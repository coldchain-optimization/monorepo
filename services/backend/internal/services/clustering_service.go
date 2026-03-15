package services

import (
	"fmt"
	"math"
	"sort"

	"looplink.com/backend/internal/domain"
)

// ClusteringService handles geo-spatial clustering of shipments
type ClusteringService struct {
	// Corridors define main routes in the system
	corridors []*Corridor
}

// Corridor represents a major route between waypoints
type Corridor struct {
	ID          string
	OriginCity  string
	DestCity    string
	OriginLat   float64
	OriginLng   float64
	DestLat     float64
	DestLng     float64
	Distance    float64 // km
	AverageTime int     // minutes
	CommonLoads []string
}

// ShipmentCluster groups multiple shipments that can be consolidated
type ShipmentCluster struct {
	ID                 string
	Corridor           *Corridor
	Shipments          []*domain.Shipment
	TotalWeight        int     // kg
	TotalVolume        int     // cubic meters
	ConsolidationScore float64 // 0-100, how well shipments fit together
	EstimatedSavings   float64 // cost savings from consolidation
	RoutingComplexity  string  // simple, moderate, complex
	PickupSequence     []*domain.Shipment
	DeliverySequence   []*domain.Shipment
}

// NewClusteringService initializes the clustering service with default corridors
func NewClusteringService() *ClusteringService {
	service := &ClusteringService{
		corridors: InitializeCorridors(),
	}
	return service
}

// InitializeCorridors sets up the main logistics corridors (extensible for future APIs)
func InitializeCorridors() []*Corridor {
	corridors := []*Corridor{
		{
			ID:          "nashik_delhi",
			OriginCity:  "Nashik",
			DestCity:    "Delhi",
			OriginLat:   19.9975,
			OriginLng:   73.7898,
			DestLat:     28.7041,
			DestLng:     77.1025,
			Distance:    1170,
			AverageTime: 1320, // 22 hours
			CommonLoads: []string{"cold_dairy", "fresh_produce", "vegetables"},
		},
		{
			ID:          "ratnagiri_mumbai",
			OriginCity:  "Ratnagiri",
			DestCity:    "Mumbai",
			OriginLat:   16.7633,
			OriginLng:   73.3167,
			DestLat:     19.0760,
			DestLng:     72.8777,
			Distance:    250,
			AverageTime: 360, // 6 hours
			CommonLoads: []string{"fresh_seafood", "coconut", "mangoes"},
		},
		{
			ID:          "pune_bangalore",
			OriginCity:  "Pune",
			DestCity:    "Bangalore",
			OriginLat:   18.5204,
			OriginLng:   73.8567,
			DestLat:     12.9716,
			DestLng:     77.5946,
			Distance:    560,
			AverageTime: 676, // 11 hours
			CommonLoads: []string{"pharmaceuticals", "vegetables", "dairy"},
		},
		{
			ID:          "surat_ahmedabad",
			OriginCity:  "Surat",
			DestCity:    "Ahmedabad",
			OriginLat:   21.1702,
			OriginLng:   72.8311,
			DestLat:     23.0225,
			DestLng:     72.5714,
			Distance:    270,
			AverageTime: 300, // 5 hours
			CommonLoads: []string{"textiles", "vegetables", "spices"},
		},
	}
	return corridors
}

// ClusterShipments groups shipments by geographic location and corridor matching
func (cs *ClusteringService) ClusterShipments(shipments []*domain.Shipment) []*ShipmentCluster {
	var clusters []*ShipmentCluster

	// Group shipments by matching corridors
	corridorMap := make(map[string][]*domain.Shipment)

	for _, shipment := range shipments {
		corridor := cs.FindBestCorridorMatch(shipment)
		if corridor != nil {
			corridorMap[corridor.ID] = append(corridorMap[corridor.ID], shipment)
		}
	}

	// Create clusters from grouped shipments
	for corridorID, shipmentsInCorridor := range corridorMap {
		if len(shipmentsInCorridor) > 0 {
			corridor := cs.GetCorridorByID(corridorID)
			cluster := cs.createCluster(corridor, shipmentsInCorridor)
			clusters = append(clusters, cluster)
		}
	}

	return clusters
}

// FindBestCorridorMatch finds the most suitable corridor for a shipment
func (cs *ClusteringService) FindBestCorridorMatch(shipment *domain.Shipment) *Corridor {
	bestCorridor := (*Corridor)(nil)
	bestScore := 0.0

	for _, corridor := range cs.corridors {
		score := cs.calculateCorridorMatchScore(shipment, corridor)
		if score > bestScore {
			bestScore = score
			bestCorridor = corridor
		}
	}

	// Only return corridor if match score is reasonable (>40%)
	if bestScore > 40 {
		return bestCorridor
	}
	return nil
}

// calculateCorridorMatchScore evaluates how well a shipment matches a corridor
func (cs *ClusteringService) calculateCorridorMatchScore(shipment *domain.Shipment, corridor *Corridor) float64 {
	score := 0.0

	// Location proximity (40% weight)
	shipLat1, shipLng1 := extractLatLng(shipment.SourceLocation)
	corrLat1, corrLng1 := extractLatLng(corridor.OriginCity)
	originDist := cs.calculateDistance(shipLat1, shipLng1, corrLat1, corrLng1)

	shipLat2, shipLng2 := extractLatLng(shipment.DestLocation)
	corrLat2, corrLng2 := extractLatLng(corridor.DestCity)
	destDist := cs.calculateDistance(shipLat2, shipLng2, corrLat2, corrLng2)

	// If within ~100km radius, good match
	if originDist < 100 && destDist < 100 {
		score += 40
	} else if originDist < 200 && destDist < 200 {
		score += 20
	}

	// Load type match (30% weight)
	for _, commonLoad := range corridor.CommonLoads {
		if shipment.LoadType == commonLoad {
			score += 30
			break
		}
	}

	// Time window compatibility (20% weight)
	if shipment.DaysAvailable >= 2 {
		score += 20
	} else if shipment.DaysAvailable == 1 {
		score += 10
	}

	// Temperature compatibility (10% weight)
	if shipment.RequiredTemp > -1 {
		score += 10
	}

	return score
}

// createCluster builds a consolidated shipment cluster
func (cs *ClusteringService) createCluster(corridor *Corridor, shipments []*domain.Shipment) *ShipmentCluster {
	cluster := &ShipmentCluster{
		ID:        fmt.Sprintf("cluster_%s_%d", corridor.ID, len(shipments)),
		Corridor:  corridor,
		Shipments: shipments,
	}

	// Calculate aggregate metrics
	for _, s := range shipments {
		cluster.TotalWeight += s.LoadWeight
		cluster.TotalVolume += s.LoadVolume
	}

	// Calculate consolidation score
	cluster.ConsolidationScore = cs.calculateClusterQuality(cluster)

	// Estimate savings from consolidation
	cluster.EstimatedSavings = cs.estimateConsolidationSavings(cluster)

	// Determine routing complexity
	cluster.RoutingComplexity = cs.assessRoutingComplexity(cluster)

	// Order shipments for efficient pickup and delivery
	cluster.PickupSequence = cs.optimizeSequence(shipments, true)
	cluster.DeliverySequence = cs.optimizeSequence(shipments, false)

	return cluster
}

// calculateClusterQuality scores how well shipments fit together (0-100)
func (cs *ClusteringService) calculateClusterQuality(cluster *ShipmentCluster) float64 {
	if len(cluster.Shipments) == 0 {
		return 0
	}

	score := 0.0

	// Basic quality from grouping (baseline)
	score = 40.0

	// Consolidation benefit (more shipments = higher score, but less if too many)
	if len(cluster.Shipments) >= 2 {
		score += float64(math.Min(float64(len(cluster.Shipments)-1)*10, 30))
	}

	// Weight utilization bonus (is truck reasonably full?)
	// Assuming average truck capacity of 15-20 tons and 25-30 m3
	weightUtilization := float64(cluster.TotalWeight) / 18000.0
	volumeUtilization := float64(cluster.TotalVolume) / 27.0

	avgUtilization := (weightUtilization + volumeUtilization) / 2.0
	if avgUtilization > 0.7 {
		score += 20.0
	} else if avgUtilization > 0.5 {
		score += 10.0
	}

	// Temperature compatibility penalty if mixed
	tempTypes := cs.countTemperatureTypes(cluster.Shipments)
	if tempTypes > 1 {
		score -= float64(tempTypes-1) * 5.0
	}

	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}

	return score
}

// estimateConsolidationSavings calculates cost savings from consolidating shipments
func (cs *ClusteringService) estimateConsolidationSavings(cluster *ShipmentCluster) float64 {
	if len(cluster.Shipments) <= 1 {
		return 0
	}

	// Baseline: cost per shipment
	individualCosts := 0.0
	for _, s := range cluster.Shipments {
		individualCosts += s.EstimatedCost
	}

	// Consolidated cost is roughly base cost + incremental
	// Base trip cost: 5000 INR
	// Per weight surcharge: 0.10 INR/kg
	// Per volume surcharge: 50 INR/m3
	// Multi-shipment consolidation discount: 15% off
	baseCost := 5000.0
	weightSurcharge := float64(cluster.TotalWeight) * 0.10
	volumeSurcharge := float64(cluster.TotalVolume) * 50.0
	consolidatedCost := (baseCost + weightSurcharge + volumeSurcharge) * 0.85

	savingsPerShipment := (individualCosts - consolidatedCost) / float64(len(cluster.Shipments))
	return savingsPerShipment
}

// assessRoutingComplexity evaluates how difficult the route is
func (cs *ClusteringService) assessRoutingComplexity(cluster *ShipmentCluster) string {
	pickupLocations := make(map[string]bool)
	deliveryLocations := make(map[string]bool)

	for _, s := range cluster.Shipments {
		pickupLocations[s.SourceLocation] = true
		deliveryLocations[s.DestLocation] = true
	}

	totalLocations := len(pickupLocations) + len(deliveryLocations)

	if totalLocations <= 3 {
		return "simple"
	} else if totalLocations <= 6 {
		return "moderate"
	}
	return "complex"
}

// optimizeSequence orders shipments for efficient routing (pickup or delivery)
func (cs *ClusteringService) optimizeSequence(shipments []*domain.Shipment, isPickup bool) []*domain.Shipment {
	// Simple ordering for now - sort by location name
	// In production, integrate with VRP solver
	sorted := make([]*domain.Shipment, len(shipments))
	copy(sorted, shipments)

	sort.Slice(sorted, func(i, j int) bool {
		var locI, locJ string
		if isPickup {
			locI = sorted[i].SourceLocation
			locJ = sorted[j].SourceLocation
		} else {
			locI = sorted[i].DestLocation
			locJ = sorted[j].DestLocation
		}
		return locI < locJ
	})

	return sorted
}

// GetCorridorByID retrieves a corridor by its ID
func (cs *ClusteringService) GetCorridorByID(id string) *Corridor {
	for _, corridor := range cs.corridors {
		if corridor.ID == id {
			return corridor
		}
	}
	return nil
}

// countTemperatureTypes counts distinct temperature requirements
func (cs *ClusteringService) countTemperatureTypes(shipments []*domain.Shipment) int {
	tempTypes := make(map[int]bool)
	for _, s := range shipments {
		if s.RequiredTemp != -1 {
			tempTypes[s.RequiredTemp] = true
		}
	}
	return len(tempTypes)
}

// calculateDistance calculates distance between two points using Haversine formula
// Returns distance in km
func (cs *ClusteringService) calculateDistance(lat1, lng1, lat2, lng2 float64) float64 {
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

// extractLatLng extracts coordinates from a location name
// In production, this would call a geocoding service
// For now, returns hardcoded coordinates for known cities
func extractLatLng(city string) (float64, float64) {
	cityCoords := map[string][2]float64{
		"Nashik":     {19.9975, 73.7898},
		"Delhi":      {28.7041, 77.1025},
		"Ratnagiri":  {16.7633, 73.3167},
		"Mumbai":     {19.0760, 72.8777},
		"Pune":       {18.5204, 73.8567},
		"Bangalore":  {12.9716, 77.5946},
		"Surat":      {21.1702, 72.8311},
		"Ahmedabad":  {23.0225, 72.5714},
		"Chennai":    {13.0827, 80.2707},
		"Kolkata":    {22.5726, 88.3639},
		"Hyderabad":  {17.3850, 78.4867},
		"Jaipur":     {26.9124, 75.7873},
		"Lucknow":    {26.8467, 80.9462},
		"Chandigarh": {30.7333, 76.7794},
		"Bhopal":     {23.1815, 79.9864},
	}

	if coords, exists := cityCoords[city]; exists {
		return coords[0], coords[1]
	}

	// Default fallback
	return 0, 0
}
