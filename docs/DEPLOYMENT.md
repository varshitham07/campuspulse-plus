# CampusPulse+ deployment

## Local
Start XAMPP MySQL, create `campuspulse`, import `backend/src/db/schema.sql`, then `backend/src/db/seed.sql`, then run migrations `002` through `007` in order.

Backend:
```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Production architecture
- Frontend: Vercel
- Backend: Render (Node web service)
- Database: managed MySQL-compatible provider (do not use local XAMPP MySQL in production)
- OTP: MSG91 after adding production credentials

## Vercel
Set the frontend root to the repository root and use the supplied `vercel.json`, or alternatively set the Vercel Root Directory to `frontend` and build with `npm run build`.

Environment variables:
- `VITE_API_BASE=https://<your-render-backend>/api`
- `VITE_SOCKET_URL=https://<your-render-backend>`

## Render
Use `render.yaml` or create a Node web service with root directory `backend`.
Set:
- `CLIENT_ORIGIN=https://<your-vercel-domain>`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- strong `JWT_SECRET`
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=none`
- `SMS_PROVIDER=msg91`
- `MSG91_AUTH_KEY`
- `MSG91_TEMPLATE_ID`
- `MSG91_SENDER_ID`

Run the SQL migrations against the production database before opening the site.

## Important
Production OTP login is intentionally blocked until MSG91 is configured. Registration approval is still enforced server-side, and OTP can never bypass approval.
