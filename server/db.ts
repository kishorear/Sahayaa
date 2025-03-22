import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Determine if we're in a production environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_ENVIRONMENT === 'production';

console.log("Database connection setup - Environment:", isProduction ? "Production" : "Development");
console.log("Database URL available:", !!process.env.DATABASE_URL);

// Create a function to get database connection with retries
function createDbPool() {
  // Default DB connection configuration
  const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    // Add connection timeout to fail fast if the database is unreachable
    connectionTimeoutMillis: 5000,
    // Add idle timeout to clean up unused connections
    idleTimeoutMillis: 30000,
    // Add max clients to limit connection pool size
    max: 20,
  };

  console.log("Database connection config:", {
    connectionString: process.env.DATABASE_URL ? "[REDACTED]" : undefined,
    ssl: dbConfig.ssl ? "Enabled with rejectUnauthorized=false" : "Disabled",
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis,
    max: dbConfig.max
  });

  // Create PostgreSQL connection pool with SSL support for production
  const pool = new Pool(dbConfig);

  // Add error handler to the pool
  pool.on('error', (err: any) => {
    console.error('Unexpected error on idle client', err);
    
    // Don't crash the application on connection errors
    if (err && typeof err === 'object' && 
        (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND')) {
      console.error('Database connection error, but continuing execution:', err.message);
    }
  });

  // Test the connection with retries
  const testConnection = async (retries = 3, delay = 2000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await pool.query('SELECT NOW()');
        console.log('Database connection successful!', res.rows[0]);
        return true;
      } catch (err: any) {
        const errorMessage = err && typeof err === 'object' ? err.message : String(err);
        console.error(`Database connection attempt ${attempt}/${retries} failed:`, errorMessage);
        
        if (attempt < retries) {
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error('All database connection attempts failed. Continuing with fallback mechanisms.');
        }
      }
    }
    return false;
  };
  
  // Start test connection process but don't wait for it
  testConnection();

  return pool;
}

// Create the database pool
const pool = createDbPool();

// Initialize Drizzle with the pool
export const db = drizzle(pool, { schema });

// Add a function to test the database connection
export async function testDbConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

// Add a reconnection function
export async function reconnectDb() {
  try {
    console.log('Attempting to reconnect to the database...');
    await pool.end();
    const newPool = createDbPool();
    // This is not ideal but for simplicity we're replacing the global pool
    Object.assign(pool, newPool);
    return await testDbConnection();
  } catch (error) {
    console.error('Database reconnection failed:', error);
    return false;
  }
}

// Export pool for reuse
export { pool };