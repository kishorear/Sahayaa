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
import { z } from 'zod';
import { storage } from '../storage';

// Create a validation schema for user registration
const creatorUserRegistrationSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  companyId: z.number().optional(),
  companyName: z.string().optional(),
  companySSO: z.string().optional(),
  teamId: z.number().optional(),
  teamName: z.string().optional(),
  role: z.string().default("user"),
  name: z.string().optional(),
  email: z.string().email("Invalid email format").optional(),
});

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
      company: users.company,
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
    const { username, password, role, name, email, company, tenantId, teamId } = req.body;
    
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
      company: company || null,
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
      company: users.company,
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
 * POST /api/creator/register
 * Register a new user with company information
 * This endpoint handles the creation of a company (tenant) if needed
 * and registers a new user with the appropriate associations
 */
router.post('/register', requireCreator, async (req: Request, res: Response) => {
  try {
    console.log('Creator user registration request received:', req.body);
    
    // Validate request data
    let validationResult;
    try {
      validationResult = creatorUserRegistrationSchema.parse(req.body);
    } catch (validationError: any) {
      console.error('Validation error:', validationError);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationError.errors || validationError.message 
      });
    }
    
    const { 
      username, 
      password, 
      companyId, 
      companyName, 
      companySSO, 
      teamId, 
      teamName,
      role, 
      name, 
      email 
    } = validationResult;
    
    // Step 1: Determine tenant (company) ID
    let userTenantId = companyId;
    
    // If no company ID provided, but company name is given, create or find company
    if (!userTenantId && companyName) {
      console.log(`No tenant ID provided, looking for tenant with name: ${companyName}`);
      
      // Check if company with this name already exists
      const existingTenants = await db.select().from(tenants)
        .where(eq(tenants.name, companyName))
        .limit(1);
      
      if (existingTenants.length > 0) {
        // Use existing company
        userTenantId = existingTenants[0].id;
        console.log(`Found existing tenant with ID: ${userTenantId}`);
      } else {
        // Create new company as a tenant
        console.log(`Creating new tenant for company: ${companyName}`);
        
        // Generate subdomain from company name
        const subdomain = companyName.toLowerCase()
          .replace(/[^a-z0-9]/g, '') // Remove special characters
          .substring(0, 20); // Limit length
        
        // Generate a random API key
        const apiKey = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
        
        // Create the tenant record
        const newTenant = await storage.createTenant({
          name: companyName,
          subdomain: subdomain,
          apiKey: apiKey,
          active: true,
          settings: {
            ssoEnabled: !!companySSO,
            ssoProvider: companySSO || null,
            emailEnabled: true,
            aiEnabled: true
          },
          branding: {
            primaryColor: '#4F46E5',
            logo: null,
            companyName: companyName,
            emailTemplate: 'default'
          }
        });
        
        userTenantId = newTenant.id;
        console.log(`Created new tenant with ID: ${userTenantId}`);
      }
    }
    
    // If we still don't have a tenant ID, return an error
    if (!userTenantId) {
      return res.status(400).json({ 
        message: 'Either companyId or companyName must be provided' 
      });
    }
    
    // Step 2: Determine team ID
    let userTeamId = teamId;
    
    // If no team ID but team name is provided, create or find team
    if (!userTeamId && teamName) {
      console.log(`No team ID provided, looking for team with name: ${teamName} in tenant: ${userTenantId}`);
      
      // Check if team with this name already exists in the tenant
      const existingTeams = await db.select().from(teams)
        .where(and(
          eq(teams.name, teamName),
          eq(teams.tenantId, userTenantId)
        ))
        .limit(1);
      
      if (existingTeams.length > 0) {
        // Use existing team
        userTeamId = existingTeams[0].id;
        console.log(`Found existing team with ID: ${userTeamId}`);
      } else {
        // Create new team in the tenant
        console.log(`Creating new team: ${teamName} in tenant: ${userTenantId}`);
        
        const newTeam = await storage.createTeam({
          name: teamName,
          description: `Team created by creator user for ${companyName || 'company ' + userTenantId}`,
          tenantId: userTenantId
        });
        
        userTeamId = newTeam.id;
        console.log(`Created new team with ID: ${userTeamId}`);
      }
    }
    
    // Step 3: Validate that username doesn't already exist in the tenant
    const existingUser = await storage.getUserByUsername(username, userTenantId);
    if (existingUser) {
      return res.status(409).json({ 
        message: `Username '${username}' already exists in this company` 
      });
    }
    
    // Step 4: Hash the password
    const hashedPassword = await hashPassword(password);
    
    // Step 5: Create the user
    const newUser = await storage.createUser({
      username,
      password: hashedPassword,
      role: role || 'user',
      name: name || null,
      email: email || null,
      company: companyName || null,
      tenantId: userTenantId,
      teamId: userTeamId || null,
      // Set SSO fields if companySSO is provided
      ssoEnabled: !!companySSO,
      ssoProvider: companySSO || null,
      ssoProviderId: null,
      ssoProviderData: companySSO ? { enabled: true, provider: companySSO } : {}
    });
    
    console.log(`User created successfully: ${username} (ID: ${newUser.id})`);
    
    // Remove sensitive data from response
    const { password: _, ...userWithoutPassword } = newUser;
    
    // Return user data with tenant and team information
    return res.status(201).json({
      ...userWithoutPassword,
      tenant: {
        id: userTenantId,
        name: companyName
      },
      team: userTeamId ? { id: userTeamId, name: teamName } : null
    });
    
  } catch (error) {
    console.error('Error registering user by creator:', error);
    return res.status(500).json({ 
      message: 'Error registering user',
      details: error.message
    });
  }
});

/**
 * GET /api/creator/tickets
 * Get all tickets across tenants
 */
router.get('/tickets', requireCreator, async (req: Request, res: Response) => {
  try {
    // Get optional filtering parameters
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
    
    // Log the request for debugging
    console.log(`Creator fetching all tickets with filters - status: ${status}, category: ${category}, tenantId: ${tenantId}`);
    
    // Base query to select all tickets, ordered by creation date (newest first)
    let ticketsQuery = db.select().from(tickets).orderBy(desc(tickets.createdAt));
    
    // Apply filters if they exist
    if (status) {
      ticketsQuery = ticketsQuery.where(eq(tickets.status, status));
    }
    
    if (category) {
      ticketsQuery = ticketsQuery.where(eq(tickets.category, category));
    }
    
    if (tenantId && !isNaN(tenantId)) {
      ticketsQuery = ticketsQuery.where(eq(tickets.tenantId, tenantId));
    }
    
    // Execute the query
    const allTickets = await ticketsQuery;
    
    console.log(`Found ${allTickets.length} tickets matching creator's criteria`);
    
    return res.status(200).json(allTickets);
  } catch (error) {
    console.error('Error fetching tickets for creator:', error);
    return res.status(500).json({ message: 'Error fetching tickets' });
  }
});

export default router;