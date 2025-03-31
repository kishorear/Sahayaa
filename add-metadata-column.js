// Script to add metadata column to support_documents table if it doesn't exist
import postgres from 'postgres';

// Configure connection
const connectionString = process.env.DATABASE_URL;

console.log('Connecting to database...');

// Connect to the database
const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });

async function addMetadataColumn() {
  try {
    console.log('Checking if metadata column exists in support_documents table...');
    
    // Check if the column exists
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'support_documents' 
      AND column_name = 'metadata'
    `;
    
    if (columns.length === 0) {
      console.log('Adding metadata column to support_documents table...');
      // Add the column if it doesn't exist
      await sql`
        ALTER TABLE support_documents
        ADD COLUMN metadata JSONB DEFAULT '{}'
      `;
      console.log('Metadata column added successfully!');
    } else {
      console.log('Metadata column already exists in support_documents table.');
    }
  } catch (error) {
    console.error('Error modifying table:', error);
  } finally {
    // Close the connection
    await sql.end();
  }
}

addMetadataColumn().catch(e => {
  console.error('Error in database operation:', e);
  process.exit(1);
});