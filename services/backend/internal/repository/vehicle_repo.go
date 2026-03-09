package repository

import (
	"database/sql"
	"fmt"

	"looplink.com/backend/internal/domain"
)

type VehicleRepository struct {
	db *sql.DB
}

func NewVehicleRepository(db *sql.DB) *VehicleRepository {
	return &VehicleRepository{db: db}
}

func (r *VehicleRepository) CreateVehicle(vehicle *domain.Vehicle) error {
	query := `
		INSERT INTO vehicles (id, driver_id, vehicle_type, license_plate, manufacturer, model, year, capacity, max_weight, is_refrigerated, temperature, fuel_type, carbon_footprint, is_available, current_location, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
	`
	_, err := r.db.Exec(query, vehicle.ID, vehicle.DriverID, vehicle.VehicleType, vehicle.LicensePlate, vehicle.Manufacturer, vehicle.Model, vehicle.Year, vehicle.Capacity, vehicle.MaxWeight, vehicle.IsRefrigerated, vehicle.Temperature, vehicle.FuelType, vehicle.CarbonFootprint, vehicle.IsAvailable, vehicle.CurrentLocation, vehicle.CreatedAt, vehicle.UpdatedAt)
	return err
}

func (r *VehicleRepository) GetVehicleByID(id string) (*domain.Vehicle, error) {
	vehicle := &domain.Vehicle{}
	query := `
		SELECT id, driver_id, vehicle_type, license_plate, manufacturer, model, year, capacity, max_weight, is_refrigerated, temperature, fuel_type, carbon_footprint, is_available, current_location, created_at, updated_at
		FROM vehicles WHERE id = $1
	`
	err := r.db.QueryRow(query, id).Scan(&vehicle.ID, &vehicle.DriverID, &vehicle.VehicleType, &vehicle.LicensePlate, &vehicle.Manufacturer, &vehicle.Model, &vehicle.Year, &vehicle.Capacity, &vehicle.MaxWeight, &vehicle.IsRefrigerated, &vehicle.Temperature, &vehicle.FuelType, &vehicle.CarbonFootprint, &vehicle.IsAvailable, &vehicle.CurrentLocation, &vehicle.CreatedAt, &vehicle.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("vehicle not found")
		}
		return nil, err
	}
	return vehicle, nil
}

func (r *VehicleRepository) GetVehiclesByDriverID(driverID string) ([]*domain.Vehicle, error) {
	query := `
		SELECT id, driver_id, vehicle_type, license_plate, manufacturer, model, year, capacity, max_weight, is_refrigerated, temperature, fuel_type, carbon_footprint, is_available, current_location, created_at, updated_at
		FROM vehicles WHERE driver_id = $1 ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query, driverID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vehicles []*domain.Vehicle
	for rows.Next() {
		vehicle := &domain.Vehicle{}
		err := rows.Scan(&vehicle.ID, &vehicle.DriverID, &vehicle.VehicleType, &vehicle.LicensePlate, &vehicle.Manufacturer, &vehicle.Model, &vehicle.Year, &vehicle.Capacity, &vehicle.MaxWeight, &vehicle.IsRefrigerated, &vehicle.Temperature, &vehicle.FuelType, &vehicle.CarbonFootprint, &vehicle.IsAvailable, &vehicle.CurrentLocation, &vehicle.CreatedAt, &vehicle.UpdatedAt)
		if err != nil {
			return nil, err
		}
		vehicles = append(vehicles, vehicle)
	}
	return vehicles, rows.Err()
}

func (r *VehicleRepository) GetAvailableVehicles() ([]*domain.Vehicle, error) {
	query := `
		SELECT id, driver_id, vehicle_type, license_plate, manufacturer, model, year, capacity, max_weight, is_refrigerated, temperature, fuel_type, carbon_footprint, is_available, current_location, created_at, updated_at
		FROM vehicles WHERE is_available = true ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var vehicles []*domain.Vehicle
	for rows.Next() {
		vehicle := &domain.Vehicle{}
		err := rows.Scan(&vehicle.ID, &vehicle.DriverID, &vehicle.VehicleType, &vehicle.LicensePlate, &vehicle.Manufacturer, &vehicle.Model, &vehicle.Year, &vehicle.Capacity, &vehicle.MaxWeight, &vehicle.IsRefrigerated, &vehicle.Temperature, &vehicle.FuelType, &vehicle.CarbonFootprint, &vehicle.IsAvailable, &vehicle.CurrentLocation, &vehicle.CreatedAt, &vehicle.UpdatedAt)
		if err != nil {
			return nil, err
		}
		vehicles = append(vehicles, vehicle)
	}
	return vehicles, rows.Err()
}

func (r *VehicleRepository) UpdateVehicle(vehicle *domain.Vehicle) error {
	query := `
		UPDATE vehicles 
		SET driver_id = $1, vehicle_type = $2, license_plate = $3, manufacturer = $4, model = $5, year = $6, capacity = $7, max_weight = $8, is_refrigerated = $9, temperature = $10, fuel_type = $11, carbon_footprint = $12, is_available = $13, current_location = $14, updated_at = $15
		WHERE id = $16
	`
	_, err := r.db.Exec(query, vehicle.DriverID, vehicle.VehicleType, vehicle.LicensePlate, vehicle.Manufacturer, vehicle.Model, vehicle.Year, vehicle.Capacity, vehicle.MaxWeight, vehicle.IsRefrigerated, vehicle.Temperature, vehicle.FuelType, vehicle.CarbonFootprint, vehicle.IsAvailable, vehicle.CurrentLocation, vehicle.UpdatedAt, vehicle.ID)
	return err
}

func (r *VehicleRepository) DeleteVehicle(id string) error {
	query := `DELETE FROM vehicles WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
