# HotelFlow — Hotel Operations Prototype

**Mobile housekeeping workflows backed by a Django REST API**

HotelFlow explores how hotel teams can coordinate rooms, housekeeping tasks, inventory and staff scheduling in one system. This repository contains both a Python backend and an Expo / React Native mobile application.

## Why this project exists

Hotel operations depend on accurate room status, task assignments and communication across staff. HotelFlow is an evolving prototype for making those workflows easier to track.

## Repository architecture

```text
hotelflow/
├── hotelflow/          # Django project configuration and URL routing
├── housekeeping/       # Rooms, tasks, checklists, inventory, incidents, chat
├── scheduling/         # Staff, availability, shifts, rosters and assignments
├── accounts/           # Account-related Django app
├── hotelflow-mobile/   # Expo / React Native mobile client
├── manage.py
└── requirements.txt
```

**Backend:** Django and Django REST Framework, with API routers for rooms, tasks, checklists, staff availability, inventory, incidents and chat. Scheduling endpoints cover zones, skills, leave, rosters, shifts and task assignments. Presence of routes does not imply every workflow has been validated end to end.

**Mobile:** Expo SDK 53, React Native, TypeScript, React Navigation, Axios and form validation libraries.

## Development setup

### Backend

```bash
git clone https://github.com/JotaC95/HotelApp.git
cd HotelApp/hotelflow
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export DJANGO_SECRET_KEY='replace-with-a-new-development-only-key'
export DJANGO_ALLOWED_HOSTS='localhost,127.0.0.1'
python manage.py check
python manage.py runserver
```

### Mobile

In a second terminal:

```bash
cd HotelApp/hotelflow/hotelflow-mobile
npm ci
npx expo start
```

Configure the mobile API base URL for your development machine and device; `localhost` on a physical phone refers to that phone, not your laptop. Review `SECURITY_SETUP.md` before deploying.

## Current status and limitations

- Work in progress; no production reliability or security certification is claimed.
- Backend and mobile integration, authentication, notifications and role-based access need end-to-end verification.
- The repository contains a SQLite database file. Review it for sensitive information before sharing data or deploying.
- Do not use the previously committed Django signing key. Configure a newly generated `DJANGO_SECRET_KEY` securely.

## Next improvements

Add a system diagram, sanitized demo screenshots, API examples, test results and a walkthrough of a complete room-cleaning workflow.

## Engineering value

Illustrates full-stack application design for a real operational domain, combining mobile UX, API design, task workflows and scheduling.
