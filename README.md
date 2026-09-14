# CampusPulse+

CampusPulse+ is an institution-owned campus communication, verification and navigation platform.

## Product flow
**DISCOVER → VERIFY → NAVIGATE → ACT**

The platform combines targeted campus alerts, incident verification, club and event communication, a campus route graph, dynamic rerouting and role-scoped administration.

## Current registration and access workflow
1. A student completes the self-registration form.
2. The server creates a unique registration token such as `CP-2026-ABC12345`.
3. The student remains `pending` and cannot log in.
4. The student presents the token to the college admin.
5. Admin reviews the submitted details and approves or rejects the application.
6. Only approved, active accounts can authenticate.

The token identifies the application; it is **not** an authentication credential.

## Roles and scope
- **STUDENT** — normal student access.
- **TEACHER** — faculty access scoped by department/class rules in the backend.
- **ADMIN** — institution-wide administration and approval.
- **CLUB PRESIDENT / VP** — scoped responsibilities attached to a club while retaining the underlying student identity.
- **FACULTY COORDINATOR** — faculty identity with additional club-scoped responsibility.

Never rely on frontend role hiding for security. Backend middleware is the source of truth.

## Local setup
### 1. Database
Start MySQL in XAMPP. Open phpMyAdmin and create `campuspulse` (utf8mb4).

For a fresh install, import `backend/src/db/schema.sql` and then `backend/src/db/seed.sql`. The schema already contains the latest CampusPulse+ tables and MVJCE department/class structure.

Then, from `backend`, run `npm run db:bootstrap` to safely ensure the default campus locations, walking edges, departments and classes exist. This command is safe to repeat.

### 2. Backend
```bash
cd backend
npm install
copy .env.example .env
npm run db:bootstrap
npm run dev
```

On macOS/Linux use `cp .env.example .env` instead of `copy`.

### 3. Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Seeded local accounts
The seed contains non-production development accounts. They are intended for local testing only.

Password for the seeded accounts: `Password123!`

- `admin@campuspulse.dev`
- `teacher@campuspulse.dev`
- `president@campuspulse.dev`
- `vp@campuspulse.dev`
- `student@campuspulse.dev`

## Authentication architecture
Access tokens are short-lived JWTs. Refresh sessions use an HttpOnly cookie and are stored server-side by hash. The frontend keeps the access token in memory and refreshes the session on reload.

OTP recovery is designed as a backup for **already-approved** accounts only. It intentionally does not fake SMS delivery; a real SMS provider adapter and production credentials must be supplied before enabling it.

## Production deployment checklist
- Use a managed MySQL-compatible production database.
- Set a strong random `JWT_SECRET`.
- Set `NODE_ENV=production` and `COOKIE_SECURE=true`.
- Configure `CLIENT_ORIGIN` to the deployed frontend URL.
- Configure a real SMS provider before enabling OTP.
- Store secrets only in the hosting provider's secret/environment settings.
- Replace development seed data and credentials before production use.
- Put uploads on durable object storage before horizontal scaling.
- Add monitoring/logging and scheduled cleanup for expired sessions/OTPs.

## Local setup (Windows + XAMPP)

1. Start Apache and MySQL in XAMPP.
2. Create a MySQL database named `campuspulse` if it does not already exist.
3. Copy `backend/.env.example` to `backend/.env`.
4. From `backend`, run `npm install` then `npm run db:doctor`.
5. For a brand-new database, use `npm run db:init`, then `npm run db:seed`, then `npm run db:bootstrap`.
6. For an existing database that already contains the current tables, do not re-import `seed.sql`; run `npm run db:migrate:006`, `npm run db:migrate:007`, `npm run db:bootstrap`, and `npm run db:local-admin` as needed. These two current migrations are idempotent.
7. Start the API with `npm run dev`.
8. In a second terminal, run `cd frontend`, `npm install`, and `npm run dev`.

Local admin (development only): `admin@campuspulse.dev` / `Password123!`.
The backend also ensures this local admin account exists on startup when `BOOTSTRAP_LOCAL_ADMIN=true` and `NODE_ENV` is not `production`.
