import { Request, Response, NextFunction, Router } from 'express';
import { db } from '../db';
import { tenants } from '@shared/schema';
import { eq } from 'drizzle-orm';

export const tenantRoutes = Router();

// Middleware to check if user is a creator
const requireCreatorRole = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role.toLowerCase() === 'creator') {
    return next();
  }
  return res.status(403).json({ message: 'Insufficient permissions. Creator role required.' });
};

// Get all tenants (only for creator role)
tenantRoutes.get('/tenants', requireCreatorRole, async (req: Request, res: Response) => {
  try {
    // Get all tenants from the database
    const allTenants = await db.select({
      id: tenants.id,
      name: tenants.name,
    }).from(tenants);

    return res.json(allTenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return res.status(500).json({ message: 'Failed to fetch tenants' });
  }
});

// Get a single tenant by ID (only for creator role)
tenantRoutes.get('/tenants/:id', requireCreatorRole, async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.params.id);
    
    if (isNaN(tenantId)) {
      return res.status(400).json({ message: 'Invalid tenant ID' });
    }
    
    const tenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    
    if (tenant.length === 0) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    
    return res.json(tenant[0]);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return res.status(500).json({ message: 'Failed to fetch tenant' });
  }
});