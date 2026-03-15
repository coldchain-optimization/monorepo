package handlers

import (
	"fmt"
	"log"
	"net/http"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
	"looplink.com/backend/internal/services"
)

type MatchingHandler struct {
	matchingEngine *services.MatchingEngine
	shipmentRepo   *repository.ShipmentRepository
	vehicleRepo    *repository.VehicleRepository
	kbService      *services.KnowledgeBaseService
	pricingService *services.PricingService
	routeService   *services.RouteService
	mlService      *services.MLInferenceService
}

func NewMatchingHandler(
	matchingEngine *services.MatchingEngine,
	shipmentRepo *repository.ShipmentRepository,
	vehicleRepo *repository.VehicleRepository,
	kbService *services.KnowledgeBaseService,
	pricingService *services.PricingService,
	routeService *services.RouteService,
	mlService *services.MLInferenceService,
) *MatchingHandler {
	return &MatchingHandler{
		matchingEngine: matchingEngine,
		shipmentRepo:   shipmentRepo,
		vehicleRepo:    vehicleRepo,
		kbService:      kbService,
		pricingService: pricingService,
		routeService:   routeService,
		mlService:      mlService,
	}
}

type SearchMatchesRequest struct {
	ShipmentID string `json:"shipment_id" binding:"required"`
	Limit      int    `json:"limit"`
}

func (mh *MatchingHandler) SearchMatches(c *gin.Context) {
	var req SearchMatchesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}
	shipment, err := mh.shipmentRepo.GetShipmentByID(req.ShipmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}
	matches, err := mh.matchingEngine.FindMatches(shipment, req.Limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	vehicleCache := make(map[string]*domain.Vehicle)
	routeData, routeErr := mh.resolveRouteData(shipment)
	if routeErr != nil {
		log.Printf("[SearchMatches] route calculation fallback for shipment=%s: %v", shipment.ID, routeErr)
	}
	distance := 300.0
	if routeData != nil && routeData.Distance > 0 {
		distance = routeData.Distance
	}

	// Enrich matches with pricing, score breakdown, and optional ML blending.
	for _, match := range matches {
		ruleScore := match.MatchScore
		match.RuleScore = ruleScore
		match.ScoreSource = "rules"

		vehicle := &domain.Vehicle{}
		if cached, ok := vehicleCache[match.VehicleID]; ok {
			vehicle = cached
		} else if mh.vehicleRepo != nil {
			if loaded, err := mh.vehicleRepo.GetVehicleByID(match.VehicleID); err == nil {
				vehicle = loaded
				vehicleCache[match.VehicleID] = loaded
			}
		}
		if vehicle.Capacity <= 0 {
			vehicle.Capacity = maxInt(1, shipment.LoadVolume)
		}
		if vehicle.MaxWeight <= 0 {
			vehicle.MaxWeight = maxInt(1, shipment.LoadWeight)
		}

		// Calculate pricing breakdown
		match.PricingBreakdown = mh.pricingService.CalculatePricing(shipment, vehicle, distance)

		// Calculate detailed score components
		match.ScoreDetails = mh.pricingService.CalculateDetailedScore(shipment, vehicle, distance, match.EstimatedTime)

		if mh.mlService != nil && mh.mlService.Enabled() {
			mlResult, err := mh.mlService.PredictMatchScoreWithDetails(c.Request.Context(), shipment, vehicle, routeData, ruleScore)
			if err != nil {
				log.Printf("[SearchMatches] ML inference failed for vehicle=%s: %v", match.VehicleID, err)
			} else {
				match.MLScore = &mlResult.Score
				match.Confidence = &mlResult.Confidence
				match.Explanation = mlResult.Explanation
				match.MatchScore = mh.mlService.Blend(ruleScore, mlResult.Score)
				match.ScoreSource = "hybrid"
			}
		}
	}

	sort.Slice(matches, func(i, j int) bool {
		return matches[i].MatchScore > matches[j].MatchScore
	})

	c.JSON(http.StatusOK, gin.H{"shipment_id": req.ShipmentID, "matches": matches, "count": len(matches)})
}

type AcceptMatchRequest struct {
	ShipmentID string  `json:"shipment_id" binding:"required"`
	VehicleID  string  `json:"vehicle_id" binding:"required"`
	DriverID   string  `json:"driver_id" binding:"required"`
	MatchScore float64 `json:"match_score"`
	Cost       float64 `json:"estimated_cost"`
}

func (mh *MatchingHandler) AcceptMatch(c *gin.Context) {
	var req AcceptMatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[AcceptMatch] Received request: shipment_id=%s, vehicle_id=%s, driver_id=%s", req.ShipmentID, req.VehicleID, req.DriverID)

	shipment, err := mh.shipmentRepo.GetShipmentByID(req.ShipmentID)
	if err != nil {
		log.Printf("[AcceptMatch] GetShipmentByID error: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	log.Printf("[AcceptMatch] Found shipment: id=%s, shipper_id=%s, status=%s", shipment.ID, shipment.ShipperID, shipment.Status)

	// Update shipment with assignment details
	shipment.AssignedVehicle = req.VehicleID
	shipment.Status = "booked"
	shipment.EstimatedCost = req.Cost
	shipment.UpdatedAt = time.Now()

	log.Printf("[AcceptMatch] Updating shipment to: status=%s, assigned_vehicle=%s, estimated_cost=%.2f", shipment.Status, shipment.AssignedVehicle, shipment.EstimatedCost)

	if err := mh.shipmentRepo.UpdateShipment(shipment); err != nil {
		log.Printf("[AcceptMatch] UpdateShipment error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to update shipment: %v", err)})
		return
	}

	log.Printf("[AcceptMatch] Successfully updated shipment")
	feedback := services.FeedbackInput{ShipmentID: req.ShipmentID, VehicleID: req.VehicleID, MatchScore: req.MatchScore, EstimatedCost: req.Cost}
	mh.kbService.StoreFeedback(feedback)
	c.JSON(http.StatusOK, gin.H{"message": "Match accepted successfully", "shipment": shipment, "vehicle_id": req.VehicleID})
}

func (mh *MatchingHandler) SubmitFeedback(c *gin.Context) {
	var req services.FeedbackInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	entry, err := mh.kbService.StoreFeedback(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Feedback stored successfully", "entry": entry})
}

func (mh *MatchingHandler) GetBackhauling(c *gin.Context) {
	shipmentID := c.Param("shipment_id")
	shipment, err := mh.shipmentRepo.GetShipmentByID(shipmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}
	matches, err := mh.matchingEngine.FindMatches(shipment, 5)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	type BackhaulResult struct {
		VehicleID   string   `json:"vehicle_id"`
		MatchScore  float64  `json:"match_score"`
		RuleScore   float64  `json:"rule_score"`
		MLScore     *float64 `json:"ml_score,omitempty"`
		Confidence  *float64 `json:"confidence,omitempty"`
		Explanation string   `json:"explanation,omitempty"`
		ScoreSource string   `json:"score_source"`
		Bonus       float64  `json:"backhauling_bonus"`
	}
	var results []BackhaulResult
	routeData, routeErr := mh.resolveRouteData(shipment)
	if routeErr != nil {
		log.Printf("[GetBackhauling] route calculation fallback for shipment=%s: %v", shipment.ID, routeErr)
	}
	for _, match := range matches {
		ruleScore := match.MatchScore
		finalScore := ruleScore
		scoreSource := "rules"
		var mlScore *float64
		var confidence *float64
		var explanation string

		if mh.mlService != nil && mh.mlService.Enabled() && mh.vehicleRepo != nil {
			vehicle, vErr := mh.vehicleRepo.GetVehicleByID(match.VehicleID)
			if vErr == nil {
				mlResult, mlErr := mh.mlService.PredictMatchScoreWithDetails(c.Request.Context(), shipment, vehicle, routeData, ruleScore)
				if mlErr != nil {
					log.Printf("[GetBackhauling] ML inference failed for vehicle=%s: %v", match.VehicleID, mlErr)
				} else {
					mlScore = &mlResult.Score
					confidence = &mlResult.Confidence
					explanation = mlResult.Explanation
					finalScore = mh.mlService.Blend(ruleScore, mlResult.Score)
					scoreSource = "hybrid"
				}
			}
		}

		results = append(results, BackhaulResult{
			VehicleID:   match.VehicleID,
			MatchScore:  finalScore,
			RuleScore:   ruleScore,
			MLScore:     mlScore,
			Confidence:  confidence,
			Explanation: explanation,
			ScoreSource: scoreSource,
			Bonus:       50.0,
		})
	}
	sort.Slice(results, func(i, j int) bool {
		return results[i].MatchScore > results[j].MatchScore
	})
	c.JSON(http.StatusOK, gin.H{"shipment_id": shipmentID, "backhauling_options": results, "count": len(results)})
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func (mh *MatchingHandler) resolveRouteData(shipment *domain.Shipment) (*domain.RouteData, error) {
	if mh.routeService == nil || shipment == nil {
		return nil, fmt.Errorf("route service unavailable")
	}
	routeData, err := mh.routeService.CalculateRoute(shipment.SourceLocation, shipment.DestLocation)
	if err != nil {
		return nil, err
	}
	return routeData, nil
}
