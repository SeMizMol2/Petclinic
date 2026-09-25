const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const migrationFiles = [
  'add_owner_appointment_requests.pgsql',
  'allow_unconfirmed_appointment_requests.pgsql'
];
Promise.resolve()
  .then(async () => {
    for (const file of migrationFiles) {
      const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', file), 'utf8');
      await pool.query(sql);
    }
  })
  .then(() => console.log('Owner appointment request migration applied'))
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => pool.end());
