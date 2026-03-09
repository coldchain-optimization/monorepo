package repository

import (
	"database/sql"
	"fmt"

	"looplink.com/backend/internal/domain"
)

type ConsignmentRepository struct {
	db *sql.DB
}

func NewConsignmentRepository(db *sql.DB) *ConsignmentRepository {
	return &ConsignmentRepository{db: db}
}

func (r *ConsignmentRepository) CreateConsignment(c *domain.Consignment) error {
	query := `
		INSERT INTO consignments (id, shipment_id, source_location, destination_location, load_weight, load_volume, extra_time, bonus_money, estimated_detour_km, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err := r.db.Exec(query, c.ID, c.ShipmentID, c.SourceLocation, c.DestLocation, c.LoadWeight, c.LoadVolume, c.ExtraTime, c.BonusMoney, c.EstimatedDetourKm, c.CreatedAt, c.UpdatedAt)
	return err
}

func (r *ConsignmentRepository) GetConsignmentByID(id string) (*domain.Consignment, error) {
	consignment := &domain.Consignment{}
	query := `
		SELECT id, shipment_id, source_location, destination_location, load_weight, load_volume, extra_time, bonus_money, estimated_detour_km, created_at, updated_at
		FROM consignments WHERE id = $1
	`
	err := r.db.QueryRow(query, id).Scan(&consignment.ID, &consignment.ShipmentID, &consignment.SourceLocation, &consignment.DestLocation, &consignment.LoadWeight, &consignment.LoadVolume, &consignment.ExtraTime, &consignment.BonusMoney, &consignment.EstimatedDetourKm, &consignment.CreatedAt, &consignment.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("consignment not found")
		}
		return nil, err
	}
	return consignment, nil
}

func (r *ConsignmentRepository) GetConsignmentsByShipmentID(shipmentID string) ([]*domain.Consignment, error) {
	query := `
		SELECT id, shipment_id, source_location, destination_location, load_weight, load_volume, extra_time, bonus_money, estimated_detour_km, created_at, updated_at
		FROM consignments WHERE shipment_id = $1 ORDER BY created_at ASC
	`
	rows, err := r.db.Query(query, shipmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var consignments []*domain.Consignment
	for rows.Next() {
		c := &domain.Consignment{}
		err := rows.Scan(&c.ID, &c.ShipmentID, &c.SourceLocation, &c.DestLocation, &c.LoadWeight, &c.LoadVolume, &c.ExtraTime, &c.BonusMoney, &c.EstimatedDetourKm, &c.CreatedAt, &c.UpdatedAt)
		if err != nil {
			return nil, err
		}
		consignments = append(consignments, c)
	}
	return consignments, rows.Err()
}

func (r *ConsignmentRepository) UpdateConsignment(c *domain.Consignment) error {
	query := `
		UPDATE consignments 
		SET source_location = $1, destination_location = $2, load_weight = $3, load_volume = $4, extra_time = $5, bonus_money = $6, estimated_detour_km = $7, updated_at = $8
		WHERE id = $9
	`
	_, err := r.db.Exec(query, c.SourceLocation, c.DestLocation, c.LoadWeight, c.LoadVolume, c.ExtraTime, c.BonusMoney, c.EstimatedDetourKm, c.UpdatedAt, c.ID)
	return err
}

func (r *ConsignmentRepository) DeleteConsignment(id string) error {
	query := `DELETE FROM consignments WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
