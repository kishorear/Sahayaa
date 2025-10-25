import { db } from './db';
import { customUserRoles, tenants } from '@shared/schema';
import { HealthcareRoles } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Seed healthcare-specific roles for healthcare industry tenants
 */
async function seedHealthcareRoles() {
  try {
    console.log('Starting healthcare roles seed...');
    
    // Get all healthcare tenants
    const healthcareTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.industryType, 'healthcare'));
    
    console.log(`Found ${healthcareTenants.length} healthcare tenants`);
    
    if (healthcareTenants.length === 0) {
      console.log('No healthcare tenants found. Skipping seed.');
      return;
    }
    
    let totalInserted = 0;
    let totalSkipped = 0;
    
    for (const tenant of healthcareTenants) {
      console.log(`Processing tenant: ${tenant.name} (ID: ${tenant.id})`);
      
      // Insert each healthcare role for this tenant
      for (const [roleKey, roleData] of Object.entries(HealthcareRoles)) {
        try {
          // Check if role already exists for this tenant
          const existing = await db
            .select()
            .from(customUserRoles)
            .where(
              and(
                eq(customUserRoles.tenantId, tenant.id),
                eq(customUserRoles.roleKey, roleKey)
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
            industryType: 'healthcare',
            isDefault: false, // Healthcare-specific roles are not system defaults
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
    console.error('Error seeding healthcare roles:', error);
    throw error;
  }
}

// Run the seed
seedHealthcareRoles()
  .then(() => {
    console.log('Healthcare roles seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Healthcare roles seed failed:', error);
    process.exit(1);
  });
