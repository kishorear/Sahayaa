/**
 * Tenant Ticket Manager - CommonJS Version
 * 
 * This utility script helps manage tickets on a per-tenant basis.
 * It can count, delete, create, and reset tickets for a specific tenant.
 */

// Environment setup
require('dotenv').config();
const { Pool } = require('pg');
const readline = require('readline');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Utility function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Utility function to format console output
function formatSection(title) {
  console.log('\n' + '='.repeat(50));
  console.log(' ' + title);
  console.log('='.repeat(50));
}

/**
 * Get ticket count for a tenant
 */
async function getTicketCountForTenant(tenantId) {
  try {
    // Get basic ticket count
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM tickets WHERE "tenantId" = $1`,
      [tenantId]
    );
    
    const ticketCount = parseInt(countResult.rows[0].count);
    console.log(`Tenant ${tenantId} has ${ticketCount} tickets.`);
    
    if (ticketCount === 0) {
      return 0;
    }
    
    // Get breakdown by category
    const categoryResult = await pool.query(
      `SELECT category, COUNT(*) as count
       FROM tickets
       WHERE "tenantId" = $1
       GROUP BY category
       ORDER BY count DESC`,
      [tenantId]
    );
    
    if (categoryResult.rows.length > 0) {
      console.log('\nTicket breakdown by category:');
      console.table(categoryResult.rows);
    }
    
    // Get breakdown by status
    const statusResult = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM tickets
       WHERE "tenantId" = $1
       GROUP BY status
       ORDER BY count DESC`,
      [tenantId]
    );
    
    if (statusResult.rows.length > 0) {
      console.log('\nTicket breakdown by status:');
      console.table(statusResult.rows);
    }
    
    // Get breakdown by complexity
    const complexityResult = await pool.query(
      `SELECT complexity, COUNT(*) as count
       FROM tickets
       WHERE "tenantId" = $1
       GROUP BY complexity
       ORDER BY count DESC`,
      [tenantId]
    );
    
    if (complexityResult.rows.length > 0) {
      console.log('\nTicket breakdown by complexity:');
      console.table(complexityResult.rows);
    }
    
    return ticketCount;
  } catch (error) {
    console.error('Error getting ticket count:', error);
    return 0;
  }
}

/**
 * Delete all tickets for a tenant
 */
async function deleteTicketsForTenant(tenantId) {
  try {
    // First get count to confirm deletion amount
    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM tickets WHERE "tenantId" = $1`,
      [tenantId]
    );
    
    const ticketCount = parseInt(countResult.rows[0].count);
    
    if (ticketCount === 0) {
      console.log(`No tickets found for tenant ${tenantId}.`);
      return 0;
    }
    
    // Get all ticket IDs for message deletion
    const ticketIdsResult = await pool.query(
      `SELECT id FROM tickets WHERE "tenantId" = $1`,
      [tenantId]
    );
    
    const ticketIds = ticketIdsResult.rows.map(row => row.id);
    
    if (ticketIds.length > 0) {
      // Delete associated messages first
      const deletedMessages = await pool.query(
        `DELETE FROM messages WHERE "ticketId" IN (${ticketIds.join(', ')})
         RETURNING id`
      );
      
      console.log(`Deleted ${deletedMessages.rowCount} messages associated with ${ticketIds.length} tickets.`);
    }
    
    // Delete the tickets themselves
    const result = await pool.query(
      `DELETE FROM tickets WHERE "tenantId" = $1 RETURNING id`,
      [tenantId]
    );
    
    console.log(`Successfully deleted ${result.rowCount} tickets for tenant ${tenantId}.`);
    return result.rowCount;
  } catch (error) {
    console.error('Error deleting tickets:', error);
    return 0;
  }
}

/**
 * Create sample tickets for a tenant
 */
async function createSampleTickets(tenantId, count) {
  try {
    const now = new Date().toISOString();
    const categories = ['technical_issue', 'billing', 'feature_request', 'account', 'documentation', 'authentication'];
    const statuses = ['new', 'in_progress', 'resolved', 'closed'];
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
      
      const ticketId = result.rows[0].id;
      
      // Add AI-resolved status for some tickets (30% chance)
      if (Math.random() > 0.7) {
        await pool.query(
          `UPDATE tickets SET "aiResolved" = true, "aiNotes" = $1 WHERE id = $2`,
          [
            `AI automatically resolved this ${category} issue by providing documentation and guidance.`,
            ticketId
          ]
        );
      }
      
      // For resolved tickets, set resolved timestamp
      if (status === 'resolved' || status === 'closed') {
        await pool.query(
          `UPDATE tickets SET "resolvedAt" = $1 WHERE id = $2`,
          [now, ticketId]
        );
      }
      
      console.log(`Created ticket ID ${ticketId} for tenant ${tenantId} (${category}, ${status}, ${complexity})`);
    }
    
    console.log(`Successfully created ${count} sample tickets for tenant ${tenantId}.`);
    return count;
  } catch (error) {
    console.error('Error creating sample tickets:', error);
    return 0;
  }
}

/**
 * Reset the ticket sequence to the current max value
 */
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

// Interactive menu function
async function interactiveMenu() {
  while (true) {
    console.log('\n=== TENANT TICKET MANAGER ===');
    console.log('1. View ticket counts by tenant');
    console.log('2. Reset ticket sequence counter');
    console.log('3. Delete all tickets for a tenant');
    console.log('4. Create sample tickets for a tenant');
    console.log('5. Exit');
    
    const choice = await prompt('\nEnter your choice (1-5): ');
    
    switch (choice) {
      case '1':
        const viewTenantId = await prompt('Enter tenant ID to view ticket counts: ');
        await getTicketCountForTenant(parseInt(viewTenantId));
        break;
      case '2':
        await resetTicketSequence();
        break;
      case '3':
        const tenantIdToDelete = await prompt('Enter tenant ID to delete tickets for: ');
        const confirmDelete = await prompt(`Are you sure you want to delete all tickets for tenant ${tenantIdToDelete}? (yes/no): `);
        if (confirmDelete.toLowerCase() === 'yes') {
          await deleteTicketsForTenant(parseInt(tenantIdToDelete));
          await resetTicketSequence();
        } else {
          console.log('Delete operation cancelled.');
        }
        break;
      case '4':
        const tenantId = await prompt('Enter tenant ID to create tickets for: ');
        const ticketCount = await prompt('How many tickets to create? ');
        await createSampleTickets(parseInt(tenantId), parseInt(ticketCount));
        await resetTicketSequence();
        break;
      case '5':
        console.log('Exiting...');
        rl.close();
        await pool.end();
        return;
      default:
        console.log('Invalid choice, please try again.');
    }
    
    await prompt('\nPress Enter to continue...');
  }
}

// Command-line mode function
async function commandLineMode() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const tenantId = parseInt(args[0]);
  const action = args[1] || 'count';
  const count = parseInt(args[2] || '5');
  
  if (!tenantId) {
    console.error('Error: Tenant ID required as first argument.');
    console.log('Usage: node tenant-ticket-manager.cjs <tenantId> [action] [count]');
    console.log('Actions: count, delete, create, reset (default: count)');
    process.exit(1);
  }
  
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
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
  
  await pool.end();
  rl.close();
  process.exit(0);
}

// Main function - determine mode
async function main() {
  formatSection('Tenant Ticket Manager');
  
  // Check if we have command line arguments
  if (process.argv.length > 2) {
    await commandLineMode();
  } else {
    await interactiveMenu();
  }
}

// Run the script and handle errors
main().catch(error => {
  console.error('An unexpected error occurred:', error);
  pool.end();
  rl.close();
  process.exit(1);
});