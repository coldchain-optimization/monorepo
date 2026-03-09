package handlers

import (
"net/http"
"time"

"github.com/gin-gonic/gin"
"github.com/google/uuid"
"looplink.com/backend/internal/domain"
"looplink.com/backend/internal/repository"
)

type VehicleHandler struct {
vehicleRepo *repository.VehicleRepository
}

func NewVehicleHandler(vehicleRepo *repository.VehicleRepository) *VehicleHandler {
return &VehicleHandler{vehicleRepo: vehicleRepo}
}

type CreateVehicleRequest struct {
DriverID        string  `json:"driver_id" binding:"required"`
VehicleType     string  `json:"vehicle_type" binding:"required"`
LicensePlate    string  `json:"license_plate" binding:"required"`
Manufacturer    string  `json:"manufacturer" binding:"required"`
Model           string  `json:"model" binding:"required"`
Year            int     `json:"year" binding:"required"`
Capacity        int     `json:"capacity" binding:"required"`
MaxWeight       int     `json:"max_weight" binding:"required"`
IsRefrigerated  bool    `json:"is_refrigerated"`
Temperature     int     `json:"temperature"`
FuelType        string  `json:"fuel_type" binding:"required"`
CarbonFootprint float64 `json:"carbon_footprint"`
CurrentLocation string  `json:"current_location"`
}

func (vh *VehicleHandler) CreateVehicle(c *gin.Context) {
var req CreateVehicleRequest
if err := c.ShouldBindJSON(&req); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}
vehicle := &domain.Vehicle{
ID: uuid.New().String(), DriverID: req.DriverID, VehicleType: req.VehicleType,
LicensePlate: req.LicensePlate, Manufacturer: req.Manufacturer, Model: req.Model,
Year: req.Year, Capacity: req.Capacity, MaxWeight: req.MaxWeight,
IsRefrigerated: req.IsRefrigerated, Temperature: req.Temperature,
FuelType: req.FuelType, CarbonFootprint: req.CarbonFootprint,
IsAvailable: true, CurrentLocation: req.CurrentLocation,
CreatedAt: time.Now(), UpdatedAt: time.Now(),
}
if err := vh.vehicleRepo.CreateVehicle(vehicle); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusCreated, gin.H{"message": "Vehicle registered successfully", "vehicle": vehicle})
}

func (vh *VehicleHandler) GetVehicle(c *gin.Context) {
id := c.Param("id")
vehicle, err := vh.vehicleRepo.GetVehicleByID(id)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"vehicle": vehicle})
}

func (vh *VehicleHandler) ListVehicles(c *gin.Context) {
driverID := c.Query("driver_id")
if driverID == "" {
driverID = c.GetString("user_id")
}
vehicles, err := vh.vehicleRepo.GetVehiclesByDriverID(driverID)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"vehicles": vehicles})
}

func (vh *VehicleHandler) UpdateVehicle(c *gin.Context) {
id := c.Param("id")
vehicle, err := vh.vehicleRepo.GetVehicleByID(id)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
return
}
var req map[string]interface{}
if err := c.ShouldBindJSON(&req); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}
if v, ok := req["vehicle_type"].(string); ok { vehicle.VehicleType = v }
if v, ok := req["license_plate"].(string); ok { vehicle.LicensePlate = v }
if v, ok := req["manufacturer"].(string); ok { vehicle.Manufacturer = v }
if v, ok := req["model"].(string); ok { vehicle.Model = v }
if v, ok := req["fuel_type"].(string); ok { vehicle.FuelType = v }
if v, ok := req["current_location"].(string); ok { vehicle.CurrentLocation = v }
if v, ok := req["is_available"].(bool); ok { vehicle.IsAvailable = v }
if v, ok := req["is_refrigerated"].(bool); ok { vehicle.IsRefrigerated = v }
if v, ok := req["capacity"].(float64); ok { vehicle.Capacity = int(v) }
if v, ok := req["max_weight"].(float64); ok { vehicle.MaxWeight = int(v) }
if v, ok := req["temperature"].(float64); ok { vehicle.Temperature = int(v) }
if v, ok := req["year"].(float64); ok { vehicle.Year = int(v) }
if v, ok := req["carbon_footprint"].(float64); ok { vehicle.CarbonFootprint = v }
vehicle.UpdatedAt = time.Now()
if err := vh.vehicleRepo.UpdateVehicle(vehicle); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"message": "Vehicle updated successfully", "vehicle": vehicle})
}

func (vh *VehicleHandler) DeleteVehicle(c *gin.Context) {
id := c.Param("id")
if err := vh.vehicleRepo.DeleteVehicle(id); err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"message": "Vehicle deleted successfully"})
}

func (vh *VehicleHandler) GetAvailableVehicles(c *gin.Context) {
vehicles, err := vh.vehicleRepo.GetAvailableVehicles()
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"vehicles": vehicles, "count": len(vehicles)})
}
