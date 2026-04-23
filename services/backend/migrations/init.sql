-- init.sql - Combined migration script for PostgreSQL
-- Run all migrations in order

-- 001: Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 002: Shippers
CREATE TABLE IF NOT EXISTS shippers (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    company_name VARCHAR(255) NOT NULL,
    company_address TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    tax_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_shippers_user_id ON shippers(user_id);

-- 003: Drivers
CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0.0,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_license_number ON drivers(license_number);

-- 004: Vehicles
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
CREATE INDEX IF NOT EXISTS idx_vehicles_driver_id ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_available ON vehicles(is_available);

-- 005: Shipments
CREATE TABLE IF NOT EXISTS shipments (
    id VARCHAR(36) PRIMARY KEY,
    shipper_id VARCHAR(36) NOT NULL,
    source_location VARCHAR(255) NOT NULL,
    destination_location VARCHAR(255) NOT NULL,
    load_weight INT NOT NULL,
    load_volume INT NOT NULL,
    load_type VARCHAR(100) NOT NULL,
    required_temp INT DEFAULT -1,
    days_available INT NOT NULL,
    time_window_start TIMESTAMP NOT NULL,
    time_window_end TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    assigned_vehicle VARCHAR(36),
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (shipper_id) REFERENCES shippers(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_vehicle) REFERENCES vehicles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_shipments_shipper_id ON shipments(shipper_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_assigned_vehicle ON shipments(assigned_vehicle);

-- 006: Consignments
CREATE TABLE IF NOT EXISTS consignments (
    id VARCHAR(36) PRIMARY KEY,
    shipment_id VARCHAR(36) NOT NULL,
    source_location VARCHAR(255) NOT NULL,
    destination_location VARCHAR(255) NOT NULL,
    load_weight INT NOT NULL,
    load_volume INT NOT NULL,
    extra_time INT NOT NULL,
    bonus_money DECIMAL(10,2),
    estimated_detour_km INT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_consignments_shipment_id ON consignments(shipment_id);

-- 007: Knowledge Base
CREATE TABLE IF NOT EXISTS knowledge_base (
    id VARCHAR(36) PRIMARY KEY,
    shipment_id VARCHAR(36) NOT NULL,
    vehicle_id VARCHAR(36) NOT NULL,
    match_score DECIMAL(5,2) NOT NULL,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    pricing_factor DECIMAL(5,2),
    time_factor DECIMAL(5,2),
    carbon_factor DECIMAL(5,2),
    route_metadata TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_shipment_id ON knowledge_base(shipment_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_vehicle_id ON knowledge_base(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_match_score ON knowledge_base(match_score);

-- 009: Tracking History
CREATE TABLE IF NOT EXISTS tracking_history (
    id VARCHAR(36) PRIMARY KEY,
    shipment_id VARCHAR(36) NOT NULL,
    vehicle_id VARCHAR(36) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tracking_history_shipment_id ON tracking_history(shipment_id);
CREATE INDEX IF NOT EXISTS idx_tracking_history_vehicle_id ON tracking_history(vehicle_id);
