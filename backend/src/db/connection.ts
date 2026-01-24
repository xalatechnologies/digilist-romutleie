/**
 * Database Connection
 * PostgreSQL connection using pg library
 */

import { Pool, PoolConfig } from 'pg';

// Database configuration from environment variables
const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'digilist',
  user: process.env.DB_USER || process.env.USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Test connection
pool.on('connect', () => {
  console.log('Database connected');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

/**
 * Execute a query with error handling
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res.rows;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
}

/**
 * Execute a query and return a single row
 */
export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Close the connection pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

