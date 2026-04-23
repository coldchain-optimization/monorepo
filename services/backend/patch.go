package services

// patch
func PatchGetRealTrackingHistory(ts *TrackingService, shipment *domain.Shipment, vehicle *domain.Vehicle) []*domain.TrackingEvent {
	history, err := ts.trackingRepo.GetTrackingHistory(shipment.ID)

	if err != nil || len(history) == 0 {
		return ts.SimulateVehicleMovement(shipment, vehicle)
	}

	startLat, startLon := ts.locationToCoordinates(shipment.SourceLocation, shipment.ID+"-src")
	endLat, endLon := ts.locationToCoordinates(shipment.DestLocation, shipment.ID+"-dst")

	var events []*domain.TrackingEvent
	for i, h := range history {
		traveled := ts.approximateDistanceKm(startLat, startLon, h.Latitude, h.Longitude)
		remaining := ts.approximateDistanceKm(h.Latitude, h.Longitude, endLat, endLon)

		speed := 0.0
		if i > 0 {
			prev := history[i-1]
			dist := ts.approximateDistanceKm(prev.Latitude, prev.Longitude, h.Latitude, h.Longitude)
			timeDiff := h.CreatedAt.Sub(prev.CreatedAt).Hours()
			if timeDiff > 0 {
				speed = dist / timeDiff
			}
		}

		events = append(events, &domain.TrackingEvent{
			ID:                   fmt.Sprintf("track_real_%d", i),
			ShipmentID:           shipment.ID,
			VehicleID:            vehicle.ID,
			Latitude:             h.Latitude,
			Longitude:            h.Longitude,
			Speed:                speed,
			Temperature:          vehicle.Temperature,
			Status:               "in_transit",
			DistanceTraveledKm:   traveled,
			DistanceRemainingKm:  remaining,
			EstimatedArrivalTime: time.Now().Add(time.Duration((remaining/50.0)*60) * time.Minute),
			CreatedAt:            h.CreatedAt,
		})
	}
	return events
}