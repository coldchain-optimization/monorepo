package services

import (
	"math"

	"looplink.com/backend/internal/domain"
)

type RouteService struct {
	// Can integrate with Google Maps API later
	// TODO: Add Google Maps API client
	// TODO: Add traffic layer service
	// TODO: Add weather API integration
	clusteringService *ClusteringService
}

func NewRouteService() *RouteService {
	return &RouteService{
		clusteringService: NewClusteringService(),
	}
}

// CalculateRoute calculates route information between two locations
// Currently uses hardcoded corridor data and mock calculation
// TODO: Integrate with Google Maps Distance Matrix API
// TODO: Add real traffic layer data for estimated time calculation
// TODO: Implement carbon emission API integration
func (rs *RouteService) CalculateRoute(from, to string) (*domain.RouteData, error) {
	// Extract coordinates
	fromLat, fromLng := extractLatLng(from)
	toLat, toLng := extractLatLng(to)

	// Calculate approximate distance using Haversine formula
	distance := rs.haversineDistance(fromLat, fromLng, toLat, toLng)

	// Estimate time based on average speed (40 km/h for cold chain logistics)
	estimatedTime := int(math.Ceil(distance / 40.0 * 60.0))

	// Calculate carbon footprint
	// Average: 2.3 kg CO2 per liter of diesel, ~5 liters per 100 km for reefer trucks
	carbonFootprint := distance * (5.0 / 100.0) * 2.3

	// Calculate base cost
	baseCost := distance * 5.0 // 5 INR per km

	// Add refrigeration cost if distance > 200 km
	if distance > 200 {
		baseCost += distance * 0.5 // Additional cost for long hauls
	}

	// Check if this matches known corridors for better estimation
	corridor := rs.findCorridor(from, to)
	if corridor != nil {
		distance = corridor.Distance
		estimatedTime = corridor.AverageTime
		carbonFootprint = distance * 0.15 // Adjusted for known corridor
		baseCost = distance * 4.5         // Slightly better rate for known routes
	}

	routeData := &domain.RouteData{
		From:            from,
		To:              to,
		Distance:        distance,
		EstimatedTime:   estimatedTime,
		CarbonFootprint: carbonFootprint,
		Cost:            baseCost,
	}

	return routeData, nil
}

// GetOptimalRoute finds the most efficient route considering multiple factors
// TODO: Implement Vehicle Routing Problem (VRP) solver for multi-stop optimization
// TODO: Add support for time window constraints
// TODO: Integrate real-time traffic data
// TODO: Add weather avoidance routing (monsoon seasons in India)
func (rs *RouteService) GetOptimalRoute(from, to string, preferences map[string]interface{}) (*domain.RouteData, error) {
	routeData, err := rs.CalculateRoute(from, to)
	if err != nil {
		return nil, err
	}

	// Apply preferences if provided
	if preferences != nil {
		// TODO: Process preferences like "avoid_highways", "minimize_toll", "prefer_cold_chain_hubs"
		// For now, just return basic route
	}

	return routeData, nil
}

// OptimizeMultiStopRoute finds the best sequence for multiple delivery/pickup stops
// TODO: This is critical for consolidation engine and needs proper VRP solver
// Current: Simple nearest-neighbor heuristic
// Needed: Implement Christofides algorithm or use external solver (OR-Tools, VROOM)
func (rs *RouteService) OptimizeMultiStopRoute(stops []map[string]interface{}) (*domain.RouteData, error) {
	// TODO: Implement proper multi-stop optimization
	// This involves solving Traveling Salesman Problem (TSP) or Vehicle Routing Problem (VRP)
	// For now, return sum of individual legs

	if len(stops) < 2 {
		return &domain.RouteData{
			Distance:      0,
			EstimatedTime: 0,
		}, nil
	}

	totalDistance := 0.0
	totalTime := 0

	// Simple nearest neighbor approach (non-optimal)
	for i := 0; i < len(stops)-1; i++ {
		fromStop := stops[i]
		toStop := stops[i+1]

		from, ok := fromStop["location"].(string)
		if !ok {
			continue
		}
		to, ok := toStop["location"].(string)
		if !ok {
			continue
		}

		routeData, err := rs.CalculateRoute(from, to)
		if err != nil {
			continue
		}

		totalDistance += routeData.Distance
		totalTime += routeData.EstimatedTime
	}

	return &domain.RouteData{
		Distance:      totalDistance,
		EstimatedTime: totalTime,
	}, nil
}

// haversineDistance calculates distance between two geographic points in km
func (rs *RouteService) haversineDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371.0 // Earth radius in km

	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLng := (lng2 - lng1) * math.Pi / 180.0

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180.0)*math.Cos(lat2*math.Pi/180.0)*
			math.Sin(dLng/2)*math.Sin(dLng/2)

	c := 2.0 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	distance := R * c

	return distance
}

// findCorridor checks if route matches a known corridor
func (rs *RouteService) findCorridor(from, to string) *Corridor {
	corridors := rs.clusteringService.corridors

	for _, corridor := range corridors {
		// Check if from/to match corridor endpoints (forward or reverse)
		if (from == corridor.OriginCity && to == corridor.DestCity) ||
			(from == corridor.DestCity && to == corridor.OriginCity) {
			return corridor
		}

		// TODO: Add fuzzy matching for nearby cities
		// For example, "Nashik Region" should match "Nashik"
	}

	return nil
}
