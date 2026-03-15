package domain

import "time"

// User roles
const (
	RoleAdmin   = "admin"
	RoleShipper = "shipper"
	RoleDriver  = "driver"
	RoleT       = "transporting_body" // Transporting body
	RoleH       = "help_seeking_body" // Help seeking body
)

// Shipment statuses
const (
	ShipmentPending   = "pending"
	ShipmentBooked    = "booked"
	ShipmentInTransit = "in_transit"
	ShipmentDelivered = "delivered"
	ShipmentCancelled = "cancelled"
)

// Vehicle types
const (
	VehicleSmall        = "small"
	VehicleMedium       = "medium"
	VehicleLarge        = "large"
	VehicleRefrigerated = "refrigerated"
)

// User represents a user in the system
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"-"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Shipper represents a company that ships goods
type Shipper struct {
	ID             string    `json:"id"`
	UserID         string    `json:"user_id"`
	CompanyName    string    `json:"company_name"`
	CompanyAddress string    `json:"company_address"`
	PhoneNumber    string    `json:"phone_number"`
	TaxID          string    `json:"tax_id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// Driver represents a driver in the system
type Driver struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	LicenseNumber string    `json:"license_number"`
	PhoneNumber   string    `json:"phone_number"`
	Rating        float64   `json:"rating"`
	Role          string    `json:"role"` // transporting_body or help_seeking_body
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Vehicle represents a vehicle owned by a driver
type Vehicle struct {
	ID              string    `json:"id"`
	DriverID        string    `json:"driver_id"`
	VehicleType     string    `json:"vehicle_type"`
	LicensePlate    string    `json:"license_plate"`
	Manufacturer    string    `json:"manufacturer"`
	Model           string    `json:"model"`
	Year            int       `json:"year"`
	Capacity        int       `json:"capacity"`   // in cubic meters
	MaxWeight       int       `json:"max_weight"` // in kg
	IsRefrigerated  bool      `json:"is_refrigerated"`
	Temperature     int       `json:"temperature"` // in Celsius
	FuelType        string    `json:"fuel_type"`
	CarbonFootprint float64   `json:"carbon_footprint"` // per km
	IsAvailable     bool      `json:"is_available"`
	CurrentLocation string    `json:"current_location"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Shipment represents a shipment to be delivered
type Shipment struct {
	ID              string    `json:"id"`
	ShipperID       string    `json:"shipper_id"`
	SourceLocation  string    `json:"source_location"`
	DestLocation    string    `json:"destination_location"`
	LoadWeight      int       `json:"load_weight"` // in kg
	LoadVolume      int       `json:"load_volume"` // in cubic meters
	LoadType        string    `json:"load_type"`
	RequiredTemp    int       `json:"required_temp"` // in Celsius (-1 if not refrigerated)
	DaysAvailable   int       `json:"days_available"`
	TimeWindowStart time.Time `json:"time_window_start"`
	TimeWindowEnd   time.Time `json:"time_window_end"`
	Status          string    `json:"status"`
	AssignedVehicle string    `json:"assigned_vehicle"` // Vehicle ID
	EstimatedCost   float64   `json:"estimated_cost"`
	ActualCost      float64   `json:"actual_cost"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// Consignment represents additional stops/detours for a shipment
type Consignment struct {
	ID                string    `json:"id"`
	ShipmentID        string    `json:"shipment_id"`
	SourceLocation    string    `json:"source_location"`
	DestLocation      string    `json:"destination_location"`
	LoadWeight        int       `json:"load_weight"`
	LoadVolume        int       `json:"load_volume"`
	ExtraTime         int       `json:"extra_time"` // in minutes
	BonusMoney        float64   `json:"bonus_money"`
	EstimatedDetourKm int       `json:"estimated_detour_km"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// MatchingRequest represents a request for matching shipments to vehicles
type MatchingRequest struct {
	ShipmentID string `json:"shipment_id"`
	Limit      int    `json:"limit"`
}

// MatchResult represents the result of a matching operation
type MatchResult struct {
	VehicleID        string        `json:"vehicle_id"`
	DriverID         string        `json:"driver_id"`
	MatchScore       float64       `json:"match_score"` // 0-1 scale
	EstimatedCost    float64       `json:"estimated_cost"`
	PricingBreakdown *PricingBreak `json:"pricing_breakdown"`
	EstimatedTime    int           `json:"estimated_time"` // in minutes
	CarbonFootprint  float64       `json:"carbon_footprint"`
	Reasons          []string      `json:"reasons"`
	ScoreDetails     *ScoreDetails `json:"score_details"`
}

// PricingBreak shows itemized costs
type PricingBreak struct {
	BaseRate             float64 `json:"base_rate"`             // per km
	Distance             float64 `json:"distance"`              // km
	DistanceCost         float64 `json:"distance_cost"`         // base × distance
	RefrigerationCost    float64 `json:"refrigeration_cost"`    // if temp required
	DeviationCost        float64 `json:"deviation_cost"`        // extra stops/detours
	ConsolidationSavings float64 `json:"consolidation_savings"` // if consolidated
	Total                float64 `json:"total"`
}

// ScoreDetails shows breakdown of match score calculation
type ScoreDetails struct {
	RouteOverlap      float64 `json:"route_overlap"`      // 0-1, weighted 0.30
	TempMatch         float64 `json:"temp_match"`         // 0-1, weighted 0.25
	CapacityFit       float64 `json:"capacity_fit"`       // 0-1, weighted 0.20
	TimeMatch         float64 `json:"time_match"`         // 0-1, weighted 0.15
	DistanceDeviation float64 `json:"distance_deviation"` // 0-1, weighted 0.10
	FinalScore        float64 `json:"final_score"`        // 0-1
}

// KnowledgeBase represents ML training data for matching
type KnowledgeBase struct {
	ID            string    `json:"id"`
	ShipmentID    string    `json:"shipment_id"`
	VehicleID     string    `json:"vehicle_id"`
	MatchScore    float64   `json:"match_score"`
	EstimatedCost float64   `json:"estimated_cost"`
	ActualCost    float64   `json:"actual_cost"`
	PricingFactor float64   `json:"pricing_factor"`
	TimeFactor    float64   `json:"time_factor"`
	CarbonFactor  float64   `json:"carbon_factor"`
	RouteMetadata string    `json:"route_metadata"` // JSON metadata
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// RouteData represents route information
type RouteData struct {
	From            string  `json:"from"`
	To              string  `json:"to"`
	Distance        float64 `json:"distance"`         // in km
	EstimatedTime   int     `json:"estimated_time"`   // in minutes
	CarbonFootprint float64 `json:"carbon_footprint"` // in kg CO2
	Cost            float64 `json:"cost"`
}

// TrackingEvent represents a GPS location event during transit
type TrackingEvent struct {
	ID                   string    `json:"id"`
	ShipmentID           string    `json:"shipment_id"`
	VehicleID            string    `json:"vehicle_id"`
	Latitude             float64   `json:"latitude"`
	Longitude            float64   `json:"longitude"`
	Speed                float64   `json:"speed"`       // km/h
	Heading              float64   `json:"heading"`     // 0-360 degrees
	Temperature          int       `json:"temperature"` // Current vehicle temp
	Status               string    `json:"status"`      // "in_transit", "stopped", "idle"
	DistanceTraveledKm   float64   `json:"distance_traveled_km"`
	DistanceRemainingKm  float64   `json:"distance_remaining_km"`
	EstimatedArrivalTime time.Time `json:"estimated_arrival_time"`
	CreatedAt            time.Time `json:"created_at"`
}

// TrackingSummary represents current shipment tracking status
type TrackingSummary struct {
	ShipmentID          string    `json:"shipment_id"`
	CurrentLocation     string    `json:"current_location"`
	Latitude            float64   `json:"latitude"`
	Longitude           float64   `json:"longitude"`
	Status              string    `json:"status"`
	DriverName          string    `json:"driver_name"`
	VehicleInfo         string    `json:"vehicle_info"`
	DistanceTraveledKm  float64   `json:"distance_traveled_km"`
	DistanceRemainingKm float64   `json:"distance_remaining_km"`
	EstimatedArrival    time.Time `json:"estimated_arrival"`
	Speed               float64   `json:"speed"`
	Temperature         int       `json:"temperature"`
	LastUpdate          time.Time `json:"last_update"`
}

// StatusEvent represents a status change event during shipment lifecycle
type StatusEvent struct {
	ID          string    `json:"id"`
	ShipmentID  string    `json:"shipment_id"`
	DriverID    string    `json:"driver_id"`
	Status      string    `json:"status"` // "pickup", "in_transit", "delivered"
	Location    string    `json:"location"`
	Latitude    float64   `json:"latitude"`
	Longitude   float64   `json:"longitude"`
	Description string    `json:"description"`
	ProofImage  string    `json:"proof_image"` // Base64 encoded image or URL
	CreatedAt   time.Time `json:"created_at"`
}
