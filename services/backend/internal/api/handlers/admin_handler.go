package handlers

import (
"net/http"

"github.com/gin-gonic/gin"
"looplink.com/backend/internal/repository"
)

type AdminHandler struct {
userRepo     *repository.UserRepository
shipmentRepo *repository.ShipmentRepository
vehicleRepo  *repository.VehicleRepository
driverRepo   *repository.DriverRepository
}

func NewAdminHandler(userRepo *repository.UserRepository, shipmentRepo *repository.ShipmentRepository, vehicleRepo *repository.VehicleRepository, driverRepo *repository.DriverRepository) *AdminHandler {
return &AdminHandler{userRepo: userRepo, shipmentRepo: shipmentRepo, vehicleRepo: vehicleRepo, driverRepo: driverRepo}
}

func (ah *AdminHandler) GetStats(c *gin.Context) {
driverCount, _ := ah.driverRepo.CountDrivers()
pendingShipments, _ := ah.shipmentRepo.GetPendingShipments()
availableVehicles, _ := ah.vehicleRepo.GetAvailableVehicles()
c.JSON(http.StatusOK, gin.H{"stats": gin.H{"total_drivers": driverCount, "pending_shipments": len(pendingShipments), "available_vehicles": len(availableVehicles)}})
}

func (ah *AdminHandler) ListUsers(c *gin.Context) {
c.JSON(http.StatusOK, gin.H{"message": "User listing available via database query", "note": "Add GetAllUsers to UserRepository for full implementation"})
}

func (ah *AdminHandler) ListAllShipments(c *gin.Context) {
shipments, err := ah.shipmentRepo.GetAllShipments()
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"shipments": shipments, "count": len(shipments)})
}

func (ah *AdminHandler) ListAllVehicles(c *gin.Context) {
vehicles, err := ah.vehicleRepo.GetAvailableVehicles()
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"vehicles": vehicles, "count": len(vehicles)})
}

func (ah *AdminHandler) ListAllDrivers(c *gin.Context) {
drivers, err := ah.driverRepo.GetAllDrivers()
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"drivers": drivers, "count": len(drivers)})
}

func (ah *AdminHandler) GetKnowledgeBaseEntries(c *gin.Context) {
c.JSON(http.StatusOK, gin.H{"message": "Knowledge base entries - use matching/feedback endpoints"})
}
