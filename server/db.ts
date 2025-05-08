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
  // Default DB connection configuration with optimized timeouts for stability
  const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    // Increase connection timeout to handle network latency in production
    connectionTimeoutMillis: 10000, // 10 seconds
    // Add idle timeout to clean up unused connections
    idleTimeoutMillis: 60000, // 60 seconds
    // Limit connection pool size to prevent overwhelming the database
    max: 15, // Increased pool size for more concurrent connections
    // More tolerant query timeout
    statement_timeout: 20000, // 20 seconds
    // Add keepalive settings to help with connection reliability
    keepalive: true,
    // Client will automatically try to reconnect up to 10 times
    max_retries: 10,
    // How long to wait between retries (ms)
    retry_interval: 3000,
  };

  console.log("Database connection config:", {
    connectionString: process.env.DATABASE_URL ? "[REDACTED]" : undefined,
    ssl: dbConfig.ssl ? "Enabled with rejectUnauthorized=false" : "Disabled",
    connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    idleTimeoutMillis: dbConfig.idleTimeoutMillis,
    max: dbConfig.max,
    statement_timeout: dbConfig.statement_timeout,
    keepalive: dbConfig.keepalive,
    max_retries: dbConfig.max_retries
  });

  // Create PostgreSQL connection pool with SSL support for production
  const pool = new Pool(dbConfig);

  // Flag to track connection state
  let isConnectionBroken = false;
  let reconnectTimer: NodeJS.Timeout | null = null;
  const RECONNECT_DELAY = 5000; // 5 seconds between reconnection attempts
  const MAX_RECONNECT_ATTEMPTS = 100; // Very high limit to keep trying in production
  let reconnectAttempts = 0;

  // Add enhanced error handler to the pool
  pool.on('error', (err: any) => {
    console.error('Unexpected error on idle client', err);
    
    // Check for all known types of connection errors including termination by admin
    const isConnectionError = err && typeof err === 'object' && 
      (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND' || 
       err.code === '57P01' || // terminating connection due to administrator command
       err.code === '08006' || // connection failure
       err.code === '08001' || // unable to connect
       err.code === '3D000' || // database does not exist
       err.code === '28P01' || // invalid password
       (err.message && (
         err.message.includes('Connection terminated') || 
         err.message.includes('timeout') ||
         err.message.includes('connection') ||
         err.message.includes('Connection refused')
       ))
      );
    
    if (isConnectionError) {
      console.error('Database connection error, continuing with fallback:', err.message);
      
      // Mark connection as broken to trigger fallbacks
      isConnectionBroken = true;
      
      // Schedule reconnection if not already scheduled
      if (!reconnectTimer && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.log(`Scheduling database reconnection attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS} in ${RECONNECT_DELAY}ms...`);
        
        reconnectTimer = setTimeout(async () => {
          reconnectAttempts++;
          console.log(`Attempting database reconnection #${reconnectAttempts}...`);
          
          try {
            const reconnected = await reconnectDb();
            
            if (reconnected) {
              console.log('Database reconnection successful!');
              isConnectionBroken = false;
              reconnectAttempts = 0;
              reconnectTimer = null;
            } else {
              console.error('Database reconnection failed.');
              
              // Schedule another attempt if we haven't hit the limit
              if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectTimer = setTimeout(() => {
                  reconnectTimer = null;
                  pool.emit('error', new Error('Trigger next reconnection attempt'));
                }, RECONNECT_DELAY * Math.min(5, reconnectAttempts)); // Exponential backoff up to 5x
              } else {
                console.error(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
              }
            }
          } catch (reconnectError) {
            console.error('Error during database reconnection:', reconnectError);
            reconnectTimer = null;
            
            // Trigger another reconnection attempt
            if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
              pool.emit('error', new Error('Reconnection error, scheduling another attempt'));
            }
          }
        }, RECONNECT_DELAY);
      }
    }
  });

  // Test the connection with retries
  const testConnection = async (retries = 5, initialDelay = 1000) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Use a query with a short timeout
        const res = await pool.query('SELECT NOW()');
        console.log('Database connection successful!', res.rows[0]);
        isConnectionBroken = false;
        return true;
      } catch (err: any) {
        const errorMessage = err && typeof err === 'object' ? err.message : String(err);
        console.error(`Database connection attempt ${attempt}/${retries} failed:`, errorMessage);
        
        // Set connection broken flag
        isConnectionBroken = true;
        
        if (attempt < retries) {
          // Use exponential backoff with jitter for retries
          const delay = initialDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5);
          console.log(`Retrying in ${Math.round(delay)}ms...`);
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

  // Add a method to check if the connection is currently broken
  (pool as any).isConnectionBroken = () => isConnectionBroken;

  return pool;
}

// Create the database pool
const pool = createDbPool();

// Initialize Drizzle with the pool
export const db = drizzle(pool, { schema });

// Add a more robust function to test the database connection with timeout
export async function testDbConnection(timeout = 5000): Promise<boolean> {
  // Create a test promise that can be timed out
  const testPromise = new Promise<boolean>(async (resolve) => {
    try {
      // Get a client from the pool with a specific timeout
      const client = await pool.connect();
      
      try {
        // Run a simple query to verify connection
        const result = await client.query('SELECT NOW()');
        console.log('Database connection test successful:', result.rows[0]);
        
        // Reset the connection broken flag if it exists
        if (typeof (pool as any).isConnectionBroken === 'function') {
          (pool as any).isConnectionBroken = () => false;
        }
        
        resolve(true);
      } catch (queryError) {
        console.error('Database query test failed:', queryError);
        resolve(false);
      } finally {
        // Always release the client back to the pool
        client.release();
      }
    } catch (connectionError) {
      console.error('Database connection acquisition failed:', connectionError);
      
      // Set the connection broken flag if it exists
      if (typeof (pool as any).isConnectionBroken === 'function') {
        (pool as any).isConnectionBroken = () => true;
      }
      
      resolve(false);
    }
  });
  
  // Run the test with a timeout to avoid hanging
  try {
    return await Promise.race([
      testPromise,
      new Promise<boolean>((resolve) => setTimeout(() => {
        console.error(`Database connection test timed out after ${timeout}ms`);
        
        // Set the connection broken flag if it exists
        if (typeof (pool as any).isConnectionBroken === 'function') {
          (pool as any).isConnectionBroken = () => true;
        }
        
        resolve(false);
      }, timeout))
    ]);
  } catch (error) {
    console.error('Unexpected error during database connection test:', error);
    return false;
  }
}

// Add a more robust reconnection function with multiple attempts
export async function reconnectDb(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Attempting to reconnect to the database (attempt ${attempt}/${maxAttempts})...`);
      
      // Try to end existing connections gracefully
      try {
        await Promise.race([
          pool.end(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Pool end timeout')), 3000))
        ]);
        console.log('Successfully closed existing pool connections');
      } catch (endError) {
        console.warn('Error closing pool connections, creating new pool anyway:', endError);
        // Continue even if ending the pool fails
      }
      
      // Create a new connection pool
      const newPool = createDbPool();
      
      // Test the new pool immediately with a timeout
      const testPromise = new Promise<boolean>(async (resolve) => {
        try {
          const client = await newPool.connect();
          try {
            await client.query('SELECT 1');
            console.log('New database connection verified successfully');
            resolve(true);
          } finally {
            client.release();
          }
        } catch (testError) {
          console.error('Failed to test new database connection:', testError);
          resolve(false);
        }
      });
      
      // Use a timeout to avoid hanging indefinitely
      const connectionSuccessful = await Promise.race([
        testPromise,
        new Promise<boolean>((resolve) => setTimeout(() => {
          console.error('Database connection test timed out');
          resolve(false);
        }, 5000))
      ]);
      
      if (connectionSuccessful) {
        // Replace the old pool with the new one
        Object.assign(pool, newPool);
        console.log('Database pool successfully reconnected and replaced');
        
        // Reinitialize the db instance with the new pool
        Object.assign(db, drizzle(pool, { schema }));
        console.log('Drizzle ORM instance updated with new pool');
        
        return true;
      } else {
        console.error(`Reconnection attempt ${attempt} failed - new pool could not connect`);
        // Try to clean up the failed pool
        try {
          await newPool.end();
        } catch (e) {
          // Ignore errors when ending a failed pool
        }
      }
    } catch (error) {
      console.error(`Database reconnection attempt ${attempt} failed with error:`, error);
    }
    
    // If we're going to retry, wait before the next attempt with exponential backoff
    if (attempt < maxAttempts) {
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.log(`Waiting ${delay}ms before next reconnection attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error(`Failed to reconnect to the database after ${maxAttempts} attempts`);
  return false;
}

// Create a resilient query wrapper function
export async function executeQuery<T>(
  queryFn: () => Promise<T>,
  fallbackFn?: () => Promise<T>,
  options: {
    retries?: number;
    initialDelay?: number;
    timeoutMs?: number;
    logPrefix?: string;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    initialDelay = 500,
    timeoutMs = 10000,
    logPrefix = 'DB Query'
  } = options;
  
  // Check if we know the connection is broken and we have a fallback
  if (typeof (pool as any).isConnectionBroken === 'function' && 
      (pool as any).isConnectionBroken() && 
      fallbackFn) {
    console.log(`${logPrefix}: Using fallback function directly as DB connection is known to be broken`);
    return fallbackFn();
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Execute the query with a timeout
      return await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`${logPrefix}: Query timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`${logPrefix}: Attempt ${attempt}/${retries} failed: ${errorMessage}`);
      
      // Special handling for JSON column errors
      if (error instanceof Error && 
          (errorMessage.includes('JSON') || 
           errorMessage.includes('json') || 
           errorMessage.includes('circular') ||
           errorMessage.includes('stringify') ||
           errorMessage.includes('unexpected token'))) {
        console.error(`${logPrefix}: JSON handling error detected:`, errorMessage);
        
        if (error.stack) {
          console.error(`${logPrefix}: Error stack:`, error.stack);
        }
        
        // Try to print the query function for debugging (limit length for logs)
        try {
          if (typeof queryFn.toString === 'function') {
            const fnString = queryFn.toString();
            console.log(`${logPrefix}: Query function:`, fnString.substring(0, 300) + (fnString.length > 300 ? '...' : ''));
          }
        } catch (debugError) {
          // Ignore errors in debug logging
        }
      }
      
      // Check if this is a fatal/connection error versus a query error
      const isConnectionError = 
        error instanceof Error && (
          errorMessage.includes('Connection') ||
          errorMessage.includes('connection') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('ECONNREFUSED') ||
          errorMessage.includes('pool is draining') ||
          errorMessage.includes('database') ||
          errorMessage.includes('DB') ||
          errorMessage.includes('57P01') || // terminating connection due to administrator command
          errorMessage.includes('08006') || // connection failure
          errorMessage.includes('08001')    // unable to connect
        );
      
      // If this is a connection issue and we're at the last retry, use the fallback if available
      if (isConnectionError && attempt >= retries && fallbackFn) {
        console.log(`${logPrefix}: Database connection issue detected, switching to fallback function`);
        
        // Mark the connection as broken
        if (typeof (pool as any).isConnectionBroken === 'function') {
          (pool as any).isConnectionBroken = () => true;
        }
        
        // Schedule a reconnection attempt in the background
        setTimeout(() => {
          console.log(`${logPrefix}: Scheduling background reconnection attempt`);
          reconnectDb().catch(e => console.error('Background reconnection failed:', e));
        }, 1000);
        
        return fallbackFn();
      }
      
      // If we have retries left, wait with exponential backoff before trying again
      if (attempt < retries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`${logPrefix}: Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else if (!fallbackFn) {
        // If we've exhausted retries and have no fallback, rethrow the error
        throw error;
      }
    }
  }
  
  // This should never be reached if we have a fallback function, but TypeScript needs it
  throw new Error(`${logPrefix}: All retries failed and no fallback provided`);
}

// Export pool for reuse
export { pool };