const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ DB connection failed', err)
  } else {
    console.log('✅ DB connected at', res.rows[0].now)
  }
})

module.exports = pool;
