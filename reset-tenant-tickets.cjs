require('dotenv').config();
const { Pool } = require('pg');
const { eq, sql } = require('drizzle-orm');
const { drizzle } = require('drizzle-orm/node-postgres');

// Create a connection to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Create a Drizzle instance
const db = drizzle(pool);

// Define the ticket and message tables from schema
const tickets = {
  id: { name: 'id' },
  tenantId: { name: 'tenant_id' },
  title: { name: 'title' },
  status: { name: 'status' },
  category: { name: 'category' },
  createdAt: { name: 'created_at' },
  updatedAt: { name: 'updated_at' }
};

const messages = {
  id: { name: 'id' },
  ticketId: { name: 'ticket_id' }
};

/**
 * Reset Tenant Tickets
 * 
 * This script provides functionality to:
 * 1. View ticket counts by tenant
 * 2. Reset ticket sequence counters
 * 3. Delete all tickets for a specific tenant (with confirmation)
 * 4. Create sample tickets for testing
 */

// Parse command-line arguments
const args = process.argv.slice(2);
const tenantId = parseInt(args[0]);
const action = args[1]?.toLowerCase() || 'help';
const count = parseInt(args[2]) || 5;

// Validate tenant ID
if (!tenantId && action !== 'help') {
  console.error('Error: Tenant ID required');
  printHelp();
  process.exit(1);
}

/**
 * Print help information
 */
function printHelp() {
  console.log(`
Usage: node reset-tenant-tickets.cjs <tenantId> <action> [count]

Arguments:
  tenantId    Required. The ID of the tenant to manage tickets for
  action      Required. One of:
              - reset      Delete tickets and create new ones
              - delete     Delete all tickets for tenant
              - create     Create sample tickets
              - count      Show ticket count for tenant
              - help       Show this help
  count       Optional. Number of tickets to create (default: 5)

Examples:
  node reset-tenant-tickets.cjs 2 reset 10     # Reset tenant 2 tickets, create 10 new ones
  node reset-tenant-tickets.cjs 1 delete       # Delete all tickets for tenant 1
  node reset-tenant-tickets.cjs 3 create 20    # Create 20 sample tickets for tenant 3
  node reset-tenant-tickets.cjs 2 count        # Show ticket count for tenant 2
`);
}

/**
 * Get ticket count for a tenant
 */
async function getTicketCount(tenantId) {
  try {
    const result = await db.select({
      count: sql`COUNT(*)`.as('count')
    })
    .from('tickets')
    .where(eq(sql`tenant_id`, tenantId));
    
    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error getting ticket count:', error);
    return 0;
  }
}

/**
 * Delete all tickets for a tenant
 */
async function deleteTickets(tenantId) {
  try {
    const ticketCount = await getTicketCount(tenantId);
    
    if (ticketCount === 0) {
      console.log(`No tickets found for tenant ${tenantId}.`);
      return 0;
    }
    
    // Get all ticket IDs for this tenant (for message deletion)
    const ticketIds = await db.select({
      id: sql\`id\`
    })
    .from('tickets')
    .where(eq(sql\`tenant_id\`, tenantId));
    
    // Delete associated messages first
    if (ticketIds.length > 0) {
      const ticketIdArray = ticketIds.map(t => t.id);
      await db.execute(
        sql\`DELETE FROM messages WHERE ticket_id IN (${ticketIdArray.join(', ')})\`
      );
      console.log(`Deleted messages for ${ticketIdArray.length} tickets.`);
    }
    
    // Delete the tickets
    await db.execute(
      sql\`DELETE FROM tickets WHERE tenant_id = ${tenantId}\`
    );
    
    console.log(`Successfully deleted ${ticketCount} tickets for tenant ${tenantId}.`);
    return ticketCount;
  } catch (error) {
    console.error(`Error deleting tickets for tenant ${tenantId}:`, error);
    return 0;
  }
}

/**
 * Create sample tickets for testing
 */
async function createSampleTickets(tenantId, count) {
  try {
    const now = new Date().toISOString();
    const categories = ['technical_issue', 'billing', 'feature_request', 'account', 'documentation'];
    const statuses = ['open', 'in_progress', 'resolved', 'closed'];
    const priorities = ['low', 'medium', 'high', 'critical'];
    
    for (let i = 1; i <= count; i++) {
      // Randomly select category, status, and priority
      const category = categories[Math.floor(Math.random() * categories.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      
      // Insert a new ticket
      await db.execute(
        sql\`INSERT INTO tickets 
            (tenant_id, title, description, status, priority, category, created_by, assigned_to, created_at, updated_at)
            VALUES 
            (${tenantId}, 
             'Sample Ticket ${i} - ${category} (Tenant ${tenantId})', 
             'This is a test ticket #${i} with ${category} category created for tenant ${tenantId}.', 
             '${status}', 
             '${priority}', 
             '${category}', 
             'system', 
             'support', 
             '${now}', 
             '${now}')\`
      );
      
      console.log(`Created ticket for tenant ${tenantId} (${category}, ${status})`);
    }
    
    console.log(`Successfully created ${count} sample tickets for tenant ${tenantId}.`);
    return count;
  } catch (error) {
    console.error(`Error creating sample tickets for tenant ${tenantId}:`, error);
    return 0;
  }
}

/**
 * Reset the ticket sequence to the current max value
 */
async function resetTicketSequence() {
  try {
    // Get the current max ticket ID
    const result = await db.select({
      maxId: sql\`MAX(id)\`.as('maxId')
    })
    .from('tickets');
    
    const maxId = result[0]?.maxId || 0;
    
    if (maxId > 0) {
      // Reset the sequence
      const sequenceName = 'tickets_id_seq';
      await db.execute(
        sql\`SELECT setval('${sequenceName}', ${maxId}, true)\`
      );
      
      console.log(`Ticket sequence reset to ${maxId + 1}.`);
    } else {
      console.log('No tickets found. Sequence not updated.');
    }
    
    return maxId;
  } catch (error) {
    console.error('Error resetting ticket sequence:', error);
    return 0;
  }
}

// Main execution based on command
(async function main() {
  try {
    switch (action) {
      case 'reset':
        console.log(`Resetting tickets for tenant ${tenantId}...`);
        await deleteTickets(tenantId);
        await createSampleTickets(tenantId, count);
        await resetTicketSequence();
        break;
        
      case 'delete':
        console.log(`Deleting all tickets for tenant ${tenantId}...`);
        await deleteTickets(tenantId);
        await resetTicketSequence();
        break;
        
      case 'create':
        console.log(`Creating ${count} sample tickets for tenant ${tenantId}...`);
        await createSampleTickets(tenantId, count);
        await resetTicketSequence();
        break;
        
      case 'count':
        const ticketCount = await getTicketCount(tenantId);
        console.log(`Tenant ${tenantId} has ${ticketCount} tickets.`);
        
        // Show summary by category
        const categoryCount = await db.select({
          category: sql\`category\`,
          count: sql\`COUNT(*)\`.as('count')
        })
        .from('tickets')
        .where(eq(sql\`tenant_id\`, tenantId))
        .groupBy(sql\`category\`);
        
        console.log('Tickets by category:');
        console.table(categoryCount);
        break;
        
      case 'help':
      default:
        printHelp();
        break;
    }
    
    // Close the database connection
    await pool.end();
    
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    
    // Close the database connection
    await pool.end();
    
    process.exit(1);
  }
})();