# LoopLink Logistics Platform - Refactored Monorepo

A complete logistics matching and route optimization platform with a modern microservices architecture.

## Project Structure

```
refactored/
├── apps/
│   ├── admin-web/          # Admin Dashboard (React + TypeScript + Vite)
│   ├── driver-web/         # Driver Dashboard (React + TypeScript + Vite)
│   └── driver-app/         # Driver Mobile App (React Native + Expo)
├── services/
│   └── backend/            # Go-based API Server & Matching Engine
├── docker-compose.yml      # Local development setup
├── package.json           # Monorepo root package.json
└── README.md
```

## Features

### Admin Dashboard (adminWeb)
- **Order Management**: Create and manage shipment orders
- **Packaging Management**: Handle packaging and logistics
- **Schedule Planning**: View and manage delivery schedules
- **Shipment Tracking**: Monitor all active shipments
- **Real-time Dashboard**: Live status updates

### Driver Dashboard (driverWeb)
- **Delivery Management**: View assigned deliveries
- **Route Optimization**: Optimized routes with Google Maps integration
- **Real-time Tracking**: Live location updates
- **Performance Metrics**: Track earnings and deliveries
- **Responsive Design**: Works on all devices

### Driver Mobile App (driverApp)
- **On-the-Go Management**: Complete mobile experience
- **GPS Integration**: Real-time location tracking
- **Offline Support**: Work without internet connection
- **Push Notifications**: Instant delivery alerts
- **Native Performance**: React Native for iOS and Android

### Backend API (Go)
- **Matching Engine**: ML-ready hardcoded matching logic
  - Matches shipments to vehicles based on:
    - Cost constraints
    - Temperature requirements
    - Weight/Capacity constraints
    - Time windows
    - Carbon footprint metrics
  
- **Route Optimization**: Integration-ready for Google Maps API
  - Multi-stop route calculation
  - Backhauling support
  - Real-time ETAs

- **Authentication**: JWT-based secure authentication
  - Role-based access (Admin, Driver, Shipper)
  - Secure token management

- **RESTful API**: Complete CRUD operations for:
  - Users & Authentication
  - Shipments & Orders
  - Vehicles & Drivers
  - Route Optimization
  - Matching Results

- **Knowledge Base**: Extensible data structure for ML integration
  - Shipment metadata storage
  - Vehicle specifications
  - Historical matching data
  - Performance metrics

## Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Mobile**: React Native + Expo
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI / shadcn/ui
- **Maps**: Leaflet + Google Maps API
- **State Management**: React Router
- **Animations**: Framer Motion

### Backend
- **Language**: Go 1.21+
- **Framework**: Gin Web Framework
- **Database**: PostgreSQL
- **Authentication**: JWT (golang-jwt)
- **Maps API**: Google Maps Go Client
- **Testing**: Go testing package
- **Deployment**: Docker & Docker Compose

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose (local dev)
- **Package Management**: npm (monorepo workspaces)

## Getting Started

### Prerequisites
- Node.js 20.19+ or 22.12+
- Go 1.21+
- PostgreSQL 12+
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd refactored
   ```

2. **Install dependencies**
   ```bash
   # Install Node dependencies for all workspaces
   npm install
   
   # Install Go dependencies (in services/backend)
   cd services/backend
   go mod download
   ```

3. **Setup environment variables**
   ```bash
   # Backend
   cp services/backend/.env.example services/backend/.env
   
   # Configure your database, JWT secret, and API keys
   ```

4. **Setup database**
   ```bash
   cd services/backend
   go run ./cmd/migration/main.go
   ```

### Running the Applications

#### Development Mode - All Services

```bash
# From root directory
npm run dev:all

# Or run individually:
npm run dev:admin          # Admin Dashboard on localhost:5173
npm run dev:driver-web     # Driver Dashboard on localhost:5174
npm run dev:backend        # Backend API on localhost:8080
```

#### Production Build

```bash
# Build all applications
npm run build:all

# Backend binary will be at: services/backend/bin/api
```

## API Documentation

### Base URL
```
http://localhost:8080/api/v1
```

### Authentication
All API requests require a JWT token in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

### Key Endpoints

#### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login and get JWT token
- `POST /auth/refresh` - Refresh expired token

#### Shipments
- `POST /shipments` - Create new shipment
- `GET /shipments` - List all shipments
- `GET /shipments/{id}` - Get shipment details
- `PUT /shipments/{id}` - Update shipment
- `DELETE /shipments/{id}` - Delete shipment

#### Vehicles
- `POST /vehicles` - Register new vehicle
- `GET /vehicles` - List all vehicles
- `GET /vehicles/{id}` - Get vehicle details
- `PUT /vehicles/{id}` - Update vehicle

#### Matching Engine
- `POST /matching/search` - Find best vehicle for shipment
  ```json
  {
    "shipment_id": "string",
    "max_budget": 1000.0,
    "temp_requirement": "5-15°C",
    "weight_kg": 500,
    "distance_km": 100
  }
  ```

#### Route Optimization
- `POST /routes/optimize` - Calculate optimal route
  ```json
  {
    "driver_id": "string",
    "shipment_ids": ["id1", "id2"],
    "start_location": "lat,lon",
    "end_location": "lat,lon"
  }
  ```

## Matching Engine Architecture

### Hardcoded Logic (Phase 1)
The matching engine currently uses deterministic rules to match shipments with vehicles:

1. **Cost Filter**: Exclude vehicles exceeding budget
2. **Capacity Check**: Verify weight/volume constraints
3. **Temperature Match**: Match temp requirements
4. **Time Window**: Check delivery time feasibility
5. **Scoring**: Calculate match score based on:
   - Cost efficiency (80% weight)
   - Carbon footprint (10% weight)
   - Time efficiency (10% weight)

### ML Integration (Phase 2 - Future)
The knowledge base stores all matching data for ML model training:
- Historical shipment metadata
- Vehicle specifications
- Matching outcomes and feedback
- Performance metrics

ML models will be integrated via API to replace the hardcoded logic.

## Database Schema

### Core Tables
- `users` - User accounts (drivers, admins, shippers)
- `vehicles` - Vehicle inventory with specifications
- `shipments` - Shipment orders with requirements
- `matching_history` - Historical matching records
- `routes` - Route optimization data
- `deliveries` - Delivery tracking information

### Knowledge Base Tables
- `kb_shipments` - Shipment metadata for ML
- `kb_vehicles` - Vehicle specifications
- `kb_matching_rules` - Configurable matching rules

## Development Guidelines

### Code Structure
- **Clear separation of concerns**: handlers → services → repositories → database
- **Dependency injection**: Services receive dependencies via constructors
- **Interface-based design**: Easy to mock and test
- **Error handling**: Consistent error responses
- **Logging**: Structured logging throughout

### Adding New Features

1. **Define domain model** in `internal/domain/models.go`
2. **Create repository** in `internal/repository/`
3. **Implement service** in `internal/services/`
4. **Add API handler** in `internal/api/handlers/`
5. **Register routes** in `internal/api/router.go`
6. **Add database migration** in `migrations/`

## Testing

```bash
# Backend tests
cd services/backend
go test ./...
go test ./... -v

# Frontend tests
npm run test --workspace=admin-web
npm run test --workspace=driver-web
```

## Deployment

### Docker Compose (Local Development)
```bash
docker-compose up -d
```

### Production
1. Build Docker images for all services
2. Push to container registry
3. Deploy with Kubernetes or similar orchestration
4. Configure environment variables for production
5. Setup reverse proxy (Nginx) for API gateway

## Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL=postgres://user:password@localhost:5432/looplink
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=looplink

# Server
PORT=8080
GIN_MODE=debug

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRY=24h

# Google Maps API
GOOGLE_MAPS_API_KEY=your_api_key

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

## Architecture Decision Records

### Why Go for Backend?
- High performance for matching engine computations
- Excellent concurrency handling with goroutines
- Fast startup time
- Cross-platform binary compilation
- Great for microservices

### Why PostgreSQL?
- ACID compliance for transactional integrity
- JSONB support for flexible schema (ML data)
- PostGIS extension for location-based queries
- Excellent for relational data

### Why Separate Frontend Apps?
- Independent deployment cycles
- Optimized for specific user roles
- Mobile app for on-the-go driver experience
- Web apps for complex admin and monitoring tasks

## Contributing

1. Create a feature branch
2. Make your changes in the appropriate workspace
3. Test locally with `npm run dev:all`
4. Commit with clear messages
5. Push and create a pull request

## Future Enhancements

- [ ] Real-time WebSocket support for live tracking
- [ ] ML-based matching engine integration
- [ ] Advanced route optimization algorithms
- [ ] Payment processing integration
- [ ] SMS/Email notifications
- [ ] Analytics dashboard
- [ ] Mobile app for iOS/Android stores
- [ ] API documentation (Swagger)
- [ ] GraphQL API option
- [ ] Event-driven architecture with message queues

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review API documentation
- Contact the development team

---

**Status**: Active Development
**Last Updated**: March 2026
**Maintainers**: LoopLink Development Team
