package repository

import (
	"database/sql"
	"fmt"

	"looplink.com/backend/internal/domain"
)

type DriverRepository struct {
	db *sql.DB
}

func NewDriverRepository(db *sql.DB) *DriverRepository {
	return &DriverRepository{db: db}
}

func (r *DriverRepository) CreateDriver(driver *domain.Driver) error {
	query := `
		INSERT INTO drivers (id, user_id, license_number, phone_number, rating, role, is_active, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.db.Exec(query, driver.ID, driver.UserID, driver.LicenseNumber, driver.PhoneNumber, driver.Rating, driver.Role, driver.IsActive, driver.CreatedAt, driver.UpdatedAt)
	return err
}

func (r *DriverRepository) GetDriverByID(id string) (*domain.Driver, error) {
	driver := &domain.Driver{}
	query := `
		SELECT id, user_id, license_number, phone_number, rating, role, is_active, created_at, updated_at
		FROM drivers WHERE id = $1
	`
	err := r.db.QueryRow(query, id).Scan(&driver.ID, &driver.UserID, &driver.LicenseNumber, &driver.PhoneNumber, &driver.Rating, &driver.Role, &driver.IsActive, &driver.CreatedAt, &driver.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("driver not found")
		}
		return nil, err
	}
	return driver, nil
}

func (r *DriverRepository) GetDriverByUserID(userID string) (*domain.Driver, error) {
	driver := &domain.Driver{}
	query := `
		SELECT id, user_id, license_number, phone_number, rating, role, is_active, created_at, updated_at
		FROM drivers WHERE user_id = $1
	`
	err := r.db.QueryRow(query, userID).Scan(&driver.ID, &driver.UserID, &driver.LicenseNumber, &driver.PhoneNumber, &driver.Rating, &driver.Role, &driver.IsActive, &driver.CreatedAt, &driver.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("driver not found")
		}
		return nil, err
	}
	return driver, nil
}

func (r *DriverRepository) GetAllDrivers() ([]*domain.Driver, error) {
	query := `
		SELECT d.id, d.user_id, d.license_number, d.phone_number, d.rating, d.role, d.is_active, d.created_at, d.updated_at
		FROM drivers d
		ORDER BY d.created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drivers []*domain.Driver
	for rows.Next() {
		driver := &domain.Driver{}
		err := rows.Scan(&driver.ID, &driver.UserID, &driver.LicenseNumber, &driver.PhoneNumber, &driver.Rating, &driver.Role, &driver.IsActive, &driver.CreatedAt, &driver.UpdatedAt)
		if err != nil {
			return nil, err
		}
		drivers = append(drivers, driver)
	}
	return drivers, rows.Err()
}

func (r *DriverRepository) GetAllDriversWithUsers() ([]map[string]interface{}, error) {
	query := `
		SELECT d.id, d.user_id, d.license_number, d.phone_number, d.rating, d.role, d.is_active, d.created_at, d.updated_at,
		       u.email, u.first_name, u.last_name
		FROM drivers d
		INNER JOIN users u ON d.user_id = u.id
		ORDER BY d.created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drivers []map[string]interface{}
	for rows.Next() {
		var id, userID, licenseNumber, phoneNumber, role, email, firstName, lastName, createdAt, updatedAt string
		var rating float64
		var isActive bool

		err := rows.Scan(&id, &userID, &licenseNumber, &phoneNumber, &rating, &role, &isActive, &createdAt, &updatedAt, &email, &firstName, &lastName)
		if err != nil {
			return nil, err
		}

		driver := map[string]interface{}{
			"id":             id,
			"user_id":        userID,
			"license_number": licenseNumber,
			"phone_number":   phoneNumber,
			"rating":         rating,
			"role":           role,
			"is_active":      isActive,
			"created_at":     createdAt,
			"updated_at":     updatedAt,
			"email":          email,
			"first_name":     firstName,
			"last_name":      lastName,
		}
		drivers = append(drivers, driver)
	}
	return drivers, rows.Err()
}

func (r *DriverRepository) GetActiveDrivers() ([]*domain.Driver, error) {
	query := `
		SELECT id, user_id, license_number, phone_number, rating, role, is_active, created_at, updated_at
		FROM drivers WHERE is_active = true ORDER BY rating DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var drivers []*domain.Driver
	for rows.Next() {
		driver := &domain.Driver{}
		err := rows.Scan(&driver.ID, &driver.UserID, &driver.LicenseNumber, &driver.PhoneNumber, &driver.Rating, &driver.Role, &driver.IsActive, &driver.CreatedAt, &driver.UpdatedAt)
		if err != nil {
			return nil, err
		}
		drivers = append(drivers, driver)
	}
	return drivers, rows.Err()
}

func (r *DriverRepository) UpdateDriver(driver *domain.Driver) error {
	query := `
		UPDATE drivers 
		SET license_number = $1, phone_number = $2, rating = $3, role = $4, is_active = $5, updated_at = $6
		WHERE id = $7
	`
	_, err := r.db.Exec(query, driver.LicenseNumber, driver.PhoneNumber, driver.Rating, driver.Role, driver.IsActive, driver.UpdatedAt, driver.ID)
	return err
}

func (r *DriverRepository) DeleteDriver(id string) error {
	query := `DELETE FROM drivers WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *DriverRepository) CountDrivers() (int, error) {
	var count int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM drivers`).Scan(&count)
	return count, err
}
