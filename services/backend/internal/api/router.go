package api

import (
	"database/sql"

	"github.com/gin-gonic/gin"
	"looplink.com/backend/internal/api/handlers"
	"looplink.com/backend/internal/api/middleware"
	"looplink.com/backend/internal/config"
	"looplink.com/backend/internal/repository"
	"looplink.com/backend/internal/services"
	"looplink.com/backend/internal/utils"
)

func SetupRouter(db *sql.DB, cfg *config.Config) *gin.Engine {
	router := gin.Default()

	// Initialize utilities
	jwtUtil := utils.NewJWTUtil(cfg.JWTSecret)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	shipmentRepo := repository.NewShipmentRepository(db)
	vehicleRepo := repository.NewVehicleRepository(db)
	driverRepo := repository.NewDriverRepository(db)
	shipperRepo := repository.NewShipperRepository(db)
	consignmentRepo := repository.NewConsignmentRepository(db)
	kbRepo := repository.NewKnowledgeBaseRepository(db)

	// Initialize services
	authService := services.NewAuthService(userRepo, jwtUtil)
	routeService := services.NewRouteService()
	matchingEngine := services.NewMatchingEngine(shipmentRepo, vehicleRepo, routeService)
	shipmentService := services.NewShipmentService(shipmentRepo, vehicleRepo)
	driverService := services.NewDriverService(driverRepo, userRepo, vehicleRepo)
	shipperService := services.NewShipperService(shipperRepo, userRepo)
	_ = services.NewConsignmentService(consignmentRepo, shipmentRepo)
	kbService := services.NewKnowledgeBaseService(kbRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, jwtUtil)
	shipmentHandler := handlers.NewShipmentHandler(shipmentService, matchingEngine, shipperService)
	vehicleHandler := handlers.NewVehicleHandler(vehicleRepo)
	driverHandler := handlers.NewDriverHandler(driverService)
	matchingHandler := handlers.NewMatchingHandler(matchingEngine, shipmentRepo, kbService)
	adminHandler := handlers.NewAdminHandler(userRepo, shipmentRepo, vehicleRepo, driverRepo)

	// Apply global middleware
	router.Use(middleware.ErrorHandlerMiddleware())

	// Public routes
	publicGroup := router.Group("/api/v1/public")
	{
		publicGroup.POST("/auth/signup", authHandler.SignUp)
		publicGroup.POST("/auth/login", authHandler.Login)
	}

	// Protected routes
	protectedGroup := router.Group("/api/v1")
	protectedGroup.Use(middleware.AuthMiddleware(jwtUtil))
	{
		// Auth routes
		protectedGroup.GET("/auth/profile", authHandler.GetProfile)
		protectedGroup.POST("/auth/refresh", authHandler.RefreshToken)

		// Shipper routes
		protectedGroup.POST("/shippers/register", shipmentHandler.RegisterShipper)
		protectedGroup.GET("/shippers/me", shipmentHandler.GetMyShipperProfile)

		// Shipment routes
		protectedGroup.POST("/shipments", shipmentHandler.CreateShipment)
		protectedGroup.GET("/shipments", shipmentHandler.ListShipments)
		protectedGroup.GET("/shipments/:id", shipmentHandler.GetShipment)
		protectedGroup.PUT("/shipments/:id", shipmentHandler.UpdateShipment)
		protectedGroup.DELETE("/shipments/:id", shipmentHandler.DeleteShipment)
		protectedGroup.GET("/shipments/:id/matches", shipmentHandler.FindMatches)
		protectedGroup.GET("/shipments/:id/best-match", shipmentHandler.GetBestMatch)

		// Vehicle routes
		protectedGroup.POST("/vehicles", vehicleHandler.CreateVehicle)
		protectedGroup.GET("/vehicles", vehicleHandler.ListVehicles)
		protectedGroup.GET("/vehicles/available", vehicleHandler.GetAvailableVehicles)
		protectedGroup.GET("/vehicles/:id", vehicleHandler.GetVehicle)
		protectedGroup.PUT("/vehicles/:id", vehicleHandler.UpdateVehicle)
		protectedGroup.DELETE("/vehicles/:id", vehicleHandler.DeleteVehicle)

		// Driver routes
		protectedGroup.POST("/drivers", driverHandler.RegisterDriver)
		protectedGroup.GET("/drivers/me", driverHandler.GetMyProfile)
		protectedGroup.PUT("/drivers/me", driverHandler.UpdateMyProfile)
		protectedGroup.GET("/drivers/:id", driverHandler.GetDriver)
		protectedGroup.GET("/drivers/:id/vehicles", driverHandler.GetDriverVehicles)

		// Matching routes
		protectedGroup.POST("/matching/search", matchingHandler.SearchMatches)
		protectedGroup.POST("/matching/accept", matchingHandler.AcceptMatch)
		protectedGroup.POST("/matching/feedback", matchingHandler.SubmitFeedback)
		protectedGroup.GET("/matching/backhauling/:shipment_id", matchingHandler.GetBackhauling)
	}

	// Admin routes
	adminGroup := router.Group("/api/v1/admin")
	adminGroup.Use(middleware.AuthMiddleware(jwtUtil))
	adminGroup.Use(middleware.RoleMiddleware("admin"))
	{
		adminGroup.GET("/stats", adminHandler.GetStats)
		adminGroup.GET("/users", adminHandler.ListUsers)
		adminGroup.GET("/shipments", adminHandler.ListAllShipments)
		adminGroup.GET("/vehicles", adminHandler.ListAllVehicles)
		adminGroup.GET("/drivers", adminHandler.ListAllDrivers)
		adminGroup.GET("/knowledge-base", adminHandler.GetKnowledgeBaseEntries)
	}

	// Health check route
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	return router
}
