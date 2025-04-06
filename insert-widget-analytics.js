// Script to insert sample data into the widget_analytics table
import postgres from 'postgres';

// Configure connection
const connectionString = process.env.DATABASE_URL;

console.log('Connecting to database...');

// Connect to the database
const sql = postgres(connectionString, { ssl: { rejectUnauthorized: false } });

// Insert sample widget analytics data
async function insertWidgetAnalytics() {
  try {
    console.log('Inserting sample widget analytics data...');
    
    // Insert sample record with autoResolvedConversations in metadata
    await sql`
      INSERT INTO widget_analytics (
        tenant_id, admin_id, api_key, client_website, client_info,
        interactions, messages_received, messages_sent, tickets_created,
        last_activity, last_client_ip, metadata
      ) VALUES (
        1, 1, 'default-widget-key', 'https://example.com', 'Mozilla/5.0',
        120, 80, 70, 10,
        NOW(), '127.0.0.1',
        ${{ autoResolvedConversations: 15, customFields: { source: 'website' } }}
      )
    `;
    
    console.log('Inserted sample widget analytics data successfully!');
  } catch (error) {
    console.error('Error inserting widget analytics data:', error);
  } finally {
    // Close the connection
    await sql.end();
  }
}

insertWidgetAnalytics().catch(e => {
  console.error('Error in database operation:', e);
  process.exit(1);
});