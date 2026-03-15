package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"looplink.com/backend/internal/domain"
)

// CitiesHandler handles city-related API endpoints
type CitiesHandler struct{}

// NewCitiesHandler creates a new cities handler
func NewCitiesHandler() *CitiesHandler {
	return &CitiesHandler{}
}

// GetAllCities returns all curated Indian cities with their coordinates
// Returns: { "cities": [ { "name": "Mumbai", "latitude": 19.0760, "longitude": 72.8777, "state": "Maharashtra", "aliases": [...] }, ... ] }
func (ch *CitiesHandler) GetAllCities(c *gin.Context) {
	cities := make([]map[string]interface{}, 0)

	// Convert the curated cities map to slices for JSON response
	for _, city := range domain.CuratedIndianCities {
		cities = append(cities, map[string]interface{}{
			"name":      city.Name,
			"latitude":  city.Latitude,
			"longitude": city.Longitude,
			"state":     city.State,
			"aliases":   city.Aliases,
			"verified":  city.Verified,
			"source":    city.Source,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"total_cities": len(cities),
		"cities":       cities,
	})
}

// ResolveCity resolves a city name to coordinates
// Query param: ?city=Mumbai
// Returns: { "name": "Mumbai", "latitude": 19.0760, "longitude": 72.8777, "state": "Maharashtra" }
func (ch *CitiesHandler) ResolveCity(c *gin.Context) {
	cityName := strings.TrimSpace(c.Query("city"))
	if cityName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "city name required"})
		return
	}

	normalized := strings.ToLower(cityName)

	// Try exact match on city key
	if city, exists := domain.CuratedIndianCities[normalized]; exists {
		c.JSON(http.StatusOK, gin.H{
			"name":      city.Name,
			"latitude":  city.Latitude,
			"longitude": city.Longitude,
			"state":     city.State,
			"aliases":   city.Aliases,
			"verified":  city.Verified,
			"source":    city.Source,
		})
		return
	}

	// Try matching aliases
	for _, city := range domain.CuratedIndianCities {
		for _, alias := range city.Aliases {
			if strings.ToLower(alias) == normalized {
				c.JSON(http.StatusOK, gin.H{
					"name":      city.Name,
					"latitude":  city.Latitude,
					"longitude": city.Longitude,
					"state":     city.State,
					"aliases":   city.Aliases,
					"verified":  city.Verified,
					"source":    city.Source,
				})
				return
			}
		}
	}

	// City not found
	c.JSON(http.StatusNotFound, gin.H{
		"error":   "city not found in database",
		"city":    cityName,
		"message": "Please check the spelling or use an alternative name",
	})
}

// SearchCities searches for cities matching a pattern
// Query param: ?q=nash (returns cities containing "nash", case-insensitive)
// Returns: { "results": [ { "name": "Nashik", "latitude": 19.9975, "longitude": 75.3458, ... }, ... ] }
func (ch *CitiesHandler) SearchCities(c *gin.Context) {
	query := strings.ToLower(strings.TrimSpace(c.Query("q")))
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search query required"})
		return
	}

	results := make([]map[string]interface{}, 0)

	for _, city := range domain.CuratedIndianCities {
		// Match city name
		if strings.Contains(strings.ToLower(city.Name), query) {
			results = append(results, map[string]interface{}{
				"name":      city.Name,
				"latitude":  city.Latitude,
				"longitude": city.Longitude,
				"state":     city.State,
				"aliases":   city.Aliases,
			})
			continue
		}

		// Match aliases
		for _, alias := range city.Aliases {
			if strings.Contains(strings.ToLower(alias), query) {
				results = append(results, map[string]interface{}{
					"name":      city.Name,
					"latitude":  city.Latitude,
					"longitude": city.Longitude,
					"state":     city.State,
					"aliases":   city.Aliases,
				})
				break
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"query":   query,
		"count":   len(results),
		"results": results,
	})
}
