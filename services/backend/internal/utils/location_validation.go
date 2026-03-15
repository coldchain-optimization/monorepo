package utils

import (
	"fmt"
	"math"
)

const EarthRadiusKm = 6371.0

// LocationValidation provides location-based validation utilities
type LocationValidation struct {
	SourceLat       float64
	SourceLon       float64
	DestLat         float64
	DestLon         float64
	AllowedRadiusKm float64
}

// NewLocationValidation creates a new LocationValidation instance
func NewLocationValidation(srcLat, srcLon, dstLat, dstLon, radiusKm float64) *LocationValidation {
	return &LocationValidation{
		SourceLat:       srcLat,
		SourceLon:       srcLon,
		DestLat:         dstLat,
		DestLon:         dstLon,
		AllowedRadiusKm: radiusKm,
	}
}

// CalculateDistance calculates distance between two coordinates using Haversine formula
// Returns distance in kilometers
func CalculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	toRad := func(deg float64) float64 { return deg * math.Pi / 180.0 }

	dLat := toRad(lat2 - lat1)
	dLon := toRad(lon2 - lon1)

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(toRad(lat1))*math.Cos(toRad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return EarthRadiusKm * c
}

// IsWithinSourceLocation checks if driver is within allowed radius of source
func (lv *LocationValidation) IsWithinSourceLocation(driverLat, driverLon float64) bool {
	distance := CalculateDistance(driverLat, driverLon, lv.SourceLat, lv.SourceLon)
	return distance <= lv.AllowedRadiusKm
}

// IsWithinDestinationLocation checks if driver is within allowed radius of destination
func (lv *LocationValidation) IsWithinDestinationLocation(driverLat, driverLon float64) bool {
	distance := CalculateDistance(driverLat, driverLon, lv.DestLat, lv.DestLon)
	return distance <= lv.AllowedRadiusKm
}

// GetDistanceToSource returns distance to source in km
func (lv *LocationValidation) GetDistanceToSource(driverLat, driverLon float64) float64 {
	return CalculateDistance(driverLat, driverLon, lv.SourceLat, lv.SourceLon)
}

// GetDistanceToDestination returns distance to destination in km
func (lv *LocationValidation) GetDistanceToDestination(driverLat, driverLon float64) float64 {
	return CalculateDistance(driverLat, driverLon, lv.DestLat, lv.DestLon)
}

// ValidatePickup validates pickup location and returns error if invalid
func (lv *LocationValidation) ValidatePickup(driverLat, driverLon float64) error {
	if !lv.IsWithinSourceLocation(driverLat, driverLon) {
		distance := lv.GetDistanceToSource(driverLat, driverLon)
		return fmt.Errorf("pickup not allowed: driver is %.2f km from source (allowed: %.1f km)", distance, lv.AllowedRadiusKm)
	}
	return nil
}

// ValidateDelivery validates delivery location and returns error if invalid
func (lv *LocationValidation) ValidateDelivery(driverLat, driverLon float64) error {
	if !lv.IsWithinDestinationLocation(driverLat, driverLon) {
		distance := lv.GetDistanceToDestination(driverLat, driverLon)
		return fmt.Errorf("delivery not allowed: driver is %.2f km from destination (allowed: %.1f km)", distance, lv.AllowedRadiusKm)
	}
	return nil
}
