// Script to create database tables using postgres.js
import postgres from 'postgres';

// Configure connection
const connectionString = process.env.DATABASE_URL;

console.log('Connecting to database...');

// Connect to the database
const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });

// Create tables directly with SQL
async function createTables() {
  try {
    console.log('Creating support_documents table...');
    // Create the support_documents table
    await sql`
      CREATE TABLE IF NOT EXISTS support_documents (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL DEFAULT 1,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        category TEXT NOT NULL,
        tags TEXT[] DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'draft',
        error_codes TEXT[] DEFAULT '{}',
        keywords TEXT[] DEFAULT '{}',
        view_count INTEGER DEFAULT 0,
        created_by INTEGER NOT NULL,
        last_edited_by INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        published_at TIMESTAMP WITH TIME ZONE
      )
    `;
    
    // Create the document_usage table
    console.log('Creating document_usage table...');
    await sql`
      CREATE TABLE IF NOT EXISTS document_usage (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        ticket_id INTEGER,
        ai_request_id TEXT,
        query_text TEXT,
        usage_type TEXT NOT NULL,
        relevance_score INTEGER,
        ai_model TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        metadata JSONB DEFAULT '{}'
      )
    `;
    
    console.log('Tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    // Close the connection
    await sql.end();
  }
}

createTables().catch(e => {
  console.error('Error in database operation:', e);
  process.exit(1);
});