const { Pool } = require("pg");
require("dotenv").config();

// IMPORTANT: Create a connection pool to PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// NOTE: This function initializes the database schema
// It creates the users table with a primary key AND a unique index on email
// NOTA BENE: The unique index guarantees email uniqueness at the database level,
// regardless of how many sources push data simultaneously
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'unverified',
        last_login TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        verification_token VARCHAR(255)
      );
    `);

    // IMPORTANT: Create a unique index on email column
    // This is NOT a primary key — it is a separate unique index
    // NOTE: This ensures email uniqueness at the storage level
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (email);
    `);

    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization error:", err.message);
    throw err;
  } finally {
    client.release();
  }
}

// IMPORTANT: Helper to generate a unique ID value for verification tokens
function getUniqIdValue() {
  const { v4: uuidv4 } = require("uuid");
  return uuidv4();
}

module.exports = { pool, initDB, getUniqIdValue };
