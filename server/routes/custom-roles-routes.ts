import type { Express, Request, Response, RequestHandler } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertCustomUserRoleSchema, updateCustomUserRoleSchema } from "@shared/schema";

/**
 * Middleware to ensure only creator role can access these routes
 */
function requireCreatorRole(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  if (req.user.role !== 'creator') {
    return res.status(403).json({ error: "Only creator role users can manage custom roles and industry types" });
  }
  
  next();
}

/**
 * Register routes for custom user roles and industry type management
 */
export function registerCustomRolesRoutes(app: Express, requireAuth: RequestHandler): void {
  
  // Get all custom user roles for a tenant (creator only)
  app.get('/api/custom-roles', requireAuth, requireCreatorRole, async (req: Request, res: Response) => {
    console.log('GET /api/custom-roles - Request from user:', req.user?.username);
    try {
      const tenantId = req.user!.tenantId;
      const roles = await storage.getCustomUserRoles(tenantId);
      console.log('GET /api/custom-roles - Returning', roles.length, 'roles');
      res.json(roles);
    } catch (error) {
      console.error('Error getting custom roles:', error);
      res.status(500).json({ error: 'Failed to get custom roles' });
    }
  });
  
  // Get a specific custom user role (creator only)
  app.get('/api/custom-roles/:id', requireAuth, requireCreatorRole, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user!.tenantId;
      
      const role = await storage.getCustomUserRoleById(id, tenantId);
      
      if (!role) {
        return res.status(404).json({ error: 'Custom role not found' });
      }
      
      res.json(role);
    } catch (error) {
      console.error('Error getting custom role:', error);
      res.status(500).json({ error: 'Failed to get custom role' });
    }
  });
  
  // Create a new custom user role (creator only)
  app.post('/api/custom-roles', requireAuth, requireCreatorRole, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      
      // Validate request body
      const validation = insertCustomUserRoleSchema.safeParse({
        ...req.body,
        tenantId
      });
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: validation.error.errors 
        });
      }
      
      // Check if role key already exists
      const existing = await storage.getCustomUserRoleByKey(validation.data.roleKey, tenantId);
      if (existing) {
        return res.status(400).json({ error: 'A role with this key already exists' });
      }
      
      const role = await storage.createCustomUserRole(validation.data);
      res.status(201).json(role);
    } catch (error) {
      console.error('Error creating custom role:', error);
      res.status(500).json({ error: 'Failed to create custom role' });
    }
  });
  
  // Update a custom user role (creator only)
  app.patch('/api/custom-roles/:id', requireAuth, requireCreatorRole, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user!.tenantId;
      
      // Ensure role exists and belongs to this tenant
      const existing = await storage.getCustomUserRoleById(id, tenantId);
      if (!existing) {
        return res.status(404).json({ error: 'Custom role not found' });
      }
      
      // Validate and whitelist allowed fields using Zod schema
      const validation = updateCustomUserRoleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid request data',
          details: validation.error.errors 
        });
      }
      
      // If roleKey is being updated, check for conflicts
      if (validation.data.roleKey && validation.data.roleKey !== existing.roleKey) {
        const conflict = await storage.getCustomUserRoleByKey(validation.data.roleKey, tenantId);
        if (conflict) {
          return res.status(400).json({ error: 'A role with this key already exists' });
        }
      }
      
      const updated = await storage.updateCustomUserRole(id, validation.data, tenantId);
      res.json(updated);
    } catch (error) {
      console.error('Error updating custom role:', error);
      res.status(500).json({ error: 'Failed to update custom role' });
    }
  });
  
  // Delete a custom user role (creator only)
  app.delete('/api/custom-roles/:id', requireAuth, requireCreatorRole, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = req.user!.tenantId;
      
      const success = await storage.deleteCustomUserRole(id, tenantId);
      
      if (!success) {
        return res.status(404).json({ error: 'Custom role not found' });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting custom role:', error);
      res.status(500).json({ error: 'Failed to delete custom role' });
    }
  });
  
  // Update tenant industry type (creator only)
  app.patch('/api/tenant/industry-type', requireAuth, requireCreatorRole, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { industryType } = req.body;
      
      if (!industryType || typeof industryType !== 'string') {
        return res.status(400).json({ error: 'Invalid industry type' });
      }
      
      const updated = await storage.updateTenant(tenantId, { industryType });
      res.json(updated);
    } catch (error) {
      console.error('Error updating industry type:', error);
      res.status(500).json({ error: 'Failed to update industry type' });
    }
  });
  
  // Get available industry types (creator only)
  app.get('/api/industry-types', requireAuth, requireCreatorRole, async (req: Request, res: Response) => {
    console.log('GET /api/industry-types - Request from user:', req.user?.username);
    try {
      // Predefined industry types - return as simple string array
      const industryTypes = [
        'technology',
        'healthcare',
        'finance',
        'education',
        'retail',
        'manufacturing',
        'real_estate',
        'hospitality',
        'transportation',
        'media',
        'telecommunications',
        'energy',
        'government',
        'nonprofit',
        'other'
      ];
      
      res.json(industryTypes);
    } catch (error) {
      console.error('Error getting industry types:', error);
      res.status(500).json({ error: 'Failed to get industry types' });
    }
  });
}
