# LoopLink Monorepo

Cold-chain logistics platform with:
- `services/backend`: Go + Gin API
- `services/driver-web`: React + Vite (JSX)
- `services/admin-web`: React + Vite (TypeScript)

## Quick Start

### 1. Start PostgreSQL
Use Docker Compose v2:

```bash
docker compose up -d postgres
```

### 2. Initialize Database + Seed Demo Data

```bash
cd services/backend
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f migrations/init.sql
PGPASSWORD=postgres psql -h localhost -U postgres -d looplink -f seed.sql
```

### 3. Run Backend

```bash
cd services/backend
go run cmd/api/main.go
```

Backend health:

```bash
curl http://localhost:8080/health
```

### 4. Run Frontends

Driver Web:

```bash
cd services/driver-web
npm install
npm run dev
```

Admin Web:

```bash
cd services/admin-web
npm install
npm run dev
```

Ports:
- Driver: `http://localhost:5173`
- Admin: `http://localhost:5174`
- Backend: `http://localhost:8080`

## Standard Dev Credentials

Seeded credentials are standardized in `services/backend/seed.sql`.

- Admin: `admin@looplink.com` / `admin123`
- Driver: `driver1@looplink.com` / `driver123`
- Shipper: `shipper1@looplink.com` / `shipper123`

## Notes on Password Handling

- New users created through `/api/v1/public/auth/signup` are still bcrypt-hashed.
- Seeded demo users are plain-text for predictable local setup.
- Login supports both hashed and seeded plain-text passwords to keep local development friction-free.

## Admin API Endpoints (Implemented)

- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/shipments`
- `GET /api/v1/admin/vehicles`
- `GET /api/v1/admin/drivers`
- `GET /api/v1/admin/knowledge-base`

All require an admin JWT token.
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
