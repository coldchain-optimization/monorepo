# Quick Start - Running All Services

## Backend (Go API)
```bash
cd services/backend
go run ./cmd/api/main.go
# Listens on http://localhost:8080/api/v1
```

## Shipper Dashboard (Web)
```bash
cd services/shipper-web
npm run dev
# Runs on http://localhost:5175 (or next available port)
```

## Admin Dashboard (Transporter/Admins Web)
```bash
cd services/admin-web
npm run dev
# Runs on http://localhost:5174
```

## Driver Mobile App
```bash
# Already running on physical Android device via Expo Go
# If not running:
cd services/driver-app
npm start  # Then choose "Expo Go" option
```

---

## All Services Running Check

```bash
# Backend health
curl http://localhost:8080/api/v1/health

# Shipper Web
curl http://localhost:5175 (or correct port if shifted)

# Admin Web
curl http://localhost:5174
```

## Try the Demo

1. Open http://localhost:5175 (Shipper Dashboard)
   - Login: shipper1@looplink.com / shipper123
   - Create a shipment

2. Open http://localhost:5174 (Admin/Transporter Dashboard)
   - Login: admin@looplink.com / admin123
   - Click "Shipments" page
   - Assign the shipment to driver1

3. On Physical Android Device (Driver Mobile App)
   - Go to "Assignments" tab
   - Click "Check for New"
   - Accept the assignment

---

## Service Ports

| Interface | Port | URL |
|-----------|------|-----|
| Shipper Dashboard | 5175+ | http://localhost:5175 |
| Admin Dashboard | 5174 | http://localhost:5174 |
| Backend API | 8080 | http://localhost:8080/api/v1 |
| PostgreSQL | 5432 | localhost (Docker) |

---

## Kill a Service

```bash
# If a port is stuck:
lsof -i :5175  # Find process
kill -9 <PID>  # Kill it

# Or in terminal:
Ctrl+C  # Stop the dev server
```

