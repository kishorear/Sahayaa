// Script to create the support_documents and document_usage tables in the database
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

// Create a new database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const createSupportDocumentsTable = `
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
  published_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);
`;

const createDocumentUsageTable = `
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
);
`;

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Creating support_documents table...');
    await client.query(createSupportDocumentsTable);
    
    console.log('Creating document_usage table...');
    await client.query(createDocumentUsageTable);
    
    await client.query('COMMIT');
    console.log('Tables created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createTables();