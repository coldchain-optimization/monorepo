package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"
	"time"

	"looplink.com/backend/internal/domain"
)

// MLInferenceService calls an external inference endpoint and blends ML score with rule score.
type MLInferenceService struct {
	enabled     bool
	endpointURL string
	client      *http.Client
	blendWeight float64
}

type mlPredictRequest struct {
	RuleScore          float64                `json:"rule_score"`
	Shipment           mlShipmentFeatures     `json:"shipment"`
	Vehicle            mlVehicleFeatures      `json:"vehicle"`
	Route              *mlRouteFeatures       `json:"route,omitempty"`
	EngineeredFeatures mlEngineeredFeatures   `json:"engineered_features"`
	Metadata           map[string]interface{} `json:"metadata,omitempty"`
}

type mlShipmentFeatures struct {
	ID            string `json:"id"`
	Source        string `json:"source"`
	Destination   string `json:"destination"`
	LoadWeight    int    `json:"load_weight"`
	LoadVolume    int    `json:"load_volume"`
	RequiredTemp  int    `json:"required_temp"`
	DaysAvailable int    `json:"days_available"`
}

type mlVehicleFeatures struct {
	ID              string  `json:"id"`
	DriverID        string  `json:"driver_id"`
	Capacity        int     `json:"capacity"`
	MaxWeight       int     `json:"max_weight"`
	IsRefrigerated  bool    `json:"is_refrigerated"`
	Temperature     int     `json:"temperature"`
	CarbonFootprint float64 `json:"carbon_footprint"`
	CurrentLocation string  `json:"current_location"`
}

type mlRouteFeatures struct {
	DistanceKm    float64 `json:"distance_km"`
	EstimatedTime int     `json:"estimated_time"`
	CarbonKg      float64 `json:"carbon_kg"`
	CostEstimate  float64 `json:"cost_estimate"`
}

type mlEngineeredFeatures struct {
	GeoCluster            string  `json:"geo_cluster"`
	SpoilageRiskScore     float64 `json:"spoilage_risk_score"`
	ShipmentDensity       float64 `json:"shipment_density"`
	BackhaulPotentialFlag int     `json:"backhaul_potential_flag"`
	UtilizationVolumePct  float64 `json:"utilization_volume_pct"`
	UtilizationWeightPct  float64 `json:"utilization_weight_pct"`
}

// MLPredictionResult wraps ML model output with confidence and explanation.
type MLPredictionResult struct {
	Score       float64            `json:"score"`
	Confidence  float64            `json:"confidence"`        // 0.0-1.0: model confidence in prediction
	Explanation string             `json:"explanation"`       // Domain-specific reason for score
	Factors     map[string]float64 `json:"factors,omitempty"` // Component scores (capacity, spoilage, etc.)
}

func NewMLInferenceService(enabled bool, endpointURL string, timeout time.Duration, blendWeight float64) *MLInferenceService {
	if timeout <= 0 {
		timeout = 1200 * time.Millisecond
	}
	endpointURL = normalizeMLServiceURL(endpointURL)
	return &MLInferenceService{
		enabled:     enabled,
		endpointURL: endpointURL,
		client:      &http.Client{Timeout: timeout},
		blendWeight: clamp(blendWeight, 0.0, 1.0),
	}
}

func (s *MLInferenceService) Enabled() bool {
	return s != nil && s.enabled
}

func (s *MLInferenceService) Blend(ruleScore, mlScore float64) float64 {
	if s == nil {
		return clamp(ruleScore, 0, 100)
	}
	r := clamp(ruleScore, 0, 100)
	m := clamp(mlScore, 0, 100)
	return clamp(((1.0-s.blendWeight)*r)+(s.blendWeight*m), 0, 100)
}

func (s *MLInferenceService) PredictMatchScore(ctx context.Context, shipment *domain.Shipment, vehicle *domain.Vehicle, routeData *domain.RouteData, ruleScore float64) (float64, error) {
	if s == nil || !s.enabled {
		return 0, fmt.Errorf("ml inference disabled")
	}
	result, err := s.PredictMatchScoreWithDetails(ctx, shipment, vehicle, routeData, ruleScore)
	if err != nil {
		return 0, err
	}
	return result.Score, nil
}

// PredictMatchScoreWithDetails returns full prediction with confidence and explanation.
func (s *MLInferenceService) PredictMatchScoreWithDetails(ctx context.Context, shipment *domain.Shipment, vehicle *domain.Vehicle, routeData *domain.RouteData, ruleScore float64) (*MLPredictionResult, error) {
	if s == nil || !s.enabled {
		return nil, fmt.Errorf("ml inference disabled")
	}
	if shipment == nil || vehicle == nil {
		return nil, fmt.Errorf("missing shipment or vehicle")
	}

	payload := mlPredictRequest{
		RuleScore: clamp(ruleScore, 0, 100),
		Shipment: mlShipmentFeatures{
			ID:            shipment.ID,
			Source:        shipment.SourceLocation,
			Destination:   shipment.DestLocation,
			LoadWeight:    shipment.LoadWeight,
			LoadVolume:    shipment.LoadVolume,
			RequiredTemp:  shipment.RequiredTemp,
			DaysAvailable: shipment.DaysAvailable,
		},
		Vehicle: mlVehicleFeatures{
			ID:              vehicle.ID,
			DriverID:        vehicle.DriverID,
			Capacity:        vehicle.Capacity,
			MaxWeight:       vehicle.MaxWeight,
			IsRefrigerated:  vehicle.IsRefrigerated,
			Temperature:     vehicle.Temperature,
			CarbonFootprint: vehicle.CarbonFootprint,
			CurrentLocation: vehicle.CurrentLocation,
		},
		EngineeredFeatures: mlEngineeredFeatures{
			GeoCluster:            deriveGeoCluster(shipment.SourceLocation, shipment.DestLocation),
			SpoilageRiskScore:     computeSpoilageRiskScore(shipment),
			ShipmentDensity:       computeShipmentDensity(shipment),
			BackhaulPotentialFlag: computeBackhaulPotentialFlag(shipment, routeData),
			UtilizationVolumePct:  computeUtilizationPct(shipment.LoadVolume, vehicle.Capacity),
			UtilizationWeightPct:  computeUtilizationPct(shipment.LoadWeight, vehicle.MaxWeight),
		},
		Metadata: map[string]interface{}{
			"source": "looplink-backend",
		},
	}
	if routeData != nil {
		payload.Route = &mlRouteFeatures{
			DistanceKm:    routeData.Distance,
			EstimatedTime: routeData.EstimatedTime,
			CarbonKg:      routeData.CarbonFootprint,
			CostEstimate:  routeData.Cost,
		}
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal ml request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.endpointURL, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to build ml request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("ml request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read ml response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("ml service status %d: %s", resp.StatusCode, string(respBody))
	}

	var response map[string]interface{}
	if err := json.Unmarshal(respBody, &response); err != nil {
		return nil, fmt.Errorf("failed to parse ml response: %w", err)
	}

	// Parse score from response (try multiple possible field names)
	var score float64
	scoreFound := false
	for _, key := range []string{"ml_score", "score", "match_score"} {
		if v, ok := response[key]; ok {
			s, ok := toFloat64(v)
			if !ok {
				continue
			}
			if s <= 1.0 {
				s *= 100.0
			}
			score = clamp(s, 0, 100)
			scoreFound = true
			break
		}
	}
	if !scoreFound {
		return nil, fmt.Errorf("ml response missing score field")
	}

	// Parse confidence (0-1 range)
	confidence := 0.75 // default confidence
	if c, ok := response["confidence"]; ok {
		if cf, ok := toFloat64(c); ok {
			confidence = clamp(cf, 0, 1)
		}
	}

	// Parse explanation/reasoning
	explanation := "Model-based matching score"
	if exp, ok := response["explanation"]; ok {
		if s, ok := exp.(string); ok && strings.TrimSpace(s) != "" {
			explanation = s
		}
	}

	// Parse component factors
	factors := make(map[string]float64)
	if f, ok := response["factors"]; ok {
		if m, ok := f.(map[string]interface{}); ok {
			for k, v := range m {
				if fv, ok := toFloat64(v); ok {
					factors[k] = clamp(fv, 0, 100)
				}
			}
		}
	}

	return &MLPredictionResult{
		Score:       score,
		Confidence:  confidence,
		Explanation: explanation,
		Factors:     factors,
	}, nil
}

func toFloat64(v interface{}) (float64, bool) {
	switch t := v.(type) {
	case float64:
		return t, true
	case float32:
		return float64(t), true
	case int:
		return float64(t), true
	case int64:
		return float64(t), true
	case json.Number:
		f, err := t.Float64()
		if err != nil {
			return 0, false
		}
		return f, true
	default:
		return 0, false
	}
}

func clamp(v, min, max float64) float64 {
	return math.Max(min, math.Min(max, v))
}

func computeSpoilageRiskScore(shipment *domain.Shipment) float64 {
	if shipment == nil {
		return 0.0
	}
	risk := 0.0
	if shipment.RequiredTemp != -1 {
		risk += 0.45
	}
	loadType := strings.ToLower(strings.TrimSpace(shipment.LoadType))
	if strings.Contains(loadType, "perish") || strings.Contains(loadType, "dairy") || strings.Contains(loadType, "fruit") || strings.Contains(loadType, "vegetable") {
		risk += 0.25
	}
	if shipment.DaysAvailable <= 1 {
		risk += 0.30
	} else if shipment.DaysAvailable <= 3 {
		risk += 0.15
	}
	return clamp(risk, 0.0, 1.0)
}

func (s *MLInferenceService) GetPrice(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	return s.proxyRequest(ctx, "/price", payload)
}

func (s *MLInferenceService) TripAnalytics(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	return s.proxyRequest(ctx, "/trip_analytics", payload)
}

func (s *MLInferenceService) EfficiencyMetrics(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	return s.proxyRequest(ctx, "/efficiency_metrics", payload)
}

func (s *MLInferenceService) OptimizeRoute(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	return s.proxyRequest(ctx, "/optimize_route", payload)
}

func (s *MLInferenceService) FindBackhaul(ctx context.Context, payload map[string]interface{}) (map[string]interface{}, error) {
	return s.proxyRequest(ctx, "/find_backhaul", payload)
}

func (s *MLInferenceService) proxyRequest(ctx context.Context, path string, payload map[string]interface{}) (map[string]interface{}, error) {
	if s == nil || !s.enabled {
		return nil, fmt.Errorf("ml service disabled")
	}

	baseURL := strings.TrimSuffix(strings.TrimRight(s.endpointURL, "/"), "/optimize")
	if baseURL == "" {
		baseURL = "http://localhost:5000"
	}
	url := strings.TrimRight(baseURL, "/") + path

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("failed to build request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("status %d: %s", resp.StatusCode, string(respBody))
	}

	var response map[string]interface{}
	if err := json.Unmarshal(respBody, &response); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	return response, nil
}

func normalizeMLServiceURL(endpointURL string) string {
	trimmed := strings.TrimSpace(endpointURL)
	if trimmed == "" {
		trimmed = "http://localhost:5000"
	}
	trimmed = strings.TrimRight(trimmed, "/")
	if strings.HasSuffix(trimmed, "/optimize") {
		return trimmed
	}
	return trimmed + "/optimize"
}

func computeShipmentDensity(shipment *domain.Shipment) float64 {
	if shipment == nil {
		return 0.0
	}
	days := maxInt(shipment.DaysAvailable, 1)
	// Simple proxy for urgency-normalized shipment intensity.
	return float64(shipment.LoadWeight+shipment.LoadVolume*10) / float64(days)
}

func computeBackhaulPotentialFlag(shipment *domain.Shipment, routeData *domain.RouteData) int {
	if shipment == nil {
		return 0
	}
	if shipment.SourceLocation == shipment.DestLocation {
		return 0
	}
	if routeData != nil && routeData.Distance >= 180 {
		return 1
	}
	if shipment.DaysAvailable >= 2 {
		return 1
	}
	return 0
}

func computeUtilizationPct(load, capacity int) float64 {
	if capacity <= 0 {
		return 0.0
	}
	return clamp((float64(load)/float64(capacity))*100.0, 0.0, 100.0)
}

func deriveGeoCluster(source, destination string) string {
	src := normalizeLocationKey(source)
	dst := normalizeLocationKey(destination)
	if src == "" && dst == "" {
		return "UNKNOWN"
	}
	if src == "" {
		return "X-" + dst
	}
	if dst == "" {
		return src + "-X"
	}
	return src + "-" + dst
}

func normalizeLocationKey(location string) string {
	trimmed := strings.TrimSpace(location)
	if trimmed == "" {
		return ""
	}
	parts := strings.FieldsFunc(trimmed, func(r rune) bool {
		return r == ',' || r == '-' || r == '/' || r == '|'
	})
	if len(parts) == 0 {
		return ""
	}
	first := strings.ToUpper(strings.TrimSpace(parts[0]))
	if first == "" {
		return ""
	}
	if len(first) <= 3 {
		return first
	}
	return first[:3]
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
