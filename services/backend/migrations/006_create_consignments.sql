-- 006_create_consignments.sql
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

CREATE INDEX idx_consignments_shipment_id ON consignments(shipment_id);
