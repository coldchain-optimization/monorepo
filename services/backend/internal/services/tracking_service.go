package services

import (
	"fmt"
	"math"
	"strings"
	"time"

	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
)

type TrackingService struct {
	shipmentRepo     *repository.ShipmentRepository
	vehicleRepo      *repository.VehicleRepository
	geocodingService *GeocodingService
}

func NewTrackingService(shipmentRepo *repository.ShipmentRepository, vehicleRepo *repository.VehicleRepository, geocodingService *GeocodingService) *TrackingService {
	return &TrackingService{
		shipmentRepo:     shipmentRepo,
		vehicleRepo:      vehicleRepo,
		geocodingService: geocodingService,
	}
}

// SimulateVehicleMovement simulates GPS positions along a route
// Returns a series of tracking events showing vehicle progression
func (ts *TrackingService) SimulateVehicleMovement(shipment *domain.Shipment, vehicle *domain.Vehicle) []*domain.TrackingEvent {
	// Route simulation based on shipment source and destination
	startLat, startLon := ts.locationToCoordinates(shipment.SourceLocation, shipment.ID+"-src")
	endLat, endLon := ts.locationToCoordinates(shipment.DestLocation, shipment.ID+"-dst")
	totalDistance := ts.approximateDistanceKm(startLat, startLon, endLat, endLon)
	if totalDistance < 20 {
		totalDistance = 20 // Keep a sensible minimum for local deliveries
	}
	totalTimeMinutes := 360 // 6 hours (50 km/h average)

	var events []*domain.TrackingEvent

	// Simulate 10 waypoints along the route (every 30km)
	numWaypoints := 10
	for i := 0; i <= numWaypoints; i++ {
		progress := float64(i) / float64(numWaypoints) // 0 to 1
		distanceTraveled := totalDistance * progress
		distanceRemaining := totalDistance - distanceTraveled

		// Simulate GPS coordinates along source -> destination line
		currentLat := startLat + (endLat-startLat)*progress
		currentLon := startLon + (endLon-startLon)*progress

		// Simulate speed variation (start slow, faster in middle, slow at end)
		var speed float64
		if progress < 0.1 || progress > 0.9 {
			speed = 30.0 // Slowdown at start/end
		} else {
			speed = 50.0 + (10.0 * math.Sin(progress*math.Pi)) // Vary between 50-60 km/h
		}

		// Estimate arrival time
		minutesRemaining := (distanceRemaining / speed) * 60
		estimatedArrival := time.Now().Add(time.Duration(minutesRemaining) * time.Minute)

		// Determine status
		status := "in_transit"
		if i == 0 {
			status = "pickup"
		} else if i == numWaypoints {
			status = "delivered"
		} else if progress > 0.8 {
			status = "approaching_destination"
		}

		event := &domain.TrackingEvent{
			ID:                   fmt.Sprintf("track_%d_%d", i, time.Now().Unix()),
			ShipmentID:           shipment.ID,
			VehicleID:            vehicle.ID,
			Latitude:             currentLat,
			Longitude:            currentLon,
			Speed:                speed,
			Heading:              math.Atan2(endLon-startLon, endLat-startLat) * 180 / math.Pi, // Bearing
			Temperature:          vehicle.Temperature,
			Status:               status,
			DistanceTraveledKm:   distanceTraveled,
			DistanceRemainingKm:  distanceRemaining,
			EstimatedArrivalTime: estimatedArrival,
			CreatedAt:            time.Now().Add(time.Duration(i*totalTimeMinutes/numWaypoints) * time.Minute),
		}

		events = append(events, event)
	}

	return events
}

// GetTrackingSummary returns current tracking status for a shipment
func (ts *TrackingService) GetTrackingSummary(shipment *domain.Shipment, vehicle *domain.Vehicle) *domain.TrackingSummary {
	// Get the most recent tracking event
	events := ts.SimulateVehicleMovement(shipment, vehicle)

	if len(events) == 0 {
		return nil
	}

	// For simulation, return the latest event
	latest := events[len(events)-1]

	// Format vehicle info
	vehicleInfo := fmt.Sprintf("%s - %s", vehicle.VehicleType, vehicle.LicensePlate)

	// Determine current location (simplified)
	currentLocation := "En Route"
	if latest.Status == "pickup" {
		currentLocation = shipment.SourceLocation
	} else if latest.Status == "delivered" {
		currentLocation = shipment.DestLocation
	}

	return &domain.TrackingSummary{
		ShipmentID:          shipment.ID,
		CurrentLocation:     currentLocation,
		Latitude:            latest.Latitude,
		Longitude:           latest.Longitude,
		Status:              latest.Status,
		DriverName:          "Driver Name", // Would be fetched from driver profile
		VehicleInfo:         vehicleInfo,
		DistanceTraveledKm:  latest.DistanceTraveledKm,
		DistanceRemainingKm: latest.DistanceRemainingKm,
		EstimatedArrival:    latest.EstimatedArrivalTime,
		Speed:               latest.Speed,
		Temperature:         latest.Temperature,
		LastUpdate:          latest.CreatedAt,
	}
}

// CalculateProgressPercentage returns how much of the journey is complete (0-100)
func (ts *TrackingService) CalculateProgressPercentage(distanceTraveled, totalDistance float64) float64 {
	if totalDistance == 0 {
		return 0
	}
	progress := (distanceTraveled / totalDistance) * 100
	if progress > 100 {
		progress = 100
	}
	if progress < 0 {
		progress = 0
	}
	return progress
}

// EstimateArrivalTime calculates ETA based on current speed and remaining distance
func (ts *TrackingService) EstimateArrivalTime(distanceRemaining, speed float64) time.Time {
	if speed == 0 {
		return time.Now().Add(1 * time.Hour) // Default 1 hour if speed is 0
	}
	minutesRemaining := (distanceRemaining / speed) * 60
	return time.Now().Add(time.Duration(minutesRemaining) * time.Minute)
}

func (ts *TrackingService) locationToCoordinates(location, seed string) (float64, float64) {
	normalized := strings.ToLower(strings.TrimSpace(location))

	// Tier 1: Use geocoding service (which tries APIs first, then curated DB)
	// This resolves ANY Indian city without manual database updates
	if ts.geocodingService != nil {
		lat, lon, err := ts.geocodingService.ResolveCity(normalized)
		if err == nil {
			return lat, lon
		}
	}

	// Tier 2: Fallback - direct curated cities lookup if geocoding service unavailable
	// Only used if GeocodingService is nil (should not happen in production)
	for _, city := range domain.CuratedIndianCities {
		if strings.ToLower(city.Name) == normalized {
			return city.Latitude, city.Longitude
		}
		// Check aliases
		for _, alias := range city.Aliases {
			if strings.ToLower(alias) == normalized {
				return city.Latitude, city.Longitude
			}
		}
	}

	// Tier 3: Last resort - deterministic hash (rarely reached)
	// This should almost never happen - implies city doesn't exist
	// Hash function ensures coordinates are at least within India's bounds
	hash := 0
	for _, ch := range normalized + ":" + seed {
		hash = ((hash << 5) - hash) + int(ch)
	}
	if hash < 0 {
		hash = -hash
	}
	lat := 8.4 + float64(hash%2720)/100.0      // 8.4 to 35.6°N
	lon := 68.7 + float64((hash*7)%2855)/100.0 // 68.7 to 97.25°E
	return lat, lon
}

func (ts *TrackingService) approximateDistanceKm(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371.0
	toRad := func(deg float64) float64 { return deg * math.Pi / 180.0 }

	dLat := toRad(lat2 - lat1)
	dLon := toRad(lon2 - lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusKm * c
}
