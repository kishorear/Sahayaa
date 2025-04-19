import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { hashPassword } from '../auth';

const router = express.Router();

// Get all tenants (companies)
router.get('/creator/tenants', async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const tenants = await storage.getAllTenants();
    res.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ message: 'Failed to fetch tenants', error: String(error) });
  }
});

// Get all users for a specific tenant
router.get('/creator/users', async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
    const users = tenantId 
      ? await storage.getUsersByTenantId(tenantId)
      : await storage.getAllUsers();
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users', error: String(error) });
  }
});

// Get all teams for a specific tenant
router.get('/creator/teams', async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID is required' });
    }
    
    const teams = await storage.getTeamsByTenantId(tenantId);
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Failed to fetch teams', error: String(error) });
  }
});

// Create a new tenant (company)
router.post('/creator/tenants', async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { name, subdomain, adminEmail, adminName } = req.body;
    
    if (!name || !subdomain) {
      return res.status(400).json({ message: 'Name and subdomain are required' });
    }
    
    // Check if subdomain already exists
    const existingTenant = await storage.getTenantBySubdomain(subdomain);
    if (existingTenant) {
      return res.status(400).json({ message: 'Subdomain already in use' });
    }
    
    // Create tenant
    const tenant = await storage.createTenant({
      name,
      subdomain,
      apiKey: generateApiKey(),
      adminId: null,
      settings: {},
      branding: {},
      active: true
    });
    
    // If admin details provided, create admin user
    if (adminEmail && adminName) {
      const adminUsername = `admin_${subdomain}`;
      const adminPassword = generateRandomPassword();
      
      const hashedPassword = await hashPassword(adminPassword);
      
      const adminUser = await storage.createUser({
        username: adminUsername,
        password: hashedPassword,
        name: adminName,
        email: adminEmail,
        role: 'administrator',
        tenantId: tenant.id,
        teamId: null,
        profilePicture: null,
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
        ssoEnabled: false,
        ssoProvider: null,
        ssoProviderId: null,
        ssoProviderData: {}
      });
      
      // Update tenant with admin ID
      await storage.updateTenant(tenant.id, { adminId: adminUser.id });
      
      // Return tenant with admin information
      return res.status(201).json({
        ...tenant,
        admin: {
          id: adminUser.id,
          username: adminUsername,
          password: adminPassword, // Only return this on creation for notifying the admin
          name: adminName,
          email: adminEmail
        }
      });
    }
    
    res.status(201).json(tenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
    res.status(500).json({ message: 'Failed to create tenant', error: String(error) });
  }
});

// Create a new user
router.post('/creator/users', async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { username, password, name, email, role, tenantId, teamId } = req.body;
    
    if (!username || !password || !tenantId || !role) {
      return res.status(400).json({ message: 'Username, password, tenant ID, and role are required' });
    }
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Verify that tenant exists
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      return res.status(400).json({ message: 'Tenant not found' });
    }
    
    // Check team if provided
    if (teamId) {
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(400).json({ message: 'Team not found' });
      }
      if (team.tenantId !== tenantId) {
        return res.status(400).json({ message: 'Team does not belong to this tenant' });
      }
    }
    
    // Create user
    const hashedPassword = await hashPassword(password);
    
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      name,
      email,
      role,
      tenantId,
      teamId: teamId || null,
      profilePicture: null,
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: [],
      ssoEnabled: false,
      ssoProvider: null,
      ssoProviderId: null,
      ssoProviderData: {}
    });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user', error: String(error) });
  }
});

// Delete a tenant
router.delete('/creator/tenants/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const tenantId = parseInt(req.params.id);
    
    // Check if tenant exists
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    // Delete tenant
    await storage.deleteTenant(tenantId);
    
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    res.status(500).json({ message: 'Failed to delete tenant', error: String(error) });
  }
});

// Delete a user
router.delete('/creator/users/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const userId = parseInt(req.params.id);
    
    // Check if user exists
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete user
    await storage.deleteUser(userId);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user', error: String(error) });
  }
});

// Cross-tenant tickets endpoint
router.get('/creator/tickets', async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get filter parameters
    const status = req.query.status as string | undefined;
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    
    // Fetch tickets with filters
    const tickets = await storage.getTickets({
      status,
      tenantId,
      limit,
      offset: (page - 1) * limit
    });
    
    // Count total tickets for pagination
    const totalCount = await storage.countTickets({ status, tenantId });
    
    res.json({
      tickets,
      pagination: {
        totalItems: totalCount,
        itemsPerPage: limit,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ message: 'Failed to fetch tickets', error: String(error) });
  }
});

// Create new company with user
router.post('/creator/register-with-company', async (req: Request, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'creator') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { username, password, name, email, role, companyName, companySubdomain } = req.body;
    
    if (!username || !password || !companyName || !companySubdomain || !role) {
      return res.status(400).json({ 
        message: 'Username, password, company name, subdomain, and role are required' 
      });
    }
    
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    // Check if subdomain already exists
    const existingTenant = await storage.getTenantBySubdomain(companySubdomain);
    if (existingTenant) {
      return res.status(400).json({ message: 'Subdomain already in use' });
    }
    
    // Create tenant transaction
    const tenant = await storage.createTenant({
      name: companyName,
      subdomain: companySubdomain,
      apiKey: generateApiKey(),
      adminId: null,
      settings: {},
      branding: {},
      active: true
    });
    
    // Create user
    const hashedPassword = await hashPassword(password);
    
    const user = await storage.createUser({
      username,
      password: hashedPassword,
      name,
      email,
      role,
      tenantId: tenant.id,
      teamId: null,
      profilePicture: null,
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: [],
      ssoEnabled: false,
      ssoProvider: null,
      ssoProviderId: null,
      ssoProviderData: {}
    });
    
    // Update tenant with admin ID if role is administrator
    if (role === 'administrator') {
      await storage.updateTenant(tenant.id, { adminId: user.id });
    }
    
    // Return success with company and user info
    res.status(201).json({
      companyId: tenant.id,
      companyName: tenant.name,
      companySubdomain: tenant.subdomain,
      userId: user.id,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    console.error('Error registering company with user:', error);
    res.status(500).json({ 
      message: 'Failed to register company with user', 
      error: String(error) 
    });
  }
});

// Helper functions
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default router;