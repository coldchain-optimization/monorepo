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
	VehicleID       string   `json:"vehicle_id"`
	DriverID        string   `json:"driver_id"`
	MatchScore      float64  `json:"match_score"`
	EstimatedCost   float64  `json:"estimated_cost"`
	EstimatedTime   int      `json:"estimated_time"` // in minutes
	CarbonFootprint float64  `json:"carbon_footprint"`
	Reasons         []string `json:"reasons"`
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
