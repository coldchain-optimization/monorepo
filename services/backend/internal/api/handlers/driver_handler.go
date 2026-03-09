package handlers

import (
"net/http"

"github.com/gin-gonic/gin"
"looplink.com/backend/internal/services"
)

type DriverHandler struct {
driverService *services.DriverService
}

func NewDriverHandler(driverService *services.DriverService) *DriverHandler {
return &DriverHandler{driverService: driverService}
}

func (dh *DriverHandler) RegisterDriver(c *gin.Context) {
var req services.RegisterDriverInput
if err := c.ShouldBindJSON(&req); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}
if req.UserID == "" {
req.UserID = c.GetString("user_id")
}
driver, err := dh.driverService.RegisterDriver(req)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusCreated, gin.H{"message": "Driver registered successfully", "driver": driver})
}

func (dh *DriverHandler) GetMyProfile(c *gin.Context) {
userID := c.GetString("user_id")
driver, err := dh.driverService.GetDriverByUserID(userID)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": "driver profile not found"})
return
}
c.JSON(http.StatusOK, gin.H{"driver": driver})
}

func (dh *DriverHandler) UpdateMyProfile(c *gin.Context) {
userID := c.GetString("user_id")
driver, err := dh.driverService.GetDriverByUserID(userID)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": "driver profile not found"})
return
}
var req services.UpdateDriverInput
if err := c.ShouldBindJSON(&req); err != nil {
c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
return
}
updated, err := dh.driverService.UpdateDriver(driver.ID, req)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"message": "Driver profile updated", "driver": updated})
}

func (dh *DriverHandler) GetDriver(c *gin.Context) {
id := c.Param("id")
driver, err := dh.driverService.GetDriverByID(id)
if err != nil {
c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"driver": driver})
}

func (dh *DriverHandler) GetDriverVehicles(c *gin.Context) {
driverID := c.Param("id")
vehicles, err := dh.driverService.GetDriverVehicles(driverID)
if err != nil {
c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
return
}
c.JSON(http.StatusOK, gin.H{"driver_id": driverID, "vehicles": vehicles, "count": len(vehicles)})
}
