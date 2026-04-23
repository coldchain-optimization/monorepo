package api

import (
	"database/sql"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
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

	// CORS configuration
	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:3000",
			"http://10.236.168.104:5173",
			"http://10.236.168.104:5174",
			"http://10.236.168.104:5175",
			"http://10.236.168.104:5176",
			"http://10.236.168.104:5177",
			"http://10.236.168.104:5178",
		},
		AllowOriginFunc: func(origin string) bool {
			// Allow local dev servers regardless of chosen Vite fallback port.
			return strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "http://127.0.0.1:")
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Initialize utilities
	jwtUtil := utils.NewJWTUtil(cfg.JWTSecret)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db)
	shipmentRepo := repository.NewShipmentRepository(db)
	vehicleRepo := repository.NewVehicleRepository(db)
        trackingRepo := repository.NewTrackingRepository(db)
	driverRepo := repository.NewDriverRepository(db)
	shipperRepo := repository.NewShipperRepository(db)
	consignmentRepo := repository.NewConsignmentRepository(db)
	kbRepo := repository.NewKnowledgeBaseRepository(db)
	geocodingCacheRepo := repository.NewGeocodingCacheRepository(db)

	// Initialize services
	authService := services.NewAuthService(userRepo, jwtUtil)
	routeService := services.NewRouteService()
	pricingService := services.NewPricingService()
	mlInferenceService := services.NewMLInferenceService(
		cfg.MLEnabled,
		cfg.MLServiceURL,
		time.Duration(cfg.MLTimeoutMs)*time.Millisecond,
		cfg.MLBlendWeight,
	)
	geocodingService := services.NewGeocodingService(geocodingCacheRepo)
	trackingService := services.NewTrackingService(shipmentRepo, vehicleRepo, geocodingService, trackingRepo)
	statusService := services.NewStatusService()
	matchingEngine := services.NewMatchingEngine(shipmentRepo, vehicleRepo, routeService)
	consolidationService := services.NewConsolidationService()
	costAllocationService := services.NewCostAllocationService()
	shipmentService := services.NewShipmentService(shipmentRepo, vehicleRepo)
	driverService := services.NewDriverService(driverRepo, userRepo, vehicleRepo)
	shipperService := services.NewShipperService(shipperRepo, userRepo)
	_ = services.NewConsignmentService(consignmentRepo, shipmentRepo)
	kbService := services.NewKnowledgeBaseService(kbRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, jwtUtil)
	shipmentHandler := handlers.NewShipmentHandler(
		shipmentService,
		matchingEngine,
		shipperService,
		vehicleRepo,
		pricingService,
		routeService,
		mlInferenceService,
	)
	vehicleHandler := handlers.NewVehicleHandler(vehicleRepo)
	driverHandler := handlers.NewDriverHandler(driverService)
	matchingHandler := handlers.NewMatchingHandler(matchingEngine, shipmentRepo, vehicleRepo, kbService, pricingService, routeService, mlInferenceService)
	trackingHandler := handlers.NewTrackingHandler(trackingService, shipmentRepo, vehicleRepo)
	statusHandler := handlers.NewStatusHandler(statusService, shipmentRepo, trackingService)
	consolidationHandler := handlers.NewConsolidationHandler(consolidationService, costAllocationService, shipmentRepo, vehicleRepo)
	adminHandler := handlers.NewAdminHandler(userRepo, shipmentRepo, vehicleRepo, driverRepo, kbRepo)
	citiesHandler := handlers.NewCitiesHandler()

	// Apply global middleware
	router.Use(middleware.ErrorHandlerMiddleware())

	// Public routes
	publicGroup := router.Group("/api/v1/public")
	{
		publicGroup.POST("/auth/signup", authHandler.SignUp)
		publicGroup.POST("/auth/login", authHandler.Login)

		// Cities routes (no auth required - used by all apps for location data)
		publicGroup.GET("/cities/all", citiesHandler.GetAllCities)
		publicGroup.GET("/cities/resolve", citiesHandler.ResolveCity) // ?city=Mumbai
		publicGroup.GET("/cities/search", citiesHandler.SearchCities) // ?q=nash
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
		protectedGroup.GET("/shipments/available", shipmentHandler.GetAvailableShipments)
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

		// Tracking routes
		protectedGroup.GET("/tracking/:shipment_id/status", trackingHandler.GetTrackingStatus)
		protectedGroup.GET("/tracking/:shipment_id/history", trackingHandler.GetTrackingHistory)
                protectedGroup.POST("/tracking/:shipment_id/location", trackingHandler.UpdateLocation)
		protectedGroup.GET("/status/:shipment_id/current", statusHandler.GetCurrentStatus)
		protectedGroup.GET("/status/:shipment_id/summary", statusHandler.GetStatusSummary)
		protectedGroup.POST("/status/:shipment_id/pickup", statusHandler.RecordPickupEvent)
		protectedGroup.POST("/status/:shipment_id/deliver", statusHandler.RecordDeliveryEvent)

		// Consolidation routes
		protectedGroup.GET("/consolidations/:shipment_id", consolidationHandler.GetConsolidationOpportunities)
		protectedGroup.POST("/consolidations", consolidationHandler.CreateConsolidatedTrip)
		protectedGroup.GET("/trips/:trip_id/backhauling", consolidationHandler.GetBackhaulOpportunities)
		protectedGroup.GET("/consolidations/metrics", consolidationHandler.GetConsolidationMetrics)
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
