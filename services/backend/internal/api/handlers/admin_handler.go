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
	kbRepo       *repository.KnowledgeBaseRepository
}

func NewAdminHandler(userRepo *repository.UserRepository, shipmentRepo *repository.ShipmentRepository, vehicleRepo *repository.VehicleRepository, driverRepo *repository.DriverRepository, kbRepo *repository.KnowledgeBaseRepository) *AdminHandler {
	return &AdminHandler{
		userRepo:     userRepo,
		shipmentRepo: shipmentRepo,
		vehicleRepo:  vehicleRepo,
		driverRepo:   driverRepo,
		kbRepo:       kbRepo,
	}
}

func (ah *AdminHandler) GetStats(c *gin.Context) {
	driverCount, _ := ah.driverRepo.CountDrivers()
	pendingShipments, _ := ah.shipmentRepo.GetPendingShipments()
	availableVehicles, _ := ah.vehicleRepo.GetAvailableVehicles()
	users, _ := ah.userRepo.GetAllUsers()
	shipments, _ := ah.shipmentRepo.GetAllShipments()
	vehicles, _ := ah.vehicleRepo.GetAllVehicles()
	kbEntries, _ := ah.kbRepo.GetAllEntries()

	c.JSON(http.StatusOK, gin.H{"stats": gin.H{
		"total_users":          len(users),
		"total_drivers":        driverCount,
		"total_shipments":      len(shipments),
		"total_vehicles":       len(vehicles),
		"total_knowledge_base": len(kbEntries),
		"pending_shipments":    len(pendingShipments),
		"available_vehicles":   len(availableVehicles),
	}})
}

func (ah *AdminHandler) ListUsers(c *gin.Context) {
	users, err := ah.userRepo.GetAllUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users, "count": len(users)})
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
	vehicles, err := ah.vehicleRepo.GetAllVehicles()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"vehicles": vehicles, "count": len(vehicles)})
}

func (ah *AdminHandler) ListAllDrivers(c *gin.Context) {
	drivers, err := ah.driverRepo.GetAllDriversWithUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"drivers": drivers, "count": len(drivers)})
}

func (ah *AdminHandler) GetKnowledgeBaseEntries(c *gin.Context) {
	entries, err := ah.kbRepo.GetAllEntries()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"entries": entries, "count": len(entries)})
}
