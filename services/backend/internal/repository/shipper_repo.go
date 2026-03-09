package repository

import (
	"database/sql"
	"fmt"

	"looplink.com/backend/internal/domain"
)

type ShipperRepository struct {
	db *sql.DB
}

func NewShipperRepository(db *sql.DB) *ShipperRepository {
	return &ShipperRepository{db: db}
}

func (r *ShipperRepository) CreateShipper(shipper *domain.Shipper) error {
	query := `
		INSERT INTO shippers (id, user_id, company_name, company_address, phone_number, tax_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := r.db.Exec(query, shipper.ID, shipper.UserID, shipper.CompanyName, shipper.CompanyAddress, shipper.PhoneNumber, shipper.TaxID, shipper.CreatedAt, shipper.UpdatedAt)
	return err
}

func (r *ShipperRepository) GetShipperByID(id string) (*domain.Shipper, error) {
	shipper := &domain.Shipper{}
	query := `
		SELECT id, user_id, company_name, company_address, phone_number, tax_id, created_at, updated_at
		FROM shippers WHERE id = $1
	`
	err := r.db.QueryRow(query, id).Scan(&shipper.ID, &shipper.UserID, &shipper.CompanyName, &shipper.CompanyAddress, &shipper.PhoneNumber, &shipper.TaxID, &shipper.CreatedAt, &shipper.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("shipper not found")
		}
		return nil, err
	}
	return shipper, nil
}

func (r *ShipperRepository) GetShipperByUserID(userID string) (*domain.Shipper, error) {
	shipper := &domain.Shipper{}
	query := `
		SELECT id, user_id, company_name, company_address, phone_number, tax_id, created_at, updated_at
		FROM shippers WHERE user_id = $1
	`
	err := r.db.QueryRow(query, userID).Scan(&shipper.ID, &shipper.UserID, &shipper.CompanyName, &shipper.CompanyAddress, &shipper.PhoneNumber, &shipper.TaxID, &shipper.CreatedAt, &shipper.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("shipper not found")
		}
		return nil, err
	}
	return shipper, nil
}

func (r *ShipperRepository) GetAllShippers() ([]*domain.Shipper, error) {
	query := `
		SELECT id, user_id, company_name, company_address, phone_number, tax_id, created_at, updated_at
		FROM shippers ORDER BY created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var shippers []*domain.Shipper
	for rows.Next() {
		shipper := &domain.Shipper{}
		err := rows.Scan(&shipper.ID, &shipper.UserID, &shipper.CompanyName, &shipper.CompanyAddress, &shipper.PhoneNumber, &shipper.TaxID, &shipper.CreatedAt, &shipper.UpdatedAt)
		if err != nil {
			return nil, err
		}
		shippers = append(shippers, shipper)
	}
	return shippers, rows.Err()
}

func (r *ShipperRepository) UpdateShipper(shipper *domain.Shipper) error {
	query := `
		UPDATE shippers 
		SET company_name = $1, company_address = $2, phone_number = $3, tax_id = $4, updated_at = $5
		WHERE id = $6
	`
	_, err := r.db.Exec(query, shipper.CompanyName, shipper.CompanyAddress, shipper.PhoneNumber, shipper.TaxID, shipper.UpdatedAt, shipper.ID)
	return err
}

func (r *ShipperRepository) DeleteShipper(id string) error {
	query := `DELETE FROM shippers WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}
