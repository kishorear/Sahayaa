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
  
  // Get all custom user roles - returns deduplicated role definitions (creator only)
  // This endpoint returns role DEFINITIONS (roleKey, name, description, permissions) for dropdowns
  // For role MANAGEMENT (edit/delete), creators get ALL roles with full access
  app.get('/api/custom-roles', requireAuth, requireCreatorRole, async (req: Request, res: Response) => {
    console.log('GET /api/custom-roles - Request from user:', req.user?.username);
    try {
      const { forManagement, industryType } = req.query;
      
      // Get ALL roles from the database
      const allRoles = await storage.getAllCustomUserRoles();
      
      if (forManagement === 'true') {
        // For role management (edit/delete), creators get ALL roles across all tenants
        // Filter by industryType if provided
        let filteredRoles = allRoles;
        if (industryType && typeof industryType === 'string') {
          filteredRoles = allRoles.filter(role => role.industryType === industryType);
        }
        console.log('GET /api/custom-roles - Returning', filteredRoles.length, 'roles for industry', industryType || 'all', '(creator management mode)');
        res.json(filteredRoles);
      } else {
        // For dropdowns (registration), return unique role DEFINITIONS only (deduplicated by roleKey)
        // Project only the definition fields, not tenant-specific metadata
        const roleDefinitions = Array.from(
          new Map(allRoles.map(role => [
            role.roleKey,
            {
              roleKey: role.roleKey,
              roleName: role.roleName,
              description: role.description,
              isDefault: role.isDefault,
              industryType: role.industryType,
              permissions: role.permissions
            }
          ])).values()
        );
        
        console.log('GET /api/custom-roles - Returning', roleDefinitions.length, 'unique role definitions (dropdown mode)');
        res.json(roleDefinitions);
      }
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
      
      // Check if role key already exists for this industry and tenant
      const industryType = validation.data.industryType || 'none';
      const existing = await storage.getCustomUserRoleByKey(validation.data.roleKey, tenantId, industryType);
      if (existing) {
        return res.status(400).json({ error: 'A role with this key already exists for this industry' });
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
      
      // Determine the industry type to check for conflicts
      const targetIndustry = validation.data.industryType || existing.industryType;
      const targetRoleKey = validation.data.roleKey || existing.roleKey;
      
      // Check for conflicts if roleKey or industryType is being changed
      if ((validation.data.roleKey && validation.data.roleKey !== existing.roleKey) || 
          (validation.data.industryType && validation.data.industryType !== existing.industryType)) {
        const conflict = await storage.getCustomUserRoleByKey(targetRoleKey, tenantId, targetIndustry);
        if (conflict && conflict.id !== id) {
          return res.status(400).json({ error: 'A role with this key already exists for this industry' });
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
