package services

import (
	"math"

	"looplink.com/backend/internal/domain"
)

type PricingService struct{}

func NewPricingService() *PricingService {
	return &PricingService{}
}

// CalculatePricing calculates itemized pricing for a shipment-vehicle match
func (ps *PricingService) CalculatePricing(shipment *domain.Shipment, vehicle *domain.Vehicle, distance float64) *domain.PricingBreak {
	// Base rate: ₹5 per km
	baseRate := 5.0

	// Distance cost
	distanceCost := baseRate * distance

	// Refrigeration cost: ₹2 per km if temperature controlled required
	refriCost := 0.0
	if shipment.RequiredTemp != -1 && vehicle.IsRefrigerated {
		refriCost = 2.0 * distance
	}

	// Deviation cost: simplified estimate
	deviationCost := 0.0
	// (In real system, would calculate based on route optimization)
	if distance > 500 { // Long distance
		deviationCost = 500.0
	}

	total := distanceCost + refriCost + deviationCost

	return &domain.PricingBreak{
		BaseRate:             baseRate,
		Distance:             distance,
		DistanceCost:         distanceCost,
		RefrigerationCost:    refriCost,
		DeviationCost:        deviationCost,
		ConsolidationSavings: 0, // If consolidated, subtract savings
		Total:                total,
	}
}

// CalculateDetailedScore calculates match score using your formula:
// score = 0.30(route_overlap) + 0.25(temp_match) + 0.20(capacity_fit) + 0.15(time_match) + 0.10(distance_inverse)
func (ps *PricingService) CalculateDetailedScore(
	shipment *domain.Shipment,
	vehicle *domain.Vehicle,
	distance float64,
	estimatedTime int,
) *domain.ScoreDetails {

	// 1. Route Overlap Score (0-1)
	// Simplified: assume good overlap if within reasonable detour (weight: 0.30)
	routeOverlapScore := ps.calculateRouteOverlap(distance)

	// 2. Temperature Match (0-1)
	// Score 1 if match, 0.5 if vehicle can do it but not specialized, 0 if can't (weight: 0.25)
	tempMatchScore := ps.calculateTempMatch(shipment.RequiredTemp, vehicle.IsRefrigerated, vehicle.Temperature)

	// 3. Capacity Fit (0-1)
	// Score based on how well the load fits (weight: 0.20)
	capacityFitScore := ps.calculateCapacityFit(shipment.LoadVolume, shipment.LoadWeight, vehicle.Capacity, vehicle.MaxWeight)

	// 4. Time Window Match (0-1)
	// Score based on if delivery can be done within time constraint (weight: 0.15)
	timeMatchScore := ps.calculateTimeMatch(estimatedTime, shipment.DaysAvailable)

	// 5. Distance Deviation Inverse (0-1)
	// Lower distance deviation = higher score (weight: 0.10)
	distanceDeviationScore := ps.calculateDistanceDeviation(distance)

	// Final weighted score
	finalScore := 0.30*routeOverlapScore +
		0.25*tempMatchScore +
		0.20*capacityFitScore +
		0.15*timeMatchScore +
		0.10*distanceDeviationScore

	return &domain.ScoreDetails{
		RouteOverlap:      routeOverlapScore,
		TempMatch:         tempMatchScore,
		CapacityFit:       capacityFitScore,
		TimeMatch:         timeMatchScore,
		DistanceDeviation: distanceDeviationScore,
		FinalScore:        math.Min(1.0, math.Max(0.0, finalScore)), // Clamp to 0-1
	}
}

// calculateRouteOverlap returns score based on distance efficiency
// Ideal is shortest path (distance = ideal), higher deviation lowers score
func (ps *PricingService) calculateRouteOverlap(distance float64) float64 {
	// Assume ideal distance for most routes is 300km
	// Score decreases as distance increases beyond ideal
	idealDistance := 300.0
	if distance <= idealDistance {
		return 1.0
	}
	// Penalize longer routes
	ratio := idealDistance / distance
	return math.Max(0.3, ratio) // Minimum 0.3 even for very long routes
}

// calculateTempMatch checks temperature compatibility
func (ps *PricingService) calculateTempMatch(requiredTemp int, isRefrigerated bool, vehicleTemp int) float64 {
	// -1 means no refrigeration required
	if requiredTemp == -1 {
		return 1.0 // Any vehicle works
	}

	// Refrigeration required
	if !isRefrigerated {
		return 0.0 // Vehicle can't handle it
	}

	// Vehicle is refrigerated, check if temperature range matches
	tempDiff := math.Abs(float64(requiredTemp - vehicleTemp))
	if tempDiff <= 2 {
		return 1.0 // Perfect match
	} else if tempDiff <= 5 {
		return 0.8 // Good match
	} else if tempDiff <= 10 {
		return 0.5 // Acceptable
	}
	return 0.2 // Poor match
}

// calculateCapacityFit scores how well the load fits the vehicle
func (ps *PricingService) calculateCapacityFit(loadVolume, loadWeight int, vehicleCapacity, vehicleMaxWeight int) float64 {
	// Both volume and weight must fit
	if loadVolume > vehicleCapacity || loadWeight > vehicleMaxWeight {
		return 0.0 // Doesn't fit
	}

	// Score based on utilization (ideal is 60-80% utilization)
	volumeRatio := float64(loadVolume) / float64(vehicleCapacity)
	weightRatio := float64(loadWeight) / float64(vehicleMaxWeight)

	// Average utilization
	avgUtilization := (volumeRatio + weightRatio) / 2.0

	// Score is highest at 70% utilization
	switch {
	case avgUtilization < 0.3:
		return 0.5 // Wasting space
	case avgUtilization <= 0.7:
		return 0.8 + (avgUtilization-0.3)*0.28 // 0.8-1.0
	default:
		return math.Max(0.6, 1.0-((avgUtilization-0.7)*0.5)) // Above 70%, slight penalty
	}
}

// calculateTimeMatch scores whether shipment can deliver within time window
func (ps *PricingService) calculateTimeMatch(estimatedTimeMinutes, daysAvailable int) float64 {
	estimatedDays := float64(estimatedTimeMinutes) / (24 * 60) // Convert to days

	if estimatedDays <= float64(daysAvailable) {
		return 1.0 // Plenty of time
	}

	// Penalize if exceeds time window
	// But allow some flexibility
	overageRatio := estimatedDays / float64(daysAvailable)
	if overageRatio <= 1.2 { // 20% overage allowed
		return 0.7
	} else if overageRatio <= 1.5 {
		return 0.4
	}
	return 0.0 // Too much time needed
}

// calculateDistanceDeviation scores based on detour distance
// Lower is better (less deviation = higher score)
func (ps *PricingService) calculateDistanceDeviation(distance float64) float64 {
	// Assume typical route would be 300km for inter-city
	optimalDistance := 300.0

	if distance <= optimalDistance {
		return 1.0 // Direct route
	}

	// Score decreases as detour increases
	deviationPercent := (distance - optimalDistance) / optimalDistance
	score := 1.0 - math.Min(0.8, deviationPercent)
	return math.Max(0.2, score)
}
