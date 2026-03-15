package services

import (
	"fmt"
	"math"
	"strings"

	"looplink.com/backend/internal/domain"
)

// ReverseGeocodingService converts coordinates back to nearest city
type ReverseGeocodingService struct {
	curatedCities map[string]domain.City
}

func NewReverseGeocodingService() *ReverseGeocodingService {
	return &ReverseGeocodingService{
		curatedCities: domain.CuratedIndianCities,
	}
}

// FindNearestCity finds the nearest curated city to given coordinates
// Returns city name, distance in km, and error if no nearby city found
func (rgs *ReverseGeocodingService) FindNearestCity(lat, lon float64, maxDistanceKm float64) (string, float64, error) {
	if maxDistanceKm <= 0 {
		maxDistanceKm = 50 // Default 50km search radius
	}

	var nearestCity string
	var nearestDistance = math.MaxFloat64

	for _, city := range rgs.curatedCities {
		distance := CalculateHaversineDistance(lat, lon, city.Latitude, city.Longitude)

		if distance < nearestDistance && distance <= maxDistanceKm {
			nearestDistance = distance
			nearestCity = city.Name
		}
	}

	if nearestCity == "" {
		return "", 0, fmt.Errorf("no city found within %.0f km of coordinates (%.4f, %.4f)", maxDistanceKm, lat, lon)
	}

	return nearestCity, nearestDistance, nil
}

// ValidateCoordinatesForCity checks if given coordinates are close to specified city
// Useful for verifying that a city name actually resolves to the expected location
func (rgs *ReverseGeocodingService) ValidateCoordinatesForCity(cityName string, lat, lon float64, toleranceKm float64) (bool, float64, error) {
	if toleranceKm <= 0 {
		toleranceKm = 5 // Default 5km tolerance
	}

	normalized := strings.ToLower(strings.TrimSpace(cityName))

	for _, city := range rgs.curatedCities {
		if strings.ToLower(city.Name) == normalized {
			distance := CalculateHaversineDistance(lat, lon, city.Latitude, city.Longitude)
			isValid := distance <= toleranceKm
			return isValid, distance, nil
		}

		// Check aliases
		for _, alias := range city.Aliases {
			if strings.ToLower(alias) == normalized {
				distance := CalculateHaversineDistance(lat, lon, city.Latitude, city.Longitude)
				isValid := distance <= toleranceKm
				return isValid, distance, nil
			}
		}
	}

	return false, 0, fmt.Errorf("city '%s' not found in curated database", cityName)
}

// CalculateHaversineDistance returns distance between two coordinates in kilometers
func CalculateHaversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKm = 6371.0
	toRad := func(deg float64) float64 { return deg * math.Pi / 180.0 }

	dLat := toRad(lat2 - lat1)
	dLon := toRad(lon2 - lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusKm * c
}

// GetNearestCities returns list of N nearest cities to given coordinates
func (rgs *ReverseGeocodingService) GetNearestCities(lat, lon float64, count int) []CityDistance {
	results := make([]CityDistance, 0)

	for _, city := range rgs.curatedCities {
		distance := CalculateHaversineDistance(lat, lon, city.Latitude, city.Longitude)
		results = append(results, CityDistance{
			Name:     city.Name,
			Distance: distance,
			State:    city.State,
		})
	}

	// Sort by distance (simple bubble sort for small datasets)
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[j].Distance < results[i].Distance {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	if count > len(results) {
		count = len(results)
	}

	return results[:count]
}

// CityDistance represents a city with its distance from a point
type CityDistance struct {
	Name     string
	Distance float64
	State    string
}
