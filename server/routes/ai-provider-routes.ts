import { Router } from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { checkAiProviderAccess } from '../ai/middleware/check-ai-provider';
import { isCreatorOrAdminRole } from '../utils';
import { getAiProviderAccessForUser } from '../ai/service';
import { logAiProviderAccess, logAiProviderManagement } from '../ai/audit-log';

const router = Router();

// Check if AI providers are available for the current user
router.get('/ai/providers/available', async (req, res) => {
  try {
    // Authentication check
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ 
        available: false,
        message: 'Not authenticated'
      });
    }
    
    const tenantId = req.user.tenantId;
    const teamId = req.user.teamId;
    
    // Creator and admin roles always have access
    if (isCreatorOrAdminRole(req.user.role)) {
      // Still check if there are providers configured for this tenant
      const providers = await db.select({ count: schema.aiProviders.id })
        .from(schema.aiProviders)
        .where(eq(schema.aiProviders.tenantId, tenantId));
        
      const hasProviders = providers.length > 0 && providers[0].count > 0;
      
      return res.json({ 
        available: hasProviders,
        message: hasProviders ? 'AI providers available' : 'No AI providers configured for this tenant',
        role: 'admin_or_creator'
      });
    }
    
    // Check if any providers are available for this tenant and team
    const hasAccess = await getAiProviderAccessForUser(tenantId, teamId);
    
    // Log to audit database
    try {
      await logAiProviderAccess(
        req.user.id,
        tenantId,
        teamId,
        'check_availability',
        hasAccess,
        {
          userRole: req.user.role,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      );
    } catch (logError) {
      console.error('Failed to log AI provider access check:', logError);
      // Non-blocking - continue even if logging fails
    }
    
    return res.json({
      available: hasAccess,
      message: hasAccess ? 'AI providers available' : 'No AI providers configured for your tenant/team'
    });
  } catch (error) {
    console.error('Error checking AI provider availability:', error);
    return res.status(500).json({ 
      available: false,
      message: 'Internal server error'
    });
  }
});

// Schema for creating/updating AI providers
const insertAIProviderSchema = createInsertSchema(schema.aiProviders, {
  name: z.string().min(1, 'Provider name is required'),
  provider: z.string().min(1, 'Provider type is required'),
  model: z.string().min(1, 'Model name is required'),
  apiKey: z.string().optional(),
  endpoint: z.string().optional(),
  isDefault: z.boolean().default(false),
  enabled: z.boolean().default(true),
  tenantId: z.number(),
  teamId: z.number().nullable().optional(),
  priority: z.number().int().min(1).max(100).default(50),
  contextWindow: z.number().int().min(1000).max(100000).default(8000),
  maxTokens: z.number().int().min(100).max(10000).default(1000),
  temperature: z.number().min(0).max(1).default(0.7),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Get all AI providers for a tenant, respecting team scoping
router.get('/tenants/:tenantId/ai-providers', checkAiProviderAccess, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    
    // Check if user has access to this tenant
    if (!isCreatorOrAdminRole(req.user?.role) && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: 'You do not have permission to access AI providers for this tenant' });
    }
    
    let aiProviders;
    
    // For creator and admin roles, show all providers for the tenant
    if (isCreatorOrAdminRole(req.user?.role)) {
      aiProviders = await db.select().from(schema.aiProviders)
        .where(eq(schema.aiProviders.tenantId, tenantId));
    } else {
      // For other roles, filter by teamId (matching teamId or null for tenant-wide providers)
      const teamId = req.user?.teamId || null;
      
      aiProviders = await db.select().from(schema.aiProviders)
        .where(and(
          eq(schema.aiProviders.tenantId, tenantId),
          or(
            eq(schema.aiProviders.teamId, teamId),
            isNull(schema.aiProviders.teamId)
          )
        ));
    }
    
    return res.json(aiProviders);
  } catch (error) {
    console.error('Error fetching AI providers:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new AI provider for a tenant
router.post('/tenants/:tenantId/ai-providers', checkAiProviderAccess, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    
    // Check if user has access to this tenant
    if (!isCreatorOrAdminRole(req.user?.role) && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: 'You do not have permission to create AI providers for this tenant' });
    }
    
    // Only creator and admin can create providers
    if (!isCreatorOrAdminRole(req.user?.role)) {
      return res.status(403).json({ message: 'Only administrators and creators can create AI providers' });
    }
    
    // Validate request body
    const result = insertAIProviderSchema.safeParse({
      ...req.body,
      tenantId
    });
    
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid request data', errors: result.error.errors });
    }
    
    // If setting as default, unset any existing default providers in same scope (tenant-wide or team-specific)
    if (result.data.isDefault) {
      // If provider is team-specific, only unset defaults for that team
      if (result.data.teamId) {
        await db.update(schema.aiProviders)
          .set({ isDefault: false })
          .where(and(
            eq(schema.aiProviders.tenantId, tenantId),
            eq(schema.aiProviders.teamId, result.data.teamId),
            eq(schema.aiProviders.isDefault, true)
          ));
      } else {
        // For tenant-wide providers, unset defaults for tenant-wide providers only
        await db.update(schema.aiProviders)
          .set({ isDefault: false })
          .where(and(
            eq(schema.aiProviders.tenantId, tenantId),
            isNull(schema.aiProviders.teamId),
            eq(schema.aiProviders.isDefault, true)
          ));
      }
    }
    
    // Insert the new AI provider
    const [aiProvider] = await db.insert(schema.aiProviders)
      .values(result.data)
      .returning();
    
    // Log the creation for audit purposes
    try {
      if (req.user) {
        await logAiProviderManagement(
          req.user.id,
          tenantId,
          result.data.teamId || null,
          'create',
          aiProvider.id,
          {
            name: aiProvider.name,
            provider: aiProvider.provider,
            model: aiProvider.model,
            teamScoped: result.data.teamId ? true : false,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        );
      }
    } catch (logError) {
      console.error('Failed to log AI provider creation:', logError);
      // Non-blocking - continue even if logging fails
    }
    
    return res.status(201).json(aiProvider);
  } catch (error) {
    console.error('Error creating AI provider:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update an AI provider
router.patch('/tenants/:tenantId/ai-providers/:providerId', checkAiProviderAccess, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const providerId = parseInt(req.params.providerId);
    
    // Check if user has access to this tenant
    if (!isCreatorOrAdminRole(req.user?.role) && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: 'You do not have permission to update AI providers for this tenant' });
    }
    
    // Only creator and admin can update providers
    if (!isCreatorOrAdminRole(req.user?.role)) {
      return res.status(403).json({ message: 'Only administrators and creators can update AI providers' });
    }
    
    // Get the existing provider to check if it belongs to the tenant
    const existingProvider = await db.select()
      .from(schema.aiProviders)
      .where(and(
        eq(schema.aiProviders.id, providerId),
        eq(schema.aiProviders.tenantId, tenantId)
      ))
      .limit(1);
    
    if (existingProvider.length === 0) {
      return res.status(404).json({ message: 'AI provider not found' });
    }
    
    // Validate request body
    const updateSchema = insertAIProviderSchema.partial();
    const result = updateSchema.safeParse({
      ...req.body,
      tenantId
    });
    
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid request data', errors: result.error.errors });
    }
    
    // If setting as default and it's not already default, unset any existing default providers in same scope
    if (result.data.isDefault && !existingProvider[0].isDefault) {
      // Determine if we're updating a team-specific or tenant-wide provider
      const teamId = result.data.teamId !== undefined 
        ? result.data.teamId 
        : existingProvider[0].teamId;
      
      // If provider is team-specific, only unset defaults for that team
      if (teamId) {
        await db.update(schema.aiProviders)
          .set({ isDefault: false })
          .where(and(
            eq(schema.aiProviders.tenantId, tenantId),
            eq(schema.aiProviders.teamId, teamId),
            eq(schema.aiProviders.isDefault, true)
          ));
      } else {
        // For tenant-wide providers, unset defaults for tenant-wide providers only
        await db.update(schema.aiProviders)
          .set({ isDefault: false })
          .where(and(
            eq(schema.aiProviders.tenantId, tenantId),
            isNull(schema.aiProviders.teamId),
            eq(schema.aiProviders.isDefault, true)
          ));
      }
    }
    
    // Special handling for the API key - don't update if not provided
    let updateData = result.data;
    if (!updateData.apiKey) {
      delete updateData.apiKey;
    }
    
    // Update the AI provider
    const [updatedProvider] = await db.update(schema.aiProviders)
      .set(updateData)
      .where(and(
        eq(schema.aiProviders.id, providerId),
        eq(schema.aiProviders.tenantId, tenantId)
      ))
      .returning();
    
    // Log the update for audit purposes
    try {
      if (req.user) {
        await logAiProviderManagement(
          req.user.id,
          tenantId,
          updatedProvider.teamId,
          'update',
          providerId,
          {
            name: updatedProvider.name,
            changes: Object.keys(updateData),
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        );
      }
    } catch (logError) {
      console.error('Failed to log AI provider update:', logError);
      // Non-blocking - continue even if logging fails
    }
    
    return res.json(updatedProvider);
  } catch (error) {
    console.error('Error updating AI provider:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete an AI provider
router.delete('/tenants/:tenantId/ai-providers/:providerId', checkAiProviderAccess, async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const providerId = parseInt(req.params.providerId);
    
    // Check if user has access to this tenant
    if (!isCreatorOrAdminRole(req.user?.role) && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: 'You do not have permission to delete AI providers for this tenant' });
    }
    
    // Only creator and admin can delete providers
    if (!isCreatorOrAdminRole(req.user?.role)) {
      return res.status(403).json({ message: 'Only administrators and creators can delete AI providers' });
    }
    
    // Get the provider to check if it exists and belongs to the tenant
    const existingProvider = await db.select()
      .from(schema.aiProviders)
      .where(and(
        eq(schema.aiProviders.id, providerId),
        eq(schema.aiProviders.tenantId, tenantId)
      ))
      .limit(1);
    
    if (existingProvider.length === 0) {
      return res.status(404).json({ message: 'AI provider not found' });
    }
    
    // Delete the AI provider
    await db.delete(schema.aiProviders)
      .where(and(
        eq(schema.aiProviders.id, providerId),
        eq(schema.aiProviders.tenantId, tenantId)
      ));
    
    // Log the deletion for audit purposes
    try {
      if (req.user) {
        await logAiProviderManagement(
          req.user.id,
          tenantId,
          existingProvider[0].teamId,
          'delete',
          providerId,
          {
            name: existingProvider[0].name,
            provider: existingProvider[0].provider,
            model: existingProvider[0].model,
            teamScoped: existingProvider[0].teamId ? true : false,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        );
      }
    } catch (logError) {
      console.error('Failed to log AI provider deletion:', logError);
      // Non-blocking - continue even if logging fails
    }
    
    return res.json({ 
      message: 'AI provider deleted successfully',
      provider: existingProvider[0]
    });
  } catch (error) {
    console.error('Error deleting AI provider:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;