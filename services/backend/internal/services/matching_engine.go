package services

import (
	"fmt"
	"math"
	"sort"

	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
)

type MatchingEngine struct {
	shipmentRepo          *repository.ShipmentRepository
	vehicleRepo           *repository.VehicleRepository
	routeService          *RouteService
	clusteringService     *ClusteringService
	consolidationService  *ConsolidationService
	costAllocationService *CostAllocationService
}

func NewMatchingEngine(shipmentRepo *repository.ShipmentRepository, vehicleRepo *repository.VehicleRepository, routeService *RouteService) *MatchingEngine {
	return &MatchingEngine{
		shipmentRepo:          shipmentRepo,
		vehicleRepo:           vehicleRepo,
		routeService:          routeService,
		clusteringService:     NewClusteringService(),
		consolidationService:  NewConsolidationService(),
		costAllocationService: NewCostAllocationService(),
	}
}

// FindMatches finds suitable vehicles for a shipment with consolidation options
// Now considers geo-clustering and multi-shipment consolidation
func (me *MatchingEngine) FindMatches(shipment *domain.Shipment, limit int) ([]*domain.MatchResult, error) {
	vehicles, err := me.vehicleRepo.GetAvailableVehicles()
	if err != nil {
		return nil, fmt.Errorf("failed to get vehicles: %w", err)
	}

	var results []*domain.MatchResult

	// Step 1: Find consolidation opportunities (multi-shipment trips)
	allShipments, err := me.shipmentRepo.GetPendingShipments()
	if err == nil && len(allShipments) > 1 {
		consolidatedTrips := me.consolidationService.FindConsolidationOpportunities(allShipments, vehicles)

		// Add consolidation results to matches
		for _, trip := range consolidatedTrips {
			// Check if our target shipment is in this trip
			found := false
			for _, s := range trip.Shipments {
				if s.ID == shipment.ID {
					found = true
					break
				}
			}

			if found && len(trip.Shipments) > 1 {
				// Multi-shipment match
				vehicle := me.findVehicleByID(vehicles, trip.VehicleID)
				if vehicle != nil {
					matchScore := me.calculateConsolidationScore(trip, len(trip.Shipments))
					reasons := []string{
						fmt.Sprintf("Consolidated with %d other shipments", len(trip.Shipments)-1),
						fmt.Sprintf("Savings: ₹%.0f (%.1f%%)", trip.SavingsPercent*trip.EstimatedCost/100, trip.SavingsPercent),
						fmt.Sprintf("Utilization: %.1f%%", float64(trip.TotalVolume)/27.0*100),
					}

					result := &domain.MatchResult{
						VehicleID:       vehicle.ID,
						DriverID:        vehicle.DriverID,
						MatchScore:      matchScore,
						EstimatedCost:   trip.CostPerShipment,
						EstimatedTime:   trip.EstimatedTime,
						CarbonFootprint: trip.RouteDistance * 0.15,
						Reasons:         reasons,
					}
					results = append(results, result)
				}
			}
		}
	}

	// Step 2: Find solo shipment matches with individual vehicles
	for _, vehicle := range vehicles {
		matchScore, reasons := me.calculateMatchScore(shipment, vehicle)

		if matchScore > 0 {
			routeData, err := me.routeService.CalculateRoute(shipment.SourceLocation, shipment.DestLocation)
			if err != nil {
				// Fallback with improved estimation
				routeData = &domain.RouteData{
					From:            shipment.SourceLocation,
					To:              shipment.DestLocation,
					Distance:        300.0, // More realistic estimate
					EstimatedTime:   360,   // 6 hours
					CarbonFootprint: 69.0,  // More realistic
					Cost:            1500.0,
				}
			}

			estimatedCost := me.calculateEstimatedCost(shipment, vehicle, routeData)

			result := &domain.MatchResult{
				VehicleID:       vehicle.ID,
				DriverID:        vehicle.DriverID,
				MatchScore:      matchScore,
				EstimatedCost:   estimatedCost,
				EstimatedTime:   routeData.EstimatedTime,
				CarbonFootprint: routeData.CarbonFootprint,
				Reasons:         reasons,
			}
			results = append(results, result)
		}
	}

	// Sort by match score (consolidated trips will likely score higher due to savings)
	sort.Slice(results, func(i, j int) bool {
		return results[i].MatchScore > results[j].MatchScore
	})

	if len(results) > limit && limit > 0 {
		results = results[:limit]
	}

	return results, nil
}

// calculateMatchScore calculates a match score between 0-100 for a shipment-vehicle pair
// Improved with geo-clustering and corridor awareness
func (me *MatchingEngine) calculateMatchScore(shipment *domain.Shipment, vehicle *domain.Vehicle) (float64, []string) {
	score := 0.0
	var reasons []string

	// 1. Capacity Check (20 points max)
	if vehicle.Capacity >= shipment.LoadVolume {
		capacityRatio := float64(shipment.LoadVolume) / float64(vehicle.Capacity)
		capacityScore := (1.0 - capacityRatio) * 20
		score += capacityScore
		reasons = append(reasons, fmt.Sprintf("Capacity: %.0f%% utilized", capacityRatio*100))
	} else {
		return 0, []string{"Insufficient capacity"}
	}

	// 2. Weight Check (20 points max)
	if vehicle.MaxWeight >= shipment.LoadWeight {
		weightRatio := float64(shipment.LoadWeight) / float64(vehicle.MaxWeight)
		weightScore := (1.0 - weightRatio) * 20
		score += weightScore
		reasons = append(reasons, fmt.Sprintf("Weight: %.0f%% utilized", weightRatio*100))
	} else {
		return 0, []string{"Insufficient weight capacity"}
	}

	// 3. Temperature Compatibility (25 points max)
	if shipment.RequiredTemp == -1 {
		score += 25
		reasons = append(reasons, "No temp requirement")
	} else if vehicle.IsRefrigerated && vehicle.Temperature <= shipment.RequiredTemp {
		score += 25
		reasons = append(reasons, fmt.Sprintf("Temp match: %dC", vehicle.Temperature))
	} else if shipment.RequiredTemp > 15 {
		score += 12
		reasons = append(reasons, "Room temperature acceptable")
	} else {
		return 0, []string{"Temperature incompatible"}
	}

	// 4. Geo/Corridor Match (20 points max)
	corridor := me.clusteringService.FindBestCorridorMatch(shipment)
	if corridor != nil {
		score += 20
		reasons = append(reasons, fmt.Sprintf("On corridor: %s→%s", corridor.OriginCity, corridor.DestCity))
	} else {
		score += 5
		reasons = append(reasons, "Off-corridor route")
	}

	// 5. Carbon Footprint Bonus (15 points max)
	carbonScore := math.Max(0, (1.0-(vehicle.CarbonFootprint/100.0))*15)
	score += carbonScore
	reasons = append(reasons, fmt.Sprintf("Carbon: %.2f kg/km", vehicle.CarbonFootprint))

	if score > 100 {
		score = 100
	}

	return score, reasons
}

// calculateEstimatedCost calculates the estimated cost for a shipment
// Improved with actual route data and consolidation consideration
func (me *MatchingEngine) calculateEstimatedCost(shipment *domain.Shipment, vehicle *domain.Vehicle, routeData *domain.RouteData) float64 {
	cost := 0.0

	// Base trip cost
	baseCost := 5000.0

	// Distance-based cost (5 INR/km baseline for cold chain)
	distanceCost := routeData.Distance * 5.0

	// Weight surcharge (0.10 INR/kg)
	weightCost := float64(shipment.LoadWeight) * 0.10

	// Volume surcharge (50 INR/m3)
	volumeCost := float64(shipment.LoadVolume) * 50.0

	// Refrigeration surcharge
	tempCost := 0.0
	if vehicle.IsRefrigerated && shipment.RequiredTemp != -1 {
		tempCost = routeData.Distance * 10.0
	}

	// Time sensitivity multiplier
	timeMultiplier := 1.0
	if shipment.DaysAvailable <= 1 {
		timeMultiplier = 1.5 // 50% premium for same-day
	} else if shipment.DaysAvailable <= 3 {
		timeMultiplier = 1.2 // 20% premium for 3-day
	} else if shipment.DaysAvailable >= 7 {
		timeMultiplier = 0.9 // 10% discount for flexible
	}

	// Vehicle eco-bonus
	ecoMultiplier := 1.0
	if vehicle.CarbonFootprint < 10 {
		ecoMultiplier = 0.95 // 5% discount for eco vehicles
	} else if vehicle.CarbonFootprint > 50 {
		ecoMultiplier = 1.05 // 5% premium for high-carbon
	}

	// Calculate total
	cost = (baseCost + distanceCost + weightCost + volumeCost + tempCost) * timeMultiplier * ecoMultiplier
	cost = math.Round(cost*100) / 100

	return cost
}

// GetMatchingRecommendation provides the best match for a shipment (top 1)
// Now prioritizes consolidations that provide cost savings
func (me *MatchingEngine) GetMatchingRecommendation(shipment *domain.Shipment) (*domain.MatchResult, error) {
	matches, err := me.FindMatches(shipment, 5)
	if err != nil {
		return nil, err
	}
	if len(matches) == 0 {
		return nil, fmt.Errorf("no suitable vehicles found for shipment")
	}

	// Return top match (highest score)
	return matches[0], nil
}

// CalculateBackhauling finds opportunities for backhauling with real route analysis
func (me *MatchingEngine) CalculateBackhauling(vehicle *domain.Vehicle, shipment *domain.Shipment) (float64, error) {
	// Get other available shipments
	allShipments, err := me.shipmentRepo.GetPendingShipments()
	if err != nil {
		return 0, err
	}

	// Find backhauling opportunities
	opportunities := me.costAllocationService.FindBackhaulOpportunities(
		&ConsolidatedTrip{
			VehicleID:     vehicle.ID,
			DriverID:      vehicle.DriverID,
			Shipments:     []*domain.Shipment{shipment},
			DeliveryRoute: []Stop{{Location: shipment.DestLocation}},
		},
		allShipments,
		[]*domain.Vehicle{vehicle},
	)

	if len(opportunities) > 0 {
		// Return the revenue from the best backhaul opportunity
		best := opportunities[0]
		return best.BachhaulRevenue, nil
	}

	return 0, nil
}

// calculateConsolidationScore calculates match score for consolidated trips
// Considers savings, vehicle utilization, and feasibility
func (me *MatchingEngine) calculateConsolidationScore(trip *ConsolidatedTrip, shipmentCount int) float64 {
	score := 0.0

	// Base score for multi-shipment consolidation
	score += float64(math.Min(float64(shipmentCount-1)*15, 30))

	// Savings bonus (up to 30 points)
	savingsBonus := (trip.SavingsPercent / 100.0) * 30.0
	score += savingsBonus

	// Vehicle utilization bonus (up to 25 points)
	utilization := float64(trip.TotalVolume) / 27.0
	if utilization > 1.0 {
		utilization = 1.0
	}
	score += utilization * 25.0

	// Routing complexity bonus
	switch trip.RoutingComplexity {
	case "simple":
		score += 10
	case "moderate":
		score += 5
	case "complex":
		score -= 5
	}

	// Feasibility adjustment
	switch trip.Feasibility {
	case "confirmed":
		score += 10
	case "likely":
		score += 5
	case "uncertain":
		score -= 10
	}

	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}

	return score
}

// findVehicleByID finds a vehicle in the list by ID
func (me *MatchingEngine) findVehicleByID(vehicles []*domain.Vehicle, id string) *domain.Vehicle {
	for _, v := range vehicles {
		if v.ID == id {
			return v
		}
	}
	return nil
}
