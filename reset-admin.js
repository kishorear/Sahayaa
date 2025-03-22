import pkg from 'pg';
const { Pool } = pkg;

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Test the connection
async function resetAdmin() {
  try {
    console.log('Attempting to connect to DB with connection string:', 
                process.env.DATABASE_URL?.replace(/:[^:]*@/, ':****@'));
                
    const client = await pool.connect();
    
    // Set admin password to 'admin123' with a known hash value
    const newPasswordHash = 'f7c599645918f8c4c75d0923bd130abc40cb6a17ef2643ad98d2e9fbdc02b1b0e2a8845ecae969e754040dd609a1e2d275bff1a19ed2b011ba2d0ccddd4aabc0.97a66c9a73dcdd3710d82daa6967a53b';
    
    // Update the admin user password
    const updateResult = await client.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id',
      [newPasswordHash, 'admin']
    );
    
    if (updateResult.rows.length > 0) {
      console.log('Admin password reset successfully for user ID:', updateResult.rows[0].id);
    } else {
      console.log('Admin user not found');
    }
    
    client.release();
  } catch (err) {
    console.error('Database operation error:', err);
  } finally {
    await pool.end();
  }
}

resetAdmin();