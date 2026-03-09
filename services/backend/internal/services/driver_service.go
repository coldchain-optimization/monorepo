package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"looplink.com/backend/internal/domain"
	"looplink.com/backend/internal/repository"
)

type DriverService struct {
	driverRepo  *repository.DriverRepository
	userRepo    *repository.UserRepository
	vehicleRepo *repository.VehicleRepository
}

func NewDriverService(driverRepo *repository.DriverRepository, userRepo *repository.UserRepository, vehicleRepo *repository.VehicleRepository) *DriverService {
	return &DriverService{
		driverRepo:  driverRepo,
		userRepo:    userRepo,
		vehicleRepo: vehicleRepo,
	}
}

type RegisterDriverInput struct {
	UserID        string `json:"user_id"`
	LicenseNumber string `json:"license_number"`
	PhoneNumber   string `json:"phone_number"`
	Role          string `json:"role"` // transporting_body or help_seeking_body
}

func (s *DriverService) RegisterDriver(input RegisterDriverInput) (*domain.Driver, error) {
	// Verify user exists
	_, err := s.userRepo.GetUserByID(input.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	// Check if driver profile already exists
	existing, _ := s.driverRepo.GetDriverByUserID(input.UserID)
	if existing != nil {
		return nil, fmt.Errorf("driver profile already exists for this user")
	}

	// Validate role
	if input.Role != domain.RoleT && input.Role != domain.RoleH {
		input.Role = domain.RoleT // Default to transporting body
	}

	driver := &domain.Driver{
		ID:            uuid.New().String(),
		UserID:        input.UserID,
		LicenseNumber: input.LicenseNumber,
		PhoneNumber:   input.PhoneNumber,
		Rating:        0.0,
		Role:          input.Role,
		IsActive:      true,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := s.driverRepo.CreateDriver(driver); err != nil {
		return nil, fmt.Errorf("failed to create driver: %w", err)
	}

	return driver, nil
}

func (s *DriverService) GetDriverByID(id string) (*domain.Driver, error) {
	return s.driverRepo.GetDriverByID(id)
}

func (s *DriverService) GetDriverByUserID(userID string) (*domain.Driver, error) {
	return s.driverRepo.GetDriverByUserID(userID)
}

func (s *DriverService) GetAllDrivers() ([]*domain.Driver, error) {
	return s.driverRepo.GetAllDrivers()
}

func (s *DriverService) GetActiveDrivers() ([]*domain.Driver, error) {
	return s.driverRepo.GetActiveDrivers()
}

type UpdateDriverInput struct {
	LicenseNumber *string  `json:"license_number"`
	PhoneNumber   *string  `json:"phone_number"`
	Role          *string  `json:"role"`
	IsActive      *bool    `json:"is_active"`
	Rating        *float64 `json:"rating"`
}

func (s *DriverService) UpdateDriver(id string, input UpdateDriverInput) (*domain.Driver, error) {
	driver, err := s.driverRepo.GetDriverByID(id)
	if err != nil {
		return nil, err
	}

	if input.LicenseNumber != nil {
		driver.LicenseNumber = *input.LicenseNumber
	}
	if input.PhoneNumber != nil {
		driver.PhoneNumber = *input.PhoneNumber
	}
	if input.Role != nil {
		driver.Role = *input.Role
	}
	if input.IsActive != nil {
		driver.IsActive = *input.IsActive
	}
	if input.Rating != nil {
		driver.Rating = *input.Rating
	}
	driver.UpdatedAt = time.Now()

	if err := s.driverRepo.UpdateDriver(driver); err != nil {
		return nil, fmt.Errorf("failed to update driver: %w", err)
	}

	return driver, nil
}

func (s *DriverService) GetDriverVehicles(driverID string) ([]*domain.Vehicle, error) {
	return s.vehicleRepo.GetVehiclesByDriverID(driverID)
}
