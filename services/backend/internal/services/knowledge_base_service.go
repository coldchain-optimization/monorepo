package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
)

type KnowledgeBaseService struct {
	kbRepo *repository.KnowledgeBaseRepository
}

func NewKnowledgeBaseService(kbRepo *repository.KnowledgeBaseRepository) *KnowledgeBaseService {
	return &KnowledgeBaseService{kbRepo: kbRepo}
}

type FeedbackInput struct {
	ShipmentID    string  `json:"shipment_id"`
	VehicleID     string  `json:"vehicle_id"`
	MatchScore    float64 `json:"match_score"`
	EstimatedCost float64 `json:"estimated_cost"`
	ActualCost    float64 `json:"actual_cost"`
	PricingFactor float64 `json:"pricing_factor"`
	TimeFactor    float64 `json:"time_factor"`
	CarbonFactor  float64 `json:"carbon_factor"`
	RouteMetadata string  `json:"route_metadata"`
}

// StoreFeedback stores match feedback for ML training
func (s *KnowledgeBaseService) StoreFeedback(input FeedbackInput) (*domain.KnowledgeBase, error) {
	entry := &domain.KnowledgeBase{
		ID:            uuid.New().String(),
		ShipmentID:    input.ShipmentID,
		VehicleID:     input.VehicleID,
		MatchScore:    input.MatchScore,
		EstimatedCost: input.EstimatedCost,
		ActualCost:    input.ActualCost,
		PricingFactor: input.PricingFactor,
		TimeFactor:    input.TimeFactor,
		CarbonFactor:  input.CarbonFactor,
		RouteMetadata: input.RouteMetadata,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.kbRepo.CreateEntry(entry); err != nil {
		return nil, fmt.Errorf("failed to store feedback: %w", err)
	}

	return entry, nil
}

func (s *KnowledgeBaseService) GetEntriesByShipmentID(shipmentID string) ([]*domain.KnowledgeBase, error) {
	return s.kbRepo.GetEntriesByShipmentID(shipmentID)
}

func (s *KnowledgeBaseService) GetAllEntries() ([]*domain.KnowledgeBase, error) {
	return s.kbRepo.GetAllEntries()
}

func (s *KnowledgeBaseService) GetHighScoreEntries(minScore float64) ([]*domain.KnowledgeBase, error) {
	return s.kbRepo.GetHighScoreEntries(minScore)
}
