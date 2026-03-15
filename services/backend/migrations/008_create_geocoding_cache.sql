-- 008: Geocoding Cache Table
CREATE TABLE IF NOT EXISTS geocoding_cache (
    id VARCHAR(36) PRIMARY KEY,
    city_name VARCHAR(255) NOT NULL UNIQUE,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'nominatim',
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_geocoding_cache_city ON geocoding_cache(city_name);
