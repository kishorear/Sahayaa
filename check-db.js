import pkg from 'pg';
const { Pool } = pkg;
import { scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Function to hash password the same way as in auth.ts
async function hashPassword(password) {
  const salt = "testingsalt123456"; // Using fixed salt for verification
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test the connection
async function testConnection() {
  try {
    console.log('Attempting to connect to DB with connection string:', 
                process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'));
                
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connected successfully:', result.rows[0]);
    
    // Try to query the users table
    const usersResult = await client.query('SELECT COUNT(*) FROM users');
    console.log('Users in database:', usersResult.rows[0]);
    
    // Check for the admin user
    const adminResult = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);
    
    if (adminResult.rows.length > 0) {
      console.log('Admin user exists:', {
        id: adminResult.rows[0].id,
        username: adminResult.rows[0].username,
        role: adminResult.rows[0].role,
        created_at: adminResult.rows[0].created_at
      });
      
      // Test manual authentication for admin user
      const hashedPassword = await hashPassword('admin123');
      console.log('Hashed admin123 password (for comparison):', hashedPassword);
      console.log('Stored admin password hash:', adminResult.rows[0].password);
      
    } else {
      console.log('Admin user does not exist');
      
      // Create admin user
      console.log('Creating admin user...');
      const hashedPassword = await hashPassword('admin123');
      const insertResult = await client.query(
        'INSERT INTO users (username, password, role, tenant_id, name, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        ['admin', hashedPassword, 'admin', 1, 'Administrator', 'admin@example.com']
      );
      console.log('Admin user created with ID:', insertResult.rows[0].id);
    }
    
    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await pool.end();
  }
}

testConnection();