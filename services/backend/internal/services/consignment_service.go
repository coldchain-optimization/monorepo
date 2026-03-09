package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
)

type ConsignmentService struct {
	consignmentRepo *repository.ConsignmentRepository
	shipmentRepo    *repository.ShipmentRepository
}

func NewConsignmentService(consignmentRepo *repository.ConsignmentRepository, shipmentRepo *repository.ShipmentRepository) *ConsignmentService {
	return &ConsignmentService{
		consignmentRepo: consignmentRepo,
		shipmentRepo:    shipmentRepo,
	}
}

type CreateConsignmentInput struct {
	ShipmentID        string  `json:"shipment_id"`
	SourceLocation    string  `json:"source_location"`
	DestLocation      string  `json:"destination_location"`
	LoadWeight        int     `json:"load_weight"`
	LoadVolume        int     `json:"load_volume"`
	ExtraTime         int     `json:"extra_time"`
	BonusMoney        float64 `json:"bonus_money"`
	EstimatedDetourKm int     `json:"estimated_detour_km"`
}

func (s *ConsignmentService) CreateConsignment(input CreateConsignmentInput) (*domain.Consignment, error) {
	// Verify shipment exists
	_, err := s.shipmentRepo.GetShipmentByID(input.ShipmentID)
	if err != nil {
		return nil, fmt.Errorf("shipment not found: %w", err)
	}

	consignment := &domain.Consignment{
		ID:                uuid.New().String(),
		ShipmentID:        input.ShipmentID,
		SourceLocation:    input.SourceLocation,
		DestLocation:      input.DestLocation,
		LoadWeight:        input.LoadWeight,
		LoadVolume:        input.LoadVolume,
		ExtraTime:         input.ExtraTime,
		BonusMoney:        input.BonusMoney,
		EstimatedDetourKm: input.EstimatedDetourKm,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	if err := s.consignmentRepo.CreateConsignment(consignment); err != nil {
		return nil, fmt.Errorf("failed to create consignment: %w", err)
	}

	return consignment, nil
}

func (s *ConsignmentService) GetConsignmentsByShipmentID(shipmentID string) ([]*domain.Consignment, error) {
	return s.consignmentRepo.GetConsignmentsByShipmentID(shipmentID)
}

func (s *ConsignmentService) GetConsignmentByID(id string) (*domain.Consignment, error) {
	return s.consignmentRepo.GetConsignmentByID(id)
}
