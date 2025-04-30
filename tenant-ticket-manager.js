import 'dotenv/config';
import { db } from './server/db.js';
import { tickets, messages } from './shared/schema.js';
import { sql, eq } from 'drizzle-orm';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Tenant Ticket Management Utility
 * 
 * This script provides functionality to:
 * 1. View ticket counts by tenant
 * 2. Reset ticket sequence counters
 * 3. Delete all tickets for a specific tenant (with confirmation)
 * 4. Create sample tickets for testing
 */

// Helper function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function displayTicketsByTenant() {
  try {
    // Get ticket counts by tenant
    const ticketCountByTenant = await db.select({
      tenantId: tickets.tenantId,
      count: sql`COUNT(*)`.as('count')
    })
    .from(tickets)
    .groupBy(tickets.tenantId);
    
    console.log('Ticket count by tenant:');
    console.table(ticketCountByTenant);
    
    // Get max ticket ID by tenant
    const maxTicketIdByTenant = await db.select({
      tenantId: tickets.tenantId,
      maxId: sql`MAX(${tickets.id})`.as('maxId')
    })
    .from(tickets)
    .groupBy(tickets.tenantId);
    
    console.log('Current maximum ticket IDs by tenant:');
    console.table(maxTicketIdByTenant);
    
    // Get sequence info
    const sequenceName = 'tickets_id_seq';
    const currentSequenceValue = await db.execute(
      sql`SELECT last_value, is_called FROM ${sql.raw(sequenceName)}`
    );
    
    console.log('Current ticket sequence information:');
    console.table(currentSequenceValue);
    
    // Display latest tickets
    const latestTickets = await db.select({
      id: tickets.id,
      tenantId: tickets.tenantId,
      title: tickets.title,
      createdAt: tickets.createdAt
    })
    .from(tickets)
    .orderBy(sql`${tickets.id} DESC`)
    .limit(5);
    
    console.log('Latest 5 tickets:');
    console.table(latestTickets);
    
    return true;
  } catch (error) {
    console.error('Error fetching ticket information:', error);
    return false;
  }
}

async function resetTicketSequence() {
  try {
    // Get max ticket ID across all tenants
    const result = await db.select({
      maxId: sql`MAX(${tickets.id})`.as('maxId')
    })
    .from(tickets);
    
    const globalMaxId = result[0]?.maxId || 0;
    console.log('Current global maximum ticket ID:', globalMaxId);
    
    // Ask for confirmation
    const confirm = await prompt(`Are you sure you want to reset the ticket sequence to ${globalMaxId}? (yes/no): `);
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Sequence reset cancelled.');
      return false;
    }
    
    // Reset the sequence
    const sequenceName = 'tickets_id_seq';
    await db.execute(
      sql`SELECT setval('${sql.raw(sequenceName)}', ${globalMaxId}, true)`
    );
    
    console.log(`Sequence ${sequenceName} has been reset to start from ${globalMaxId + 1}`);
    return true;
  } catch (error) {
    console.error('Error resetting ticket sequence:', error);
    return false;
  }
}

async function deleteTicketsForTenant(tenantId) {
  try {
    // First check how many tickets will be deleted
    const countResult = await db.select({
      count: sql`COUNT(*)`.as('count')
    })
    .from(tickets)
    .where(eq(tickets.tenantId, tenantId));
    
    const ticketCount = countResult[0]?.count || 0;
    console.log(`Found ${ticketCount} tickets for tenant ID ${tenantId}`);
    
    if (ticketCount === 0) {
      console.log('No tickets to delete.');
      return false;
    }
    
    // Ask for confirmation
    const confirm = await prompt(`Are you ABSOLUTELY SURE you want to delete ALL ${ticketCount} tickets for tenant ${tenantId}? This cannot be undone (yes/no): `);
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Deletion cancelled.');
      return false;
    }
    
    // Get ticket IDs first (we'll need these to delete related messages)
    const ticketIds = await db.select({
      id: tickets.id
    })
    .from(tickets)
    .where(eq(tickets.tenantId, tenantId));
    
    // Delete associated messages first
    const ticketIdArray = ticketIds.map(t => t.id);
    if (ticketIdArray.length > 0) {
      const deletedMessages = await db.delete(messages)
        .where(sql`${messages.ticketId} IN (${ticketIdArray.join(', ')})`);
      console.log(`Deleted related messages for ${ticketIdArray.length} tickets`);
    }
    
    // Now delete the tickets
    const deletedTickets = await db.delete(tickets)
      .where(eq(tickets.tenantId, tenantId));
    
    console.log(`Successfully deleted ${ticketCount} tickets for tenant ID ${tenantId}`);
    return true;
  } catch (error) {
    console.error(`Error deleting tickets for tenant ${tenantId}:`, error);
    return false;
  }
}

async function createSampleTickets(tenantId, count = 5) {
  try {
    // Get current date
    const now = new Date();
    
    // Sample data for randomization
    const categories = ['technical_issue', 'billing', 'feature_request', 'account', 'documentation', 'authentication'];
    const statuses = ['new', 'in_progress', 'resolved', 'closed'];
    const complexities = ['simple', 'medium', 'complex'];
    
    // Create sample tickets
    for (let i = 1; i <= count; i++) {
      // Random selections
      const category = categories[Math.floor(Math.random() * categories.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const complexity = complexities[Math.floor(Math.random() * complexities.length)];
      
      const newTicket = {
        tenantId: tenantId,
        title: `Sample Ticket ${i} - ${category} (Tenant ${tenantId})`,
        description: `This is a test ticket #${i} with ${category} category created for tenant ${tenantId}.`,
        status: status,
        complexity: complexity,
        category: category,
        createdBy: 1, // Admin user ID
        assignedTo: 'support',
        createdAt: now,
        updatedAt: now,
        aiResolved: Math.random() > 0.7 // 30% chance of being AI resolved
      };
      
      // Add resolved timestamp for closed or resolved tickets
      if (status === 'resolved' || status === 'closed') {
        newTicket.resolvedAt = now;
      }
      
      const result = await db.insert(tickets).values(newTicket).returning();
      
      // Add AI notes for AI-resolved tickets
      if (newTicket.aiResolved) {
        await db.update(tickets)
          .set({ 
            aiNotes: `AI automatically resolved this ${category} issue by providing documentation and guidance.`
          })
          .where(eq(tickets.id, result[0].id));
      }
      
      console.log(`Created ticket ID ${result[0].id} for tenant ${tenantId} (${category}, ${status}, ${complexity})`);
    }
    
    console.log(`Successfully created ${count} sample tickets for tenant ID ${tenantId}`);
    return true;
  } catch (error) {
    console.error(`Error creating sample tickets for tenant ${tenantId}:`, error);
    return false;
  }
}

async function mainMenu() {
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
        await displayTicketsByTenant();
        break;
      case '2':
        await resetTicketSequence();
        break;
      case '3':
        const tenantIdToDelete = await prompt('Enter tenant ID to delete tickets for: ');
        await deleteTicketsForTenant(parseInt(tenantIdToDelete));
        break;
      case '4':
        const tenantId = await prompt('Enter tenant ID to create tickets for: ');
        const ticketCount = await prompt('How many tickets to create? ');
        await createSampleTickets(parseInt(tenantId), parseInt(ticketCount));
        break;
      case '5':
        console.log('Exiting...');
        rl.close();
        return;
      default:
        console.log('Invalid choice, please try again.');
    }
    
    await prompt('\nPress Enter to continue...');
  }
}

// Run the main menu
mainMenu()
  .catch(error => {
    console.error('An unexpected error occurred:', error);
    rl.close();
    process.exit(1);
  });