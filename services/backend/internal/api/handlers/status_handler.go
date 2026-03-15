package handlers

import (
	"net/http"
	"time"

	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/services"

	"github.com/gin-gonic/gin"
)

type StatusHandler struct {
	statusService *services.StatusService
}

// NewStatusHandler creates a new StatusHandler instance
func NewStatusHandler(statusService *services.StatusService) *StatusHandler {
	return &StatusHandler{
		statusService: statusService,
	}
}

// GetStatusHistory retrieves all status events for a shipment
// GET /status/:shipment_id/history
func (h *StatusHandler) GetStatusHistory(c *gin.Context) {
	shipmentID := c.Param("shipment_id")

	// Get all events
	events := h.statusService.GetStatusHistory(shipmentID)

	// If no events exist, generate default events for demo
	if len(events) == 0 {
		events = h.statusService.GenerateDefaultStatusHistory(shipmentID, "demo-driver-1")
	}

	c.JSON(http.StatusOK, gin.H{
		"shipment_id": shipmentID,
		"events":      events,
		"total":       len(events),
	})
}

// GetCurrentStatus retrieves latest status event for a shipment
// GET /status/:shipment_id/current
func (h *StatusHandler) GetCurrentStatus(c *gin.Context) {
	shipmentID := c.Param("shipment_id")

	// Get current status
	status := h.statusService.GetCurrentStatus(shipmentID)

	// If no status exist, return pending with Mumbai coordinates
	if status == nil {
		status = &domain.StatusEvent{
			ID:         "status_initial",
			ShipmentID: shipmentID,
			Status:     "pending",
			Location:   "Origin, Mumbai",
			Latitude:   19.0760,
			Longitude:  72.8777,
			CreatedAt:  time.Now(),
		}
	}

	c.JSON(http.StatusOK, status)
}

// GetStatusSummary retrieves summary of all status events
// GET /status/:shipment_id/summary
func (h *StatusHandler) GetStatusSummary(c *gin.Context) {
	shipmentID := c.Param("shipment_id")

	summary := h.statusService.GetStatusSummary(shipmentID)
	c.JSON(http.StatusOK, summary)
}

// RecordPickupEvent records a pickup event
// POST /status/:shipment_id/pickup
func (h *StatusHandler) RecordPickupEvent(c *gin.Context) {
	shipmentID := c.Param("shipment_id")

	var req struct {
		DriverID  string  `json:"driver_id" binding:"required"`
		Location  string  `json:"location" binding:"required"`
		Latitude  float64 `json:"latitude" binding:"required"`
		Longitude float64 `json:"longitude" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event, err := h.statusService.RecordPickupEvent(shipmentID, req.DriverID, req.Location, req.Latitude, req.Longitude)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, event)
}

// RecordDeliveryEvent records a delivery event with optional proof image
// POST /status/:shipment_id/deliver
func (h *StatusHandler) RecordDeliveryEvent(c *gin.Context) {
	shipmentID := c.Param("shipment_id")

	var req struct {
		DriverID   string  `json:"driver_id" binding:"required"`
		Location   string  `json:"location" binding:"required"`
		Latitude   float64 `json:"latitude" binding:"required"`
		Longitude  float64 `json:"longitude" binding:"required"`
		ProofImage string  `json:"proof_image"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event, err := h.statusService.RecordDeliveryEvent(shipmentID, req.DriverID, req.Location, req.Latitude, req.Longitude, req.ProofImage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, event)
}
