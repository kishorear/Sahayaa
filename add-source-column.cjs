// Script to add source column to tickets table
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Add source column to tickets table
 */
async function addSourceColumn() {
  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Check if the column already exists
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tickets' AND column_name = 'source'
    `;
    const columnCheck = await client.query(checkColumnQuery);

    // Only add the column if it doesn't exist
    if (columnCheck.rows.length === 0) {
      console.log('Adding source column to tickets table...');
      
      // Add the column
      await client.query(`
        ALTER TABLE tickets 
        ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'chat'
      `);
      
      console.log('Source column added successfully.');
    } else {
      console.log('Source column already exists.');
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    // Roll back transaction on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}

async function run() {
  try {
    await addSourceColumn();
    process.exit(0);
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    // Close pool
    await pool.end();
  }
}

// Run the migration
run();