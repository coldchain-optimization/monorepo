package services

import (
	"fmt"
	"math"

	"looplink.com/backend/internal/domain"
)

// CostAllocationService handles fair cost distribution for consolidated shipments
type CostAllocationService struct {
	consolidationService *ConsolidationService
}

// ShipmentCostAllocation represents the allocated cost for a single shipment
type ShipmentCostAllocation struct {
	ShipmentID       string
	IndividualCost   float64 // Cost if shipped alone
	ConsolidatedCost float64 // Cost when consolidated with others
	Savings          float64 // Absolute savings in INR
	SavingsPercent   float64 // Percentage savings
	Allocation       CostBreakdown
}

// CostBreakdown shows how the consolidated cost is split
type CostBreakdown struct {
	BaseCost           float64 // Base trip cost divided among shipments
	DistanceCost       float64 // Per-km cost based on distance
	WeightCost         float64 // Per-kg surcharge
	VolumeCost         float64 // Per-m3 surcharge
	TemperatureCost    float64 // Refrigeration surcharge if applicable
	ConsolidationBonus float64 // Discount applied (negative value)
}

// BackhaulOpportunity represents a return load opportunity
type BackhaulOpportunity struct {
	ID                  string
	Vehicle             *domain.Vehicle
	OriginTrip          *ConsolidatedTrip
	BackhaulShipments   []*domain.Shipment
	OriginDestination   string
	BackhaulOrigin      string
	BackhaulDestination string
	OriginalCost        float64 // Cost without backhaul
	BackhauledCost      float64 // Cost with backhaul revenue
	BachhaulRevenue     float64 // Income from backhaul leg
	UtilizationGain     float64 // Percentage increase in capacity utilization
	Feasibility         string  // high, medium, low
}

// NewCostAllocationService initializes the cost allocation service
func NewCostAllocationService() *CostAllocationService {
	return &CostAllocationService{
		consolidationService: NewConsolidationService(),
	}
}

// AllocateCostsShapley implements Shapley value-inspired fair cost distribution
// This version uses a simplified approach suitable for real-time calculation
func (cas *CostAllocationService) AllocateCostsShapley(
	trip *ConsolidatedTrip,
) []*ShipmentCostAllocation {
	if len(trip.Shipments) == 0 {
		return []*ShipmentCostAllocation{}
	}

	allocations := make([]*ShipmentCostAllocation, len(trip.Shipments))

	// For solo shipments, simple allocation
	if len(trip.Shipments) == 1 {
		s := trip.Shipments[0]
		allocations[0] = &ShipmentCostAllocation{
			ShipmentID:       s.ID,
			IndividualCost:   s.EstimatedCost,
			ConsolidatedCost: trip.EstimatedCost,
			Savings:          0,
			SavingsPercent:   0,
			Allocation:       cas.calculateCostBreakdown(s, trip.EstimatedCost, 1),
		}
		return allocations
	}

	// For multiple shipments, use Shapley-inspired approach
	// Each shipment's value = what it contributes by being in the trip

	totalSavings := 0.0
	for _, s := range trip.Shipments {
		totalSavings += s.EstimatedCost
	}
	totalSavings -= trip.EstimatedCost // Actual savings from consolidation

	// Calculate contribution weight for each shipment based on its characteristics
	weights := cas.calculateShapleyWeights(trip.Shipments)

	for i, s := range trip.Shipments {
		weight := weights[i]

		// Allocate consolidated cost based on weight
		allocation := &ShipmentCostAllocation{
			ShipmentID:       s.ID,
			IndividualCost:   s.EstimatedCost,
			ConsolidatedCost: trip.EstimatedCost * weight, // Weighted share
			Allocation:       cas.calculateCostBreakdown(s, trip.EstimatedCost*weight, weight),
		}

		// Calculate savings
		allocation.Savings = allocation.IndividualCost - allocation.ConsolidatedCost
		if allocation.IndividualCost > 0 {
			allocation.SavingsPercent = (allocation.Savings / allocation.IndividualCost) * 100.0
		}

		allocations[i] = allocation
	}

	return allocations
}

// calculateShapleyWeights computes contribution weights for each shipment
// Weights sum to 1.0
func (cas *CostAllocationService) calculateShapleyWeights(shipments []*domain.Shipment) []float64 {
	weights := make([]float64, len(shipments))

	// Weight based on:
	// - Volume contribution (40%)
	// - Weight contribution (35%)
	// - Temperature requirement (15%)
	// - Urgency/time window (10%)

	totalVolume := 0
	totalWeight := 0

	for _, s := range shipments {
		totalVolume += s.LoadVolume
		totalWeight += s.LoadWeight
	}

	urgencyScores := cas.calculateUrgencyScores(shipments)
	maxUrgency := 0.0
	for _, score := range urgencyScores {
		if score > maxUrgency {
			maxUrgency = score
		}
	}

	for i, s := range shipments {
		volumeWeight := float64(s.LoadVolume) / float64(totalVolume) * 0.40
		weightWeight := float64(s.LoadWeight) / float64(totalWeight) * 0.35

		tempWeight := 0.0
		if s.RequiredTemp != -1 {
			tempWeight = 0.15
		}

		urgencyWeight := 0.0
		if maxUrgency > 0 {
			urgencyWeight = (urgencyScores[i] / maxUrgency) * 0.10
		}

		weights[i] = volumeWeight + weightWeight + tempWeight + urgencyWeight
	}

	// Normalize weights to sum to 1.0
	totalWeightFloat := 0.0
	for _, w := range weights {
		totalWeightFloat += w
	}

	if totalWeightFloat > 0 {
		for i := range weights {
			weights[i] = weights[i] / totalWeightFloat
		}
	}

	return weights
}

// calculateCostBreakdown itemizes the cost components for a shipment
func (cas *CostAllocationService) calculateCostBreakdown(
	shipment *domain.Shipment,
	allocatedCost float64,
	weight float64,
) CostBreakdown {
	breakdown := CostBreakdown{}

	// Base cost allocation (fixed component divided by weight)
	breakdown.BaseCost = 5000.0 * weight

	// Distance-based cost
	breakdown.DistanceCost = allocatedCost * 0.35

	// Weight surcharge
	breakdown.WeightCost = float64(shipment.LoadWeight) * 0.10

	// Volume surcharge
	breakdown.VolumeCost = float64(shipment.LoadVolume) * 50.0 * weight

	// Temperature surcharge
	if shipment.RequiredTemp != -1 {
		breakdown.TemperatureCost = allocatedCost * 0.15
	}

	// Consolidation bonus (negative = discount)
	if weight < 1.0 { // Only for consolidated shipments
		breakdown.ConsolidationBonus = allocatedCost * -0.15
	}

	return breakdown
}

// calculateUrgencyScores rates shipments by time sensitivity
func (cas *CostAllocationService) calculateUrgencyScores(shipments []*domain.Shipment) []float64 {
	scores := make([]float64, len(shipments))

	for i, s := range shipments {
		windowDays := s.DaysAvailable
		score := 0.0

		if windowDays <= 1 {
			score = 100.0 // Very urgent
		} else if windowDays <= 3 {
			score = 75.0 // Moderately urgent
		} else if windowDays <= 7 {
			score = 50.0 // Standard
		} else {
			score = 25.0 // Flexible
		}

		scores[i] = score
	}

	return scores
}

// FindBackhaulOpportunities identifies return load possibilities
func (cas *CostAllocationService) FindBackhaulOpportunities(
	completedTrip *ConsolidatedTrip,
	availableShipments []*domain.Shipment,
	availableVehicles []*domain.Vehicle,
) []*BackhaulOpportunity {
	var opportunities []*BackhaulOpportunity

	if len(completedTrip.Shipments) == 0 {
		return opportunities
	}

	// Vehicle ends at the final delivery location
	vehicleCurrentLocation := completedTrip.DeliveryRoute[len(completedTrip.DeliveryRoute)-1].Location

	// Find shipments that originate near the vehicle's end location
	for _, vehicle := range availableVehicles {
		if vehicle.ID != completedTrip.VehicleID {
			continue
		}

		for _, backhaul := range availableShipments {
			// Backhaul candidate should start where vehicle ends
			distance := cas.calculateLocationDistance(vehicleCurrentLocation, backhaul.SourceLocation)

			// Within 50km is reasonable for picking up backhaul
			if distance < 50 {
				opportunity := cas.evaluateBackhaulOpportunity(
					vehicle,
					completedTrip,
					backhaul,
					vehicleCurrentLocation,
				)
				if opportunity.Feasibility != "impossible" {
					opportunities = append(opportunities, opportunity)
				}
			}
		}
	}

	return opportunities
}

// evaluateBackhaulOpportunity assesses feasibility of a backhaul load
func (cas *CostAllocationService) evaluateBackhaulOpportunity(
	vehicle *domain.Vehicle,
	originTrip *ConsolidatedTrip,
	backhaul *domain.Shipment,
	pickupLocation string,
) *BackhaulOpportunity {
	opp := &BackhaulOpportunity{
		ID:                  fmt.Sprintf("backhaul_%s_%s", vehicle.ID, backhaul.ID),
		Vehicle:             vehicle,
		OriginTrip:          originTrip,
		BackhaulShipments:   []*domain.Shipment{backhaul},
		OriginDestination:   originTrip.DeliveryRoute[len(originTrip.DeliveryRoute)-1].Location,
		BackhaulOrigin:      pickupLocation,
		BackhaulDestination: backhaul.DestLocation,
	}

	// Calculate cost scenario
	opp.OriginalCost = originTrip.EstimatedCost

	// With backhaul, vehicle doesn't deadhead back - reduces per-shipment cost
	backhaul_revenue := backhaul.EstimatedCost * 0.5 // Split 50-50
	opp.BachhaulRevenue = backhaul_revenue

	// Consolidated cost for both trips
	opp.BackhauledCost = opp.OriginalCost + (backhaul.EstimatedCost * 0.5)

	// Capacity utilization gain
	remainingCapacity := vehicle.Capacity - int(float64(originTrip.TotalVolume)*0.9)
	if remainingCapacity > 0 {
		utilizationGain := float64(backhaul.LoadVolume) / float64(remainingCapacity) * 100.0
		opp.UtilizationGain = math.Min(utilizationGain, 100)
	}

	// Assess feasibility
	opp.Feasibility = cas.assessBackhaulFeasibility(opp, vehicle)

	return opp
}

// assessBackhaulFeasibility checks if backhaul is viable
func (cas *CostAllocationService) assessBackhaulFeasibility(
	opp *BackhaulOpportunity,
	vehicle *domain.Vehicle,
) string {
	// Capacity check
	if opp.BackhaulShipments[0].LoadWeight+opp.OriginTrip.TotalWeight > vehicle.MaxWeight {
		return "impossible"
	}

	if opp.BackhaulShipments[0].LoadVolume+opp.OriginTrip.TotalVolume > vehicle.Capacity {
		return "impossible"
	}

	// Temperature compatibility
	originHasTemp := false
	backhaulHasTemp := false

	for _, s := range opp.OriginTrip.Shipments {
		if s.RequiredTemp != -1 {
			originHasTemp = true
		}
	}

	if opp.BackhaulShipments[0].RequiredTemp != -1 {
		backhaulHasTemp = true
	}

	// Can't mix cold and non-cold unseparated
	if originHasTemp && backhaulHasTemp && opp.OriginTrip.Shipments[0].RequiredTemp != opp.BackhaulShipments[0].RequiredTemp {
		return "low"
	}

	// Revenue check
	if opp.BachhaulRevenue > (opp.OriginalCost * 0.2) {
		return "high"
	} else if opp.BachhaulRevenue > (opp.OriginalCost * 0.1) {
		return "medium"
	}

	return "low"
}

// calculateLocationDistance finds distance between two locations
// Uses simplified Haversine if coordinates available, else uses hardcoded distances
func (cas *CostAllocationService) calculateLocationDistance(locA, locB string) float64 {
	lat1, lng1 := extractLatLng(locA)
	lat2, lng2 := extractLatLng(locB)

	if lat1 == 0 || lat2 == 0 {
		return 100.0 // Default fallback
	}

	const R = 6371.0
	dlat := (lat2 - lat1) * math.Pi / 180.0
	dlng := (lng2 - lng1) * math.Pi / 180.0

	a := math.Sin(dlat/2)*math.Sin(dlat/2) +
		math.Cos(lat1*math.Pi/180.0)*math.Cos(lat2*math.Pi/180.0)*
			math.Sin(dlng/2)*math.Sin(dlng/2)
	c := 2.0 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}
