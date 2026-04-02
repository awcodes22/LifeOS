import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ quiet: true });
// using a pool here instead of a single client
// pool handles multiple requests at the same time without choking
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false,
});

// quick check to confirm the db is actually connected on startup
pool.connect((err) => {
  if (err) {
    console.error("DB connection failed:", err.message);
  } else {
    console.log("Connected to Neon PostgreSQL");
  }
});

export default pool;
