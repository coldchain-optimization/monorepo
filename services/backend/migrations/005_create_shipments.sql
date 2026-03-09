-- 005_create_shipments.sql
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

CREATE INDEX idx_shipments_shipper_id ON shipments(shipper_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_assigned_vehicle ON shipments(assigned_vehicle);
