package services

import (
	"fmt"
	"time"

	"looplink.com/backend/internal/domain"
)

// StatusService handles status event tracking and history
type StatusService struct {
	// In production, this would use a database
	// For now, we store events in memory
	statusHistory map[string][]*domain.StatusEvent
}

// NewStatusService creates a new StatusService instance
func NewStatusService() *StatusService {
	return &StatusService{
		statusHistory: make(map[string][]*domain.StatusEvent),
	}
}

// RecordPickupEvent records when driver picks up shipment
func (s *StatusService) RecordPickupEvent(shipmentID, driverID, location string, lat, long float64) (*domain.StatusEvent, error) {
	event := &domain.StatusEvent{
		ID:          fmt.Sprintf("event_%d", time.Now().UnixNano()),
		ShipmentID:  shipmentID,
		DriverID:    driverID,
		Status:      "pickup",
		Location:    location,
		Latitude:    lat,
		Longitude:   long,
		Description: fmt.Sprintf("Shipment picked up at %s", location),
		CreatedAt:   time.Now(),
	}

	s.statusHistory[shipmentID] = append(s.statusHistory[shipmentID], event)
	return event, nil
}

// RecordTransitEvent records vehicle in transit
func (s *StatusService) RecordTransitEvent(shipmentID, driverID, location string, lat, long float64) (*domain.StatusEvent, error) {
	event := &domain.StatusEvent{
		ID:          fmt.Sprintf("event_%d", time.Now().UnixNano()),
		ShipmentID:  shipmentID,
		DriverID:    driverID,
		Status:      "in_transit",
		Location:    location,
		Latitude:    lat,
		Longitude:   long,
		Description: fmt.Sprintf("Shipment in transit near %s", location),
		CreatedAt:   time.Now(),
	}

	s.statusHistory[shipmentID] = append(s.statusHistory[shipmentID], event)
	return event, nil
}

// RecordDeliveryEvent records successful delivery
func (s *StatusService) RecordDeliveryEvent(shipmentID, driverID, location string, lat, long float64, proofImage string) (*domain.StatusEvent, error) {
	event := &domain.StatusEvent{
		ID:          fmt.Sprintf("event_%d", time.Now().UnixNano()),
		ShipmentID:  shipmentID,
		DriverID:    driverID,
		Status:      "delivered",
		Location:    location,
		Latitude:    lat,
		Longitude:   long,
		Description: fmt.Sprintf("Shipment delivered at %s", location),
		ProofImage:  proofImage,
		CreatedAt:   time.Now(),
	}

	s.statusHistory[shipmentID] = append(s.statusHistory[shipmentID], event)
	return event, nil
}

// GetStatusHistory retrieves all status events for a shipment
func (s *StatusService) GetStatusHistory(shipmentID string) []*domain.StatusEvent {
	if events, exists := s.statusHistory[shipmentID]; exists {
		return events
	}
	return []*domain.StatusEvent{}
}

// GenerateDefaultStatusHistory creates default events for a shipment
func (s *StatusService) GenerateDefaultStatusHistory(shipmentID, driverID string) []*domain.StatusEvent {
	return []*domain.StatusEvent{
		{
			ID:          fmt.Sprintf("event_%d", time.Now().UnixNano()-3*time.Hour.Nanoseconds()),
			ShipmentID:  shipmentID,
			DriverID:    driverID,
			Status:      "pickup",
			Location:    "Origin Warehouse, Mumbai",
			Latitude:    19.0760,
			Longitude:   72.8777,
			Description: "Shipment picked up at origin",
			CreatedAt:   time.Now().Add(-3 * time.Hour),
		},
		{
			ID:          fmt.Sprintf("event_%d", time.Now().UnixNano()-2*time.Hour.Nanoseconds()),
			ShipmentID:  shipmentID,
			DriverID:    driverID,
			Status:      "in_transit",
			Location:    "Highway, Madhya Pradesh",
			Latitude:    23.1815,
			Longitude:   79.9864,
			Description: "Vehicle in transit to destination",
			CreatedAt:   time.Now().Add(-2 * time.Hour),
		},
		{
			ID:          fmt.Sprintf("event_%d", time.Now().UnixNano()-1*time.Hour.Nanoseconds()),
			ShipmentID:  shipmentID,
			DriverID:    driverID,
			Status:      "in_transit",
			Location:    "Approaching Delhi, Haryana Border",
			Latitude:    28.5244,
			Longitude:   77.1855,
			Description: "Approaching destination, will arrive soon",
			CreatedAt:   time.Now().Add(-1 * time.Hour),
		},
	}
}

// GetCurrentStatus returns the latest status event for a shipment
func (s *StatusService) GetCurrentStatus(shipmentID string) *domain.StatusEvent {
	events := s.GetStatusHistory(shipmentID)
	if len(events) > 0 {
		return events[len(events)-1]
	}
	return nil
}

// GetStatusSummary returns summary of all status events
func (s *StatusService) GetStatusSummary(shipmentID string) map[string]interface{} {
	events := s.GetStatusHistory(shipmentID)
	if len(events) == 0 {
		return map[string]interface{}{
			"total_events":   0,
			"current_status": "pending",
			"events":         []*domain.StatusEvent{},
		}
	}

	lastEvent := events[len(events)-1]
	return map[string]interface{}{
		"total_events":   len(events),
		"current_status": lastEvent.Status,
		"last_location":  lastEvent.Location,
		"last_update":    lastEvent.CreatedAt,
		"events":         events,
	}
}
