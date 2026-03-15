package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
	"looplink.com/backend/internal/services"
)

type ConsolidationHandler struct {
	consolidationService  *services.ConsolidationService
	costAllocationService *services.CostAllocationService
	shipmentRepo          *repository.ShipmentRepository
	vehicleRepo           *repository.VehicleRepository
}

func NewConsolidationHandler(
	consolidationService *services.ConsolidationService,
	costAllocationService *services.CostAllocationService,
	shipmentRepo *repository.ShipmentRepository,
	vehicleRepo *repository.VehicleRepository,
) *ConsolidationHandler {
	return &ConsolidationHandler{
		consolidationService:  consolidationService,
		costAllocationService: costAllocationService,
		shipmentRepo:          shipmentRepo,
		vehicleRepo:           vehicleRepo,
	}
}

// GetConsolidationOpportunities finds consolidation options for a shipment
// GET /api/v1/consolidations/:shipment_id
func (ch *ConsolidationHandler) GetConsolidationOpportunities(c *gin.Context) {
	shipmentID := c.Param("shipment_id")

	// Verify the target shipment exists
	_, err := ch.shipmentRepo.GetShipmentByID(shipmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	// Get all pending shipments
	allShipments, err := ch.shipmentRepo.GetPendingShipments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch shipments"})
		return
	}

	// Get available vehicles
	availableVehicles, err := ch.vehicleRepo.GetAvailableVehicles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch vehicles"})
		return
	}

	// Find consolidation opportunities
	trips := ch.consolidationService.FindConsolidationOpportunities(allShipments, availableVehicles)

	// Filter trips that include our target shipment
	var relevantTrips []*services.ConsolidatedTrip
	for _, trip := range trips {
		for _, s := range trip.Shipments {
			if s.ID == shipmentID {
				relevantTrips = append(relevantTrips, trip)
				break
			}
		}
	}

	if len(relevantTrips) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"shipment_id":   shipmentID,
			"opportunities": []interface{}{},
			"message":       "No consolidation opportunities found for this shipment",
		})
		return
	}

	// Prepare response with cost allocations
	type OpportunityResponse struct {
		TripID            string                             `json:"trip_id"`
		VehicleID         string                             `json:"vehicle_id"`
		DriverID          string                             `json:"driver_id"`
		ShipmentCount     int                                `json:"shipment_count"`
		TotalWeight       int                                `json:"total_weight"`
		TotalVolume       int                                `json:"total_volume"`
		RoutingComplexity string                             `json:"routing_complexity"`
		Feasibility       string                             `json:"feasibility"`
		EstimatedCost     float64                            `json:"estimated_cost"`
		CostPerShipment   float64                            `json:"cost_per_shipment"`
		SavingsPercent    float64                            `json:"savings_percent"`
		RouteDistance     float64                            `json:"route_distance"`
		EstimatedTime     int                                `json:"estimated_time"`
		CostAllocations   []*services.ShipmentCostAllocation `json:"cost_allocations"`
	}

	opportunities := make([]OpportunityResponse, len(relevantTrips))
	for i, trip := range relevantTrips {
		allocations := ch.costAllocationService.AllocateCostsShapley(trip)

		opportunities[i] = OpportunityResponse{
			TripID:            trip.ID,
			VehicleID:         trip.VehicleID,
			DriverID:          trip.DriverID,
			ShipmentCount:     len(trip.Shipments),
			TotalWeight:       trip.TotalWeight,
			TotalVolume:       trip.TotalVolume,
			RoutingComplexity: trip.RoutingComplexity,
			Feasibility:       trip.Feasibility,
			EstimatedCost:     trip.EstimatedCost,
			CostPerShipment:   trip.CostPerShipment,
			SavingsPercent:    trip.SavingsPercent,
			RouteDistance:     trip.RouteDistance,
			EstimatedTime:     trip.EstimatedTime,
			CostAllocations:   allocations,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"shipment_id":   shipmentID,
		"opportunities": opportunities,
		"count":         len(opportunities),
	})
}

// CreateConsolidatedTrip accepts a consolidation opportunity and creates the trip
// POST /api/v1/consolidations
type CreateConsolidationRequest struct {
	TripID    string   `json:"trip_id" binding:"required"`
	Shipments []string `json:"shipment_ids" binding:"required"`
}

func (ch *ConsolidationHandler) CreateConsolidatedTrip(c *gin.Context) {
	var req CreateConsolidationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Fetch shipments to validate
	var shipments []*domain.Shipment
	for _, shipmentID := range req.Shipments {
		shipment, err := ch.shipmentRepo.GetShipmentByID(shipmentID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found: " + shipmentID})
			return
		}
		shipments = append(shipments, shipment)
	}

	// Update shipments to "booked" status with consolidated trip info
	for _, shipment := range shipments {
		shipment.Status = "booked"
		if err := ch.shipmentRepo.UpdateShipment(shipment); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update shipment: " + shipment.ID})
			return
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":        "Consolidated trip created successfully",
		"trip_id":        req.TripID,
		"shipment_count": len(shipments),
	})
}

// GetBackhaulOpportunities finds return load opportunities for a vehicle after completing a trip
// GET /api/v1/trips/:trip_id/backhauling
type BackhaulOpportunityResponse struct {
	ID                  string  `json:"id"`
	OriginDestination   string  `json:"origin_destination"`
	BackhaulOrigin      string  `json:"backhaul_origin"`
	BackhaulDestination string  `json:"backhaul_destination"`
	BachhaulRevenue     float64 `json:"backhaul_revenue"`
	UtilizationGain     float64 `json:"utilization_gain_percent"`
	Feasibility         string  `json:"feasibility"`
	ShipmentCount       int     `json:"shipment_count"`
}

func (ch *ConsolidationHandler) GetBackhaulOpportunities(c *gin.Context) {
	tripIDParam := c.Param("trip_id")

	// Get all pending shipments (potential backhaul loads)
	allShipments, err := ch.shipmentRepo.GetPendingShipments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch shipments"})
		return
	}

	// Get available vehicles
	availableVehicles, err := ch.vehicleRepo.GetAvailableVehicles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch vehicles"})
		return
	}

	if len(allShipments) == 0 || len(availableVehicles) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"trip_id":       tripIDParam,
			"opportunities": []interface{}{},
			"count":         0,
		})
		return
	}

	// Create a dummy consolidated trip for backhauling analysis
	// In production, this would fetch from database
	dummyTrip := &services.ConsolidatedTrip{
		ID:        tripIDParam,
		VehicleID: allShipments[0].AssignedVehicle, // Placeholder
		Shipments: allShipments[:1],
		DeliveryRoute: []services.Stop{
			{
				Location: "Mumbai", // Default destination
			},
		},
		EstimatedCost: 10000,
	}

	backhaulOpportunities := ch.costAllocationService.FindBackhaulOpportunities(
		dummyTrip,
		allShipments[1:], // Remaining shipments as potential backhauls
		availableVehicles,
	)

	if len(backhaulOpportunities) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"trip_id":       tripIDParam,
			"opportunities": []interface{}{},
			"message":       "No backhaul opportunities found",
		})
		return
	}

	// Format response
	opportunities := make([]BackhaulOpportunityResponse, len(backhaulOpportunities))
	for i, opp := range backhaulOpportunities {
		opportunities[i] = BackhaulOpportunityResponse{
			ID:                  opp.ID,
			OriginDestination:   opp.OriginDestination,
			BackhaulOrigin:      opp.BackhaulOrigin,
			BackhaulDestination: opp.BackhaulDestination,
			BachhaulRevenue:     opp.BachhaulRevenue,
			UtilizationGain:     opp.UtilizationGain,
			Feasibility:         opp.Feasibility,
			ShipmentCount:       len(opp.BackhaulShipments),
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"trip_id":       tripIDParam,
		"opportunities": opportunities,
		"count":         len(opportunities),
	})
}

// GetConsolidationMetrics returns aggregated metrics about consolidation performance
// GET /api/v1/consolidations/metrics
func (ch *ConsolidationHandler) GetConsolidationMetrics(c *gin.Context) {
	// Get all shipments
	allShipments, err := ch.shipmentRepo.GetPendingShipments()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch shipments"})
		return
	}

	availableVehicles, err := ch.vehicleRepo.GetAvailableVehicles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch vehicles"})
		return
	}

	if len(allShipments) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"total_shipments":         0,
			"consolidation_rate":      0.0,
			"potential_savings":       0.0,
			"average_savings_percent": 0.0,
		})
		return
	}

	trips := ch.consolidationService.FindConsolidationOpportunities(allShipments, availableVehicles)

	consolidatedCount := 0
	totalSavings := 0.0

	for _, trip := range trips {
		if len(trip.Shipments) > 1 {
			consolidatedCount += len(trip.Shipments)
			totalSavings += trip.EstimatedCost * (trip.SavingsPercent / 100.0)
		}
	}

	consolidationRate := 0.0
	avgSavings := 0.0
	if len(allShipments) > 0 {
		consolidationRate = float64(consolidatedCount) / float64(len(allShipments)) * 100.0
		avgSavings = totalSavings / float64(len(allShipments))
	}

	c.JSON(http.StatusOK, gin.H{
		"total_shipments":              len(allShipments),
		"consolidated_shipments":       consolidatedCount,
		"consolidation_rate_percent":   consolidationRate,
		"total_potential_savings":      totalSavings,
		"average_savings_per_shipment": avgSavings,
		"opportunities_count":          len(trips),
	})
}
