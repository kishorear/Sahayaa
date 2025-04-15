// Migration script to add the profilePicture column to the users table

import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Create a new PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    console.log('Adding profilePicture column to users table...');
    
    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Check if the column already exists
      const checkResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profilepicture'
      `);
      
      if (checkResult.rows.length === 0) {
        // Column doesn't exist, so add it
        await client.query(`
          ALTER TABLE users ADD COLUMN profilepicture TEXT;
        `);
        console.log('Successfully added profilepicture column to users table');
      } else {
        console.log('profilepicture column already exists in users table');
      }
      
      // Also make sure the profilePicture column exists (camelCase)
      const checkCamelCaseResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'profilePicture'
      `);
      
      if (checkCamelCaseResult.rows.length === 0) {
        // Column doesn't exist, so add it
        await client.query(`
          ALTER TABLE users ADD COLUMN "profilePicture" TEXT;
        `);
        console.log('Successfully added profilePicture column (camelCase) to users table');
        
        // If both columns exist, copy data from lowercase to camelCase
        const copyDataResult = await client.query(`
          UPDATE users SET "profilePicture" = profilepicture 
          WHERE profilepicture IS NOT NULL AND "profilePicture" IS NULL;
        `);
        console.log('Copied any existing data from profilepicture to profilePicture');
      } else {
        console.log('profilePicture column (camelCase) already exists in users table');
      }
      
    } finally {
      // Release the client
      client.release();
    }
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();