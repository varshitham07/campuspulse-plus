# RENDER BACKEND DEPLOYMENT - STEP BY STEP

## PHASE 1: CREATE RENDER ACCOUNT

### Step 1.1: Go to Render
```
URL: https://render.com
Action: Click "Get Started" or "Sign Up"
```

### Step 1.2: Create Account
```
Option 1: Sign up with GitHub (RECOMMENDED)
  - Click "Continue with GitHub"
  - Authorize Render to access your GitHub

Option 2: Sign up with Email
  - Enter email and password
  - Verify email
```

---

## PHASE 2: CONNECT GITHUB REPOSITORY

### Step 2.1: Navigate to Dashboard
```
After login, you're on Render Dashboard
```

### Step 2.2: Create New Web Service
```
Click: "New +" button (top right)
Select: "Web Service"
```

### Step 2.3: Connect GitHub
```
You'll see GitHub repos
If not authorized yet:
  - Click "Connect account"
  - Authorize Render in GitHub popup
  - Return to Render

Search for: campuspulse-plus
Click: Select "varshitham07/campuspulse-plus"
```

---

## PHASE 3: CONFIGURE WEB SERVICE

### Step 3.1: Basic Settings
```
Form shows up with fields:

Name: campuspulse-backend
Environment: Node
Region: Choose closest to you (Singapore/India preferred)
Branch: main
Root Directory: backend

Build Command: npm install
Start Command: npm start

Instance Type: Free (for testing) or Starter ($7/month for production)

Click: "Create Web Service"
```

⏳ **Wait 2-3 minutes for initial build**

---

## PHASE 4: ADD ENVIRONMENT VARIABLES

### Step 4.1: Navigate to Environment Tab
```
After service is created:
Click: "Environment" tab (next to "Dashboard")
```

### Step 4.2: Add Each Variable (Copy-Paste Exactly)

**Click "+ Add Environment Variable" and add these ONE BY ONE:**

#### Variable 1:
```
Key: PORT
Value: 4000
Click: Add
```

#### Variable 2:
```
Key: NODE_ENV
Value: production
Click: Add
```

#### Variable 3:
```
Key: CLIENT_ORIGIN
Value: https://campuspulse-frontend.vercel.app
(IMPORTANT: You'll update this after Vercel deployment)
Click: Add
```

#### Variable 4:
```
Key: DB_HOST
Value: [PASTE FROM AIVEN - Your MySQL host]
Example: campuspulse-db-xxxx.aivencloud.com
Click: Add
```

#### Variable 5:
```
Key: DB_PORT
Value: 3306
Click: Add
```

#### Variable 6:
```
Key: DB_USER
Value: avnadmin
Click: Add
```

#### Variable 7:
```
Key: DB_PASSWORD
Value: [PASTE FROM AIVEN - Your MySQL password]
Click: Add
```

#### Variable 8:
```
Key: DB_NAME
Value: campuspulse
Click: Add
```

#### Variable 9:
```
Key: DB_SSL_ENABLED
Value: true
Click: Add
```

#### Variable 10:
```
Key: JWT_SECRET
Value: [GENERATE RANDOM - See below]
Click: Add
```

#### Variable 11:
```
Key: ACCESS_TOKEN_TTL
Value: 15m
Click: Add
```

#### Variable 12:
```
Key: REFRESH_TOKEN_DAYS
Value: 30
Click: Add
```

#### Variable 13:
```
Key: COOKIE_SECURE
Value: true
Click: Add
```

#### Variable 14:
```
Key: COOKIE_SAMESITE
Value: none
Click: Add
```

#### Variable 15:
```
Key: BOOTSTRAP_LOCAL_ADMIN
Value: false
Click: Add
```

#### Variable 16:
```
Key: SMS_PROVIDER
Value: console
Click: Add
```

---

## 🔐 GENERATE JWT_SECRET

### In Your Terminal (Mac/Linux/Windows PowerShell):

**Windows (PowerShell):**
```powershell
$bytes = [byte[]]::new(32)
[System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**Mac/Linux/Git Bash:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Alternative (if Node not installed):**
```bash
openssl rand -hex 32
```

Copy the output (long random string) → Use as `JWT_SECRET` value in Render

---

## PHASE 5: DEPLOY

### Step 5.1: Save Environment Variables
```
After adding all variables:
Scroll to bottom
Click: "Save Configuration"
```

**⚠️ RENDER WILL AUTO-REDEPLOY WITH NEW ENV VARS**

### Step 5.2: Monitor Deployment
```
Go to: "Logs" tab
Watch the build output
Expected messages:
  - "npm install"
  - "npm start"
  - "CampusPulse+ API listening on :4000"

Wait for: "✓ Service is live"
```

### Step 5.3: Get Your Backend URL
```
After deployment completes:
Look at top of page
Your URL: https://campuspulse-backend.onrender.com
(Yours will have different name)

Copy this URL - you need it for Vercel!
```

---

## ✅ VERIFY BACKEND IS WORKING

### Step 6.1: Test Health Endpoint
```
Open in browser (or Postman):
https://campuspulse-backend.onrender.com/api/health

Expected Response:
{
  "status": "ok",
  "time": "2026-09-14T..."
}

If ERROR: 
  - Check logs in Render dashboard
  - Verify all environment variables
  - Verify Aiven database connection
```

### Step 6.2: Test Database Connection
```
In Postman or curl:
GET https://campuspulse-backend.onrender.com/api/auth/departments

Expected: 
{
  "departments": [
    {"id": 1, "code": "AE", "name": "Aeronautical Engineering"},
    ... (15 departments)
  ]
}

If ERROR: Check Aiven credentials in Render env vars
```

---

## 🚨 TROUBLESHOOTING

### Build Failed - "npm ERR!"
```
Problem: Build command failed
Solution:
1. Check backend/package.json exists
2. Check backend/src/server.js exists
3. Verify no syntax errors in code
4. Check Render logs for specific error
```

### "Module not found"
```
Problem: Missing dependency
Solution:
1. In your local terminal:
   cd backend
   npm install
2. Commit package-lock.json to GitHub
3. Push to main branch
4. Render will redeploy
```

### Port Already in Use
```
Problem: "EADDRINUSE"
Solution:
1. This means another process is on :4000
2. Change PORT in Render env var to 4001
3. Or restart the service
```

### Database Connection Refused
```
Problem: "connect ECONNREFUSED"
Solution:
1. Verify DB_HOST copied correctly (check for spaces)
2. Verify DB_PASSWORD copied correctly
3. Verify DB_SSL_ENABLED=true
4. Check Aiven firewall allows connections
5. In Aiven dashboard, verify service is running
```

### CORS Errors in Frontend
```
Problem: "Access to XMLHttpRequest blocked"
Solution:
1. Wait until Vercel deployment completes
2. Copy exact Vercel URL
3. Update Render CLIENT_ORIGIN to match
4. Wait 1-2 minutes for redeploy
```

### Health Check Fails
```
Problem: Service keeps restarting
Solution:
1. Check logs for error messages
2. Most common: Database connection
3. Verify all DB env vars one by one
4. Try restarting service (top right menu)
```

---

## 📊 AFTER DEPLOYMENT

### Save These URLs:
```
Backend URL:    https://campuspulse-backend.onrender.com
API Base:       https://campuspulse-backend.onrender.com/api
Health Check:   https://campuspulse-backend.onrender.com/api/health
```

### Set Render Alerts (Optional):
```
Click: "Settings" tab
Enable: Notifications
  - Deployment failed
  - Exceeded memory usage
```

### Monitor Logs Regularly:
```
Click: "Logs" tab
Watch for errors
Useful for debugging frontend issues
```

---

## ✨ YOU'RE READY FOR VERCEL!

Save your backend URL from Step 5.3 → Use in VERCEL_SETUP.md

**Next:** Follow VERCEL_SETUP.md to deploy frontend
