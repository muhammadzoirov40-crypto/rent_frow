# RentFlow - Equipment Rental Management Platform

A full-stack rental management platform built with React, FastAPI, and PostgreSQL.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend:** Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2
- **Database:** PostgreSQL 16
- **Infrastructure:** Docker, Docker Compose, Redis, MinIO (S3-compatible)

## Features

- **Two user roles:** Owner and Customer
- **Equipment management:** Create, update, delete equipment listings
- **Booking system:** Book equipment with date validation and overlap prevention
- **Rental lifecycle:** Pickup, active, return, inspection, completion
- **Payment tracking:** Booking fees, deposits, refunds
- **Owner dashboard:** Revenue analytics, booking performance charts, occupancy rate
- **Customer portal:** Browse equipment, book, manage bookings/rentals
- **Reviews:** Rate completed rentals
- **i18n:** English, Russian, Tajik
- **Dark/Light theme:** Persisted in localStorage
- **JWT authentication:** OTP-based (email verification)
- **Role-based access control:** Backend-enforced permissions

## Quick Start

### Development (Docker)

```bash
# Start infrastructure (DB, Redis, MinIO)
docker compose -f docker-compose.infra.yml up -d

# Run backend
pip install -r requirements.txt
alembic upgrade head  # or let auto-create handle it
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run frontend
cd frontend
npm install
npm run dev
```

### Full Docker Stack

```bash
docker compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- pgAdmin: http://localhost:5050
- MinIO Console: http://localhost:9001

### Running Tests

```bash
# Tests require a running PostgreSQL instance
# Set TEST_DATABASE_URL or use docker-compose.infra.yml
python -m pytest tests/ -v
```

## API Endpoints

### Auth
- `POST /api/v1/auth/send-otp` - Send OTP code
- `POST /api/v1/auth/register` - Register (CUSTOMER or OWNER)
- `POST /api/v1/auth/login` - Login with OTP
- `GET /api/v1/auth/me` - Get current user

### Equipment
- `GET /api/v1/equipment` - List equipment
- `POST /api/v1/equipment` - Create (OWNER)
- `GET /api/v1/equipment/{id}` - Get equipment
- `PUT /api/v1/equipment/{id}` - Update (OWNER, own only)
- `DELETE /api/v1/equipment/{id}` - Delete (OWNER, own only)

### Bookings
- `GET /api/v1/bookings` - My bookings (CUSTOMER)
- `POST /api/v1/bookings` - Create booking (CUSTOMER)
- `GET /api/v1/bookings/owner/all` - Owner's bookings
- `POST /api/v1/bookings/{id}/confirm` - Confirm (OWNER)
- `POST /api/v1/bookings/{id}/reject` - Reject (OWNER)
- `POST /api/v1/bookings/{id}/cancel` - Cancel (CUSTOMER)

### Dashboard
- `GET /api/v1/dashboard/summary` - Revenue, bookings, occupancy
- `GET /api/v1/dashboard/revenue-chart` - Revenue over time
- `GET /api/v1/dashboard/booking-performance` - Status breakdown
- `GET /api/v1/dashboard/recent-bookings` - Recent bookings list

### Reviews
- `GET /api/v1/reviews?equipment_id=X` - List reviews
- `POST /api/v1/reviews` - Create review (CUSTOMER)
- `PATCH /api/v1/reviews/{id}` - Update review (CUSTOMER)

## Project Structure

```
backend/
  app/
    api/routes/    # FastAPI routers
    core/          # Config, auth, dependencies
    models/        # SQLAlchemy models
    schemas/       # Pydantic schemas
    services/      # Business logic
    repositories/  # Database queries
  alembic/         # Database migrations
  tests/           # Pytest tests

frontend/
  src/
    api/           # Axios API clients
    components/    # Reusable UI components
    pages/         # Page components
    contexts/      # React contexts (Theme)
    i18n/          # Translations (en, ru, tj)
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET_KEY` - JWT signing secret
- `REDIS_URL` - Redis connection
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - S3 credentials (optional)
