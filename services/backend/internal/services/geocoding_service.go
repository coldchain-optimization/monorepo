package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
)

type GeocodingService struct {
	httpClient     *http.Client
	cacheRepo      *repository.GeocodingCacheRepository
	photonURL      string
	nominatimURL   string
	requestTimeout time.Duration
	curatedCities  map[string]domain.City
}

type PhotonResult struct {
	Features []struct {
		Geometry struct {
			Coordinates [2]float64 `json:"coordinates"` // [lon, lat]
		} `json:"geometry"`
	} `json:"features"`
}

type NominatimResult struct {
	Lat string `json:"lat"`
	Lon string `json:"lon"`
}

func NewGeocodingService(cacheRepo *repository.GeocodingCacheRepository) *GeocodingService {
	return &GeocodingService{
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		cacheRepo:      cacheRepo,
		photonURL:      "https://photon.komoot.io/api",
		nominatimURL:   "https://nominatim.openstreetmap.org/search",
		requestTimeout: 5 * time.Second,
		curatedCities:  domain.CuratedIndianCities,
	}
}

// ResolveCity resolves a city name to latitude and longitude coordinates
// Priority: 1) Database cache (instant if cached), 2) Photon API, 3) Nominatim API, 4) Curated cities (fallback)
// This ensures complete coverage of any Indian city without manual additions
func (gs *GeocodingService) ResolveCity(cityName string) (float64, float64, error) {
	normalized := strings.ToLower(strings.TrimSpace(cityName))

	// Tier 1: Check database cache first (fastest if we've seen this city before)
	if gs.cacheRepo != nil {
		lat, lon, err := gs.cacheRepo.GetCoordinates(normalized)
		if err == nil {
			return lat, lon, nil
		}
	}

	// Tier 2: Try Photon API (faster, Komoot, better for city searches)
	lat, lon, err := gs.callPhoton(normalized)
	if err == nil {
		// Cache on success for future requests
		if gs.cacheRepo != nil {
			go gs.cacheRepo.CacheCoordinates(normalized, lat, lon)
		}
		return lat, lon, nil
	}

	// Tier 3: Fall back to Nominatim API if Photon fails
	lat, lon, err = gs.callNominatim(normalized)
	if err == nil {
		// Cache on success for future requests
		if gs.cacheRepo != nil {
			go gs.cacheRepo.CacheCoordinates(normalized, lat, lon)
		}
		return lat, lon, nil
	}

	// Tier 4: Emergency fallback to curated cities (only if APIs are down)
	// This ensures service works even when external APIs are unavailable
	for _, city := range gs.curatedCities {
		if strings.ToLower(city.Name) == normalized {
			if gs.cacheRepo != nil {
				go gs.cacheRepo.CacheCoordinates(normalized, city.Latitude, city.Longitude)
			}
			return city.Latitude, city.Longitude, nil
		}
		// Check aliases too
		for _, alias := range city.Aliases {
			if strings.ToLower(alias) == normalized {
				if gs.cacheRepo != nil {
					go gs.cacheRepo.CacheCoordinates(normalized, city.Latitude, city.Longitude)
				}
				return city.Latitude, city.Longitude, nil
			}
		}
	}

	return 0, 0, fmt.Errorf("unable to resolve city '%s' through any geocoding service", cityName)
}

// callPhoton queries the Photon API (Komoot) which is faster than Nominatim
// Photon is based on Nominatim data but optimized for city/street searches
func (gs *GeocodingService) callPhoton(cityName string) (float64, float64, error) {
	// Photon API: https://photon.komoot.io/
	url := fmt.Sprintf("%s?q=%s&limit=1&osm_tag=place:city,place:town,place:village",
		gs.photonURL,
		strings.ReplaceAll(cityName, " ", "+"))

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to create Photon request: %w", err)
	}

	// Photon doesn't require User-Agent but good practice
	req.Header.Set("User-Agent", "LoopLink-Backend/1.0")

	resp, err := gs.httpClient.Do(req)
	if err != nil {
		return 0, 0, fmt.Errorf("Photon API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return 0, 0, fmt.Errorf("Photon API returned status %d: %s", resp.StatusCode, string(body))
	}

	var result PhotonResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return 0, 0, fmt.Errorf("failed to parse Photon response: %w", err)
	}

	if len(result.Features) == 0 {
		return 0, 0, fmt.Errorf("no results found from Photon for city: %s", cityName)
	}

	// Photon returns [longitude, latitude]
	lon := result.Features[0].Geometry.Coordinates[0]
	lat := result.Features[0].Geometry.Coordinates[1]

	return lat, lon, nil
}

// callNominatim makes a request to the Nominatim API (fallback)
func (gs *GeocodingService) callNominatim(cityName string) (float64, float64, error) {
	// Add country filter to improve accuracy for Indian cities
	query := fmt.Sprintf("%s, India", cityName)
	url := fmt.Sprintf("%s?q=%s&format=json&limit=1", gs.nominatimURL, strings.ReplaceAll(query, " ", "+"))

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return 0, 0, fmt.Errorf("failed to create Nominatim request: %w", err)
	}

	req.Header.Set("User-Agent", "LoopLink-Backend/1.0")

	resp, err := gs.httpClient.Do(req)
	if err != nil {
		return 0, 0, fmt.Errorf("Nominatim API request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return 0, 0, fmt.Errorf("Nominatim API returned status %d: %s", resp.StatusCode, string(body))
	}

	var results []NominatimResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return 0, 0, fmt.Errorf("failed to parse Nominatim response: %w", err)
	}

	if len(results) == 0 {
		return 0, 0, fmt.Errorf("no results found for city: %s", cityName)
	}

	// Parse latitude and longitude from string format
	var lat, lon float64
	if _, err := fmt.Sscanf(results[0].Lat, "%f", &lat); err != nil {
		return 0, 0, fmt.Errorf("invalid latitude format: %s", results[0].Lat)
	}
	if _, err := fmt.Sscanf(results[0].Lon, "%f", &lon); err != nil {
		return 0, 0, fmt.Errorf("invalid longitude format: %s", results[0].Lon)
	}

	return lat, lon, nil
}
