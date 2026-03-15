package repository

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type GeocodingCacheRepository struct {
	db *sql.DB
}

func NewGeocodingCacheRepository(db *sql.DB) *GeocodingCacheRepository {
	return &GeocodingCacheRepository{db: db}
}

// GetCoordinates retrieves cached coordinates for a city
func (r *GeocodingCacheRepository) GetCoordinates(cityName string) (float64, float64, error) {
	var lat, lon float64
	query := `
		SELECT latitude, longitude FROM geocoding_cache 
		WHERE city_name = $1
		LIMIT 1
	`
	err := r.db.QueryRow(query, cityName).Scan(&lat, &lon)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, 0, fmt.Errorf("city not found in cache: %s", cityName)
		}
		return 0, 0, err
	}
	return lat, lon, nil
}

// CacheCoordinates stores coordinates for a city in the database
func (r *GeocodingCacheRepository) CacheCoordinates(cityName string, latitude, longitude float64) error {
	id := uuid.New().String()
	query := `
		INSERT INTO geocoding_cache (id, city_name, latitude, longitude, source, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (city_name) DO UPDATE SET
			latitude = EXCLUDED.latitude,
			longitude = EXCLUDED.longitude,
			updated_at = EXCLUDED.updated_at
	`
	_, err := r.db.Exec(query, id, cityName, latitude, longitude, "nominatim", time.Now(), time.Now())
	return err
}

// DeleteCache removes a cached entry for a city
func (r *GeocodingCacheRepository) DeleteCache(cityName string) error {
	query := `DELETE FROM geocoding_cache WHERE city_name = $1`
	_, err := r.db.Exec(query, cityName)
	return err
}

// ClearAll removes all cached entries (useful for testing)
func (r *GeocodingCacheRepository) ClearAll() error {
	query := `DELETE FROM geocoding_cache`
	_, err := r.db.Exec(query)
	return err
}
