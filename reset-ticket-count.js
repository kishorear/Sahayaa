import 'dotenv/config';
import { db } from './server/db.js';
import { tickets } from './shared/schema.js';
import { sql } from 'drizzle-orm';

/**
 * Reset ticket creation count based on tenant ID
 * This script will set the ticket counter sequence to the maximum ID value
 * found for each tenant, ensuring new tickets start from the correct number.
 */
async function resetTicketCountByTenant() {
  try {
    console.log('Starting ticket counter reset by tenant...');
    
    // First, get max ticket ID by tenant
    const maxTicketIdByTenant = await db.select({
      tenantId: tickets.tenantId,
      maxId: sql`MAX(${tickets.id})`.as('maxId')
    })
    .from(tickets)
    .groupBy(tickets.tenantId);
    
    console.log('Current maximum ticket IDs by tenant:');
    console.table(maxTicketIdByTenant);
    
    // For PostgreSQL, we need to update the sequence used for ticket IDs
    // This assumes a sequence named 'tickets_id_seq' is used for the tickets table
    const sequenceName = 'tickets_id_seq';
    
    // Get the current sequence value
    const currentSequenceValue = await db.execute(
      sql`SELECT last_value FROM ${sql.raw(sequenceName)}`
    );
    
    console.log('Current sequence value:', currentSequenceValue[0]?.last_value);
    
    // Find the global maximum ID to update the sequence
    const globalMaxId = Math.max(...maxTicketIdByTenant.map(t => t.maxId || 0), 0);
    console.log('Global maximum ticket ID:', globalMaxId);
    
    if (globalMaxId > 0) {
      // Set the sequence to start from global max + 1
      await db.execute(
        sql`SELECT setval('${sql.raw(sequenceName)}', ${globalMaxId}, true)`
      );
      
      console.log(`Sequence ${sequenceName} has been reset to start from ${globalMaxId + 1}`);
    } else {
      console.log('No tickets found. Sequence will remain at its current value.');
    }
    
    // Display summary of tickets by tenant
    const ticketCountByTenant = await db.select({
      tenantId: tickets.tenantId,
      count: sql`COUNT(*)`.as('count')
    })
    .from(tickets)
    .groupBy(tickets.tenantId);
    
    console.log('Ticket count by tenant:');
    console.table(ticketCountByTenant);
    
    console.log('Ticket counter reset completed successfully.');
  } catch (error) {
    console.error('Error resetting ticket counters:', error);
    throw error;
  }
}

// Run the script
resetTicketCountByTenant()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });