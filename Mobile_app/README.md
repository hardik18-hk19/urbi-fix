# Hackademia

An Uber-like instant help platform with community forum, AI auto-tagging, voting, negotiation, and role-based flows (consumer/provider). This monorepo contains a FastAPI backend and a Flutter mobile app.

- **Backend**: FastAPI + SQLite (default), JWT auth, providers, bookings, issues, AI features, voting, negotiation
- **Mobile App**: Flutter app with role-based flows, instant help, provider dashboard, forum with AI tags and voting

## Repository Structure
- `backend/` – FastAPI app and dependencies
- `mobile_app/` – Flutter application

## Quick Start

### 1) Backend (FastAPI)

1. Create and activate a virtual environment
   - Windows (PowerShell):
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
2. Install dependencies
   ```powershell
   pip install -r backend\requirements.txt
   ```
3. Configure environment (optional; defaults work for local dev)
   - Create/edit `backend/.env` with:
     ```ini
     SECRET_KEY=dev-secret-change-me
     ACCESS_TOKEN_EXPIRE_MINUTES=60
     JWT_ALGORITHM=HS256
     DATABASE_URL=sqlite:///./data.db
     CORS_ALLOW_ORIGINS=*
     UPLOAD_DIR=./uploads
     ```
4. Run the server (from repo root)
   ```powershell
   uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
   ```
5. Open API docs
   - Swagger UI: http://localhost:8000/docs

Notes:
- DB tables auto-create on startup (SQLite file at `backend/data.db`).
- Static files served at `/uploads` (directory: `backend/uploads`).

### 2) Mobile App (Flutter)

1. Prereqs: Flutter SDK (3.x), Android/iOS tooling
2. Set API base URL
   - Edit `mobile_app/lib/config/api_config.dart` → set `baseUrl` to your backend address, e.g.:
     ```dart
     static const String baseUrl = "http://<YOUR_LAN_IP>:8000"; // e.g., http://192.168.1.50:8000
     ```
3. Get packages and run
   ```powershell
   Set-Location mobile_app
   flutter pub get
   flutter run
   ```

## Key Features & Endpoints (Backend)
- **Auth**: `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`
- **Providers**: `/api/providers` (CRUD); `/api/providers/nearby?lat=..&lng=..&within_km=..&skill=cleaning`
- **Consumers**: `/api/consumers` (profile)
- **Bookings**: `/api/bookings` (create, list, update status requested|accepted|declined|scheduled|completed|canceled)
- **Issues/Forum**: `/api/issues` (create with `analyze=true` to auto-tag via AI)
- **AI**: `/api/ai/auto-tag`, `/api/ai/auto-tag-with-image`, `/api/ai/schedule`
- **Voting**: `/api/votes/{issue_id}` (POST `{value: 1|-1}`); `/api/issues?sort=trending`
- **Negotiation**: `/api/negotiation/start`, `/api/negotiation/chat`, `/api/negotiation/session`, plus intelligent variants under `/api/negotiation/intelligent/*`
- **Fundraising**: `/api/fundraisers` (if applicable in your flow)

## Typical Test Flow (Manual)
1. Create two users (consumer and provider) via `/api/auth/signup` and login.
2. Provider: create provider profile with `skills` (e.g., `cleaning,cooking`) and `lat/lng`.
3. Consumer: call `/api/providers/nearby` with `lat/lng` and `skill=cleaning` → provider should appear.
4. Create a booking (`/api/bookings`) → status starts as `requested`.
5. Provider accepts booking via `PATCH /api/bookings/{id}` with `{status: "accepted"}`.
6. Create an issue with `analyze=true` → AI classification returned and stored; upvote/downvote via votes API.
7. Provider can view issues via `/api/issues`.
8. Provider can start negotiation via `/api/negotiation/start` → chat, session, etc. → upvote/downvote via votes API.
9. Negotiation ends → consumer pays via fundraising or other means → booking status becomes `completed`.
10. Booking history available via `/api/bookings`.


## Troubleshooting
- **Mobile can’t reach backend**: Ensure phone/emulator can reach the host IP and port. Use your machine’s LAN IP (not `localhost`) in `ApiConfig.baseUrl`.
- **CORS errors**: Adjust `CORS_ALLOW_ORIGINS` in `backend/.env` (comma-separated origins), then restart.
- **DB issues**: Delete `backend/data.db` in dev to reset. Ensure the app has write permission to `backend/`.
- **Uploads**: Make sure `backend/uploads` exists (it’s auto-created on startup).

## License
TBD

---
For detailed design notes and implemented changes, see `.zencoder/rules/repo.md`.