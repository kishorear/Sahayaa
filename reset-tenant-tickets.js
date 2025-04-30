import 'dotenv/config';
import { db } from './server/db.js';
import { tickets, messages } from './shared/schema.js';
import { sql, eq } from 'drizzle-orm';

/**
 * Reset Tenant Tickets
 * 
 * This script resets tickets for a specific tenant:
 * 1. Deletes all tickets for the specified tenant
 * 2. Creates new sample tickets (optional)
 * 3. Resets the ticket sequence if needed
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
Usage: node reset-tenant-tickets.js <tenantId> <action> [count]

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
  node reset-tenant-tickets.js 2 reset 10     # Reset tenant 2 tickets, create 10 new ones
  node reset-tenant-tickets.js 1 delete       # Delete all tickets for tenant 1
  node reset-tenant-tickets.js 3 create 20    # Create 20 sample tickets for tenant 3
  node reset-tenant-tickets.js 2 count        # Show ticket count for tenant 2
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
    .from(tickets)
    .where(eq(tickets.tenantId, tenantId));
    
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
      id: tickets.id
    })
    .from(tickets)
    .where(eq(tickets.tenantId, tenantId));
    
    // Delete associated messages first
    if (ticketIds.length > 0) {
      const ticketIdArray = ticketIds.map(t => t.id);
      const deletedMessages = await db.delete(messages)
        .where(sql`${messages.ticketId} IN (${ticketIdArray.join(', ')})`);
      console.log(`Deleted messages for ${ticketIdArray.length} tickets.`);
    }
    
    // Delete the tickets
    const deletedTickets = await db.delete(tickets)
      .where(eq(tickets.tenantId, tenantId));
    
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
    const now = new Date();
    const categories = ['technical_issue', 'billing', 'feature_request', 'account', 'documentation', 'authentication'];
    const statuses = ['open', 'in_progress', 'resolved', 'closed'];
    const priorities = ['low', 'medium', 'high', 'critical'];
    
    for (let i = 1; i <= count; i++) {
      // Randomly select category, status, and priority
      const category = categories[Math.floor(Math.random() * categories.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      
      const newTicket = {
        tenantId: tenantId,
        title: `Sample Ticket ${i} - ${category} (Tenant ${tenantId})`,
        description: `This is a test ticket #${i} with ${category} category created for tenant ${tenantId}.`,
        status: status,
        priority: priority,
        category: category,
        createdBy: 'system',
        assignedTo: 'support',
        aiResolved: Math.random() > 0.7, // 30% chance of being AI resolved
        createdAt: now,
        updatedAt: now
      };
      
      if (status === 'resolved' || status === 'closed') {
        newTicket.resolvedAt = now;
      }
      
      const result = await db.insert(tickets).values(newTicket).returning();
      console.log(`Created ticket ID ${result[0].id} (${category}, ${status}) for tenant ${tenantId}`);
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
      maxId: sql`MAX(${tickets.id})`.as('maxId')
    })
    .from(tickets);
    
    const maxId = result[0]?.maxId || 0;
    
    if (maxId > 0) {
      // Reset the sequence
      const sequenceName = 'tickets_id_seq';
      await db.execute(
        sql`SELECT setval('${sql.raw(sequenceName)}', ${maxId}, true)`
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
          category: tickets.category,
          count: sql`COUNT(*)`.as('count')
        })
        .from(tickets)
        .where(eq(tickets.tenantId, tenantId))
        .groupBy(tickets.category);
        
        console.log('Tickets by category:');
        console.table(categoryCount);
        break;
        
      case 'help':
      default:
        printHelp();
        break;
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  }
})();