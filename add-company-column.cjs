/**
 * Script to reset ticket counters and manage tickets per tenant
 */
require('dotenv').config();
const { Pool } = require('pg');

// Create a connection to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Parse command-line arguments
const args = process.argv.slice(2);
const tenantId = parseInt(args[0]);

async function getTicketCountForTenant(tenantId) {
  try {
    // Get tenant's ticket count
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM tickets WHERE "tenantId" = $1`,
      [tenantId]
    );
    
    console.log(`Tenant ${tenantId} has ${result.rows[0].count} tickets.`);
    
    // Get tickets by category
    const categories = await pool.query(
      `SELECT category, COUNT(*) as count 
       FROM tickets 
       WHERE "tenantId" = $1 
       GROUP BY category`,
      [tenantId]
    );
    
    console.log('Ticket breakdown by category:');
    console.table(categories.rows);
    
    return result.rows[0].count;
  } catch (error) {
    console.error('Error getting ticket count:', error);
    return 0;
  }
}

async function deleteTicketsForTenant(tenantId) {
  try {
    // Get ticket count first
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM tickets WHERE "tenantId" = $1`,
      [tenantId]
    );
    
    const ticketCount = parseInt(result.rows[0].count);
    console.log(`Found ${ticketCount} tickets for tenant ${tenantId}.`);
    
    if (ticketCount === 0) {
      console.log('No tickets to delete.');
      return 0;
    }
    
    // Get ticket IDs
    const ticketIdsResult = await pool.query(
      `SELECT id FROM tickets WHERE "tenantId" = $1`,
      [tenantId]
    );
    
    const ticketIds = ticketIdsResult.rows.map(row => row.id);
    
    // Delete messages first
    if (ticketIds.length > 0) {
      const deleteMessagesResult = await pool.query(
        `DELETE FROM messages WHERE "ticketId" IN (${ticketIds.join(', ')})
         RETURNING id`
      );
      console.log(`Deleted ${deleteMessagesResult.rowCount} messages.`);
    }
    
    // Delete tickets
    const deleteTicketsResult = await pool.query(
      `DELETE FROM tickets WHERE "tenantId" = $1 RETURNING id`,
      [tenantId]
    );
    
    console.log(`Deleted ${deleteTicketsResult.rowCount} tickets for tenant ${tenantId}.`);
    return deleteTicketsResult.rowCount;
  } catch (error) {
    console.error('Error deleting tickets:', error);
    return 0;
  }
}

async function createSampleTickets(tenantId, count = 5) {
  try {
    const now = new Date().toISOString();
    const categories = ['technical_issue', 'billing', 'feature_request', 'account', 'documentation'];
    const statuses = ['open', 'in_progress', 'resolved', 'closed'];
    const complexities = ['simple', 'medium', 'complex'];
    
    for (let i = 1; i <= count; i++) {
      // Select random category, status and complexity
      const category = categories[Math.floor(Math.random() * categories.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const complexity = complexities[Math.floor(Math.random() * complexities.length)];
      
      // Create ticket
      const result = await pool.query(
        `INSERT INTO tickets 
         ("tenantId", title, description, status, category, complexity, "createdBy", "assignedTo", "createdAt", "updatedAt")
         VALUES 
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          tenantId,
          `Sample Ticket ${i} - ${category}`,
          `This is a test ticket #${i} with ${category} category created for tenant ${tenantId}.`,
          status,
          category,
          complexity,
          1, // Admin user ID as creator
          'support', // Role-based assignment
          now,
          now
        ]
      );
      
      console.log(`Created ticket ID ${result.rows[0].id} for tenant ${tenantId} (${category}, ${status})`);
    }
    
    console.log(`Successfully created ${count} sample tickets for tenant ${tenantId}.`);
    return count;
  } catch (error) {
    console.error('Error creating sample tickets:', error);
    return 0;
  }
}

async function resetTicketSequence() {
  try {
    // Get current max ticket ID
    const maxResult = await pool.query(
      `SELECT MAX(id) as max_id FROM tickets`
    );
    
    const maxId = parseInt(maxResult.rows[0].max_id || '0');
    console.log(`Current maximum ticket ID: ${maxId}`);
    
    if (maxId > 0) {
      // Reset sequence
      await pool.query(
        `SELECT setval('tickets_id_seq', $1, true)`,
        [maxId]
      );
      
      console.log(`Ticket sequence reset to ${maxId + 1}.`);
    } else {
      console.log('No tickets found, sequence not updated.');
    }
    
    return maxId;
  } catch (error) {
    console.error('Error resetting ticket sequence:', error);
    return 0;
  }
}

// Main function
async function main() {
  console.log('== Tenant Ticket Manager ==');
  
  if (!tenantId) {
    console.error('Error: Tenant ID required as first argument.');
    console.log('Usage: node add-company-column.cjs <tenantId> [action] [count]');
    console.log('Actions: count, delete, create, reset (default: count)');
    process.exit(1);
  }
  
  const action = args[1] || 'count';
  const count = parseInt(args[2] || '5');
  
  try {
    switch (action) {
      case 'count':
        await getTicketCountForTenant(tenantId);
        break;
        
      case 'delete':
        await deleteTicketsForTenant(tenantId);
        await resetTicketSequence();
        break;
        
      case 'create':
        await createSampleTickets(tenantId, count);
        await resetTicketSequence();
        break;
        
      case 'reset':
        await deleteTicketsForTenant(tenantId);
        await createSampleTickets(tenantId, count);
        await resetTicketSequence();
        break;
        
      default:
        console.log('Unknown action. Use: count, delete, create, or reset.');
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    await pool.end();
    process.exit(1);
  }
}

// Run the script
main();