# TripPilot — HOS-Compliant Truck Trip Planner

A full-stack "Truck Trip Planner" for property-carrying commercial drivers. Enter a
current location, pickup, dropoff, and current cycle hours used — TripPilot geocodes
the route, calculates an FMCSA Hours-of-Service (HOS) compliant schedule, inserts fuel
and rest stops automatically, and generates daily ELD log sheets, all visualized on an
interactive map and timeline.

## 1. Project Overview

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + React Leaflet
- **Backend**: Django + Django REST Framework
- **Database**: SQLite locally, PostgreSQL-ready for production
- **External APIs**: OpenStreetMap (tiles), Nominatim (geocoding), OSRM (routing) — all free, no API keys required

## 2. Features

- Trip planning form with validation, loading states, and inline errors
- Dynamic HOS scheduling engine (11-hr driving limit, 14-hr window, 30-min breaks, 10-hr rest, 70/8 cycle)
- Automatic fuel stop insertion every 1,000 miles
- Pickup/dropoff modeled as 1-hour on-duty (not driving) events
- Interactive Leaflet map with color-coded markers, popups, legend, and auto-fit bounds
- Visual stop timeline with icons, durations, and locations
- SVG-drawn daily ELD log sheets (4 duty-status rows, 24-hour grid), with day navigation and printing
- Trip history and detail retrieval endpoints
- Graceful error handling for invalid addresses, geocoding/routing failures, and cycle-limit violations
- 23 automated backend tests with mocked external services

## 3. Tech Stack

| Layer      | Technology                                             |
|------------|----------------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS, React Leaflet, Axios, React Router |
| Backend    | Python 3.12, Django 5, Django REST Framework            |
| Database   | SQLite (dev), PostgreSQL (prod-ready via `dj-database-url`) |
| Routing    | OSRM public demo server                                 |
| Geocoding  | OpenStreetMap Nominatim                                 |
| Deployment | Vercel (frontend), Render/Railway (backend)              |

## 4. Architecture

```
truck-planner/
├── backend/
│   ├── config/                 # Django project settings, URLs, WSGI/ASGI
│   └── trips/
│       ├── models.py           # Trip, TripStop, ScheduleEvent, ELDLog, ELDEvent
│       ├── serializers.py
│       ├── views.py            # POST /trips/plan/, GET /trips/, GET /trips/<id>/
│       ├── services/
│       │   ├── geocoding.py    # Nominatim client
│       │   ├── routing.py      # OSRM client
│       │   ├── hos.py          # HOS rule constants
│       │   ├── scheduler.py    # Core HOS-compliant simulation engine
│       │   └── eld.py          # Converts events into daily ELD logs
│       └── tests/              # 23 unit/integration tests, external calls mocked
└── frontend/
    └── src/
        ├── components/         # Header, Hero, TripForm, RouteMap, StopTimeline, ELDLog, ...
        ├── pages/               # Home, TripResult
        ├── services/api.ts     # Axios client
        └── types/index.ts      # Shared TypeScript interfaces
```

All HOS and scheduling logic lives in `trips/services/` — views only orchestrate the
pipeline (geocode → route → schedule → ELD logs → persist → respond).

## 5. Local Setup

### 5.1 Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

Backend runs at `http://127.0.0.1:8000`.

### 5.2 Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`.

## 6. Environment Variables

**backend/.env**
```
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
DATABASE_URL=sqlite:///db.sqlite3
FUEL_STOP_INTERVAL_MILES=1000
FUEL_STOP_DURATION_MINUTES=30
```

**frontend/.env**
```
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## 7. API Endpoints

| Method | Endpoint             | Description                                  |
|--------|-----------------------|-----------------------------------------------|
| POST   | `/api/trips/plan/`    | Plans a trip end-to-end and returns full trip data |
| GET    | `/api/trips/<id>/`    | Retrieves a saved trip                        |
| GET    | `/api/trips/`         | Lists recent trips                            |
| GET    | `/api/health/`        | Health check                                  |

**POST /api/trips/plan/ request body:**
```json
{
  "current_location": "Chicago, IL",
  "pickup_location": "Dallas, TX",
  "dropoff_location": "Houston, TX",
  "current_cycle_used": 10,
  "start_date": "2026-08-01",
  "start_time": "08:00:00"
}
```

**Error response shape:**
```json
{ "success": false, "error": "Unable to calculate route.", "details": "..." }
```

## 8. HOS Assumptions

- 70 hours / 8-day cycle
- 11 hours max driving after 10 consecutive hours off duty
- 14-hour driving window
- 30-minute break required after 8 cumulative hours of driving
- 10 consecutive hours off-duty/sleeper berth to reset the shift
- Pickup = 1 hour, Dropoff = 1 hour (on-duty, not driving)
- Fuel stop every 1,000 miles (30 minutes)
- No adverse driving conditions exception applied

If a trip cannot be completed within the driver's remaining cycle hours, the trip is
flagged `cycle_exceeded` and driving stops at the legal limit rather than generating an
illegal schedule.

## 9. Routing API Information

TripPilot uses the free public [OSRM](http://project-osrm.org/) demo server for driving
directions and [Nominatim](https://nominatim.org/) for geocoding. Both are rate-limited
public services intended for demos/light use — for production traffic, self-host OSRM or
use a paid provider.

## 10. Testing

```bash
cd backend
python manage.py test trips -v 2
```

23 tests cover models, serializer validation, HOS rule constants, the scheduling engine
(11-hr limit, 14-hr window, 30-min breaks, 10-hr rest, fuel stops, cycle limits,
multi-day trips), ELD log generation, and API endpoints (with geocoding/routing mocked
so tests never depend on live external services).

## 11. Deployment

### Frontend → Vercel
1. Push this repo to GitHub.
2. Import the `frontend/` directory as a new Vercel project (framework: Vite).
3. Set environment variable `VITE_API_BASE_URL` to your deployed backend URL, e.g. `https://trippilot-backend.onrender.com/api`.
4. Deploy.

### Backend → Render
1. Push this repo to GitHub.
2. Create a new Web Service on Render, root directory `backend/`.
3. Render will pick up `render.yaml`, or manually set:
   - Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
   - Start command: `gunicorn config.wsgi:application`
4. Set environment variables: `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS` (your Vercel URL), and optionally `DATABASE_URL` for a managed Postgres instance.

### Backend → Railway (alternative)
Railway auto-detects the `Procfile`. Set the same environment variables as above.

## 12. Production Checklist

- [ ] `DEBUG=False` in production
- [ ] Strong, unique `SECRET_KEY` set via environment variable
- [ ] `ALLOWED_HOSTS` restricted to your real domain(s)
- [ ] `CORS_ALLOWED_ORIGINS` restricted to your deployed frontend origin
- [ ] PostgreSQL configured via `DATABASE_URL` for production persistence
- [ ] `python manage.py collectstatic` run during deploy (handled by WhiteNoise)
- [ ] Frontend `VITE_API_BASE_URL` points at the deployed backend

## 13. Git & GitHub Setup

```bash
git init
git add .
git commit -m "Initial commit: TripPilot full-stack trip planner"
git branch -M main
git remote add origin https://github.com/<your-username>/trippilot.git
git push -u origin main
```

## 14. Screenshots

_Add screenshots of the landing page, trip dashboard, map, and ELD log here before submission._
