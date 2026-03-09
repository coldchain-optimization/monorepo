package services

import (
"fmt"
"time"

"github.com/google/uuid"
"looplink.com/backend/internal/domain"
"looplink.com/backend/internal/repository"
)

type ShipperService struct {
shipperRepo *repository.ShipperRepository
userRepo    *repository.UserRepository
}

func NewShipperService(shipperRepo *repository.ShipperRepository, userRepo *repository.UserRepository) *ShipperService {
return &ShipperService{
shipperRepo: shipperRepo,
userRepo:    userRepo,
}
}

type RegisterShipperInput struct {
UserID         string `json:"user_id"`
CompanyName    string `json:"company_name"`
CompanyAddress string `json:"company_address"`
PhoneNumber    string `json:"phone_number"`
TaxID          string `json:"tax_id"`
}

func (s *ShipperService) RegisterShipper(input RegisterShipperInput) (*domain.Shipper, error) {
_, err := s.userRepo.GetUserByID(input.UserID)
if err != nil {
return nil, fmt.Errorf("user not found: %w", err)
}

existing, _ := s.shipperRepo.GetShipperByUserID(input.UserID)
if existing != nil {
return nil, fmt.Errorf("shipper profile already exists for this user")
}

shipper := &domain.Shipper{
ID:             uuid.New().String(),
UserID:         input.UserID,
CompanyName:    input.CompanyName,
CompanyAddress: input.CompanyAddress,
PhoneNumber:    input.PhoneNumber,
TaxID:          input.TaxID,
CreatedAt:      time.Now(),
UpdatedAt:      time.Now(),
}

if err := s.shipperRepo.CreateShipper(shipper); err != nil {
return nil, fmt.Errorf("failed to create shipper: %w", err)
}

return shipper, nil
}

func (s *ShipperService) GetShipperByID(id string) (*domain.Shipper, error) {
return s.shipperRepo.GetShipperByID(id)
}

func (s *ShipperService) GetShipperByUserID(userID string) (*domain.Shipper, error) {
return s.shipperRepo.GetShipperByUserID(userID)
}

func (s *ShipperService) GetAllShippers() ([]*domain.Shipper, error) {
return s.shipperRepo.GetAllShippers()
}

type UpdateShipperInput struct {
CompanyName    *string `json:"company_name"`
CompanyAddress *string `json:"company_address"`
PhoneNumber    *string `json:"phone_number"`
TaxID          *string `json:"tax_id"`
}

func (s *ShipperService) UpdateShipper(id string, input UpdateShipperInput) (*domain.Shipper, error) {
shipper, err := s.shipperRepo.GetShipperByID(id)
if err != nil {
return nil, err
}

if input.CompanyName != nil {
shipper.CompanyName = *input.CompanyName
}
if input.CompanyAddress != nil {
shipper.CompanyAddress = *input.CompanyAddress
}
if input.PhoneNumber != nil {
shipper.PhoneNumber = *input.PhoneNumber
}
if input.TaxID != nil {
shipper.TaxID = *input.TaxID
}
shipper.UpdatedAt = time.Now()

if err := s.shipperRepo.UpdateShipper(shipper); err != nil {
return nil, fmt.Errorf("failed to update shipper: %w", err)
}

return shipper, nil
}
