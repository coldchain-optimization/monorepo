package services

import (
	"fmt"
	"sort"

	"looplink.com/backend/internal/domain"
)

// ConsolidationService matches shipments for consolidated trips
type ConsolidationService struct {
	clusteringService *ClusteringService
}

// ConsolidatedTrip represents a single trip with multiple shipments
type ConsolidatedTrip struct {
	ID                string
	VehicleID         string
	DriverID          string
	Shipments         []*domain.Shipment
	Consignments      []*domain.Consignment // intermediate stops
	TotalWeight       int
	TotalVolume       int
	PickupRoute       []Stop
	DeliveryRoute     []Stop
	EstimatedCost     float64
	CostPerShipment   float64
	IndividualCosts   []float64 // cost if shipped individually
	SavingsPercent    float64
	RouteDistance     float64
	EstimatedTime     int
	RoutingComplexity string // simple, moderate, complex
	Feasibility       string // confirmed, likely, uncertain
}

// Stop represents a pickup or delivery location in a route
type Stop struct {
	Location      string
	ShipmentID    string
	Latitude      float64
	Longitude     float64
	Weight        int
	Volume        int
	StopType      string // "pickup" or "delivery"
	SequenceOrder int
	ArrivalTime   int // minutes from start
}

// NewConsolidationService initializes the consolidation service
func NewConsolidationService() *ConsolidationService {
	return &ConsolidationService{
		clusteringService: NewClusteringService(),
	}
}

// FindConsolidationOpportunities identifies shipments that can be consolidated
func (cs *ConsolidationService) FindConsolidationOpportunities(
	shipments []*domain.Shipment,
	availableVehicles []*domain.Vehicle,
) []*ConsolidatedTrip {
	var trips []*ConsolidatedTrip

	// Cluster shipments by geography and characteristics
	clusters := cs.clusteringService.ClusterShipments(shipments)

	// For each cluster, find best vehicle match
	for _, cluster := range clusters {
		// Filter shipments by compatibility
		compatibleShipments := cs.filterCompatibleShipments(cluster.Shipments)
		if len(compatibleShipments) == 0 {
			continue
		}

		// Try to match with available vehicles
		for _, vehicle := range availableVehicles {
			if cs.canVehicleConsolidate(vehicle, compatibleShipments) {
				trip := cs.createConsolidatedTrip(vehicle, compatibleShipments, cluster)
				if trip.Feasibility != "impossible" {
					trips = append(trips, trip)
				}
			}
		}
	}

	// Sort by savings potential
	sort.Slice(trips, func(i, j int) bool {
		return trips[i].SavingsPercent > trips[j].SavingsPercent
	})

	return trips
}

// filterCompatibleShipments removes shipments with conflicting requirements
func (cs *ConsolidationService) filterCompatibleShipments(shipments []*domain.Shipment) []*domain.Shipment {
	if len(shipments) == 0 {
		return shipments
	}

	var compatible []*domain.Shipment

	// Temperature segregation: don't mix cold and non-cold loads
	referenceTemp := shipments[0].RequiredTemp
	for _, s := range shipments {
		if (referenceTemp == -1 && s.RequiredTemp == -1) ||
			(referenceTemp != -1 && s.RequiredTemp != -1) {
			compatible = append(compatible, s)
		}
	}

	return compatible
}

// canVehicleConsolidate checks if vehicle can handle multiple shipments
func (cs *ConsolidationService) canVehicleConsolidate(
	vehicle *domain.Vehicle,
	shipments []*domain.Shipment,
) bool {
	if !vehicle.IsAvailable {
		return false
	}

	// Check vehicle has required refrigeration
	for _, s := range shipments {
		if s.RequiredTemp != -1 && !vehicle.IsRefrigerated {
			return false
		}
	}

	// Check capacity
	totalWeight := 0
	totalVolume := 0
	for _, s := range shipments {
		totalWeight += s.LoadWeight
		totalVolume += s.LoadVolume
	}

	if totalWeight > vehicle.MaxWeight || totalVolume > vehicle.Capacity {
		return false
	}

	return true
}

// createConsolidatedTrip builds a consolidated trip structure
func (cs *ConsolidationService) createConsolidatedTrip(
	vehicle *domain.Vehicle,
	shipments []*domain.Shipment,
	cluster *ShipmentCluster,
) *ConsolidatedTrip {
	trip := &ConsolidatedTrip{
		ID:        fmt.Sprintf("trip_%s_%s", vehicle.ID, cluster.ID),
		VehicleID: vehicle.ID,
		DriverID:  vehicle.DriverID,
		Shipments: shipments,
	}

	// Calculate aggregate metrics
	for _, s := range shipments {
		trip.TotalWeight += s.LoadWeight
		trip.TotalVolume += s.LoadVolume
	}

	// Calculate route and costs
	trip.RouteDistance = cluster.Corridor.Distance
	trip.EstimatedTime = cluster.Corridor.AverageTime

	// Build pickup and delivery routes
	trip.PickupRoute = cs.buildRoute(cluster.PickupSequence, true)
	trip.DeliveryRoute = cs.buildRoute(cluster.DeliverySequence, false)

	// Calculate costs
	cs.calculateConsolidationCosts(trip, vehicle)

	// Assess feasibility
	trip.Feasibility = cs.assessConsolidationFeasibility(trip, cluster)

	return trip
}

// buildRoute constructs a sequence of stops for pickup or delivery
func (cs *ConsolidationService) buildRoute(shipments []*domain.Shipment, isPickup bool) []Stop {
	var route []Stop
	cumulativeTime := 0

	for i, s := range shipments {
		var location string
		if isPickup {
			location = s.SourceLocation
		} else {
			location = s.DestLocation
		}

		lat, lng := extractLatLng(location)

		stop := Stop{
			Location:      location,
			ShipmentID:    s.ID,
			Latitude:      lat,
			Longitude:     lng,
			Weight:        s.LoadWeight,
			Volume:        s.LoadVolume,
			SequenceOrder: i + 1,
			ArrivalTime:   cumulativeTime,
		}

		if isPickup {
			stop.StopType = "pickup"
			cumulativeTime += 15 // 15 min per pickup
		} else {
			stop.StopType = "delivery"
			cumulativeTime += 20 // 20 min per delivery
		}

		route = append(route, stop)
	}

	return route
}

// calculateConsolidationCosts computes consolidated vs individual costs
func (cs *ConsolidationService) calculateConsolidationCosts(
	trip *ConsolidatedTrip,
	vehicle *domain.Vehicle,
) {
	// Consolidated cost structure
	baseCost := 5000.0 // Base trip cost in INR

	// Variable costs
	distanceCost := trip.RouteDistance * 5.0       // 5 INR per km
	weightCost := float64(trip.TotalWeight) * 0.10 // 0.10 INR per kg
	volumeCost := float64(trip.TotalVolume) * 50.0 // 50 INR per m3

	// Temperature surcharge if refrigerated
	tempCost := 0.0
	for _, s := range trip.Shipments {
		if s.RequiredTemp != -1 {
			tempCost += trip.RouteDistance * 10.0
			break
		}
	}

	// Consolidation discount (15% for multi-shipment)
	consolidationDiscount := 1.0
	if len(trip.Shipments) > 1 {
		consolidationDiscount = 0.85 // 15% discount
	}

	trip.EstimatedCost = (baseCost + distanceCost + weightCost + volumeCost + tempCost) * consolidationDiscount
	trip.CostPerShipment = trip.EstimatedCost / float64(len(trip.Shipments))

	// Calculate individual costs for comparison
	for _, s := range trip.Shipments {
		// Each shipment individually would be shipped alone
		indivCost := (baseCost + s.EstimatedCost) // rough estimate
		trip.IndividualCosts = append(trip.IndividualCosts, indivCost)
	}

	// Calculate savings percentage
	totalIndividualCost := 0.0
	for _, cost := range trip.IndividualCosts {
		totalIndividualCost += cost
	}

	if totalIndividualCost > 0 {
		savings := totalIndividualCost - trip.EstimatedCost
		trip.SavingsPercent = (savings / totalIndividualCost) * 100.0
	}
}

// assessConsolidationFeasibility evaluates how realistic the consolidation is
func (cs *ConsolidationService) assessConsolidationFeasibility(
	trip *ConsolidatedTrip,
	cluster *ShipmentCluster,
) string {
	feasibility := "confirmed"

	// Check if all time windows overlap
	if !cs.timeWindowsOverlap(trip.Shipments) {
		feasibility = "uncertain"
	}

	// Check routing complexity
	if cluster.RoutingComplexity == "complex" {
		feasibility = "likely"
	}

	// Check if consolidation is worth it (at least 2 shipments or 20% savings)
	if len(trip.Shipments) < 2 && trip.SavingsPercent < 20 {
		feasibility = "uncertain"
	}

	// Check volume utilization
	utilization := float64(trip.TotalVolume) / 27.0
	if utilization < 0.3 {
		feasibility = "unlikely"
	}

	return feasibility
}

// timeWindowsOverlap checks if all shipment time windows have a common period
func (cs *ConsolidationService) timeWindowsOverlap(shipments []*domain.Shipment) bool {
	if len(shipments) == 0 {
		return false
	}

	// Find latest start and earliest end
	latestStart := shipments[0].TimeWindowStart
	earliestEnd := shipments[0].TimeWindowEnd

	for _, s := range shipments[1:] {
		if s.TimeWindowStart.After(latestStart) {
			latestStart = s.TimeWindowStart
		}
		if s.TimeWindowEnd.Before(earliestEnd) {
			earliestEnd = s.TimeWindowEnd
		}
	}

	return latestStart.Before(earliestEnd)
}

// GetConsolidationForShipment finds best consolidation option for a single shipment
func (cs *ConsolidationService) GetConsolidationForShipment(
	shipment *domain.Shipment,
	otherShipments []*domain.Shipment,
	availableVehicles []*domain.Vehicle,
) *ConsolidatedTrip {
	// Combine shipments
	allShipments := append([]*domain.Shipment{shipment}, otherShipments...)

	// Find consolidation opportunities
	trips := cs.FindConsolidationOpportunities(allShipments, availableVehicles)

	if len(trips) > 0 {
		// Return best option (highest savings)
		return trips[0]
	}

	return nil
}
