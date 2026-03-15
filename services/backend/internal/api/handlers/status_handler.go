package handlers

import (
	"net/http"
	"strings"
	"time"

	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
	"looplink.com/backend/internal/services"
	"looplink.com/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type StatusHandler struct {
	statusService   *services.StatusService
	shipmentRepo    *repository.ShipmentRepository
	trackingService *services.TrackingService
}

// NewStatusHandler creates a new StatusHandler instance
func NewStatusHandler(statusService *services.StatusService, shipmentRepo *repository.ShipmentRepository, trackingService *services.TrackingService) *StatusHandler {
	return &StatusHandler{
		statusService:   statusService,
		shipmentRepo:    shipmentRepo,
		trackingService: trackingService,
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

// RecordPickupEvent records a pickup event with location validation
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

	// Fetch shipment to get source/destination for location validation
	shipment, err := h.shipmentRepo.GetShipmentByID(shipmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	// Use helper function to get location coordinates
	srcLat, srcLon := getLocationCoordinates(shipment.SourceLocation)
	dstLat, dstLon := getLocationCoordinates(shipment.DestLocation)

	// Validate location (within 50km of source)
	validator := utils.NewLocationValidation(srcLat, srcLon, dstLat, dstLon, 50.0)
	if err := validator.ValidatePickup(req.Latitude, req.Longitude); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event, err := h.statusService.RecordPickupEvent(shipmentID, req.DriverID, req.Location, req.Latitude, req.Longitude)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"event":   event,
		"message": "Pickup recorded successfully",
	})
}

// RecordDeliveryEvent records a delivery event with location validation
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

	// Fetch shipment to get source/destination for location validation
	shipment, err := h.shipmentRepo.GetShipmentByID(shipmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
		return
	}

	// Use helper function to get location coordinates
	srcLat, srcLon := getLocationCoordinates(shipment.SourceLocation)
	dstLat, dstLon := getLocationCoordinates(shipment.DestLocation)

	// Validate location (within 50km of destination)
	validator := utils.NewLocationValidation(srcLat, srcLon, dstLat, dstLon, 50.0)
	if err := validator.ValidateDelivery(req.Latitude, req.Longitude); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	event, err := h.statusService.RecordDeliveryEvent(shipmentID, req.DriverID, req.Location, req.Latitude, req.Longitude, req.ProofImage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"event":   event,
		"message": "Delivery recorded successfully",
	})
}

// getLocationCoordinates returns coordinates for known cities
// This helper function maps city names to their coordinates
func getLocationCoordinates(location string) (float64, float64) {
	known := map[string][2]float64{
		"mumbai":             {19.0760, 72.8777},
		"delhi":              {28.7041, 77.1025},
		"bengaluru":          {12.9716, 77.5946},
		"bangalore":          {12.9716, 77.5946},
		"kochi":              {9.9312, 76.2673},
		"cochin":             {9.9312, 76.2673},
		"hyderabad":          {17.3850, 78.4867},
		"chennai":            {13.0827, 80.2707},
		"kolkata":            {22.5726, 88.3639},
		"pune":               {18.5204, 73.8567},
		"ahmedabad":          {23.0225, 72.5714},
		"jaipur":             {26.9124, 75.7873},
		"indore":             {22.7196, 75.8577},
		"bhopal":             {23.2599, 77.4126},
		"lucknow":            {26.8467, 80.9462},
		"patna":              {25.5941, 85.1376},
		"surat":              {21.1702, 72.8311},
		"kanyakumari":        {8.0883, 77.5385},
		"thiruvananthapuram": {8.5241, 76.9366},
		"trivandrum":         {8.5241, 76.9366},
		"coimbatore":         {11.0026, 76.7855},
		"madurai":            {9.9252, 78.1198},
		"vijayawada":         {16.5062, 80.6480},
		"visakhapatnam":      {17.6869, 83.2185},
		"nagpur":             {21.1458, 79.0882},
		"raipur":             {21.2514, 81.6296},
		"guwahati":           {26.1445, 91.7362},
		"chandigarh":         {30.7333, 76.7794},
	}

	// Normalize input
	normalized := strings.ToLower(strings.TrimSpace(location))

	// Check for exact or partial match
	for city, coords := range known {
		if strings.Contains(normalized, city) {
			return coords[0], coords[1]
		}
	}

	// Default fallback to India-bounded coordinates
	return 20.0, 78.0
}
