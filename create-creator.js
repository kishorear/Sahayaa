import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { hashPassword } from './server/auth.js';

async function createCreatorUser() {
  try {
    console.log('Attempting to create creator user...');
    
    // Hash the password
    const password = await hashPassword('creator123');
    
    // Create a creator user
    const insertedUser = await db.insert(users).values({
      username: 'admin_creator',
      password,
      role: 'creator',
      name: 'System Creator',
      email: 'creator@example.com',
      tenantId: 1, // This doesn't matter for creators as they can access all tenants
      teamId: null, // No team needed for creator
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log('Creator user created successfully!');
    console.log('Creator user details:');
    console.log('Username: admin_creator');
    console.log('Password: creator123');
    console.log('User ID:', insertedUser[0].id);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating creator user:', error);
    process.exit(1);
  }
}

createCreatorUser();