package repository

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	"looplink.com/backend/internal/domain"
)

type TrackingRepository struct {
	db *sql.DB
}

func NewTrackingRepository(db *sql.DB) *TrackingRepository {
	return &TrackingRepository{db: db}
}

func (r *TrackingRepository) SaveLocation(shipmentID, vehicleID string, lat, lon float64) error {
	query := `
		INSERT INTO tracking_history (id, shipment_id, vehicle_id, latitude, longitude, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.Exec(query, uuid.New().String(), shipmentID, vehicleID, lat, lon, time.Now())
	return err
}

func (r *TrackingRepository) GetLatestLocation(shipmentID string) (*domain.TrackingEvent, error) {
	query := `
		SELECT latitude, longitude, timestamp
		FROM tracking_history
		WHERE shipment_id = $1
		ORDER BY timestamp DESC
		LIMIT 1
	`
	var event domain.TrackingEvent
	err := r.db.QueryRow(query, shipmentID).Scan(&event.Latitude, &event.Longitude, &event.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &event, nil
}

func (r *TrackingRepository) GetTrackingHistory(shipmentID string) ([]domain.TrackingEvent, error) {
	query := `
		SELECT latitude, longitude, timestamp
		FROM tracking_history
		WHERE shipment_id = $1
		ORDER BY timestamp ASC
	`
	rows, err := r.db.Query(query, shipmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []domain.TrackingEvent
	for rows.Next() {
		var event domain.TrackingEvent
		if err := rows.Scan(&event.Latitude, &event.Longitude, &event.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, event)
	}
	return events, nil
}
