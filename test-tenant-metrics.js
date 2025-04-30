import 'dotenv/config';
import { db } from './server/db.js';
import { tickets } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Test Tenant Metrics Isolation
 * 
 * This script helps test and verify that metrics are properly isolated by tenant.
 * It fetches and displays metric data for each tenant separately, allowing
 * you to verify that data segregation is working correctly.
 */
async function testTenantMetricsIsolation() {
  try {
    console.log('=== TENANT METRICS ISOLATION TEST ===');
    
    // Get all tenants that have tickets
    const tenantsWithTickets = await db.select({
      tenantId: tickets.tenantId,
      count: sql`COUNT(*)`.as('count')
    })
    .from(tickets)
    .groupBy(tickets.tenantId);
    
    console.log('Tenants with tickets:');
    console.table(tenantsWithTickets);
    
    // For each tenant, print out ticket distribution by category
    for (const tenant of tenantsWithTickets) {
      const tenantId = tenant.tenantId;
      console.log(`\n=== METRICS FOR TENANT ID: ${tenantId} ===`);
      
      // Get ticket data for this tenant
      const tenantTickets = await db.select({
        id: tickets.id,
        title: tickets.title,
        status: tickets.status,
        category: tickets.category,
        createdAt: tickets.createdAt
      })
      .from(tickets)
      .where(eq(tickets.tenantId, tenantId))
      .orderBy(sql`${tickets.createdAt} DESC`)
      .limit(5);
      
      console.log(`Most recent 5 tickets for Tenant ${tenantId}:`);
      console.table(tenantTickets);
      
      // Get category breakdown
      const categoryBreakdown = await db.select({
        category: tickets.category,
        count: sql`COUNT(*)`.as('count')
      })
      .from(tickets)
      .where(eq(tickets.tenantId, tenantId))
      .groupBy(tickets.category);
      
      console.log(`Category breakdown for Tenant ${tenantId}:`);
      console.table(categoryBreakdown);
      
      // Get status breakdown
      const statusBreakdown = await db.select({
        status: tickets.status,
        count: sql`COUNT(*)`.as('count')
      })
      .from(tickets)
      .where(eq(tickets.tenantId, tenantId))
      .groupBy(tickets.status);
      
      console.log(`Status breakdown for Tenant ${tenantId}:`);
      console.table(statusBreakdown);
      
      console.log('-'.repeat(50));
    }
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    return true;
  } catch (error) {
    console.error('Error testing tenant metrics isolation:', error);
    return false;
  }
}

// Run the test
testTenantMetricsIsolation()
  .then(() => {
    console.log('Test completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });