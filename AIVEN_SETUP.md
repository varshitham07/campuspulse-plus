# AIVEN DATABASE SETUP - STEP BY STEP (Copy-Paste Ready)

## PHASE 1: GET YOUR AIVEN CREDENTIALS

### Step 1.1: Open Aiven Dashboard
```
URL: https://console.aiven.io
Action: Login with your account
```

### Step 1.2: Find Your Connection Details
```
Left Menu → campuspulse-prod (project)
  ↓
Click on campuspulse-db (MySQL service)
  ↓
Look for "Connection information" section
  ↓
Copy these values:
```

**SAVE THESE VALUES** (you'll need them):
```
Host (Server):          ___________________________
Port:                   ___________________________
Username (avnadmin):    ___________________________
Password:               ___________________________
Database name:          campuspulse
SSL Required:           YES
```

---

## PHASE 2: INSTALL & OPEN MYSQL WORKBENCH

### Step 2.1: Download MySQL Workbench (if you don't have it)
```
URL: https://dev.mysql.com/downloads/workbench/
Download: MySQL Workbench 8.0
Install: Follow installer instructions
```

### Step 2.2: Open MySQL Workbench
```
Action: Launch MySQL Workbench application
```

---

## PHASE 3: CREATE AIVEN CONNECTION IN MYSQL WORKBENCH

### Step 3.1: Create New Connection
```
Menu: Database → Manage Connections...
Click: + (plus icon to create new connection)
```

### Step 3.2: Fill in Connection Details
```
Connection Name:        aiven-campuspulse
Connection Method:      Standard (TCP/IP)
Hostname:               [PASTE YOUR HOST FROM STEP 1.2]
Port:                   [PASTE YOUR PORT - usually 3306]
Username:               [PASTE YOUR USERNAME - usually avnadmin]
Password:               [PASTE YOUR PASSWORD]
Default Schema:         campuspulse
SSL Mode:               REQUIRED
SSL CA File:            [Leave blank - Aiven handles this]
SSL Cert File:          [Leave blank]
SSL Key File:           [Leave blank]
```

### Step 3.3: Test Connection
```
Click: "Test Connection"
Expected: "Connection successful" message
If error: Check credentials again, ensure you copied exactly
```

### Step 3.4: Save Connection
```
Click: OK
```

---

## PHASE 4: CONNECT & INITIALIZE DATABASE

### Step 4.1: Open Connection
```
In MySQL Workbench left panel:
Double-click: "aiven-campuspulse" connection
Wait: Should show connection opening (loading bar)
```

### Step 4.2: Open SQL Query Editor
```
Menu: File → New Query Tab
OR
Shortcut: Ctrl+T
```

### Step 4.3: GET THE SCHEMA SQL
```
Open this file on your computer:
backend/src/db/schema-production.sql

Action: Copy ALL content from this file
```

**EXACT LOCATION:**
```
Your Repository Folder
  → backend
    → src
      → db
        → schema-production.sql  ← THIS FILE
```

### Step 4.4: Paste Into MySQL Workbench
```
In the SQL query editor (opened in Step 4.2):
Click: In the white text area
Action: Paste (Ctrl+V) the entire schema SQL
```

### Step 4.5: EXECUTE THE SCHEMA
```
Menu: Query → Execute (All or Selection)
OR
Shortcut: Ctrl+Shift+Enter
OR
Click: ⚡ Lightning bolt icon

WAIT: This will take 5-30 seconds
Expected Output: "X queries executed successfully"
```

### Step 4.6: Verify Tables Created
```
Copy this SQL query:

SELECT TABLE_NAME 
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'campuspulse' 
ORDER BY TABLE_NAME;

Paste into query editor
Execute (Ctrl+Shift+Enter)

Expected Result: List of ~30 tables including:
- users
- clubs
- departments
- classes
- events
- announcements
- incidents
- notifications
- auth_sessions
- ... (and more)
```

### Step 4.7: Verify Department Count
```
Copy this SQL query:

SELECT COUNT(*) as department_count FROM departments;

Paste and Execute

Expected Result: 15 (MVJCE departments)
```

### Step 4.8: Verify Class Count
```
Copy this SQL query:

SELECT COUNT(*) as class_count FROM classes;

Paste and Execute

Expected Result: 35 (departments × years × sections)
```

---

## PHASE 5: ADD SEED DATA (OPTIONAL - For Testing Only)

### Step 5.1: GET THE SEED SQL
```
Open this file on your computer:
backend/src/db/seed.sql

Action: Copy ALL content
```

### Step 5.2: Execute Seed Data
```
In new query tab (Ctrl+T):
Paste the seed SQL
Execute (Ctrl+Shift+Enter)

Expected: Test accounts created
- admin@campuspulse.dev / Password123!
- teacher@campuspulse.dev / Password123!
- president@campuspulse.dev / Password123!
- student@campuspulse.dev / Password123!
```

### Step 5.3: Verify Seed Data
```
Copy this SQL:

SELECT full_name, email, role, approval_status FROM users;

Execute and verify you see test accounts
```

---

## ✅ DATABASE SETUP COMPLETE!

### Verification Checklist:
- [ ] Connected to Aiven MySQL
- [ ] Ran schema-production.sql successfully
- [ ] All ~30 tables created
- [ ] 15 departments exist
- [ ] 35 classes exist
- [ ] (Optional) Seed data created with test accounts

---

## 🔧 TROUBLESHOOTING

### Connection Failed Error
```
Problem: "Authentication failed for user 'avnadmin'"
Solution:
1. Double-check password (copy-paste carefully, check for spaces)
2. Verify you're using the Aiven credentials, not local MySQL
3. Go back to Aiven dashboard and re-copy credentials
```

### SSL/TLS Error
```
Problem: "SSL connection error"
Solution:
1. In MySQL Workbench connection settings
2. Set SSL Mode to "REQUIRED"
3. Leave CA File, Cert File, Key File blank
4. Click Test Connection again
```

### "Database 'campuspulse' not found"
```
Problem: Database doesn't exist yet
Solution:
The schema-production.sql creates it automatically
1. Make sure you didn't miss the CREATE DATABASE line
2. Re-run the entire schema-production.sql script
```

### Queries Executing But No Results
```
Problem: Tables don't show up
Solution:
1. Make sure you selected database: USE campuspulse;
2. In MySQL Workbench, expand "Schemas" on left panel
3. Right-click "campuspulse" → "Refresh"
```

### Cannot Execute Large SQL File
```
Problem: Too large or times out
Solution:
1. In MySQL Workbench: Edit → Preferences
2. SQL Editor → SQL Execution
3. Increase "Max allowed packet" to 256M
4. Restart Workbench and try again
```

---

## 📸 NEXT STEPS AFTER DATABASE IS READY

Once you see all tables and departments/classes verified:

1. **Save Your Aiven Credentials** (safely in a document)
   ```
   DB_HOST: ___________________________
   DB_PORT: ___________________________
   DB_USER: ___________________________
   DB_PASSWORD: ___________________________
   ```

2. **Proceed to Render Backend Deployment** (see RENDER_SETUP.md)

3. **Then to Vercel Frontend Deployment** (see VERCEL_SETUP.md)

---

## 🆘 STUCK? 

Copy-paste these commands in MySQL Workbench and send me the results:

```sql
-- Check if database exists
SHOW DATABASES LIKE 'campuspulse';

-- Check number of tables
SELECT COUNT(*) as table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'campuspulse';

-- List all tables
SHOW TABLES;

-- Check departments
SELECT COUNT(*) as dept_count FROM departments;

-- Check users
SELECT COUNT(*) as user_count FROM users;

-- Check one sample table structure
DESCRIBE users;
```

Good luck! Let me know when database is ready. 🚀
