-- 007_create_knowledge_base.sql
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

CREATE INDEX idx_knowledge_base_shipment_id ON knowledge_base(shipment_id);
CREATE INDEX idx_knowledge_base_vehicle_id ON knowledge_base(vehicle_id);
CREATE INDEX idx_knowledge_base_match_score ON knowledge_base(match_score);
