const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    })
  : new Pool({
      host: process.env.PGHOST || 'localhost',
      port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
      database: process.env.PGDATABASE || 'teamdashboard',
      user: process.env.PGUSER || process.env.USER || 'iamrps',
      password: process.env.PGPASSWORD || undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

// Auto-create table on cloud startup if it does not exist
async function initSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS work_entries (
        id SERIAL PRIMARY KEY,
        member_name VARCHAR(255) NOT NULL,
        codebase VARCHAR(255) NOT NULL,
        task VARCHAR(255) NOT NULL,
        comment TEXT NOT NULL,
        files JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(50) NOT NULL DEFAULT 'working',
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_on TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_work_entries_status ON work_entries(status);
      CREATE INDEX IF NOT EXISTS idx_work_entries_last_updated ON work_entries(last_updated DESC);
    `);
  } catch (err) {
    console.error('Database schema init notice:', err.message);
  }
}

initSchema();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
