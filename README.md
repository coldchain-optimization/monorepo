# LoopLink Platform - Cold Chain Logistics

**Complete real-time shipment tracking, ML-optimized vehicle matching, and driver management for refrigerated logistics.**

[![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)]()
[![Go Version](https://img.shields.io/badge/go-1.21%2B-blue)]()
[![Node Version](https://img.shields.io/badge/node-18%2B-blue)]()

---

## 🚀 Quick Start

**Get everything running in 5 minutes:**

```bash
# 1. Start database
docker compose up -d postgres

# 2. Setup database  
cd services/backend
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f migrations/init.sql
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f seed.sql

# 3. Start all services (in separate terminals)
cd services/backend && go run cmd/api/main.go           # Terminal 1: Backend (port 8080)
cd services/shipper-web && npm install && npm run dev   # Terminal 2: Shipper (port 5175)
cd services/admin-web && npm install && npm run dev     # Terminal 3: Admin (port 5174)
cd services/driver-app && npm start                     # Terminal 4: Driver (Expo Go)

# 4. Verify
curl http://localhost:8080/api/v1/health
```

**📖 For detailed instructions, see [SETUP_AND_RUN.md](./SETUP_AND_RUN.md)**

---

## 📋 Complete Documentation

All setup, configuration, and operational steps are documented in **[SETUP_AND_RUN.md](./SETUP_AND_RUN.md)**, including:

- ✅ Complete Prerequisites & Environment Setup
- ✅ Complete Step-by-Step Installation Guide
- ✅ Running All 4 Microservices
- ✅ Database Initialization & Management
- ✅ Test Credentials & Demo Workflow
- ✅ Service Ports & URL Reference
- ✅ Full End-to-End Demo (10 min walkthrough)
- ✅ Troubleshooting Guide
- ✅ Architecture Overview
- ✅ Development Guide (adding features)
- ✅ ML Integration (optional)
- ✅ API Endpoints Reference
- ✅ Common Commands & Utilities

**👉 Start with [SETUP_AND_RUN.md](./SETUP_AND_RUN.md)**

---

## 🏗️ Architecture

**Tech Stack:**
- **Frontend (Web):** React + Vite + TypeScript
- **Frontend (Mobile):** React Native + Expo
- **Backend:** Go 1.21+ with Gin framework
- **Database:** PostgreSQL 13+
- **APIs:** REST with JWT authentication
- **Real-time:** WebSockets for live tracking
- **Geocoding:** Photon API + Nominatim (auto-fallback)

**Services:**
- `services/backend/` - Go REST API (port 8080)
- `services/shipper-web/` - Shipper dashboard React app (port 5175)
- `services/admin-web/` - Admin dashboard React app (port 5174)
- `services/driver-app/` - Driver mobile app (React Native + Expo)
- `services/ml-service/` - Optional ML model for route optimization

---

## 🔐 Demo Credentials

All seeded in database. Login with:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Admin | admin@looplink.com | admin123 | Admin dashboard (5174) |
| Shipper | shipper1@looplink.com | shipper123 | Shipper dashboard (5175) |
| Driver | driver1@looplink.com | driver123 | Mobile app (Expo) |

---

## 📚 Other Docs

- **[ENDPOINT_SCHEMA_SUMMARY.md](./ENDPOINT_SCHEMA_SUMMARY.md)** - ML model endpoint specifications
- **[DEMO_WORKFLOW.md](./DEMO_WORKFLOW.md)** - Step-by-step demo walkthrough
- **[ML_INTEGRATION_GUIDE.md](./ML_INTEGRATION_GUIDE.md)** - ML model integration details
- **[ML_IMPLEMENTATION_SUMMARY.md](./ML_IMPLEMENTATION_SUMMARY.md)** - ML model implementation notes
- **[QUICKSTART.md](./QUICKSTART.md)** - Service quick start (see SETUP_AND_RUN.md instead)

---

## ✨ Key Features

✅ **Real-time Shipment Tracking** - Live GPS with route simulation  
✅ **Intelligent Driver Assignment** - ML-optimized vehicle matching  
✅ **Temperature Management** - Cold chain monitoring & alerts  
✅ **Mobile-First Driver App** - React Native on Android/iOS  
✅ **Admin Dashboard** - Full fleet & shipment management  
✅ **Shipper Portal** - Create & track shipments  
✅ **Geocoding** - Automatic city → coordinates resolution  
✅ **Persistent Caching** - Cached geocoding for fast queries  
✅ **JWT Authentication** - Secure token-based auth  

---

## 🐛 Troubleshooting

**Can't connect to database?**
```bash
docker ps  # Check if postgres is running
docker compose up -d postgres  # Start if needed
```

**Port already in use?**
```bash
lsof -i :8080  # Find process
kill -9 <PID>  # Kill it
```

**Login fails?**
```bash
# Reseed demo data
cd services/backend
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f seed.sql
```

**See [SETUP_AND_RUN.md - Troubleshooting](./SETUP_AND_RUN.md#troubleshooting) for more.**

---

## 🚦 Service Status

| Service | Port | Status |
|---------|------|--------|
| Backend API | 8080 | ✅ Running |
| Shipper Web | 5175 | ✅ Running |
| Admin Web | 5174 | ✅ Running |
| Driver App | Expo | ✅ Running |
| PostgreSQL | 5432 | ✅ Running |

---

## 📖 Development

**Architecture & Design:**
- Microservices with Go backend + React frontends
- Domain-driven design with repositories & services
- **See [SETUP_AND_RUN.md - Development Guide](./SETUP_AND_RUN.md#development-guide) for adding features**

**File Structure:**
```
monorepo/
├── services/
│   ├── backend/         # Go API
│   ├── shipper-web/     # Shipper React app
│   ├── admin-web/       # Admin React app
│   ├── driver-app/      # Driver mobile app
│   └── ml-service/      # ML model (optional)
├── SETUP_AND_RUN.md     # 👈 Complete guide (start here)
└── docker-compose.yml
```

---

## 🤖 ML Integration (Optional)

The system optionally integrates with an external ML service for intelligent shipment-vehicle matching.

**See [ML_INTEGRATION_GUIDE.md](./ML_INTEGRATION_GUIDE.md) for full details.**

```bash
# Start ML service (if available)
cd services/ml-service
python -m venv env
source env/bin/activate
pip install -r requirements.txt
python app.py  # Listens on port 8000
```

---

## 📝 License

Internal project for LoopLink Platform.

---

## 🎯 Next Steps

1. **Read** [SETUP_AND_RUN.md](./SETUP_AND_RUN.md) (5 min read)
2. **Run** Quick Start section (5 min setup)
3. **Try** End-to-End Demo (10 min demo)
4. **Build** Custom features using Development Guide

**Questions?** Check [SETUP_AND_RUN.md - Troubleshooting](./SETUP_AND_RUN.md#troubleshooting)

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
