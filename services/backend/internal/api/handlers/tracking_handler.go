package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"looplink.com/backend/internal/repository"
	"looplink.com/backend/internal/services"
)

type TrackingHandler struct {
	trackingService *services.TrackingService
	shipmentRepo    *repository.ShipmentRepository
	vehicleRepo     *repository.VehicleRepository
}

func NewTrackingHandler(trackingService *services.TrackingService, shipmentRepo *repository.ShipmentRepository, vehicleRepo *repository.VehicleRepository) *TrackingHandler {
	return &TrackingHandler{
		trackingService: trackingService,
		shipmentRepo:    shipmentRepo,
		vehicleRepo:     vehicleRepo,
	}
}

// GetTrackingStatus returns current tracking status for a shipment
func (th *TrackingHandler) GetTrackingStatus(c *gin.Context) {
	shipmentID := c.Param("shipment_id")

	// Get shipment
	shipment, err := th.shipmentRepo.GetShipmentByID(shipmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	// Get assigned vehicle
	if shipment.AssignedVehicle == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "shipment not assigned to a vehicle"})
		return
	}

	vehicle, err := th.vehicleRepo.GetVehicleByID(shipment.AssignedVehicle)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vehicle not found"})
		return
	}

	// Get tracking summary
	summary := th.trackingService.GetTrackingSummary(shipment, vehicle)
	if summary == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate tracking summary"})
		return
	}

	c.JSON(http.StatusOK, summary)
}

// GetTrackingHistory returns all tracking events (waypoints) for visualization
func (th *TrackingHandler) GetTrackingHistory(c *gin.Context) {
	shipmentID := c.Param("shipment_id")

	// Get shipment
	shipment, err := th.shipmentRepo.GetShipmentByID(shipmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	// Get assigned vehicle
	if shipment.AssignedVehicle == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "shipment not assigned to a vehicle"})
		return
	}

	vehicle, err := th.vehicleRepo.GetVehicleByID(shipment.AssignedVehicle)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "vehicle not found"})
		return
	}

	// Get simulated tracking history (waypoints)
	events := th.trackingService.SimulateVehicleMovement(shipment, vehicle)

	c.JSON(http.StatusOK, gin.H{
		"shipment_id":       shipmentID,
		"total_distance_km": 300.0,
		"total_events":      len(events),
		"events":            events,
	})
}
