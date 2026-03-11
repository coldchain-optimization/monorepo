# ColdChain Optimization Platform - API Contract Documentation

## Overview
This document defines the complete backend-frontend API contract for the ColdChain Optimization Platform, ensuring proper data flow between Go backend and React frontends.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────┐
│          ColdChain Optimization Platform                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  FRONTEND LAYER (React 19 + TypeScript)               │
│  ├─ Driver Web (Port 5173)                            │
│  │  ├─ Pages: Login, Dashboard, MyVehicles,          │
│  │  │         MyProfile, Matching, Backhauling       │
│  │  └─ API Client: Axios-based with JWT              │
│  │                                                     │
│  └─ Admin Web (Port 5174)                            │
│     └─ Pages: Dashboard, Users, Analytics            │
│                                                       │
│  API LAYER (JSON/REST)                               │
│  └─ Base URL: http://localhost:8080/api/v1           │
│     Authentication: Bearer Token (JWT)               │
│                                                       │
│  BACKEND LAYER (Go + Gin)                            │
│  ├─ Port: 8080                                       │
│  ├─ 37 API Routes (Auth, Drivers, Vehicles, Matching)
│  └─ Data Models: User, Driver, Vehicle, Shipment    │
│                                                       │
│  DATABASE LAYER (PostgreSQL)                         │
│  └─ Port: 5432                                       │
│     15 Tables with full cold-chain schema            │
└─────────────────────────────────────────────────────────┘
```

## Data Model Types

### 1. User (Auth)
**Purpose**: Authentication and user profile
**Backend**: `internal/domain/models.go`
**Frontend**: `src/types/index.ts`

| Field | Type | Backend | Frontend | Usage |
|-------|------|---------|----------|-------|
| `id` | string | UUID | string | Unique identifier |
| `email` | string | varchar | string | Login credential |
| `password` | string | hashed | - | Not exposed to frontend |
| `first_name` | string | varchar | string | User display |
| `last_name` | string | varchar | string | User display |
| `role` | enum | driver/shipper/admin | driver/shipper/admin | Authorization |
| `created_at` | timestamp | timestamp | string | Metadata |
| `updated_at` | timestamp | timestamp | string | Metadata |

### 2. Driver
**Purpose**: Driver profile and statistics
**Backend**: `Shipment.go` (100+ lines struct)
**Frontend**: `types/index.ts` (Driver interface)

| Field | Type | Backend | Frontend | Remarks |
|-------|------|---------|----------|---------|
| `id` | string | UUID | string | Primary key |
| `user_id` | string | UUID | string | Reference to User |
| `license_number` | string | varchar | string | Government issued |
| `phone_number` | string | varchar | string | Contact |
| `rating` | float64 | numeric | number | 0-5 stars |
| `role` | enum | transporting_body/help_seeking_body | string | Job role |
| `is_active` | boolean | boolean | boolean | Account status |
| `created_at` | timestamp | timestamp | string | Registration date |
| `updated_at` | timestamp | timestamp | string | Last update |

### 3. Vehicle ⭐ CRITICAL
**Purpose**: Transporter assets with cold-chain capability
**Backend Location**: `internal/domain/models.go` (lines 69-88)
**Frontend Location**: `src/types/index.ts`

| Field | Backend | Frontend | Type | Notes |
|-------|---------|----------|------|-------|
| `id` | id | id | UUID | Primary key |
| `driver_id` | driver_id | driver_id | string | FK to Driver |
| `vehicle_type` | vehicle_type | vehicle_type | enum: small/medium/large/refrigerated | Capacity class |
| `license_plate` | license_plate | license_plate | string | Registration number |
| `manufacturer` | **manufacturer** | **manufacturer** | string | Ashok Leyland, Tata, etc. |
| `model` | **model** | **model** | string | Cargo, LCV, etc. |
| `year` | **year** | **year** | integer | Manufacturing year |
| `capacity` | **capacity** | **capacity** | integer | **Cubic meters (m³)** |
| `max_weight` | **max_weight** | **max_weight** | integer | **Kilograms (kg)** |
| `is_refrigerated` | **is_refrigerated** | **is_refrigerated** | boolean | Cold-chain capable |
| `temperature` | **temperature** | **temperature** | integer | **Celsius (°C)** - SINGLE VALUE |
| `fuel_type` | **fuel_type** | **fuel_type** | string | diesel/petrol/cng/electric |
| `carbon_footprint` | **carbon_footprint** | **carbon_footprint** | float | per km |
| `is_available` | **is_available** | **is_available** | boolean | Ready for dispatch |
| `current_location` | current_location | current_location | string | City/GPS |
| `created_at` | created_at | created_at | timestamp | Registration time |
| `updated_at` | updated_at | updated_at | timestamp | Last modified |

**⚠️ CRITICAL CHANGES FROM PREVIOUS VERSION**:
- ❌ OLD: `temperature_min`, `temperature_max` (REMOVED)
- ✅ NEW: `temperature` (single Celsius value)
- ✅ Added: `manufacturer`, `model`, `year`, `fuel_type`, `carbon_footprint`
- ✅ Renamed: Capacity is cubic meters, NOT kilograms
- ✅ Max_weight is kilograms

### 4. Shipment ⭐ CRITICAL
**Purpose**: Load/cargo request from shipper
**Backend**: `internal/domain/models.go` (lines 90-110)
**Frontend**: `src/types/index.ts`

| Field | Backend | Frontend | Type | Notes |
|-------|---------|----------|------|-------|
| `id` | id | id | UUID | Shipment tracking ID |
| `shipper_id` | shipper_id | shipper_id | string | FK to Shipper |
| **`source_location`** | **source_location** | **source_location** | string | **Previously: `source`** |
| **`destination_location`** | **destination_location** | **destination_location** | string | **Previously: `destination`** |
| **`load_weight`** | **load_weight** | **load_weight** | integer | **kg - Previously: `weight`** |
| **`load_volume`** | **load_volume** | **load_volume** | integer | **m³** |
| **`load_type`** | **load_type** | **load_type** | string | General Cargo, Perishable, etc. |
| **`required_temp`** | **required_temp** | **required_temp** | integer | **°C - Previously: `temperature_min/max`** |
| `days_available` | days_available | days_available | integer | Days before expiry |
| **`time_window_start`** | **time_window_start** | **time_window_start** | timestamp | **Pickup date-time** |
| **`time_window_end`** | **time_window_end** | **time_window_end** | timestamp | **Delivery date-time** |
| `status` | status | status | enum | pending/booked/in_transit/delivered |
| `assigned_vehicle` | assigned_vehicle | assigned_vehicle | string | FK to Vehicle |
| `estimated_cost` | estimated_cost | estimated_cost | float | ₹ Cost estimate |
| `actual_cost` | actual_cost | actual_cost | float | ₹ Actual cost |
| `created_at` | created_at | created_at | timestamp | Order date |
| `updated_at` | updated_at | updated_at | timestamp | Last update |

**⚠️ CRITICAL CHANGES FROM PREVIOUS VERSION**:
- ❌ OLD: `source`, `destination`, `weight`, `pickup_date`, `delivery_date`
- ✅ NEW: `source_location`, `destination_location`, `load_weight`, `time_window_start/end`
- ✅ Added: `load_volume`, `load_type`, `required_temp` (single), `days_available`
- ❌ REMOVED: Non-existent fields like `temperature_min`, `temperature_max`, `description`, `shipper.phone`

### 5. MatchResult
**Purpose**: AI matching engine output connecting vehicle to shipment
**Backend**: `internal/domain/models.go` (lines 129-137)
**Frontend**: `src/types/index.ts`

| Field | Type | Backend | Frontend | Usage |
|-------|------|---------|----------|-------|
| `id` | string | UUID | string | Match ID |
| `shipment_id` | string | UUID | string | FK to Shipment |
| `vehicle_id` | string | UUID | string | FK to Vehicle |
| `driver_id` | string | UUID | string | FK to Driver |
| `match_score` | float64 (0-1) | numeric | number | Quality score (80%= excellent) |
| `estimated_cost` | float64 | numeric | number | ₹ Cost for this match |
| `estimated_time` | int | minutes | number | Delivery time estimate |
| `carbon_footprint` | float64 | numeric | number | CO₂ per km |
| `reasons` | []string | jsonb array | string[] | Why matched |
| `shipment` | Shipment | FK join | Shipment | Full shipment details |

---

## Frontend Pages & API Contracts

### Page: Backhauling (backhauling_match_showcase)

**Purpose**: Find return shipments to optimize routes and earn revenue

**API Calls**:
1. `GET /matching/search` → `POST /matching/search` (BODY: `{limit: 50}`)
   - Returns: `{ matches: MatchResult[] }`
   - Each match contains `match.shipment` with Shipment structure

**Component Fields Used** (`src/pages/Backhauling.tsx`):
```tsx
// Correct field mappings after fix:
shipment.source_location         // Route origin
shipment.destination_location    // Route destination
shipment.load_weight             // Weight in kg
shipment.load_type               // Cargo type
shipment.required_temp           // Refrigeration temp
shipment.load_volume             // Volume in m³
shipment.time_window_start       // Pickup date
shipment.time_window_end         // Delivery deadline
shipment.estimated_cost          // ₹ Revenue
shipment.shipper?.user?.*        // Shipper contact
```

**Status**: ✅ FIXED - JSX syntax corrected, field names aligned

---

### Page: MyVehicles (transporter_vehicle_management)

**Purpose**: CRUD for driver's vehicle fleet

**API Calls**:
1. `GET /drivers/me/vehicles` → Returns: `{ vehicles: Vehicle[] }`
2. `POST /vehicles` → Create vehicle (BODY: CreateVehicleRequest)
3. `PUT /vehicles/{id}` → Update vehicle

**Form ↔ API Mapping** (`src/pages/MyVehicles.tsx`):
```tsx
// Form data → Backend mapping:
licensePlate        → license_plate
vehicleType         → vehicle_type
manufacturer        → manufacturer         // NEW
model               → model                // NEW
year                → year                 // NEW
capacity            → capacity             // Changes to m³
maxWeight           → max_weight           // RENAMED
isRefrigerated      → is_refrigerated      // NEW
temperature         → temperature          // CHANGED: single °C
fuelType            → fuel_type            // NEW
currentLocation     → current_location

// OLD REMOVED:
// temperatureMin, temperatureMax (now single temperature)
```

**Display Fields** (vehicle card):
```tsx
vehicle.license_plate            // DL01AB1234
vehicle.manufacturer             // Ashok Leyland
vehicle.model                    // Cargo LCV
vehicle.year                     // 2022
vehicle.vehicle_type             // refrigerated
vehicle.max_weight               // 5000 (kg)
vehicle.temperature              // 2 (°C)
vehicle.capacity                 // 20 (m³)
vehicle.current_location         // New Delhi
vehicle.is_available             // true/false
```

**Status**: ✅ FIXED - Form structure updated, display fields corrected

---

### Page: Matching (primary_opportunity_showcase)

**Purpose**: Browse and accept shipment matches

**API Calls**:
1. `POST /matching/search` (BODY: `{limit: 20}`)
   - Returns: `{ matches: MatchResult[] }`

**Component Fields** (`src/pages/Matching.tsx`):
```tsx
// Match display:
match.match_score              // 85% (displayed as percentage)
match.shipment.source_location // Origin
match.shipment.destination_location // Destination
match.shipment.load_weight     // kg
match.shipment.load_type       // Cargo type
match.shipment.required_temp   // °C
match.shipment.load_volume     // m³
match.shipment.time_window_start  // Pickup (date)
match.shipment.time_window_end    // Delivery deadline (date)
match.shipment.estimated_cost  // ₹
match.estimated_cost           // ₹ (from match, not shipment)
match.estimated_time           // minutes
```

**Status**: ✅ FIXED - Field names aligned with backend structure

---

### Page: Dashboard (driver_home_screen)

**Purpose**: Home screen showing recent matches and quick actions

**API Calls**:
1. `POST /matching/search` (implicit, for recent matches)
2. `GET /drivers/me/vehicles` (check if driver registered)

**Fields Used**:
```tsx
recentMatches.map(match => {
  match.match_score           // Percentage match
  match.shipment.source_location     // Origin
  match.shipment.destination_location// Destination
  match.shipment.estimated_cost      // ₹ Revenue
  match.reasons               // Why matched
})
```

**Status**: ✅ FIXED - Field names corrected

---

## API Endpoint Reference

### Authentication

```http
POST /api/v1/public/auth/login
Content-Type: application/json

{
  "email": "driver@looplink.com",
  "password": "Driver@123456"
}

Response 200:
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "email": "driver@looplink.com",
    "role": "driver",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Vehicles

```http
GET /api/v1/drivers/me/vehicles
Authorization: Bearer {token}

Response 200:
{
  "vehicles": [
    {
      "id": "uuid",
      "license_plate": "DL01AB1234",
      "vehicle_type": "refrigerated",
      "manufacturer": "Ashok Leyland",
      "model": "Cargo",
      "year": 2022,
      "capacity": 20,      // m³
      "max_weight": 5000,  // kg
      "is_refrigerated": true,
      "temperature": 2,    // °C
      "fuel_type": "diesel",
      "carbon_footprint": 0.45,
      "is_available": true,
      "current_location": "New Delhi"
    }
  ]
}
```

### Matching

```http
POST /api/v1/matching/search
Authorization: Bearer {token}
Content-Type: application/json

{
  "limit": 50
}

Response 200:
{
  "matches": [
    {
      "match_id": "uuid",
      "shipment": {
        "id": "uuid",
        "source_location": "Mumbai",
        "destination_location": "Delhi",
        "load_weight": 1500,        // kg
        "load_volume": 10,          // m³
        "load_type": "Perishable",
        "required_temp": 2,         // °C
        "time_window_start": "2026-03-15T08:00:00Z",
        "time_window_end": "2026-03-20T18:00:00Z",
        "estimated_cost": 45000,    // ₹
        "status": "pending",
        "shipper": {
          "id": "uuid",
          "company_name": "FreshGoods Ltd",
          "phone": "9876543210",
          "user": {
            "first_name": "Rajesh",
            "last_name": "Sharma",
            "email": "rajesh@freshgoods.com"
          }
        }
      },
      "vehicle_id": "uuid",
      "driver_id": "uuid",
      "match_score": 0.87,          // 87%
      "estimated_cost": 45000,      // ₹
      "estimated_time": 360,        // minutes
      "carbon_footprint": 125.5,    // kg CO₂
      "reasons": [
        "Route overlap 95%",
        "Temperature compatible",
        "5+ star rating"
      ]
    }
  ]
}
```

---

## Current Test Credentials

### Driver (Transport Body)
```
Email: driver@looplink.com
Password: Driver@123456
Role: driver
Vehicle: Refrigerated truck available
```

### Admin (Help Seeking Body)
```
Email: testadmin@test.com
Password: Test123456
Role: admin
Access: Dashboard, Analytics
```

### Shipper (Help Seeking Body)
```
Email: shipper@looplink.com
Password: Shipper@123456
Role: shipper
Access: Create shipments
```

---

## Service Status

| Service | Port | Status | Protocol |
|---------|------|--------|----------|
| Backend (Go/Gin) | 8080 | ✅ Running | HTTP |
| Driver Frontend | 5173 | ✅ Running | HTTPS (dev) |
| Admin Frontend | 5174 | ✅ Running | HTTPS (dev) |
| PostgreSQL | 5432 | ✅ Running | TCP |
| Redis (optional) | 6379 | ⏸ Not in use | TCP |

---

## Troubleshooting

### "404 on matching/search endpoint"
**Cause**: API sending to wrong endpoint or wrong HTTP method
**Check**: `src/api/client.ts` - `searchMatches()` should use `POST` with body, not `GET`
**Status**: ✅ FIXED in searchMatches()

### "Undefined property errors in Backhauling"
**Cause**: Using old field names (`source` instead of `source_location`)
**Check**: `src/pages/Backhauling.tsx` - uses correct fields now
**Status**: ✅ FIXED - all fields aligned

### "Vehicle display shows wrong values"
**Cause**: Mixing up capacity (m³) with max_weight (kg)
**Check**: `src/pages/MyVehicles.tsx` - now shows max_weight for kg
**Status**: ✅ FIXED - display corrected

### "Temperature range not working"
**Cause**: Backend only has single `temperature` field, not min/max
**Check**: Update components to use `vehicle.temperature` (single value)
**Status**: ✅ FIXED - removed temperature_min/max references

---

## Schema Validation Checklist

- [x] Shipment type matches Go struct (source_location, destination_location, load_weight, etc.)
- [x] Vehicle type includes all fields (manufacturer, model, year, capacity, max_weight, temperature)
- [x] MyVehicles form sends correct field names to API
- [x] Backhauling component uses correct Shipment fields
- [x] Matching component displays MatchResult correctly
- [x] Dashboard displays recent matches with correct fields
- [x] API client searchMatches() uses POST with body
- [x] All services running and responding
- [x] PostgreSQL connected and initialized
- [x] Build succeeds without TypeScript errors

---

## Migration Notes from Old Version

If you were working with previous schema:

| Old Field | New Field | Type Change | Page |
|-----------|-----------|-------------|------|
| `source` | `source_location` | ✅ Same | Backhauling, Matching, Dashboard |
| `destination` | `destination_location` | ✅ Same | Backhauling, Matching, Dashboard |
| `weight` | `load_weight` | ✅ Same | Backhauling |
| `pickup_date` | `time_window_start` | string (timestamp) | Matching |
| `delivery_date` | `time_window_end` | string (timestamp) | Matching |
| `temperature_min/max` | `required_temp` | Single value (°C) | Backhauling |
| `description` | REMOVED | - | Backhauling |
| N/A | `load_type` | ADDED | Backhauling, Matching |
| N/A | `load_volume` | ADDED | Backhauling |

---

**Document Version**: 1.0  
**Last Updated**: March 12, 2026  
**Status**: ✅ API Contract Synchronized - Ready for Production Testing
