package repository

import (
	"database/sql"
	"fmt"

	"looplink.com/backend/internal/domain"
)

type ShipmentRepository struct {
	db *sql.DB
}

func NewShipmentRepository(db *sql.DB) *ShipmentRepository {
	return &ShipmentRepository{db: db}
}

func (r *ShipmentRepository) CreateShipment(shipment *domain.Shipment) error {
	query := `
		INSERT INTO shipments (id, shipper_id, source_location, destination_location, load_weight, load_volume, load_type, required_temp, days_available, time_window_start, time_window_end, status, estimated_cost, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`
	_, err := r.db.Exec(query, shipment.ID, shipment.ShipperID, shipment.SourceLocation, shipment.DestLocation, shipment.LoadWeight, shipment.LoadVolume, shipment.LoadType, shipment.RequiredTemp, shipment.DaysAvailable, shipment.TimeWindowStart, shipment.TimeWindowEnd, shipment.Status, shipment.EstimatedCost, shipment.CreatedAt, shipment.UpdatedAt)
	return err
}

func (r *ShipmentRepository) GetShipmentByID(id string) (*domain.Shipment, error) {
	shipment := &domain.Shipment{}
	query := `
		SELECT id, shipper_id, source_location, destination_location, load_weight, load_volume, load_type, required_temp, days_available, time_window_start, time_window_end, status, COALESCE(assigned_vehicle, ''), COALESCE(estimated_cost, 0), COALESCE(actual_cost, 0), created_at, updated_at
		FROM shipments WHERE id = $1
	`
	err := r.db.QueryRow(query, id).Scan(&shipment.ID, &shipment.ShipperID, &shipment.SourceLocation, &shipment.DestLocation, &shipment.LoadWeight, &shipment.LoadVolume, &shipment.LoadType, &shipment.RequiredTemp, &shipment.DaysAvailable, &shipment.TimeWindowStart, &shipment.TimeWindowEnd, &shipment.Status, &shipment.AssignedVehicle, &shipment.EstimatedCost, &shipment.ActualCost, &shipment.CreatedAt, &shipment.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("shipment not found")
		}
		return nil, err
	}
	return shipment, nil
}

func (r *ShipmentRepository) GetShipmentsByShipperID(shipperID string) ([]*domain.Shipment, error) {
	query := `
		SELECT id, shipper_id, source_location, destination_location, load_weight, load_volume, load_type, required_temp, days_available, time_window_start, time_window_end, status, COALESCE(assigned_vehicle, ''), COALESCE(estimated_cost, 0), COALESCE(actual_cost, 0), created_at, updated_at
		FROM shipments WHERE shipper_id = $1 ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, shipperID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shipments []*domain.Shipment
	for rows.Next() {
		shipment := &domain.Shipment{}
		err := rows.Scan(&shipment.ID, &shipment.ShipperID, &shipment.SourceLocation, &shipment.DestLocation, &shipment.LoadWeight, &shipment.LoadVolume, &shipment.LoadType, &shipment.RequiredTemp, &shipment.DaysAvailable, &shipment.TimeWindowStart, &shipment.TimeWindowEnd, &shipment.Status, &shipment.AssignedVehicle, &shipment.EstimatedCost, &shipment.ActualCost, &shipment.CreatedAt, &shipment.UpdatedAt)
		if err != nil {
			return nil, err
		}
		shipments = append(shipments, shipment)
	}
	return shipments, rows.Err()
}

func (r *ShipmentRepository) UpdateShipment(shipment *domain.Shipment) error {
	query := `
		UPDATE shipments 
		SET shipper_id = $1, source_location = $2, destination_location = $3, load_weight = $4, load_volume = $5, load_type = $6, required_temp = $7, days_available = $8, time_window_start = $9, time_window_end = $10, status = $11, assigned_vehicle = $12, estimated_cost = $13, actual_cost = $14, updated_at = $15
		WHERE id = $16
	`
	_, err := r.db.Exec(query, shipment.ShipperID, shipment.SourceLocation, shipment.DestLocation, shipment.LoadWeight, shipment.LoadVolume, shipment.LoadType, shipment.RequiredTemp, shipment.DaysAvailable, shipment.TimeWindowStart, shipment.TimeWindowEnd, shipment.Status, shipment.AssignedVehicle, shipment.EstimatedCost, shipment.ActualCost, shipment.UpdatedAt, shipment.ID)
	return err
}

func (r *ShipmentRepository) DeleteShipment(id string) error {
	query := `DELETE FROM shipments WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *ShipmentRepository) GetAllShipments() ([]*domain.Shipment, error) {
	query := `
		SELECT id, shipper_id, source_location, destination_location, load_weight, load_volume, load_type, required_temp, days_available, time_window_start, time_window_end, status, COALESCE(assigned_vehicle, ''), COALESCE(estimated_cost, 0), COALESCE(actual_cost, 0), created_at, updated_at
		FROM shipments ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shipments []*domain.Shipment
	for rows.Next() {
		shipment := &domain.Shipment{}
		err := rows.Scan(&shipment.ID, &shipment.ShipperID, &shipment.SourceLocation, &shipment.DestLocation, &shipment.LoadWeight, &shipment.LoadVolume, &shipment.LoadType, &shipment.RequiredTemp, &shipment.DaysAvailable, &shipment.TimeWindowStart, &shipment.TimeWindowEnd, &shipment.Status, &shipment.AssignedVehicle, &shipment.EstimatedCost, &shipment.ActualCost, &shipment.CreatedAt, &shipment.UpdatedAt)
		if err != nil {
			return nil, err
		}
		shipments = append(shipments, shipment)
	}
	return shipments, rows.Err()
}

func (r *ShipmentRepository) GetPendingShipments() ([]*domain.Shipment, error) {
	query := `
		SELECT id, shipper_id, source_location, destination_location, load_weight, load_volume, load_type, required_temp, days_available, time_window_start, time_window_end, status, COALESCE(assigned_vehicle, ''), COALESCE(estimated_cost, 0), COALESCE(actual_cost, 0), created_at, updated_at
		FROM shipments WHERE status = $1 ORDER BY created_at ASC
	`
	rows, err := r.db.Query(query, domain.ShipmentPending)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shipments []*domain.Shipment
	for rows.Next() {
		shipment := &domain.Shipment{}
		err := rows.Scan(&shipment.ID, &shipment.ShipperID, &shipment.SourceLocation, &shipment.DestLocation, &shipment.LoadWeight, &shipment.LoadVolume, &shipment.LoadType, &shipment.RequiredTemp, &shipment.DaysAvailable, &shipment.TimeWindowStart, &shipment.TimeWindowEnd, &shipment.Status, &shipment.AssignedVehicle, &shipment.EstimatedCost, &shipment.ActualCost, &shipment.CreatedAt, &shipment.UpdatedAt)
		if err != nil {
			return nil, err
		}
		shipments = append(shipments, shipment)
	}
	return shipments, rows.Err()
}
