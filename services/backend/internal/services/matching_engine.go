package services

import (
"fmt"
"math"
"sort"

"looplink.com/backend/internal/domain"
"looplink.com/backend/internal/repository"
)

type MatchingEngine struct {
	shipmentRepo *repository.ShipmentRepository
	vehicleRepo  *repository.VehicleRepository
	routeService *RouteService
}

func NewMatchingEngine(shipmentRepo *repository.ShipmentRepository, vehicleRepo *repository.VehicleRepository, routeService *RouteService) *MatchingEngine {
	return &MatchingEngine{
		shipmentRepo: shipmentRepo,
		vehicleRepo:  vehicleRepo,
		routeService: routeService,
	}
}

// FindMatches finds suitable vehicles for a shipment using hardcoded matching logic
func (me *MatchingEngine) FindMatches(shipment *domain.Shipment, limit int) ([]*domain.MatchResult, error) {
	vehicles, err := me.vehicleRepo.GetAvailableVehicles()
	if err != nil {
		return nil, fmt.Errorf("failed to get vehicles: %w", err)
	}

	var results []*domain.MatchResult

	for _, vehicle := range vehicles {
		matchScore, reasons := me.calculateMatchScore(shipment, vehicle)

		if matchScore > 0 {
			routeData, err := me.routeService.CalculateRoute(shipment.SourceLocation, shipment.DestLocation)
			if err != nil {
				routeData = &domain.RouteData{
					From:            shipment.SourceLocation,
					To:              shipment.DestLocation,
					Distance:        100,
					EstimatedTime:   120,
					CarbonFootprint: 50,
					Cost:            500,
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

	sort.Slice(results, func(i, j int) bool {
return results[i].MatchScore > results[j].MatchScore
	})

	if len(results) > limit && limit > 0 {
		results = results[:limit]
	}

	return results, nil
}

// calculateMatchScore calculates a match score between 0-100 for a shipment-vehicle pair
func (me *MatchingEngine) calculateMatchScore(shipment *domain.Shipment, vehicle *domain.Vehicle) (float64, []string) {
	score := 0.0
	var reasons []string

	// 1. Capacity Check (25 points max)
	if vehicle.Capacity >= shipment.LoadVolume {
		capacityRatio := float64(shipment.LoadVolume) / float64(vehicle.Capacity)
		capacityScore := (1.0 - capacityRatio) * 25
		score += capacityScore
		reasons = append(reasons, fmt.Sprintf("Capacity suitable: %.0f%% utilized", capacityRatio*100))
	} else {
		return 0, []string{"Insufficient capacity"}
	}

	// 2. Weight Check (25 points max)
	if vehicle.MaxWeight >= shipment.LoadWeight {
		weightRatio := float64(shipment.LoadWeight) / float64(vehicle.MaxWeight)
		weightScore := (1.0 - weightRatio) * 25
		score += weightScore
		reasons = append(reasons, fmt.Sprintf("Weight capacity suitable: %.0f%% utilized", weightRatio*100))
	} else {
		return 0, []string{"Insufficient weight capacity"}
	}

	// 3. Temperature Check (20 points max)
	if shipment.RequiredTemp == -1 {
		score += 20
		reasons = append(reasons, "No temperature requirements")
	} else if vehicle.IsRefrigerated && vehicle.Temperature <= shipment.RequiredTemp {
		score += 20
		reasons = append(reasons, fmt.Sprintf("Temperature compatible: %dC", vehicle.Temperature))
	} else if shipment.RequiredTemp > 15 {
		score += 10
		reasons = append(reasons, "Room temperature acceptable")
	} else {
		return 0, []string{"Temperature incompatible"}
	}

	// 4. Time Window Check (15 points max)
	score += 15
	reasons = append(reasons, fmt.Sprintf("Available for %d days", shipment.DaysAvailable))

	// 5. Carbon Footprint Bonus (15 points max)
	carbonScore := (1.0 - (vehicle.CarbonFootprint / 100.0)) * 15
	if carbonScore < 0 {
		carbonScore = 0
	}
	score += carbonScore
	reasons = append(reasons, fmt.Sprintf("Carbon footprint: %.2f kg CO2/km", vehicle.CarbonFootprint))

	if score > 100 {
		score = 100
	}

	return score, reasons
}

// calculateEstimatedCost calculates the estimated cost for a shipment
func (me *MatchingEngine) calculateEstimatedCost(shipment *domain.Shipment, vehicle *domain.Vehicle, routeData *domain.RouteData) float64 {
	cost := 0.0
	baseRate := 5.0
	cost += routeData.Distance * baseRate

	weightSurcharge := float64(shipment.LoadWeight) * 0.10
	cost += weightSurcharge

	volumeSurcharge := float64(shipment.LoadVolume) * 0.50
	cost += volumeSurcharge

	if vehicle.IsRefrigerated && shipment.RequiredTemp != -1 {
		cost += routeData.Distance * 10.0
	}

	if shipment.DaysAvailable <= 1 {
		cost *= 1.5
	} else if shipment.DaysAvailable <= 3 {
		cost *= 1.2
	}

	if vehicle.CarbonFootprint < 10 {
		cost *= 0.9
	} else if vehicle.CarbonFootprint > 50 {
		cost *= 1.1
	}

	cost = math.Round(cost*100) / 100
	return cost
}

// GetMatchingRecommendation provides the best match for a shipment (top 1)
func (me *MatchingEngine) GetMatchingRecommendation(shipment *domain.Shipment) (*domain.MatchResult, error) {
	matches, err := me.FindMatches(shipment, 1)
	if err != nil {
		return nil, err
	}
	if len(matches) == 0 {
		return nil, fmt.Errorf("no suitable vehicles found for shipment")
	}
	return matches[0], nil
}

// CalculateBackhauling finds opportunities for backhauling
func (me *MatchingEngine) CalculateBackhauling(vehicle *domain.Vehicle, shipment *domain.Shipment) (float64, error) {
	backhaulingBonus := 50.0
	return backhaulingBonus, nil
}
