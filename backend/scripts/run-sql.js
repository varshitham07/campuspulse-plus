require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/run-sql.js <sql-file>'); process.exit(2); }

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  try {
    const sql = fs.readFileSync(file, 'utf8');
    await connection.query(sql);
    console.log(`SQL completed: ${file}`);
  } finally { await connection.end(); }
})().catch(err => { console.error(`SQL failed: ${err.message}`); process.exit(1); });
