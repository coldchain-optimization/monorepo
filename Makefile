.PHONY: help install dev dev-admin dev-driver-web dev-backend dev-all build build-all test clean docker-up docker-down migrate

help:
	@echo "LoopLink Monorepo - Available Commands"
	@echo ""
	@echo "Installation:"
	@echo "  make install              Install dependencies for all workspaces"
	@echo ""
	@echo "Development:"
	@echo "  make dev-admin            Start Admin Dashboard"
	@echo "  make dev-driver-web       Start Driver Dashboard"
	@echo "  make dev-backend          Start Backend API"
	@echo "  make dev-all              Start all services (requires concurrently)"
	@echo ""
	@echo "Build:"
	@echo "  make build                Build all applications"
	@echo "  make build-backend        Build backend binary"
	@echo ""
	@echo "Testing:"
	@echo "  make test                 Run all tests"
	@echo "  make test-backend         Run backend tests"
	@echo ""
	@echo "Database:"
	@echo "  make migrate              Run database migrations"
	@echo "  make migrate-down         Rollback database"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up            Start services with Docker Compose"
	@echo "  make docker-down          Stop Docker Compose services"
	@echo "  make docker-logs          View Docker logs"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean                Clean build artifacts and node_modules"
	@echo "  make lint                 Run linters"

install:
	@echo "Installing dependencies..."
	npm install
	cd services/backend && go mod download

dev-admin:
	@echo "Starting Admin Dashboard..."
	cd apps/admin-web && npm run dev

dev-driver-web:
	@echo "Starting Driver Dashboard..."
	cd apps/driver-web && npm run dev

dev-backend:
	@echo "Starting Backend API..."
	cd services/backend && go run ./cmd/api/main.go

dev-all:
	@echo "Starting all services..."
	npm run dev:all

build:
	@echo "Building all applications..."
	npm run build:all

build-backend:
	@echo "Building backend binary..."
	cd services/backend && go build -o bin/api ./cmd/api

test:
	@echo "Running all tests..."
	cd services/backend && go test ./...

test-backend:
	@echo "Running backend tests..."
	cd services/backend && go test -v ./...

migrate:
	@echo "Running database migrations..."
	cd services/backend && go run ./cmd/migration/main.go

migrate-down:
	@echo "Rolling back database migrations..."
	cd services/backend && go run ./cmd/migration/main.go down

docker-up:
	@echo "Starting Docker Compose services..."
	docker-compose up -d

docker-down:
	@echo "Stopping Docker Compose services..."
	docker-compose down

docker-logs:
	@echo "Viewing Docker Compose logs..."
	docker-compose logs -f

lint:
	@echo "Running linters..."
	cd apps/admin-web && npm run lint
	cd apps/driver-web && npm run lint
	cd services/backend && go fmt ./...

clean:
	@echo "Cleaning build artifacts..."
	rm -rf apps/admin-web/dist
	rm -rf apps/driver-web/dist
	rm -rf services/backend/bin
	rm -rf node_modules
	find . -type d -name node_modules -exec rm -rf {} +
	@echo "Clean complete!"

fmt:
	@echo "Formatting code..."
	cd services/backend && go fmt ./...
	cd apps/admin-web && npm run lint -- --fix
	cd apps/driver-web && npm run lint -- --fix

setup-env:
	@echo "Setting up environment files..."
	cp .env.example .env
	cp services/backend/.env.example services/backend/.env
	@echo "Environment files created. Please update with your configuration."

status:
	@echo "Monorepo Status"
	@echo "==============="
	@echo "Admin Web:"
	@test -d apps/admin-web && echo "✓ Present" || echo "✗ Missing"
	@echo "Driver Web:"
	@test -d apps/driver-web && echo "✓ Present" || echo "✗ Missing"
	@echo "Driver App:"
	@test -d apps/driver-app && echo "✓ Present" || echo "✗ Missing"
	@echo "Backend:"
	@test -d services/backend && echo "✓ Present" || echo "✗ Missing"
