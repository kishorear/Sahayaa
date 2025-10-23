import { db } from './db';
import { customUserRoles, tenants } from '@shared/schema';
import { DefaultRoles } from '@shared/schema';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { eq, and } from 'drizzle-orm';

/**
 * Seed default system roles into the database for all tenants
 * This makes the hardcoded roles (admin, support_agent, engineer, user) 
 * editable through the Role Management UI
 */
export async function seedDefaultRoles() {
  try {
    console.log('Starting default roles seed...');
    
    // Get all tenants
    const allTenants = await db.select().from(tenants);
    console.log(`Found ${allTenants.length} tenants`);
    
    let totalInserted = 0;
    let totalSkipped = 0;
    
    for (const tenant of allTenants) {
      console.log(`Processing tenant: ${tenant.name} (ID: ${tenant.id})`);
      
      // Insert each default role for this tenant
      for (const [roleKey, roleData] of Object.entries(DefaultRoles)) {
        try {
          // Check if role already exists for this tenant
          const existing = await db
            .select()
            .from(customUserRoles)
            .where(
              and(
                eq(customUserRoles.tenantId, tenant.id),
                eq(customUserRoles.roleKey, roleKey),
                eq(customUserRoles.industryType, 'none')
              )
            )
            .limit(1);
          
          if (existing.length > 0) {
            console.log(`  - Skipped ${roleKey}: already exists`);
            totalSkipped++;
            continue;
          }
          
          // Insert the role
          await db.insert(customUserRoles).values({
            tenantId: tenant.id,
            roleKey: roleData.key,
            roleName: roleData.name,
            description: roleData.description,
            permissions: roleData.permissions as any,
            industryType: 'none', // System roles apply to all industries
            isDefault: true, // Mark as system role
            active: true,
          });
          
          console.log(`  - Inserted ${roleKey}`);
          totalInserted++;
        } catch (error) {
          console.error(`  - Error inserting ${roleKey}:`, error);
        }
      }
    }
    
    console.log(`\nSeeding complete!`);
    console.log(`Total inserted: ${totalInserted}`);
    console.log(`Total skipped: ${totalSkipped}`);
    
  } catch (error) {
    console.error('Error seeding default roles:', error);
    throw error;
  }
}

// Run if called directly
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  seedDefaultRoles()
    .then(() => {
      console.log('Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
