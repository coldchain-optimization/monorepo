# LoopLink Monorepo Setup Guide

This guide will help you set up the complete LoopLink logistics platform monorepo.

## Project Overview

LoopLink is a comprehensive logistics matching and route optimization platform consisting of:
- **Admin Dashboard** (React Web App)
- **Driver Dashboard** (React Web App)
- **Driver Mobile App** (React Native)
- **Backend API** (Go)

All managed as a single monorepo with shared dependencies and coordinated development.

## Prerequisites

### Required Software
- **Node.js**: 20.19+ or 22.12+ (get from https://nodejs.org/)
- **Go**: 1.21+ (get from https://golang.org/)
- **PostgreSQL**: 12+ (get from https://www.postgresql.org/)
- **Git**: 2.0+ (get from https://git-scm.com/)

### Optional but Recommended
- **Docker**: Latest version (for containerized development)
- **Docker Compose**: Latest version
- **VS Code**: Latest version (excellent Go support)
- **Postman**: For API testing

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd refactored
```

### 2. Install Dependencies

```bash
# Install all Node dependencies (for admin-web, driver-web, driver-app)
npm install

# Go dependencies are managed per package with go.mod
```

### 3. Setup Environment Variables

```bash
# Copy example environment files
cp .env.example .env
cp services/backend/.env.example services/backend/.env

# Edit the files with your configuration
nano .env
nano services/backend/.env
```

Key variables to configure:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` - PostgreSQL connection
- `JWT_SECRET` - Change to a secure random string
- `GOOGLE_MAPS_API_KEY` - Get from Google Cloud Console

### 4. Setup PostgreSQL Database

#### Option A: Local Installation

```bash
# Create database and user
createuser looplink_user
createdb -O looplink_user looplink

# Update .env with credentials
```

#### Option B: Docker

```bash
# Use the docker-compose setup
docker-compose up -d postgres
```

### 5. Run Database Migrations

```bash
cd services/backend
go run ./cmd/migration/main.go
```

## Development Workflow

### Starting All Services

```bash
# Option 1: Using npm script (requires concurrently)
npm install -D concurrently
npm run dev:all

# Option 2: Using Make
make dev-all

# Option 3: Manual - Open 3 terminals
# Terminal 1: Admin Dashboard
npm run dev:admin

# Terminal 2: Driver Dashboard  
npm run dev:driver-web

# Terminal 3: Backend API
npm run dev:backend
```

### Running Individual Services

```bash
# Admin Dashboard
cd apps/admin-web
npm install
npm run dev
# Runs on http://localhost:5173

# Driver Dashboard
cd apps/driver-web
npm install
npm run dev
# Runs on http://localhost:5174

# Driver Mobile App (Expo)
cd apps/driver-app
npm install
npm start
# Follow Expo instructions for iOS/Android

# Backend API
cd services/backend
go run ./cmd/api/main.go
# Runs on http://localhost:8080
```

## Using Docker Compose

### Start All Services with Docker

```bash
# Build and start all containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services Available

- **Admin Dashboard**: http://localhost:5173
- **Driver Dashboard**: http://localhost:5174
- **Backend API**: http://localhost:8080
- **PostgreSQL**: localhost:5432

## Testing APIs

### Using curl

```bash
# Register new user
curl -X POST http://localhost:8080/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","role":"driver"}'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# List shipments (with token)
curl -X GET http://localhost:8080/api/v1/shipments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Using Postman

1. Import the API collection: `services/backend/postman_collection.json`
2. Set up environment variables with your base URL and JWT token
3. Test endpoints with pre-configured requests

## Project Structure Reference

```
refactored/
├── apps/
│   ├── admin-web/
│   │   ├── src/
│   │   │   ├── components/     # UI Components
│   │   │   ├── pages/          # Page components
│   │   │   ├── lib/            # Utilities
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   ├── driver-web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── lib/
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── driver-app/
│       ├── app/               # Expo Router screens
│       ├── components/
│       ├── constants/
│       ├── hooks/
│       ├── state/
│       ├── app.json           # Expo configuration
│       └── package.json
│
├── services/
│   └── backend/
│       ├── cmd/
│       │   ├── api/
│       │   │   └── main.go    # API server entry point
│       │   └── migration/
│       │       └── main.go    # Database migration runner
│       │
│       ├── internal/
│       │   ├── api/
│       │   │   ├── handlers/  # HTTP request handlers
│       │   │   ├── middleware/# Auth, logging, error handling
│       │   │   └── router.go  # Route definitions
│       │   │
│       │   ├── domain/
│       │   │   └── models.go  # Business entities
│       │   │
│       │   ├── services/      # Business logic layer
│       │   │   ├── auth_service.go
│       │   │   ├── matching_engine.go
│       │   │   ├── route_service.go
│       │   │   └── ...
│       │   │
│       │   ├── repository/    # Data access layer
│       │   │
│       │   ├── database/
│       │   │   ├── db.go      # Connection management
│       │   │   └── migrations/# SQL migration files
│       │   │
│       │   ├── config/
│       │   │   └── config.go  # Configuration management
│       │   │
│       │   └── utils/
│       │       ├── jwt.go
│       │       ├── validators.go
│       │       └── ...
│       │
│       ├── pkg/
│       │   ├── logger/        # Logging utilities
│       │   └── maps/          # Google Maps client
│       │
│       ├── migrations/        # SQL migration files
│       │   ├── 001_create_tables.sql
│       │   ├── 002_create_indexes.sql
│       │   └── ...
│       │
│       ├── go.mod             # Go module definition
│       ├── go.sum             # Dependency lock file
│       ├── Dockerfile         # Container image definition
│       ├── .env.example       # Example environment variables
│       └── README.md          # Backend-specific documentation
│
├── package.json               # Monorepo root package.json
├── docker-compose.yml         # Development container setup
├── Makefile                   # Build and development commands
├── .env.example               # Example environment variables
├── SETUP.md                   # This file
└── README.md                  # Main project documentation
```

## Common Tasks

### Adding a New Backend Endpoint

1. Define the handler in `services/backend/internal/api/handlers/`
2. Add the route in `services/backend/internal/api/router.go`
3. Implement service logic in `services/backend/internal/services/`
4. Add repository methods if needed in `services/backend/internal/repository/`

### Adding a New Database Table

1. Create migration file: `services/backend/migrations/XXX_add_table.sql`
2. Run migrations: `go run ./cmd/migration/main.go`
3. Update domain models in `services/backend/internal/domain/models.go`

### Adding a Frontend Page

For Admin Dashboard:
1. Create component in `apps/admin-web/src/pages/`
2. Add route in `apps/admin-web/src/main.tsx`
3. Add navigation link in `apps/admin-web/src/components/Navbar.tsx`

### Testing Backend Changes

```bash
cd services/backend

# Run all tests
go test ./...

# Run specific test
go test ./internal/services -v

# Run with coverage
go test -cover ./...
```

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process using port 8080 (example)
lsof -i :8080
kill -9 <PID>
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d looplink

# Check services/backend/.env for correct credentials
```

### Node Modules Issues

```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Go Module Issues

```bash
cd services/backend

# Download modules
go mod download

# Clean cache
go clean -modcache

# Tidy up
go mod tidy
```

### Frontend Not Connecting to Backend

1. Check backend is running on http://localhost:8080
2. Verify `VITE_API_URL` in frontend .env
3. Check CORS settings in `services/backend/.env`
4. Check network tab in browser developer tools

## Next Steps

1. **Explore the Admin Dashboard**: http://localhost:5173
2. **Explore the Driver Dashboard**: http://localhost:5174
3. **Test API endpoints**: Use Postman or curl
4. **Read API documentation**: See `services/backend/README.md`
5. **Review matching engine logic**: See `services/backend/internal/services/matching_engine.go`

## Getting Help

- Check the [Main README](./README.md) for architecture overview
- Review individual service READMEs in their directories
- Check git commit history for context on decisions
- Ask team members or create documentation issues

## Development Tips

### VS Code Recommended Extensions

- **Go**: golang.go
- **REST Client**: humao.rest-client
- **Thunder Client**: rangav.vscode-thunder-client
- **SQLTools**: mtxr.sqltools
- **Prettier**: esbenp.prettier-vscode
- **ESLint**: dbaeumer.vscode-eslint

### VS Code Settings

```json
{
  "[go]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  },
  "[typescript]": {
    "editor.formatOnSave": true
  }
}
```

## Performance Optimization

### Backend
- Enable query result caching
- Use connection pooling
- Implement API rate limiting
- Add request logging

### Frontend
- Lazy load components
- Optimize images
- Enable CSS minification
- Use production build for testing

## Security Checklist

- [ ] Change `JWT_SECRET` from default value
- [ ] Use HTTPS in production
- [ ] Enable CORS only for trusted origins
- [ ] Use environment variables for secrets
- [ ] Validate all user inputs
- [ ] Implement rate limiting
- [ ] Use prepared statements in queries
- [ ] Keep dependencies updated

---

**Last Updated**: March 2026
**Status**: Active Development
