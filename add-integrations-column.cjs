// Simple script to add the integrationSettings column to the tenants table
const { Client } = require('pg');

// Get the database URL from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function addColumn() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('Adding integrationSettings column to tenants table...');
    await client.query(`
      ALTER TABLE tenants
      ADD COLUMN IF NOT EXISTS "integrationSettings" JSONB DEFAULT '{}'::jsonb
    `);
    
    console.log('Column added successfully!');
  } catch (error) {
    console.error('Error adding column:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addColumn()
  .then(() => {
    console.log('Migration completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });