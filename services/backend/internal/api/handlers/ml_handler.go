package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"looplink.com/backend/internal/services"
)

type MLHandler struct {
	mlService *services.MLInferenceService
}

func NewMLHandler(mlService *services.MLInferenceService) *MLHandler {
	return &MLHandler{mlService: mlService}
}

func (h *MLHandler) GetPrice(c *gin.Context) {
	h.proxyCall(c, h.mlService.GetPrice)
}

func (h *MLHandler) OptimizeRoute(c *gin.Context) {
	h.proxyCall(c, h.mlService.OptimizeRoute)
}

func (h *MLHandler) FindBackhaul(c *gin.Context) {
	h.proxyCall(c, h.mlService.FindBackhaul)
}

func (h *MLHandler) TripAnalytics(c *gin.Context) {
	h.proxyCall(c, h.mlService.TripAnalytics)
}

func (h *MLHandler) EfficiencyMetrics(c *gin.Context) {
	h.proxyCall(c, h.mlService.EfficiencyMetrics)
}

func (h *MLHandler) proxyCall(c *gin.Context, fn func(context.Context, map[string]interface{}) (map[string]interface{}, error)) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid json payload"})
		return
	}

	result, err := fn(c.Request.Context(), payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}
