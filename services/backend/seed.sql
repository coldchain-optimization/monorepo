-- Seed data for LoopLink Cold Chain Optimization
-- Run this after running migrations: psql -U coldchain -d looplink -f seed.sql
-- Dev credentials are plain-text by design for local demo consistency.
-- Admin login: admin@looplink.com / admin123

-- Clear existing data (for demo purposes)
TRUNCATE TABLE knowledge_base CASCADE;
TRUNCATE TABLE consignments CASCADE;
TRUNCATE TABLE shipments CASCADE;
TRUNCATE TABLE vehicles CASCADE;
TRUNCATE TABLE drivers CASCADE;
TRUNCATE TABLE shippers CASCADE;
TRUNCATE TABLE users CASCADE;

-- Create test users
INSERT INTO users (id, email, password, first_name, last_name, role, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440999', 'admin@looplink.com', 'admin123', 'Admin', 'User', 'admin', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440000', 'driver1@looplink.com', 'driver123', 'Rajesh', 'Kumar', 'driver', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440001', 'driver2@looplink.com', 'driver123', 'Priya', 'Singh', 'driver', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'shipper1@looplink.com', 'shipper123', 'Amit', 'Patel', 'shipper', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'shipper2@looplink.com', 'shipper123', 'Neha', 'Gupta', 'shipper', NOW(), NOW());

-- Create drivers
INSERT INTO drivers (id, user_id, license_number, phone_number, rating, role, is_active, created_at, updated_at) VALUES
('650e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'DL1234567890', '+91 9876543210', 4.5, 'transporting_body', true, NOW(), NOW()),
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'DL0987654321', '+91 9876543211', 4.8, 'transporting_body', true, NOW(), NOW());

-- Create shippers
INSERT INTO shippers (id, user_id, company_name, company_address, phone_number, tax_id, created_at, updated_at) VALUES
('750e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'Fresh Farm Exports', '123 Agricultural Lane, Mumbai, Maharashtra', '+91 9876543212', 'GST123456789', NOW(), NOW()),
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'Cold Storage Solutions', '456 Industrial Road, Delhi, Delhi', '+91 9876543213', 'GST987654321', NOW(), NOW());

-- Create vehicles
INSERT INTO vehicles (id, driver_id, vehicle_type, license_plate, manufacturer, model, year, capacity, max_weight, is_refrigerated, temperature, fuel_type, carbon_footprint, is_available, current_location, created_at, updated_at) VALUES
('850e8400-e29b-41d4-a716-446655440000', '650e8400-e29b-41d4-a716-446655440000', 'Refrigerated Truck', 'KA01AB1234', 'Ashok Leyland', '2520 A', 2023, 5000, 10000, true, 4, 'Diesel', 50.5, true, 'Mumbai', NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440000', 'Cold Van', 'KA01CD5678', 'Mahindra', 'Bolero Pik-Up', 2022, 2000, 5000, true, 2, 'Diesel', 35.2, true, 'Mumbai', NOW(), NOW()),
('850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440001', 'Refrigerated Truck', 'DL01EF9012', 'Tata', 'ACE', 2023, 3500, 8000, true, 4, 'Diesel', 42.3, true, 'Delhi', NOW(), NOW());

-- Create shipments
INSERT INTO shipments (id, shipper_id, source_location, destination_location, load_weight, load_volume, load_type, required_temp, days_available, time_window_start, time_window_end, status, assigned_vehicle, estimated_cost, actual_cost, created_at, updated_at) VALUES
('950e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440000', 'Mumbai', 'Bangalore', 4500, 3000, 'Vegetables', 4, 2, NOW(), NOW() + INTERVAL '2 days', 'available', NULL, 15000.00, NULL, NOW(), NOW()),
('950e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440000', 'Pune', 'Delhi', 3000, 2000, 'Fruits', 5, 3, NOW(), NOW() + INTERVAL '3 days', 'available', NULL, 18000.00, NULL, NOW(), NOW()),
('950e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 'Delhi', 'Jaipur', 2500, 1800, 'Dairy', 2, 1, NOW(), NOW() + INTERVAL '1 day', 'available', NULL, 8000.00, NULL, NOW(), NOW()),
('950e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440001', 'Bangalore', 'Hyderabad', 4000, 2800, 'Seafood', 0, 2, NOW(), NOW() + INTERVAL '2 days', 'available', NULL, 12000.00, NULL, NOW(), NOW()),
('950e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440000', 'Chennai', 'Kochi', 3500, 2400, 'Vegetables', 4, 2, NOW(), NOW() + INTERVAL '2 days', 'available', NULL, 14000.00, NULL, NOW(), NOW());

-- Create consignments (sub-shipments)
INSERT INTO consignments (id, shipment_id, source_location, destination_location, load_weight, load_volume, extra_time, bonus_money, estimated_detour_km, created_at, updated_at) VALUES
('a50e8400-e29b-41d4-a716-446655440000', '950e8400-e29b-41d4-a716-446655440000', 'Mumbai', 'Pune', 1500, 1000, 2, 500.00, 100, NOW(), NOW()),
('a50e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440001', 'Pune', 'Nashik', 1000, 700, 1, 300.00, 80, NOW(), NOW()),
('a50e8400-e29b-41d4-a716-446655440002', '950e8400-e29b-41d4-a716-446655440002', 'Delhi', 'Agra', 1200, 800, 1, 400.00, 90, NOW(), NOW());

-- Create matching knowledge base entries
INSERT INTO knowledge_base (id, shipment_id, vehicle_id, match_score, estimated_cost, actual_cost, pricing_factor, time_factor, carbon_factor, route_metadata, created_at, updated_at) VALUES
('b50e8400-e29b-41d4-a716-446655440000', '950e8400-e29b-41d4-a716-446655440000', '850e8400-e29b-41d4-a716-446655440000', 0.92, 15000.00, NULL, 0.85, 0.95, 0.88, '{"route":"efficient","distance":1200}', NOW(), NOW()),
('b50e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 0.88, 18000.00, NULL, 0.90, 0.87, 0.90, '{"route":"good","distance":1400}', NOW(), NOW()),
('b50e8400-e29b-41d4-a716-446655440002', '950e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440002', 0.95, 8000.00, NULL, 0.92, 0.98, 0.91, '{"route":"optimal","distance":280}', NOW(), NOW()),
('b50e8400-e29b-41d4-a716-446655440003', '950e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440000', 0.85, 12000.00, NULL, 0.88, 0.82, 0.87, '{"route":"good","distance":650}', NOW(), NOW()),
('b50e8400-e29b-41d4-a716-446655440004', '950e8400-e29b-41d4-a716-446655440004', '850e8400-e29b-41d4-a716-446655440001', 0.90, 14000.00, NULL, 0.91, 0.93, 0.89, '{"route":"efficient","distance":750}', NOW(), NOW());

-- Verify data
SELECT COUNT(*) as users FROM users;
SELECT COUNT(*) as drivers FROM drivers;
SELECT COUNT(*) as shippers FROM shippers;
SELECT COUNT(*) as vehicles FROM vehicles;
SELECT COUNT(*) as shipments FROM shipments;
SELECT COUNT(*) as consignments FROM consignments;
SELECT COUNT(*) as knowledge_base FROM knowledge_base;

-- List all tables manually if needed using: \dt
