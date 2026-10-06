# RentHub - Equipment Rental Management Platform

A full-stack rental management platform built with React, FastAPI, and PostgreSQL
(SQLite works too, and the bundled server deployment uses it — see
[Database](#database)).

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend:** Python 3.12+, FastAPI, SQLAlchemy 2.0, Pydantic v2
- **Database:** PostgreSQL 16 (default) or SQLite — schema is owned by Alembic
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
alembic upgrade head   # optional: the server runs this itself at startup
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

### Local / Server (without Docker)

```bash
# Windows (local)
./run.ps1

# Linux server (or WSL/macOS) — one command:
bash run.sh
```

`run.sh` starts:
- Backend → http://127.0.0.1:8000 (logs: `backend.log`)
- Frontend → http://<server-ip>:3000 (binds `0.0.0.0`)

On first run it creates `.env` and `frontend/.env` from `.env.example`. Fill `SMTP_*`
in `.env` to send real OTP emails — otherwise the code is printed to `backend.log`.

After `git pull` on the server, run `bash run.sh` again (backend restarts, Vite
auto-restarts on config changes and hot-reloads source).

If Google login is used from the server, add `http://<server-ip>:3000` to the
**Authorized JavaScript origins** of the OAuth client in Google Cloud Console.


### Running Tests

The suite runs against **PostgreSQL**. It is the only thing the tests need —
no Redis, no MinIO, no SMTP (`conftest.py` turns email off by itself).

```bash
# One PostgreSQL instance is enough; either of these brings one up:
docker compose -f docker-compose.infra.yml up -d db

# ...or just tell the tests where yours is:
export TEST_DATABASE_URL=postgresql+asyncpg://rentflow:rentflow@localhost:5432/rentflow_test

python -m pytest tests/ -v
```

`TEST_DATABASE_URL` defaults to that same `rentflow_test` database, so with the
Compose file running the command above works unchanged.

CI runs exactly this on every push and pull request
(`.github/workflows/tests.yml`): one job builds the schema from the migrations
on a clean PostgreSQL, one runs the suite, one type-checks and builds the
frontend. `npm run typecheck` does the same locally.

## Database

The project is configured for **PostgreSQL 16** and that is what
`DATABASE_URL` defaults to. Where the data actually lives depends on how you
run it, and the two are deliberately both supported:

| How it runs | Database | Set by |
| --- | --- | --- |
| `docker compose up` | PostgreSQL 16 | `docker-compose.yml` → `DATABASE_URL` |
| `bash run.sh` / `./run.ps1` with a fresh `.env` | PostgreSQL 16 | `.env` copied from `.env.example`, which enables PostgreSQL |
| The live server (`rent_frow.service`) | SQLite, file `app.db` next to the code | `.env` on the server: `DATABASE_URL=sqlite+aiosqlite:///./app.db` |
| `pytest` | PostgreSQL, database `rentflow_test` | `TEST_DATABASE_URL` |

SQLite is the supported fallback rather than the default: `.env.example` carries
it commented out (`DATABASE_URL=sqlite+aiosqlite:///./rentflow.db`) for a laptop
with no PostgreSQL around, and the server happens to be deployed that way.

So: **the default is PostgreSQL, the live server is on SQLite, and both are
supported.** The application does not care which — the models, the queries and
the migrations are the same on both, and the two dialect differences (how a
`NOT NULL` is dropped, how an enum is stored) are handled inside the
migrations, not by calling `Base.metadata.create_all` from application code.

### Migrations

`alembic/` owns the schema. It is run for you: `app.main`'s lifespan calls
`alembic upgrade head` on startup, so pulling a new revision and restarting is
the whole deploy step.

```bash
alembic upgrade head            # bring the database to the current schema
alembic current                 # what revision it is on
alembic history                 # the chain
```

What happens at startup depends on what is in front of it:

- **empty database** — the revisions build it from nothing;
- **tables but no `alembic_version` row** — a database written by the old
  startup code. It is stamped at the last revision before the catch-up and
  then upgraded, which adds only what is missing;
- **already tracked** — upgrade, which on an up-to-date database is a no-op.

`alembic/env.py` takes its URL from the application settings, so `alembic`
migrates the database the server is actually using. Point it somewhere else
for one run with `ALEMBIC_DATABASE_URL=...`.

### One-off scripts

`scripts/migrate_sqlite_to_pg.py` moves the contents of a SQLite database
into PostgreSQL — the only place `rentflow.db` is still referenced, and only
because that is the file a pre-Docker setup created:

```bash
python scripts/migrate_sqlite_to_pg.py postgresql+asyncpg://user:pass@host/db
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

The repository root *is* the backend; `frontend/` is the only nested app.

```
app/
  api/routes/     # FastAPI routers
  core/           # Config, auth, dependencies, the migration runner
  models/         # SQLAlchemy models - the source of truth for the schema
  schemas/        # Pydantic schemas
  services/       # Business logic
  repositories/   # Database queries
alembic/
  versions/       # Migrations - the only place schema changes are written
tests/            # Pytest suite, run by CI on every push
scripts/          # One-off helpers: SQLite -> PostgreSQL, audits, i18n patches
frontend/
  src/
    api/          # Axios API clients
    components/   # Reusable UI components
    pages/        # Page components
    contexts/     # React contexts (Theme)
    i18n/         # Translations (en, ru, tj)
mobile/           # Expo app sharing the same API
audit/            # Review notes and reports
_archive/         # Kept, not deleted: superseded scripts and an old copy of
                  # the frontend. See _archive/README.md.
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - where the data lives. Either dialect works:
  `postgresql+asyncpg://user:pass@host/dbname` (the default, and what
  `.env.example` enables) or `sqlite+aiosqlite:///./app.db` (what the live
  server uses; `.env.example` shows it as `./rentflow.db`). See
  [Database](#database) for which one each way of running the project uses.
- `TEST_DATABASE_URL` - what `pytest` talks to; defaults to
  `postgresql+asyncpg://rentflow:rentflow@localhost:5432/rentflow_test`
- `JWT_SECRET_KEY` - JWT signing secret
- `REDIS_URL` - Redis connection
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - S3 credentials (optional)
- `EMAIL_ENABLED` / `SMTP_*` - transactional email (OTP, rental requests);
  `WALLET_ENABLED` - the wallet and deposit flow
