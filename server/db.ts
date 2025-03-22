import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Determine if we're in a production environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_ENVIRONMENT === 'production';

// Create PostgreSQL connection pool with SSL support for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

// Initialize Drizzle with the pool
export const db = drizzle(pool, { schema });

// Export pool for reuse
export { pool };