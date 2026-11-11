# HotelFlow — Developer and User Orientation

HotelFlow is an evolving hotel-operations prototype combining a Django REST backend with an Expo / React Native mobile client. It explores workflows for room status, housekeeping tasks, staff scheduling, inventory, incidents and communication.

## Choose your starting point

| I want to… | Go to |
| --- | --- |
| Understand the architecture | [Architecture](#architecture) |
| Run the backend | [Backend setup](#backend-setup) |
| Run the mobile client | [Mobile setup](#mobile-setup) |
| Explore available API documentation | [API exploration](#api-exploration) |
| Prepare a secure environment | [Security setup](SECURITY_SETUP.md) |

## Architecture

```text
Expo / React Native mobile app
            |
            | HTTP requests (configure API host)
            v
Django REST Framework backend
   |            |           |
housekeeping  scheduling    accounts / core
   |            |           |
            SQLite (development)
```

The repository includes `hotelflow/housekeeping/`, `hotelflow/scheduling/`, `hotelflow/accounts/`, `hotelflow/core/` and `hotelflow/hotelflow-mobile/`. These are implemented code areas; end-to-end user workflows have not all been verified.

## Backend setup

```bash
git clone https://github.com/JotaC95/HotelApp.git
cd HotelApp/hotelflow
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DJANGO_SECRET_KEY='replace-with-a-fresh-random-local-secret'
export DJANGO_ALLOWED_HOSTS='localhost,127.0.0.1'
python manage.py check
python manage.py migrate
python manage.py runserver
```

Generate a fresh secret and review [SECURITY_SETUP.md](SECURITY_SETUP.md) before exposing the service. The environment configuration and dependencies must be checked against your local Python version.

## Mobile setup

From the repository root, in another terminal:

```bash
cd hotelflow/hotelflow-mobile
npm ci
npx expo start
```

The mobile device must be able to reach the backend over the network. When using a physical device, `localhost` means the device itself; use an appropriate development IP address and update the mobile API configuration. Expo device compatibility and authentication flows need testing.

## API exploration

The root URL configuration declares these routes:

| Path | Purpose |
| --- | --- |
| `/admin/` | Django administration |
| `/api/schema/` | OpenAPI schema endpoint |
| `/api/docs/` | Swagger UI (drf-spectacular) |
| `/api/housekeeping/` | Housekeeping and scheduling route groups |
| `/api/scheduling/` | Scheduling routes |
| `/api/auth/` | DRF authentication views |

After starting the backend, visit `http://127.0.0.1:8000/api/docs/` to inspect the API schema. Authentication may be required for operations; not every route has a verified sample response.

## Current status and limitations

- Prototype, not a production-certified hotel management system.
- Do not enter real guest or employee information into public demo environments.
- A SQLite database file is tracked in the repository; review it before redistribution.
- User journeys, roles/permissions, push notifications and backend/mobile integration require further verification.

## Troubleshooting

- **Backend startup error:** check environment variables, migrations and Python dependencies.
- **Mobile cannot connect:** confirm backend address, firewall and device/network connectivity.
- **401/403:** inspect authentication and role permissions; do not bypass them.
- **Unexpected route:** use `/api/docs/` and inspect URL configuration for the installed revision.

## Contributing to documentation

Provide a sanitized screenshot or API example, state the environment used and distinguish verified behavior from proposed features. Never commit tokens, private records or real employee data.
