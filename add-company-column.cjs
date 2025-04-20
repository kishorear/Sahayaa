const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addCompanyColumn() {
  try {
    console.log('Adding company column to users table...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS company TEXT
    `);
    console.log('Company column added successfully.');
  } catch (error) {
    console.error('Error adding company column:', error);
  } finally {
    await pool.end();
  }
}

addCompanyColumn();