-- 004_create_vehicles.sql
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(36) PRIMARY KEY,
    driver_id VARCHAR(36) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    license_plate VARCHAR(50) UNIQUE NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    capacity INT NOT NULL,
    max_weight INT NOT NULL,
    is_refrigerated BOOLEAN DEFAULT false,
    temperature INT DEFAULT 20,
    fuel_type VARCHAR(50) NOT NULL,
    carbon_footprint DECIMAL(8,2) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    current_location VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
);

CREATE INDEX idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX idx_vehicles_is_available ON vehicles(is_available);
