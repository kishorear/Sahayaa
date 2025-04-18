import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  tenants, 
  teams, 
  users, 
  tickets,
  InsertTenant, 
  InsertUser,
  InsertTeam
} from '@shared/schema';
import { eq, and, isNull, ne, desc } from 'drizzle-orm';
import { comparePasswords, hashPassword } from '../auth';

const router = Router();

/**
 * Middleware to check if the user is a creator
 */
function requireCreator(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (req.user.role !== 'creator') {
    return res.status(403).json({ message: 'Forbidden - Creator role required' });
  }
  
  next();
}

/**
 * POST /api/creator/login
 * Login for creator users
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    // Check if user exists
    const existingUsers = await db.select().from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    if (existingUsers.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = existingUsers[0];
    
    // Check if user is a creator
    if (user.role !== 'creator') {
      return res.status(403).json({ message: 'Forbidden - Creator role required' });
    }
    
    // Verify password
    const passwordMatches = await comparePasswords(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Set session
    if (req.session) {
      req.session.userId = user.id;
    }
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error('Error during creator login:', error);
    return res.status(500).json({ message: 'Error during login' });
  }
});

/**
 * GET /api/creator/tenants
 * Get all tenants
 */
router.get('/tenants', requireCreator, async (req: Request, res: Response) => {
  try {
    const result = await db.select().from(tenants);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return res.status(500).json({ message: 'Error fetching tenants' });
  }
});

/**
 * GET /api/creator/tenants/:id
 * Get a tenant by ID
 */
router.get('/tenants/:id', requireCreator, async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.params.id);
    if (isNaN(tenantId)) {
      return res.status(400).json({ message: 'Invalid tenant ID' });
    }
    
    const result = await db.select().from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    return res.status(200).json(result[0]);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return res.status(500).json({ message: 'Error fetching tenant' });
  }
});

/**
 * POST /api/creator/tenants
 * Create a new tenant
 */
router.post('/tenants', requireCreator, async (req: Request, res: Response) => {
  try {
    const { name, subdomain, adminEmail, adminName } = req.body;
    
    if (!name || !subdomain) {
      return res.status(400).json({ message: 'Name and subdomain are required' });
    }
    
    // Check if subdomain is already taken
    const existingTenants = await db.select().from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1);
    
    if (existingTenants.length > 0) {
      return res.status(409).json({ message: 'Subdomain already in use' });
    }
    
    // Create the tenant
    const insertData: InsertTenant = {
      name,
      subdomain,
      apiKey: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15), // Generate a random API key
      active: true,
    };
    
    const result = await db.insert(tenants).values(insertData).returning();
    const newTenant = result[0];
    
    // If adminEmail is provided, create an admin user for the tenant
    if (adminEmail && adminName) {
      // Generate a temporary password
      const tempPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await hashPassword(tempPassword);
      
      const adminUsername = adminEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const adminUser: InsertUser = {
        tenantId: newTenant.id,
        username: adminUsername,
        password: hashedPassword,
        role: 'administrator',
        name: adminName,
        email: adminEmail,
      };
      
      await db.insert(users).values(adminUser);
      
      // TODO: Send email with temporary password to the admin
      console.log(`Created admin user ${adminUsername} for tenant ${name} with password: ${tempPassword}`);
    }
    
    return res.status(201).json(newTenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
    return res.status(500).json({ message: 'Error creating tenant' });
  }
});

/**
 * DELETE /api/creator/tenants/:id
 * Delete a tenant and all associated data (users, teams, etc.)
 */
router.delete('/tenants/:id', requireCreator, async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.params.id);
    if (isNaN(tenantId)) {
      return res.status(400).json({ message: 'Invalid tenant ID' });
    }
    
    // First verify tenant exists
    const tenantResult = await db.select().from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    if (tenantResult.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    // Delete all users associated with this tenant
    await db.delete(users)
      .where(eq(users.tenantId, tenantId));
    
    // Delete all teams associated with this tenant
    await db.delete(teams)
      .where(eq(teams.tenantId, tenantId));
    
    // Delete the tenant
    await db.delete(tenants)
      .where(eq(tenants.id, tenantId));
    
    return res.status(200).json({ message: 'Tenant and all associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return res.status(500).json({ message: 'Error deleting tenant' });
  }
});

/**
 * GET /api/creator/users
 * Get all users (optionally filtered by tenantId)
 */
router.get('/users', requireCreator, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
    
    let query = db.select({
      id: users.id,
      tenantId: users.tenantId,
      teamId: users.teamId,
      username: users.username,
      role: users.role,
      name: users.name,
      email: users.email,
      profilePicture: users.profilePicture,
      mfaEnabled: users.mfaEnabled,
      ssoEnabled: users.ssoEnabled,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users);
    
    // If tenantId is provided, filter by it
    if (tenantId && !isNaN(tenantId)) {
      query = query.where(eq(users.tenantId, tenantId));
    }
    
    const result = await query;
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ message: 'Error fetching users' });
  }
});

/**
 * POST /api/creator/users
 * Create a new user
 */
router.post('/users', requireCreator, async (req: Request, res: Response) => {
  try {
    const { username, password, role, name, email, tenantId, teamId } = req.body;
    
    if (!username || !password || !role || !tenantId) {
      return res.status(400).json({ message: 'Username, password, role, and tenantId are required' });
    }
    
    // Verify tenant exists
    const tenantResult = await db.select().from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    if (tenantResult.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    // If teamId is provided, verify it exists and belongs to the tenant
    if (teamId) {
      const teamResult = await db.select().from(teams)
        .where(and(
          eq(teams.id, teamId),
          eq(teams.tenantId, tenantId)
        ))
        .limit(1);
      
      if (teamResult.length === 0) {
        return res.status(404).json({ message: 'Team not found or does not belong to the tenant' });
      }
    }
    
    // Check if username is already taken within the tenant
    const existingUsers = await db.select().from(users)
      .where(and(
        eq(users.username, username),
        eq(users.tenantId, tenantId)
      ))
      .limit(1);
    
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username already exists in this tenant' });
    }
    
    // Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Create the user
    const insertData: InsertUser = {
      username,
      password: hashedPassword,
      role,
      name: name || null,
      email: email || null,
      tenantId,
      teamId: teamId || null,
    };
    
    const result = await db.insert(users).values(insertData).returning({
      id: users.id,
      tenantId: users.tenantId,
      teamId: users.teamId,
      username: users.username,
      role: users.role,
      name: users.name,
      email: users.email,
      profilePicture: users.profilePicture,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ message: 'Error creating user' });
  }
});

/**
 * DELETE /api/creator/users/:id
 * Delete a user
 */
router.delete('/users/:id', requireCreator, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // First verify user exists
    const userResult = await db.select().from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow deleting the current user
    if (req.user && userId === req.user.id) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }
    
    // Delete the user
    await db.delete(users)
      .where(eq(users.id, userId));
    
    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Error deleting user' });
  }
});

/**
 * GET /api/creator/teams
 * Get all teams (optionally filtered by tenantId)
 */
router.get('/teams', requireCreator, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
    
    let query = db.select().from(teams);
    
    // If tenantId is provided, filter by it
    if (tenantId && !isNaN(tenantId)) {
      query = query.where(eq(teams.tenantId, tenantId));
    }
    
    const result = await query;
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return res.status(500).json({ message: 'Error fetching teams' });
  }
});

/**
 * POST /api/creator/teams
 * Create a new team
 */
router.post('/teams', requireCreator, async (req: Request, res: Response) => {
  try {
    const { name, description, tenantId } = req.body;
    
    if (!name || !tenantId) {
      return res.status(400).json({ message: 'Name and tenantId are required' });
    }
    
    // Verify tenant exists
    const tenantResult = await db.select().from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    
    if (tenantResult.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    // Create the team
    const insertData: InsertTeam = {
      name,
      description: description || '',
      tenantId,
    };
    
    const result = await db.insert(teams).values(insertData).returning();
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating team:', error);
    return res.status(500).json({ message: 'Error creating team' });
  }
});

/**
 * GET /api/creator/tickets
 * Get all tickets across tenants with comprehensive filtering options
 */
router.get('/tickets', requireCreator, async (req: Request, res: Response) => {
  try {
    // Get all optional filtering parameters
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
    const assignedTo = req.query.assignedTo as string | undefined;
    const search = req.query.search as string | undefined;
    const complexity = req.query.complexity as string | undefined;
    const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : undefined;
    
    // Log the request for debugging
    console.log(`Creator fetching all tickets with filters:`, { 
      status, 
      category, 
      tenantId, 
      assignedTo, 
      search,
      complexity,
      teamId
    });
    
    // Build a conditions array for the query
    const conditions = [];
    
    if (status) {
      conditions.push(eq(tickets.status, status));
    }
    
    if (category) {
      conditions.push(eq(tickets.category, category));
    }
    
    if (tenantId && !isNaN(tenantId)) {
      conditions.push(eq(tickets.tenantId, tenantId));
    }
    
    if (assignedTo) {
      conditions.push(eq(tickets.assignedTo, assignedTo));
    }
    
    if (complexity) {
      conditions.push(eq(tickets.complexity, complexity));
    }
    
    if (teamId && !isNaN(teamId)) {
      conditions.push(eq(tickets.teamId, teamId));
    }
    
    // Execute the query with the combined conditions
    let query;
    if (conditions.length > 0) {
      query = db.select().from(tickets).where(and(...conditions)).orderBy(desc(tickets.createdAt));
    } else {
      query = db.select().from(tickets).orderBy(desc(tickets.createdAt));
    }
    
    let allTickets = await query;
    
    // If there's a search term, filter results in memory (since we can't use LIKE in Drizzle easily)
    if (search && search.length > 0) {
      const searchLower = search.toLowerCase();
      allTickets = allTickets.filter(ticket => 
        ticket.title.toLowerCase().includes(searchLower) || 
        ticket.description.toLowerCase().includes(searchLower)
      );
    }
    
    console.log(`Found ${allTickets.length} tickets matching creator's criteria`);
    
    return res.status(200).json(allTickets);
  } catch (error) {
    console.error('Error fetching tickets for creator:', error);
    return res.status(500).json({ message: 'Error fetching tickets' });
  }
});

export default router;