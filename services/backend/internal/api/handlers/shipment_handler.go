package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"looplink.com/backend/internal/services"
)

type ShipmentHandler struct {
	shipmentService *services.ShipmentService
	matchingEngine  *services.MatchingEngine
	shipperService  *services.ShipperService
}

func NewShipmentHandler(shipmentService *services.ShipmentService, matchingEngine *services.MatchingEngine, shipperService *services.ShipperService) *ShipmentHandler {
	return &ShipmentHandler{
		shipmentService: shipmentService,
		matchingEngine:  matchingEngine,
		shipperService:  shipperService,
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

	c.JSON(http.StatusOK, gin.H{
		"shipment_id": id,
		"best_match":  match,
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
