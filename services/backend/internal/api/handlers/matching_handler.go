package handlers

import (
"net/http"

"github.com/gin-gonic/gin"
"looplink.com/backend/internal/repository"
"looplink.com/backend/internal/services"
)

type MatchingHandler struct {
matchingEngine *services.MatchingEngine
shipmentRepo   *repository.ShipmentRepository
kbService      *services.KnowledgeBaseService
}

func NewMatchingHandler(matchingEngine *services.MatchingEngine, shipmentRepo *repository.ShipmentRepository, kbService *services.KnowledgeBaseService) *MatchingHandler {
return &MatchingHandler{matchingEngine: matchingEngine, shipmentRepo: shipmentRepo, kbService: kbService}
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
shipment, err := mh.shipmentRepo.GetShipmentByID(req.ShipmentID)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": "shipment not found"})
return
}
shipment.AssignedVehicle = req.VehicleID
shipment.Status = "booked"
shipment.EstimatedCost = req.Cost
if err := mh.shipmentRepo.UpdateShipment(shipment); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update shipment"})
return
}
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
VehicleID  string  `json:"vehicle_id"`
MatchScore float64 `json:"match_score"`
Bonus      float64 `json:"backhauling_bonus"`
}
var results []BackhaulResult
for _, match := range matches {
results = append(results, BackhaulResult{VehicleID: match.VehicleID, MatchScore: match.MatchScore, Bonus: 50.0})
}
c.JSON(http.StatusOK, gin.H{"shipment_id": shipmentID, "backhauling_options": results, "count": len(results)})
}
