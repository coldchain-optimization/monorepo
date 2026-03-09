package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
)

type ShipmentService struct {
	shipmentRepo *repository.ShipmentRepository
	vehicleRepo  *repository.VehicleRepository
}

func NewShipmentService(shipmentRepo *repository.ShipmentRepository, vehicleRepo *repository.VehicleRepository) *ShipmentService {
	return &ShipmentService{
		shipmentRepo: shipmentRepo,
		vehicleRepo:  vehicleRepo,
	}
}

type CreateShipmentInput struct {
	ShipperID       string    `json:"shipper_id"`
	SourceLocation  string    `json:"source_location"`
	DestLocation    string    `json:"destination_location"`
	LoadWeight      int       `json:"load_weight"`
	LoadVolume      int       `json:"load_volume"`
	LoadType        string    `json:"load_type"`
	RequiredTemp    int       `json:"required_temp"`
	DaysAvailable   int       `json:"days_available"`
	TimeWindowStart time.Time `json:"time_window_start"`
	TimeWindowEnd   time.Time `json:"time_window_end"`
}

func (s *ShipmentService) CreateShipment(input CreateShipmentInput) (*domain.Shipment, error) {
	shipment := &domain.Shipment{
		ID:              uuid.New().String(),
		ShipperID:       input.ShipperID,
		SourceLocation:  input.SourceLocation,
		DestLocation:    input.DestLocation,
		LoadWeight:      input.LoadWeight,
		LoadVolume:      input.LoadVolume,
		LoadType:        input.LoadType,
		RequiredTemp:    input.RequiredTemp,
		DaysAvailable:   input.DaysAvailable,
		TimeWindowStart: input.TimeWindowStart,
		TimeWindowEnd:   input.TimeWindowEnd,
		Status:          domain.ShipmentPending,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := s.shipmentRepo.CreateShipment(shipment); err != nil {
		return nil, fmt.Errorf("failed to create shipment: %w", err)
	}

	return shipment, nil
}

func (s *ShipmentService) GetShipmentByID(id string) (*domain.Shipment, error) {
	return s.shipmentRepo.GetShipmentByID(id)
}

func (s *ShipmentService) GetShipmentsByShipperID(shipperID string) ([]*domain.Shipment, error) {
	return s.shipmentRepo.GetShipmentsByShipperID(shipperID)
}

func (s *ShipmentService) GetPendingShipments() ([]*domain.Shipment, error) {
	return s.shipmentRepo.GetPendingShipments()
}

type UpdateShipmentInput struct {
	SourceLocation  *string    `json:"source_location"`
	DestLocation    *string    `json:"destination_location"`
	LoadWeight      *int       `json:"load_weight"`
	LoadVolume      *int       `json:"load_volume"`
	LoadType        *string    `json:"load_type"`
	RequiredTemp    *int       `json:"required_temp"`
	DaysAvailable   *int       `json:"days_available"`
	TimeWindowStart *time.Time `json:"time_window_start"`
	TimeWindowEnd   *time.Time `json:"time_window_end"`
	Status          *string    `json:"status"`
}

func (s *ShipmentService) UpdateShipment(id string, input UpdateShipmentInput) (*domain.Shipment, error) {
	shipment, err := s.shipmentRepo.GetShipmentByID(id)
	if err != nil {
		return nil, err
	}

	if input.SourceLocation != nil {
		shipment.SourceLocation = *input.SourceLocation
	}
	if input.DestLocation != nil {
		shipment.DestLocation = *input.DestLocation
	}
	if input.LoadWeight != nil {
		shipment.LoadWeight = *input.LoadWeight
	}
	if input.LoadVolume != nil {
		shipment.LoadVolume = *input.LoadVolume
	}
	if input.LoadType != nil {
		shipment.LoadType = *input.LoadType
	}
	if input.RequiredTemp != nil {
		shipment.RequiredTemp = *input.RequiredTemp
	}
	if input.DaysAvailable != nil {
		shipment.DaysAvailable = *input.DaysAvailable
	}
	if input.TimeWindowStart != nil {
		shipment.TimeWindowStart = *input.TimeWindowStart
	}
	if input.TimeWindowEnd != nil {
		shipment.TimeWindowEnd = *input.TimeWindowEnd
	}
	if input.Status != nil {
		shipment.Status = *input.Status
	}
	shipment.UpdatedAt = time.Now()

	if err := s.shipmentRepo.UpdateShipment(shipment); err != nil {
		return nil, fmt.Errorf("failed to update shipment: %w", err)
	}

	return shipment, nil
}

func (s *ShipmentService) DeleteShipment(id string) error {
	return s.shipmentRepo.DeleteShipment(id)
}

// AssignVehicle assigns a vehicle to a shipment
func (s *ShipmentService) AssignVehicle(shipmentID, vehicleID string, estimatedCost float64) (*domain.Shipment, error) {
	shipment, err := s.shipmentRepo.GetShipmentByID(shipmentID)
	if err != nil {
		return nil, err
	}

	// Verify vehicle exists and is available
	vehicle, err := s.vehicleRepo.GetVehicleByID(vehicleID)
	if err != nil {
		return nil, fmt.Errorf("vehicle not found: %w", err)
	}
	if !vehicle.IsAvailable {
		return nil, fmt.Errorf("vehicle is not available")
	}

	shipment.AssignedVehicle = vehicleID
	shipment.EstimatedCost = estimatedCost
	shipment.Status = domain.ShipmentBooked
	shipment.UpdatedAt = time.Now()

	if err := s.shipmentRepo.UpdateShipment(shipment); err != nil {
		return nil, fmt.Errorf("failed to assign vehicle: %w", err)
	}

	// Mark vehicle as unavailable
	vehicle.IsAvailable = false
	vehicle.UpdatedAt = time.Now()
	if err := s.vehicleRepo.UpdateVehicle(vehicle); err != nil {
		return nil, fmt.Errorf("failed to update vehicle availability: %w", err)
	}

	return shipment, nil
}

func (s *ShipmentService) GetAllShipments() ([]*domain.Shipment, error) {
	return s.shipmentRepo.GetAllShipments()
}
