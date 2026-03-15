package handlers

import (
	"errors"
	"log"
	"net/http"
	"sort"

	"github.com/gin-gonic/gin"
	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
	"looplink.com/backend/internal/services"
)

type ShipmentHandler struct {
	shipmentService *services.ShipmentService
	matchingEngine  *services.MatchingEngine
	shipperService  *services.ShipperService
	vehicleRepo     *repository.VehicleRepository
	pricingService  *services.PricingService
	routeService    *services.RouteService
	mlService       *services.MLInferenceService
}

func NewShipmentHandler(
	shipmentService *services.ShipmentService,
	matchingEngine *services.MatchingEngine,
	shipperService *services.ShipperService,
	vehicleRepo *repository.VehicleRepository,
	pricingService *services.PricingService,
	routeService *services.RouteService,
	mlService *services.MLInferenceService,
) *ShipmentHandler {
	return &ShipmentHandler{
		shipmentService: shipmentService,
		matchingEngine:  matchingEngine,
		shipperService:  shipperService,
		vehicleRepo:     vehicleRepo,
		pricingService:  pricingService,
		routeService:    routeService,
		mlService:       mlService,
	}
}

// CreateShipment creates a new shipment
func (sh *ShipmentHandler) CreateShipment(c *gin.Context) {
	var req services.CreateShipmentInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Look up shipper by user_id to get the shipper.id for the FK
	userID := c.GetString("user_id")
	shipper, err := sh.shipperService.GetShipperByUserID(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "You must register as a shipper first (POST /api/v1/shippers/register)",
			"details": err.Error(),
		})
		return
	}
	req.ShipperID = shipper.ID

	shipment, err := sh.shipmentService.CreateShipment(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Shipment created successfully",
		"shipment": shipment,
	})
}

// GetShipment retrieves a shipment by ID
func (sh *ShipmentHandler) GetShipment(c *gin.Context) {
	id := c.Param("id")

	shipment, err := sh.shipmentService.GetShipmentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"shipment": shipment})
}

// ListShipments lists shipments for the current user
func (sh *ShipmentHandler) ListShipments(c *gin.Context) {
	userID := c.GetString("user_id")

	// Look up shipper by user_id
	shipper, err := sh.shipperService.GetShipperByUserID(userID)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"shipments": []interface{}{}})
		return
	}

	shipments, err := sh.shipmentService.GetShipmentsByShipperID(shipper.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"shipments": shipments})
}

// GetAvailableShipments lists all shipments available for drivers to match
func (sh *ShipmentHandler) GetAvailableShipments(c *gin.Context) {
	shipments, err := sh.shipmentService.GetAllShipments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"shipments": shipments})
}

// UpdateShipment updates a shipment
func (sh *ShipmentHandler) UpdateShipment(c *gin.Context) {
	id := c.Param("id")

	var req services.UpdateShipmentInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	shipment, err := sh.shipmentService.UpdateShipment(id, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Shipment updated successfully",
		"shipment": shipment,
	})
}

// DeleteShipment deletes a shipment
func (sh *ShipmentHandler) DeleteShipment(c *gin.Context) {
	id := c.Param("id")

	if err := sh.shipmentService.DeleteShipment(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Shipment deleted successfully"})
}

// FindMatches finds matching vehicles for a shipment
func (sh *ShipmentHandler) FindMatches(c *gin.Context) {
	id := c.Param("id")

	shipment, err := sh.shipmentService.GetShipmentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	matches, err := sh.matchingEngine.FindMatches(shipment, 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	sh.enrichMatches(c, shipment, matches)

	c.JSON(http.StatusOK, gin.H{
		"shipment_id": id,
		"matches":     matches,
		"count":       len(matches),
	})
}

// GetBestMatch returns the best matching vehicle for a shipment
func (sh *ShipmentHandler) GetBestMatch(c *gin.Context) {
	id := c.Param("id")

	shipment, err := sh.shipmentService.GetShipmentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	match, err := sh.matchingEngine.GetMatchingRecommendation(shipment)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	results := []*domain.MatchResult{match}
	sh.enrichMatches(c, shipment, results)
	best := results[0]

	c.JSON(http.StatusOK, gin.H{
		"shipment_id": id,
		"best_match":  best,
	})
}

// RegisterShipper registers a shipper profile for the current user
func (sh *ShipmentHandler) RegisterShipper(c *gin.Context) {
	var req services.RegisterShipperInput
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	req.UserID = c.GetString("user_id")

	shipper, err := sh.shipperService.RegisterShipper(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Shipper profile registered successfully",
		"shipper": shipper,
	})
}

// GetMyShipperProfile gets the current user"s shipper profile
func (sh *ShipmentHandler) GetMyShipperProfile(c *gin.Context) {
	userID := c.GetString("user_id")

	shipper, err := sh.shipperService.GetShipperByUserID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipper profile not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"shipper": shipper})
}

func (sh *ShipmentHandler) enrichMatches(c *gin.Context, shipment *domain.Shipment, matches []*domain.MatchResult) {
	if shipment == nil || len(matches) == 0 {
		return
	}

	routeData, routeErr := sh.resolveRouteData(shipment)
	if routeErr != nil {
		log.Printf("[ShipmentHandler] route calculation fallback for shipment=%s: %v", shipment.ID, routeErr)
	}
	distance := 300.0
	if routeData != nil && routeData.Distance > 0 {
		distance = routeData.Distance
	}

	vehicleCache := make(map[string]*domain.Vehicle)
	for _, match := range matches {
		ruleScore := match.MatchScore
		match.RuleScore = ruleScore
		match.ScoreSource = "rules"

		vehicle := &domain.Vehicle{}
		if cached, ok := vehicleCache[match.VehicleID]; ok {
			vehicle = cached
		} else if sh.vehicleRepo != nil {
			if loaded, err := sh.vehicleRepo.GetVehicleByID(match.VehicleID); err == nil {
				vehicle = loaded
				vehicleCache[match.VehicleID] = loaded
			}
		}
		if vehicle.Capacity <= 0 {
			vehicle.Capacity = maxIntShipment(1, shipment.LoadVolume)
		}
		if vehicle.MaxWeight <= 0 {
			vehicle.MaxWeight = maxIntShipment(1, shipment.LoadWeight)
		}

		if sh.pricingService != nil {
			match.PricingBreakdown = sh.pricingService.CalculatePricing(shipment, vehicle, distance)
			match.ScoreDetails = sh.pricingService.CalculateDetailedScore(shipment, vehicle, distance, match.EstimatedTime)
		}

		if sh.mlService != nil && sh.mlService.Enabled() {
			mlResult, err := sh.mlService.PredictMatchScoreWithDetails(c.Request.Context(), shipment, vehicle, routeData, ruleScore)
			if err != nil {
				log.Printf("[ShipmentHandler] ML inference failed for vehicle=%s: %v", match.VehicleID, err)
			} else {
				match.MLScore = &mlResult.Score
				match.Confidence = &mlResult.Confidence
				match.Explanation = mlResult.Explanation
				match.MatchScore = sh.mlService.Blend(ruleScore, mlResult.Score)
				match.ScoreSource = "hybrid"
			}
		}
	}

	sort.Slice(matches, func(i, j int) bool {
		return matches[i].MatchScore > matches[j].MatchScore
	})
}

func (sh *ShipmentHandler) resolveRouteData(shipment *domain.Shipment) (*domain.RouteData, error) {
	if sh.routeService == nil || shipment == nil {
		return nil, errors.New("route service unavailable")
	}
	routeData, err := sh.routeService.CalculateRoute(shipment.SourceLocation, shipment.DestLocation)
	if err != nil {
		return nil, err
	}
	return routeData, nil
}

func maxIntShipment(a, b int) int {
	if a > b {
		return a
	}
	return b
}
