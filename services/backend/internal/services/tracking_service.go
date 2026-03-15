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
	shipmentRepo *repository.ShipmentRepository
	vehicleRepo  *repository.VehicleRepository
}

func NewTrackingService(shipmentRepo *repository.ShipmentRepository, vehicleRepo *repository.VehicleRepository) *TrackingService {
	return &TrackingService{
		shipmentRepo: shipmentRepo,
		vehicleRepo:  vehicleRepo,
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
	known := map[string][2]float64{
		"mumbai":    {19.0760, 72.8777},
		"delhi":     {28.7041, 77.1025},
		"bengaluru": {12.9716, 77.5946},
		"bangalore": {12.9716, 77.5946},
		"kochi":     {9.9312, 76.2673},
		"cochin":    {9.9312, 76.2673},
		"hyderabad": {17.3850, 78.4867},
		"chennai":   {13.0827, 80.2707},
		"kolkata":   {22.5726, 88.3639},
		"pune":      {18.5204, 73.8567},
		"ahmedabad": {23.0225, 72.5714},
		"jaipur":    {26.9124, 75.7873},
		"indore":    {22.7196, 75.8577},
		"bhopal":    {23.2599, 77.4126},
		"lucknow":   {26.8467, 80.9462},
		"patna":     {25.5941, 85.1376},
		"surat":     {21.1702, 72.8311},
	}

	normalized := strings.ToLower(strings.TrimSpace(location))
	for city, coords := range known {
		if strings.Contains(normalized, city) {
			return coords[0], coords[1]
		}
	}

	// Deterministic fallback inside India-like bounds for unknown locations
	hash := 0
	for _, ch := range normalized + ":" + seed {
		hash = ((hash << 5) - hash) + int(ch)
	}
	if hash < 0 {
		hash = -hash
	}
	lat := 8.0 + float64(hash%2700)/100.0      // 8.00 - 35.00
	lon := 68.0 + float64((hash*7)%2900)/100.0 // 68.00 - 97.00
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
