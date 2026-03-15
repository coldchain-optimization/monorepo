# LoopLink Platform - Complete Setup & Run Guide

**Last Updated:** March 15, 2026  
**Platform:** Cold-Chain Logistics with Real-time Tracking & ML-Optimized Matching

---

## Table of Contents

1. [Quick Start (5 Minutes)](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Complete Setup Guide](#complete-setup-guide)
4. [Running All Services](#running-all-services)
5. [Database Setup](#database-setup)
6. [Test Credentials](#test-credentials)
7. [Service Ports & URLs](#service-ports--urls)
8. [End-to-End Demo Workflow](#end-to-end-demo-workflow)
9. [Troubleshooting](#troubleshooting)
10. [Architecture Overview](#architecture-overview)
11. [Development Guide](#development-guide)
12. [ML Model Integration](#ml-model-integration-optional)
13. [API Endpoints Reference](#api-endpoints-reference)

---

## Quick Start

Get everything running in 5 minutes:

```bash
# 1. Start PostgreSQL
docker compose up -d postgres

# 2. Initialize database (from root directory)
cd services/backend
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f migrations/init.sql
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f seed.sql
cd ..

# 3. Start Backend (Terminal 1)
cd services/backend
go run cmd/api/main.go
# Expects: "Server running on :8080"

# 4. Start Shipper Dashboard (Terminal 2)
cd services/shipper-web
npm install
npm run dev
# Expects: "http://localhost:5175"

# 5. Start Admin Dashboard (Terminal 3)
cd services/admin-web
npm install
npm run dev
# Expects: "http://localhost:5174"

# 6. Driver App (Terminal 4 - Physical Device via Expo Go)
cd services/driver-app
npm start
# Choose "Expo Go" option, then scan QR code on physical Android device
```

**Verify Everything:**
```bash
curl http://localhost:8080/api/v1/health
# Expected: {"status":"healthy"}
```

Now log in with [Test Credentials](#test-credentials) and start the [End-to-End Demo](#end-to-end-demo-workflow).

---

## Prerequisites

### Software Required
- **Go** 1.21+ ([Download](https://golang.org/dl/))
- **Node.js** 18+ & npm ([Download](https://nodejs.org/))
- **PostgreSQL** (via Docker, or locally)
- **Docker & Docker Compose v2+** ([Install Guide](https://docs.docker.com/compose/install/))
- **Git**

### System Requirements
- **RAM:** 4GB minimum (8GB recommended)
- **Disk:** 2GB free space
- **OS:** macOS, Linux, or Windows (WSL2)

### Browser Requirements
- Modern browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled

### Mobile Testing
- Android device (physical or emulator)
- **Expo Go** app installed from Google Play Store

---

## Complete Setup Guide

### Step 1: Clone & Navigate

```bash
cd /path/to/monorepo
ls -la
# Expect: services/, docker-compose.yml, Makefile, etc.
```

### Step 2: Setup PostgreSQL

```bash
# Start PostgreSQL container
docker compose up -d postgres

# Verify it's running
docker ps
# Look for "postgres" container with "Up" status

# Wait 10 seconds for database to be ready
sleep 10
```

### Step 3: Initialize Database

```bash
cd services/backend

# Create tables
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f migrations/init.sql
# Expected: "CREATE TABLE" messages

# Seed demo data
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f seed.sql
# Expected: "INSERT 0 [number]" messages

cd ../..
```

**What was created:**
- `users` - All user accounts (admins, drivers, shippers)
- `shippers` - Shipper company profiles
- `drivers` - Driver profiles
- `vehicles` - Vehicle fleet
- `shipments` - Shipment records
- `consignments` - Individual cargo items
- `knowledge_base` - Temperature/load guidelines
- `geocoding_cache` - Cached city coordinates (for route optimization)

---

## Running All Services

Open **4-5 separate terminal windows** and run each command:

### Terminal 1: Backend API

```bash
cd services/backend
go run cmd/api/main.go
```

**Expected Output:**
```
✓ Database connected
✓ Server running on :8080
✓ API ready at http://localhost:8080/api/v1
```

**Health Check:**
```bash
curl http://localhost:8080/api/v1/health
# Response: {"status":"healthy"}
```

**API Docs:** `http://localhost:8080/api/v1` (REST endpoints documented)

---

### Terminal 2: Shipper Dashboard (React Web)

```bash
cd services/shipper-web
npm install  # Only needed first time
npm run dev
```

**Expected Output:**
```
✓ VITE v4.x.x ready in [time]
➜ Local: http://localhost:5175/
```

**Access:** `http://localhost:5175`  
**Purpose:** Shipper creates shipments, tracks deliveries

---

### Terminal 3: Admin Dashboard (React Web)

```bash
cd services/admin-web
npm install  # Only needed first time
npm run dev
```

**Expected Output:**
```
✓ VITE v4.x.x ready in [time]
➜ Local: http://localhost:5174/
```

**Access:** `http://localhost:5174`  
**Purpose:** Admin assigns drivers, manages vehicles, tracks orders

---

### Terminal 4: Driver Mobile App

```bash
cd services/driver-app
npm start
```

**Expected Output:**
```
✓ Expo Dev Server running
✓ Metro bundler ready
? How would you like to open the app?
  › Expo Go
```

**Select "Expo Go"** and you'll see a QR code.

**On Physical Android Device:**
1. Open **Expo Go** app
2. Tap "Scan QR Code"
3. Point camera at terminal QR code
4. App loads on device

---

## Database Setup

### Initial Setup (Already Done)

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f migrations/init.sql
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f seed.sql
```

### View Database

```bash
# Connect to PostgreSQL
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink

# Available commands:
\dt              # List all tables
\d shipments     # Describe table schema
SELECT * FROM shipments LIMIT 5;  # Query data
\q               # Quit
```

### Reset Database (if needed)

```bash
# ⚠️ WARNING: This deletes all data
cd services/backend

# Drop and recreate
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-initialize
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f migrations/init.sql
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f seed.sql
```

### Database Structure

| Table | Purpose |
|-------|---------|
| `users` | Login accounts (admin, driver, shipper) |
| `shippers` | Shipper company profiles |
| `drivers` | Driver details (license, ratings) |
| `vehicles` | Refrigerated trucks inventory |
| `shipments` | Cold-chain shipment records |
| `consignments` | Individual items in shipments |
| `knowledge_base` | Product temperature guidelines |
| `geocoding_cache` | Cached city coordinates |

---

## Test Credentials

### Admin Account
- **Email:** `admin@looplink.com`
- **Password:** `admin123`
- **Role:** Platform administrator
- **Access:** Admin Dashboard (http://localhost:5174)
- **Permissions:** View all shipments, assign drivers, manage vehicles

### Shipper Account
- **Email:** `shipper1@looplink.com`
- **Password:** `shipper123`
- **Role:** Logistics company creating shipments
- **Access:** Shipper Dashboard (http://localhost:5175)
- **Permissions:** Create shipments, view own shipments

### Driver Account
- **Email:** `driver1@looplink.com`
- **Password:** `driver123`
- **Role:** Vehicle operator
- **Access:** Driver Mobile App
- **Permissions:** View assignments, track shipments, update status

### Additional Driver
- **Email:** `driver2@looplink.com`
- **Password:** `driver123`

---

## Service Ports & URLs

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Shipper Dashboard** | 5175 | http://localhost:5175 | Create & track shipments |
| **Admin Dashboard** | 5174 | http://localhost:5174 | Manage drivers & assignments |
| **Backend API** | 8080 | http://localhost:8080/api/v1 | REST API |
| **PostgreSQL** | 5432 | localhost (Docker) | Database |
| **Postgres Web UI** | 5050 | http://localhost:5050 (optional) | pgAdmin |

### Port Conflicts?

```bash
# Find what's using a port
lsof -i :5175

# Kill the process
kill -9 <PID>

# Or just stop all services
docker compose down
```

---

## End-to-End Demo Workflow

Complete a full shipment lifecycle in 10 minutes.

### Setup
Ensure all 4 services are running (see [Running All Services](#running-all-services)).

---

### Phase 1: Shipper Creates Shipment (5 min)

**Open:** http://localhost:5175 (Shipper Dashboard)

1. **Log In**
   - Email: `shipper1@looplink.com`
   - Password: `shipper123`

2. **Click "Create Shipment"** tab

3. **Fill Form:**
   - **From:** Mumbai
   - **To:** Delhi (or any destination)
   - **Load Type:** Vegetables
   - **Weight:** 500 kg
   - **Volume:** 2 cubic meters
   - **Min Temp:** 2°C
   - **Max Temp:** 8°C
   - **Est. Cost:** ₹5000

4. **Click "Create Shipment"**

   **Success:** Green notification showing shipment ID

---

### Phase 2: Admin Assigns Driver (5 min)

**Open:** http://localhost:5174 (Admin Dashboard)

1. **Log In**
   - Email: `admin@looplink.com`
   - Password: `admin123`

2. **Click "Shipments"** page

3. **Find your shipment** (Look for "Mumbai → Delhi")

4. **Click "Assign"** button

5. **In Modal:**
   - **Select Driver:** Rajesh Kumar (driver1@looplink.com)
   - **Select Vehicle:** Any available refrigerated truck
   - Click **"Assign Driver"**

   **Success:** Shipment status changes to "Assigned"

---

### Phase 3: Driver Accepts on Mobile

**Device:** Physical Android with Expo Go

1. **Log In**
   - Email: `driver1@looplink.com`
   - Password: `driver123`

2. **Click "Assignments"** tab

3. **See pending assignment**

4. **Click "Accept"**

   **Success:** Assignment moves to "Active"

---

### Phase 4: Track Live Status (End-to-End)

**Admin Dashboard:**
- Go to Shipments → Click your shipment
- See live GPS tracking with waypoints
- Temperature readings from vehicle

**Shipper Dashboard:**
- Go to My Shipments
- See delivery ETA and current location
- Temperature conditions being maintained

**Driver Mobile App:**
- See shipment details
- Current location and next waypoint
- Push notifications on status changes

---

## Troubleshooting

### Services Won't Start

#### Backend fails with "address already in use"
```bash
# Kill process on port 8080
lsof -i :8080
kill -9 <PID>

# Or restart everything
docker compose down
docker compose up -d postgres
```

#### Node/npm errors
```bash
# Clear cache and reinstall
cd services/shipper-web
rm -rf node_modules package-lock.json
npm install
npm run dev
```

#### Database connection failed
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# If not running:
docker compose up -d postgres

# Wait 10 seconds, then try backend again:
sleep 10
cd services/backend
go run cmd/api/main.go
```

### Login Issues

#### "Invalid credentials"
- Check spelling of email/password (case-sensitive)
- Verify seeding completed: `PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -c "SELECT COUNT(*) FROM users;"`
- Should show `7` users

#### "User not found"
- Database not seeded properly
- Reset database (see [Reset Database](#reset-database-if-needed))

### Port Already in Use

```bash
# Check if 5175 is taken
lsof -i :5175

# Kill and restart
kill -9 <PID>
cd services/shipper-web
npm run dev
```

### Driver App Won't Connect

1. Ensure Android device on **same WiFi** as Dev machine
2. Check backend is running: `curl http://localhost:8080/api/v1/health`
3. If QR code doesn't appear: `npm start` again
4. Clear Expo cache: `expo start --clear`

### GPS Tracking Not Showing

- Check admin/shipper dashboards open in browser
- Ensure Admin Dashboard has shipment open
- Backend must be running with: `go run cmd/api/main.go`
- Wait 5-10 seconds for tracking to begin

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────┐
│                    USERS                             │
├──────────────┬──────────────────┬──────────────────┤
│   Shipper    │     Admin        │     Driver       │
│   Web App    │     Web App      │   Mobile App     │
│ (React)      │    (React)       │  (React Native)  │
│ Port 5175    │    Port 5174     │   Expo Go        │
└─────────┬────┴────────┬─────────┴────────┬──────────┘
          │             │                  │
          └─────────────┼──────────────────┘
                        │ HTTPS/REST API
          ┌─────────────▼──────────────────┐
          │   Backend API (Go + Gin)       │
          │   Port 8080                    │
          │                                │
          │  • Authentication              │
          │  • Shipment Management         │
          │  • Driver Assignment           │
          │  • Real-time Tracking          │
          │  • ML-based Matching           │
          │  • Route Optimization          │
          └─────────────┬──────────────────┘
                        │ SQL
          ┌─────────────▼──────────────────┐
          │   PostgreSQL Database          │
          │   Port 5432                    │
          │                                │
          │  • Users & Roles               │
          │  • Shipments                   │
          │  • Vehicles & Drivers          │
          │  • Tracking Events             │
          │  • Geocoding Cache             │
          └────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend (Web)** | React + Vite + TypeScript |
| **Frontend (Mobile)** | React Native + Expo |
| **Backend** | Go 1.21+ with Gin framework |
| **Database** | PostgreSQL 13+ |
| **Authentication** | JWT tokens |
| **Real-time** | WebSockets (for tracking) |
| **Geocoding** | Photon API + Nominatim (fallback) |
| **ML Integration** | FastAPI (external service) |

### File Structure

```
monorepo/
├── services/
│   ├── backend/              # Go API
│   │   ├── cmd/api/          # Entry point
│   │   ├── internal/
│   │   │   ├── api/          # Handlers & routes
│   │   │   ├── domain/       # Models & entities
│   │   │   ├── repository/   # Database access
│   │   │   ├── services/     # Business logic
│   │   │   └── config/       # Configuration
│   │   ├── migrations/       # SQL migrations
│   │   ├── seed.sql          # Demo data
│   │   └── go.mod            # Go dependencies
│   │
│   ├── shipper-web/          # Shipper dashboard (React)
│   │   ├── src/
│   │   │   ├── pages/        # Page components
│   │   │   ├── components/   # Reusable components
│   │   │   ├── services/     # API calls
│   │   │   └── types/        # TypeScript types
│   │   └── package.json
│   │
│   ├── admin-web/            # Admin dashboard (React)
│   │   └── [Similar structure]
│   │
│   ├── driver-app/           # Driver mobile app (React Native)
│   │   ├── src/
│   │   │   ├── screens/      # Mobile screens
│   │   │   ├── components/   # UI components
│   │   │   ├── services/     # API integration
│   │   │   └── constants/    # Configuration
│   │   └── package.json
│   │
│   └── ml-service/           # ML model (FastAPI - optional)
│       ├── app.py
│       ├── requirements.txt
│       └── env/              # Python venv
│
├── docker-compose.yml        # PostgreSQL + services
├── Makefile                  # Build commands
└── SETUP_AND_RUN.md         # This file
```

---

## Development Guide

### Adding a New Feature

1. **Define Model** in `internal/domain/models.go`:
   ```go
   type MyEntity struct {
       ID    string
       Name  string
       // ... fields
   }
   ```

2. **Create Repository** in `internal/repository/my_entity_repo.go`:
   ```go
   type MyEntityRepository struct {
       db *sql.DB
   }
   
   func (r *MyEntityRepository) Create(ctx context.Context, entity *MyEntity) error {
       // SQL INSERT
   }
   ```

3. **Implement Service** in `internal/services/my_service.go`:
   ```go
   type MyService struct {
       repo *repository.MyEntityRepository
   }
   
   func (s *MyService) DoSomething(ctx context.Context) error {
       // Business logic
   }
   ```

4. **Add Handler** in `internal/api/handlers/my_handler.go`:
   ```go
   func (h *MyHandler) GetMyEntity(c *gin.Context) {
       // HTTP endpoint
   }
   ```

5. **Register Routes** in `internal/api/router.go`:
   ```go
   v1.GET("/myentity/:id", myHandler.GetMyEntity)
   ```

6. **Add Migration** in `migrations/NNN_add_my_entity.sql`:
   ```sql
   CREATE TABLE my_entity (
       id UUID PRIMARY KEY,
       name VARCHAR(255)
   );
   ```

### Running Tests

```bash
cd services/backend

# Run all tests
go test ./...

# Run with coverage
go test -cover ./...

# Run specific test
go test -run TestFunctionName ./...
```

### Building for Production

```bash
cd services/backend

# Build binary
go build -o looplink-api cmd/api/main.go

# Run binary
./looplink-api

# Or docker
docker build -t looplink-api .
docker run -p 8080:8080 looplink-api
```

### Environment Variables

Create `.env` in each service:

```bash
# services/backend/.env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/looplink
JWT_SECRET=your-secret-key
PORT=8080
```

```bash
# services/shipper-web/.env
VITE_API_URL=http://localhost:8080/api/v1
```

---

## ML Model Integration (Optional)

### Overview

The system optionally integrates with an external ML model for shipment-vehicle matching optimization.

### Setup

1. **Start ML Service** (if available):
   ```bash
   cd services/ml-service
   python -m venv env
   source env/bin/activate  # or `env\Scripts\activate` on Windows
   pip install -r requirements.txt
   python app.py
   # Listens on http://localhost:8000
   ```

2. **Configure Backend**:
   ```bash
   # services/backend/.env
   ML_ENABLED=true
   ML_SERVICE_URL=http://localhost:8000/optimize
   ML_TIMEOUT_MS=1200
   ML_BLEND_WEIGHT=0.35
   ```

3. **Restart Backend**:
   ```bash
   cd services/backend
   go run cmd/api/main.go
   ```

### ML Features

- **Intelligent Matching:** ML model predicts best driver-shipment pairs
- **Confidence Scores:** Shows how confident model is in recommendation
- **Explainability:** Returns human-readable reasoning for matches
- **Fallback:** Uses rule-based scoring if ML service unavailable

### Expected ML Input

```json
{
  "rule_score": 71.425,
  "shipment": {
    "id": "ship-001",
    "source": "Mumbai",
    "destination": "Delhi",
    "load_weight": 500,
    "required_temp": -18
  },
  "vehicle": {
    "id": "veh-001",
    "capacity": 10,
    "is_refrigerated": true,
    "temperature": -20
  },
  "route": {
    "distance_km": 1396.0,
    "estimated_time": 22
  }
}
```

### Expected ML Output

```json
{
  "ml_score": 91.425,
  "confidence": 0.87,
  "explanation": "Excellent match: Vehicle climate perfectly aligns with shipment needs; strong capacity efficiency; optimized routing.",
  "factors": {
    "temp_alignment": 95.0,
    "capacity_efficiency": 85.0,
    "route_optimization": 90.0
  }
}
```

See [ML_INTEGRATION_GUIDE.md](./ML_INTEGRATION_GUIDE.md) for complete details.

---

## API Endpoints Reference

### Authentication

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/auth/signup` | Create new account | None |
| POST | `/auth/login` | Get JWT token | None |
| POST | `/auth/logout` | Logout | JWT |

### Shipments

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/shipments` | Create shipment | JWT (Shipper) |
| GET | `/shipments` | List shipments | JWT |
| GET | `/shipments/:id` | Get shipment details | JWT |
| PATCH | `/shipments/:id` | Update shipment | JWT |
| DELETE | `/shipments/:id` | Cancel shipment | JWT |
| GET | `/shipments/:id/matches` | Find matching vehicles | JWT |
| GET | `/shipments/:id/best-match` | Get best match | JWT |

### Vehicle Management

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/vehicles` | List all vehicles | JWT |
| POST | `/vehicles` | Create vehicle | JWT (Admin) |
| GET | `/vehicles/:id` | Get vehicle details | JWT |
| PATCH | `/vehicles/:id` | Update vehicle | JWT (Admin) |

### Drivers

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/drivers` | List drivers | JWT |
| POST | `/drivers` | Register driver | None |
| GET | `/drivers/:id` | Get driver profile | JWT |
| PATCH | `/drivers/:id` | Update profile | JWT |

### Admin

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/admin/stats` | Dashboard stats | JWT (Admin) |
| GET | `/admin/users` | List all users | JWT (Admin) |
| GET | `/admin/shipments` | All shipments | JWT (Admin) |
| GET | `/admin/vehicles` | All vehicles | JWT (Admin) |

### Cities & Geocoding

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/cities/all` | All Indian cities | None |
| GET | `/cities/resolve?city=name` | Resolve city name → coordinates | None |
| GET | `/cities/search?q=pattern` | Search cities by name | None |

### Tracking

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/tracking/:shipmentId` | Get live tracking events | JWT |
| WS | `/ws/tracking/:shipmentId` | WebSocket for live updates | JWT |

### Health

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/health` | API health check | None |

---

## Getting Help

### Common Issues

1. **"Cannot connect to database"**
   - Ensure PostgreSQL is running: `docker ps`
   - Check password: `PGPASSWORD=postgres psql -h localhost -U postgres`

2. **"Port already in use"**
   - Kill process: `lsof -i :8080` → `kill -9 <PID>`

3. **"Module not found"**
   - `go mod download` (backend)
   - `npm install` (frontend)

4. **"Login fails"**
   - Reseed database: See [Reset Database](#reset-database-if-needed)

### Useful Commands

```bash
# View all running services
docker ps

# Stop all services
docker compose down

# View logs
docker compose logs postgres

# Restart specific service
docker compose restart postgres

# SSH into running container
docker exec -it postgres bash

# Check Go version
go version

# Check Node version
node --version
npm --version
```

---

## Next Steps

1. ✅ Complete [Quick Start](#quick-start)
2. ✅ Run [End-to-End Demo](#end-to-end-demo-workflow)
3. 📖 Explore API at `http://localhost:8080/api/v1`
4. 🚀 Build custom features using [Development Guide](#development-guide)
5. 🤖 Integrate ML model (see [ML Integration](#ml-model-integration-optional))

---

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review error messages in terminal logs
- Check database state: `psql -h localhost -U postgres -d looplink`
- Restart services: `docker compose down && docker compose up -d postgres`

---

**Last Updated:** March 15, 2026  
**Version:** 1.0  
**Status:** Production Ready
