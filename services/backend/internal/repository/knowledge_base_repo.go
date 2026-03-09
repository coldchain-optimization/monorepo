package repository

import (
	"database/sql"
	"fmt"

	"looplink.com/backend/internal/domain"
)

type KnowledgeBaseRepository struct {
	db *sql.DB
}

func NewKnowledgeBaseRepository(db *sql.DB) *KnowledgeBaseRepository {
	return &KnowledgeBaseRepository{db: db}
}

func (r *KnowledgeBaseRepository) CreateEntry(kb *domain.KnowledgeBase) error {
	query := `
		INSERT INTO knowledge_base (id, shipment_id, vehicle_id, match_score, estimated_cost, actual_cost, pricing_factor, time_factor, carbon_factor, route_metadata, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`
	_, err := r.db.Exec(query, kb.ID, kb.ShipmentID, kb.VehicleID, kb.MatchScore, kb.EstimatedCost, kb.ActualCost, kb.PricingFactor, kb.TimeFactor, kb.CarbonFactor, kb.RouteMetadata, kb.CreatedAt, kb.UpdatedAt)
	return err
}

func (r *KnowledgeBaseRepository) GetEntryByID(id string) (*domain.KnowledgeBase, error) {
	kb := &domain.KnowledgeBase{}
	query := `
		SELECT id, shipment_id, vehicle_id, match_score, estimated_cost, actual_cost, pricing_factor, time_factor, carbon_factor, route_metadata, created_at, updated_at
		FROM knowledge_base WHERE id = $1
	`
	err := r.db.QueryRow(query, id).Scan(&kb.ID, &kb.ShipmentID, &kb.VehicleID, &kb.MatchScore, &kb.EstimatedCost, &kb.ActualCost, &kb.PricingFactor, &kb.TimeFactor, &kb.CarbonFactor, &kb.RouteMetadata, &kb.CreatedAt, &kb.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("knowledge base entry not found")
		}
		return nil, err
	}
	return kb, nil
}

func (r *KnowledgeBaseRepository) GetEntriesByShipmentID(shipmentID string) ([]*domain.KnowledgeBase, error) {
	query := `
		SELECT id, shipment_id, vehicle_id, match_score, estimated_cost, actual_cost, pricing_factor, time_factor, carbon_factor, route_metadata, created_at, updated_at
		FROM knowledge_base WHERE shipment_id = $1 ORDER BY match_score DESC
	`
	rows, err := r.db.Query(query, shipmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*domain.KnowledgeBase
	for rows.Next() {
		kb := &domain.KnowledgeBase{}
		err := rows.Scan(&kb.ID, &kb.ShipmentID, &kb.VehicleID, &kb.MatchScore, &kb.EstimatedCost, &kb.ActualCost, &kb.PricingFactor, &kb.TimeFactor, &kb.CarbonFactor, &kb.RouteMetadata, &kb.CreatedAt, &kb.UpdatedAt)
		if err != nil {
			return nil, err
		}
		entries = append(entries, kb)
	}
	return entries, rows.Err()
}

func (r *KnowledgeBaseRepository) GetAllEntries() ([]*domain.KnowledgeBase, error) {
	query := `
		SELECT id, shipment_id, vehicle_id, match_score, estimated_cost, actual_cost, pricing_factor, time_factor, carbon_factor, route_metadata, created_at, updated_at
		FROM knowledge_base ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*domain.KnowledgeBase
	for rows.Next() {
		kb := &domain.KnowledgeBase{}
		err := rows.Scan(&kb.ID, &kb.ShipmentID, &kb.VehicleID, &kb.MatchScore, &kb.EstimatedCost, &kb.ActualCost, &kb.PricingFactor, &kb.TimeFactor, &kb.CarbonFactor, &kb.RouteMetadata, &kb.CreatedAt, &kb.UpdatedAt)
		if err != nil {
			return nil, err
		}
		entries = append(entries, kb)
	}
	return entries, rows.Err()
}

func (r *KnowledgeBaseRepository) UpdateEntry(kb *domain.KnowledgeBase) error {
	query := `
		UPDATE knowledge_base 
		SET match_score = $1, estimated_cost = $2, actual_cost = $3, pricing_factor = $4, time_factor = $5, carbon_factor = $6, route_metadata = $7, updated_at = $8
		WHERE id = $9
	`
	_, err := r.db.Exec(query, kb.MatchScore, kb.EstimatedCost, kb.ActualCost, kb.PricingFactor, kb.TimeFactor, kb.CarbonFactor, kb.RouteMetadata, kb.UpdatedAt, kb.ID)
	return err
}

func (r *KnowledgeBaseRepository) DeleteEntry(id string) error {
	query := `DELETE FROM knowledge_base WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *KnowledgeBaseRepository) GetHighScoreEntries(minScore float64) ([]*domain.KnowledgeBase, error) {
	query := `
		SELECT id, shipment_id, vehicle_id, match_score, estimated_cost, actual_cost, pricing_factor, time_factor, carbon_factor, route_metadata, created_at, updated_at
		FROM knowledge_base WHERE match_score >= $1 ORDER BY match_score DESC
	`
	rows, err := r.db.Query(query, minScore)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []*domain.KnowledgeBase
	for rows.Next() {
		kb := &domain.KnowledgeBase{}
		err := rows.Scan(&kb.ID, &kb.ShipmentID, &kb.VehicleID, &kb.MatchScore, &kb.EstimatedCost, &kb.ActualCost, &kb.PricingFactor, &kb.TimeFactor, &kb.CarbonFactor, &kb.RouteMetadata, &kb.CreatedAt, &kb.UpdatedAt)
		if err != nil {
			return nil, err
		}
		entries = append(entries, kb)
	}
	return entries, rows.Err()
}
