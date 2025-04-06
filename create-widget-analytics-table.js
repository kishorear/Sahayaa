// Script to create the widget_analytics table
import postgres from 'postgres';

// Configure connection
const connectionString = process.env.DATABASE_URL;

console.log('Connecting to database...');

// Connect to the database
const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });

// Create widget_analytics table directly with SQL
async function createWidgetAnalyticsTable() {
  try {
    console.log('Creating widget_analytics table...');
    // Create the widget_analytics table
    await sql`
      CREATE TABLE IF NOT EXISTS widget_analytics (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL,
        admin_id INTEGER NOT NULL,
        api_key TEXT NOT NULL,
        client_website TEXT,
        client_info TEXT,
        interactions INTEGER DEFAULT 0,
        messages_received INTEGER DEFAULT 0,
        messages_sent INTEGER DEFAULT 0,
        tickets_created INTEGER DEFAULT 0,
        last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        last_client_ip TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;
    
    console.log('widget_analytics table created successfully!');
  } catch (error) {
    console.error('Error creating widget_analytics table:', error);
  } finally {
    // Close the connection
    await sql.end();
  }
}

createWidgetAnalyticsTable().catch(e => {
  console.error('Error in database operation:', e);
  process.exit(1);
});