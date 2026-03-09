# LoopLink Monorepo Structure Guide

## What is a Monorepo?

A monorepo (monolithic repository) is a single Git repository that contains multiple projects/applications. In LoopLink's case, it contains:
- Multiple frontend applications (admin-web, driver-web, driver-app)
- A single backend service (Go API)
- Shared configuration and documentation

## Current Project Layout

```
MP (Project Root - Original)
├── adminWeb/          ← Admin Dashboard (Original location)
├── driverWeb/         ← Driver Dashboard (Original location)
├── driverApp/         ← Driver Mobile App (Original location)
├── backend/           ← Go Backend (Original location)
│   ├── cmd/
│   ├── internal/
│   ├── migrations/
│   ├── pkg/
│   └── go.mod
└── refactored/        ← NEW MONOREPO STRUCTURE
    ├── apps/
    │   ├── admin-web/     ← Will reference ../adminWeb
    │   ├── driver-web/    ← Will reference ../driverWeb
    │   └── driver-app/    ← Will reference ../driverApp
    ├── services/
    │   └── backend/       ← Will reference ../backend
    ├── package.json       ← Monorepo workspace config
    ├── docker-compose.yml
    ├── Makefile
    ├── README.md
    ├── SETUP.md
    └── .gitignore
```

## How the Monorepo Works

### Current Approach: Symlinks/References

The existing applications stay in their current locations:
- `/media/muon/New Volume1/Academics/BY/Theory/sem8/MP/adminWeb/`
- `/media/muon/New Volume1/Academics/BY/Theory/sem8/MP/driverWeb/`
- `/media/muon/New Volume1/Academics/BY/Theory/sem8/MP/driverApp/`
- `/media/muon/New Volume1/Academics/BY/Theory/sem8/MP/backend/`

The `refactored/` folder acts as the monorepo entry point that:
1. Provides unified development commands
2. Manages shared dependencies
3. Coordinates all services
4. Provides Docker Compose orchestration
5. Centralizes documentation

### Monorepo Commands (from refactored/ directory)

```bash
cd refactored

# Install all dependencies
npm install

# Start all services
npm run dev:all

# Build everything
npm run build:all

# Run tests
npm run test

# Use Make commands
make dev-all
make docker-up
make test-backend
```

## Directory References

When working from the `refactored/` directory, services are referenced as:

### Frontend Apps Structure
```
refactored/apps/admin-web/
├── package.json
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── PackagingPage.tsx
│   │   ├── SchedulePage.tsx
│   │   └── ShipmentPage.tsx
│   └── main.tsx
├── vite.config.ts
└── tsconfig.json
```

### Backend Structure
```
refactored/services/backend/
├── cmd/
│   ├── api/
│   │   └── main.go
│   └── migration/
│       └── main.go
├── internal/
│   ├── api/
│   │   ├── handlers/
│   │   │   ├── auth_handler.go
│   │   │   ├── shipment_handler.go
│   │   │   ├── vehicle_handler.go
│   │   │   └── route_handler.go
│   │   ├── middleware/
│   │   │   └── auth.go
│   │   └── router.go
│   ├── domain/
│   │   └── models.go
│   ├── services/
│   │   ├── auth_service.go
│   │   ├── matching_engine.go
│   │   ├── route_service.go
│   │   └── shipment_service.go
│   ├── repository/
│   │   ├── user_repo.go
│   │   ├── shipment_repo.go
│   │   └── vehicle_repo.go
│   ├── database/
│   │   ├── db.go
│   │   └── migrations/
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_shipments.sql
│   │       └── ...
│   ├── config/
│   │   └── config.go
│   └── utils/
│       ├── jwt.go
│       └── validators.go
├── migrations/
│   ├── 001_create_users.sql
│   ├── 002_create_shipments.sql
│   └── ...
├── go.mod
├── go.sum
├── Dockerfile
└── .env.example
```

## Workflow: Making Changes

### Updating Admin Dashboard

```bash
# From project root
cd MP/adminWeb
npm install          # if dependencies changed
npm run dev         # start development server

# Or from monorepo
cd MP/refactored
npm run dev:admin
```

### Updating Driver Dashboard

```bash
# From project root
cd MP/driverWeb
npm run dev

# Or from monorepo
cd MP/refactored
npm run dev:driver-web
```

### Updating Driver App

```bash
# From project root
cd MP/driverApp
npm start            # Expo

# Or from monorepo (requires Expo CLI)
cd MP/refactored/apps/driver-app
npm start
```

### Updating Backend

```bash
# From project root
cd MP/backend
go run ./cmd/api/main.go

# Or from monorepo
cd MP/refactored
npm run dev:backend

# Or
make dev-backend
```

## Development Best Practices

### 1. Always Start from Monorepo Root

```bash
cd MP/refactored
npm run dev:all   # Coordinates all services
```

### 2. Use Make Commands for Consistency

```bash
make help         # See all available commands
make dev-all      # Start everything
make docker-up    # Use containerized setup
```

### 3. Environment Configuration

All services use environment variables. Copy and configure:
```bash
cp .env.example .env
cp services/backend/.env.example services/backend/.env
```

### 4. Database Migrations

Always run from backend:
```bash
cd MP/refactored/services/backend
go run ./cmd/migration/main.go
```

## Integration Points

### Frontend ↔ Backend Communication

**Admin Dashboard API Calls**
```typescript
// apps/admin-web/src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Example: Create shipment
fetch(`${API_URL}/shipments`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(shipmentData)
});
```

**Driver Dashboard API Calls**
```typescript
// apps/driver-web/src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

// Example: Get assigned deliveries
fetch(`${API_URL}/deliveries?driver_id=${driverId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Backend Endpoints

**Matching Engine**
```
POST /api/v1/matching/search
{
  "shipment_id": "string",
  "max_budget": 1000.0,
  "requirements": {
    "temperature": "5-15°C",
    "weight_kg": 500,
    "distance_km": 100
  }
}

Response: 200 OK
{
  "matches": [
    {
      "vehicle_id": "string",
      "score": 0.95,
      "cost": 850.0,
      "carbon_footprint": 45.2
    }
  ]
}
```

## Docker Compose Services

When running `docker-compose up -d`:

```yaml
Services:
├── postgres         # Database on port 5432
├── backend         # API on port 8080
├── admin-web       # Dashboard on port 5173
└── driver-web      # Dashboard on port 5174
```

All services can communicate using service names:
- Backend connects to `postgres` (not localhost)
- Frontend points to `http://backend:8080`

## Monorepo Benefits

1. **Unified Commands**: Single entry point for all operations
2. **Shared Dependencies**: Install once, use everywhere
3. **Coordinated Deployment**: All services versioned together
4. **Easy Navigation**: Clear structure for developers
5. **Simplified CI/CD**: Single repository for automation
6. **Consistent Documentation**: Centralized guides
7. **Docker Orchestration**: One-command setup

## File Locations Reference

| Item | Original | Monorepo |
|------|----------|----------|
| Admin Web | `MP/adminWeb/` | `MP/refactored/apps/admin-web/` |
| Driver Web | `MP/driverWeb/` | `MP/refactored/apps/driver-web/` |
| Driver App | `MP/driverApp/` | `MP/refactored/apps/driver-app/` |
| Backend | `MP/backend/` | `MP/refactored/services/backend/` |
| Config | N/A | `MP/refactored/.env` |
| Docker | N/A | `MP/refactored/docker-compose.yml` |
| Documentation | N/A | `MP/refactored/README.md`, `SETUP.md` |

## Next Steps

1. **Review the structure**: `ls -la refactored/`
2. **Read main docs**: `cat refactored/README.md`
3. **Follow setup guide**: `cat refactored/SETUP.md`
4. **Start development**: `cd refactored && make dev-all`
5. **Test API**: Use Postman with endpoints listed in docs

---

For any questions about the monorepo structure, refer to `SETUP.md` or main `README.md`.
