require('dotenv').config();
const pool = require('../src/config/db');
(async()=>{
 try {
  const [[db]] = await pool.query('SELECT DATABASE() AS name');
  const [[userCount]] = await pool.query('SELECT COUNT(*) AS n FROM users');
  const [[deptCount]] = await pool.query('SELECT COUNT(*) AS n FROM departments');
  const [[classCount]] = await pool.query('SELECT COUNT(*) AS n FROM classes');
  const [[locCount]] = await pool.query('SELECT COUNT(*) AS n FROM locations');
  console.log(JSON.stringify({database:db.name,users:Number(userCount.n),departments:Number(deptCount.n),classes:Number(classCount.n),locations:Number(locCount.n)},null,2));
 } catch(e){ console.error('Database check failed:',e.message); process.exitCode=1; } finally { await pool.end(); }
})();
