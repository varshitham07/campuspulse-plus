# CampusPulse+ Production Deployment Guide

**Architecture:**
```
Vercel Frontend (React/Vite)
         ↓
Render Backend (Node.js/Express)
         ↓
Aiven MySQL Database
```

---

## PHASE 1: DATABASE SETUP (Aiven MySQL)

### Step 1: Connect to Aiven MySQL via MySQL Workbench
1. Open your Aiven dashboard: https://console.aiven.io
2. Go to **campuspulse-prod** project → **campuspulse-db** service
3. Copy connection details:
   - **Host:** `campuspulse-db-xxxx.aivencloud.com`
   - **Port:** `3306`
   - **Username:** `avnadmin`
   - **Password:** (shown in dashboard)

### Step 2: Initialize Database Schema
1. Open MySQL Workbench
2. Create new connection with Aiven details above
3. Execute SQL from `backend/src/db/schema-production.sql` **EXACTLY AS IS**
   - ⚠️ **CRITICAL:** Departments and classes MUST be created FIRST
   - All other tables depend on them
4. Verify tables created:
   ```sql
   SHOW TABLES;
   SELECT COUNT(*) FROM departments;
   SELECT COUNT(*) FROM classes;
   ```
   Should show 15 departments and 35 classes

### Step 3: Insert Seed Data (Optional - for testing)
Run `backend/src/db/seed.sql` to add development test accounts:
- **admin@campuspulse.dev** / `Password123!`
- **teacher@campuspulse.dev** / `Password123!`
- **president@campuspulse.dev** / `Password123!`
- **student@campuspulse.dev** / `Password123!`

---

## PHASE 2: RENDER BACKEND DEPLOYMENT

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up or login
3. Create new Web Service

### Step 2: Connect GitHub Repository
1. Click "New +" → "Web Service"
2. Select **GitHub** → Authorize Render
3. Find and select **varshitham07/campuspulse-plus**
4. Set:
   - **Name:** `campuspulse-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### Step 3: Add Environment Variables to Render Dashboard
Click "Environment" tab and add ALL these:

```
PORT=4000
NODE_ENV=production
CLIENT_ORIGIN=https://campuspulse-frontend.vercel.app

DB_HOST=campuspulse-db-xxxx.aivencloud.com
DB_PORT=3306
DB_USER=avnadmin
DB_PASSWORD=<your-aiven-password>
DB_NAME=campuspulse
DB_SSL_ENABLED=true

JWT_SECRET=<generate-random-32-char-string>
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_DAYS=30

COOKIE_SECURE=true
COOKIE_SAMESITE=none

BOOTSTRAP_LOCAL_ADMIN=false
SMS_PROVIDER=console
```

**⚠️ CRITICAL - Generate Strong JWT_SECRET:**
```bash
# In terminal, run:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and paste as `JWT_SECRET`

### Step 4: Deploy
1. Click "Deploy"
2. Wait for deployment to complete (3-5 minutes)
3. Your backend URL will be: `https://campuspulse-backend.onrender.com`

### Step 5: Verify Backend Health
Open in browser:
```
https://campuspulse-backend.onrender.com/api/health
```
Should return:
```json
{"status":"ok","time":"2026-09-14T..."}
```

---

## PHASE 3: VERCEL FRONTEND DEPLOYMENT

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Sign up or login with GitHub
3. Click "Add New..." → "Project"

### Step 2: Import GitHub Repository
1. Search for **campuspulse-plus**
2. Click "Import"
3. Set:
   - **Framework Preset:** React
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### Step 3: Add Environment Variables
In "Environment Variables" section, add:

```
VITE_API_BASE=https://campuspulse-backend.onrender.com/api
VITE_SOCKET_URL=https://campuspulse-backend.onrender.com
```

### Step 4: Deploy
1. Click "Deploy"
2. Wait for build to complete (2-3 minutes)
3. Your frontend URL will be displayed (usually `https://campuspulse-plus-frontend.vercel.app`)

### Step 5: Test Frontend
Open frontend URL in browser and verify:
- ✅ Page loads without errors
- ✅ Registration form appears
- ✅ Can see departments dropdown

---

## PHASE 4: UPDATE FRONTEND ENVIRONMENT

### Back in Render Dashboard
1. Go to **campuspulse-backend** service
2. Click "Environment" tab
3. Update `CLIENT_ORIGIN` with your actual Vercel URL:
   ```
   CLIENT_ORIGIN=https://your-vercel-url.vercel.app
   ```
4. Click "Save" (triggers redeploy)

---

## PHASE 5: TEST END-TO-END FLOW

### Test 1: Student Registration
1. Go to frontend URL
2. Register as student:
   - Full Name: Test Student
   - Email: test@example.com
   - Password: TestPass123
   - Mobile: 9876543210
   - Department: CSE
   - Year: 2
   - Section: CSE 2nd Year — Section A
   - Student ID: CS22999
3. Get registration token
4. **STOP** - Admin approval required

### Test 2: Admin Login
1. Go to frontend
2. Login as: `admin@campuspulse.dev` / `Password123!`
3. Navigate to admin panel
4. Approve the pending student registration
5. Logout

### Test 3: Approved Student Login
1. Go to frontend
2. Login with student credentials
3. Verify you can access dashboard
4. Verify Socket.IO connects (real-time features work)

---

## PHASE 6: PRODUCTION CHECKLIST

- [ ] Aiven database initialized with production schema
- [ ] Render backend deployed and health check working
- [ ] Vercel frontend deployed and loading
- [ ] Backend JWT_SECRET is strong random 32+ chars
- [ ] Frontend environment variables point to production URLs
- [ ] Backend CLIENT_ORIGIN matches Vercel URL
- [ ] Test student registration → admin approval → login flow
- [ ] No console errors in browser dev tools
- [ ] Socket.IO connects without warnings
- [ ] HTTPS working on both frontend and backend
- [ ] Rate limiting active on auth endpoints

---

## ACCESSING THE APPLICATION

### Frontend (Student/Admin Access)
**URL:** `https://your-vercel-url.vercel.app`

**Default Admin Account:**
- Email: `admin@campuspulse.dev`
- Password: `Password123!`

### Backend API
**Base URL:** `https://campuspulse-backend.onrender.com/api`

**Health Check:** `https://campuspulse-backend.onrender.com/api/health`

---

## DATABASE ACCESS (MySQL Workbench)

**Connection Details:**
- Host: `campuspulse-db-xxxx.aivencloud.com` (from Aiven dashboard)
- Port: `3306`
- Username: `avnadmin`
- Password: (from Aiven dashboard)
- Database: `campuspulse`

---

## TROUBLESHOOTING

### Backend won't deploy
1. Check Render logs for errors
2. Verify all environment variables are set
3. Ensure `backend/package.json` exists
4. Verify `backend/src/server.js` exists

### Frontend won't load
1. Check browser console for CORS errors
2. Verify `VITE_API_BASE` points to correct backend
3. Check Vercel deployment logs
4. Ensure `frontend/package.json` exists

### Database connection fails
1. Verify Aiven credentials in Render env vars
2. Check Aiven firewall allows connections
3. Test connection in MySQL Workbench first
4. Ensure database `campuspulse` exists

### CORS errors between frontend and backend
1. Update Render `CLIENT_ORIGIN` to match Vercel URL exactly
2. Ensure `NODE_ENV=production`
3. Verify `COOKIE_SAMESITE=none` is set
4. Verify `COOKIE_SECURE=true` is set

### Socket.IO not connecting
1. Check browser Network tab for WebSocket upgrade
2. Verify `VITE_SOCKET_URL` matches backend URL
3. Ensure no firewall blocks WebSocket connections

---

## FILES CREATED/MODIFIED

### New Files
- `backend/src/db/schema-production.sql` - Production database schema
- `backend/src/middleware/rbac.js` - Role-based access control
- `backend/.env.production` - Production environment template
- `frontend/.env.example` - Frontend environment template

### Modified Files
- `backend/src/controllers/auth.controller.js` - Fixed refresh token bug
- `backend/src/db/schema.sql` - Original schema (use production version)

---

## SECURITY NOTES

⚠️ **NEVER:**
- Commit `.env` files to GitHub
- Share JWT_SECRET or database passwords
- Enable `BOOTSTRAP_LOCAL_ADMIN` in production
- Use development SMS provider in production

✅ **ALWAYS:**
- Use strong random JWT_SECRET (32+ chars)
- Set `NODE_ENV=production`
- Set `COOKIE_SECURE=true`
- Use HTTPS only (both Render and Vercel provide this)
- Keep Aiven credentials in Render dashboard only

---

## NEXT STEPS AFTER DEPLOYMENT

1. **Add Real SMS Provider** (optional)
   - Configure MSG91 or Twilio in environment variables
   - Update `SMS_PROVIDER` from `console` to `msg91`

2. **Enable Monitoring**
   - Set up Render alerts for deployment failures
   - Monitor Aiven database performance

3. **Backup Strategy**
   - Configure Aiven automated backups
   - Test restore procedure

4. **Custom Domain** (optional)
   - Add your college domain to Vercel
   - Update `CLIENT_ORIGIN` accordingly

---

## SUPPORT

For issues:
1. Check application logs in Render dashboard
2. Check browser console for frontend errors
3. Check Aiven MySQL for connection issues
4. Review environment variables match exactly
5. Verify all secrets are strong and unique

Good luck! 🚀
