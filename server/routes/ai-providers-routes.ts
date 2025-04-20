import { Router, Response } from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { isCreatorOrAdminRole } from '../utils';
import { getAiProviderAccessForUser, reloadProvidersFromDatabase } from '../ai/service';
import { logAiProviderAccess, logAiProviderManagement } from '../ai/audit-log';

// Use extended Request type from Express that has user property
import { Request } from 'express-serve-static-core';

const router = Router();

// Schema for creating/updating AI providers
const insertAIProviderSchema = createInsertSchema(schema.aiProviders)
  .extend({
    name: z.string().min(1, 'Provider name is required'),
    type: z.string().min(1, 'Provider type is required'),
    model: z.string().min(1, 'Model name is required'),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    isDefault: z.boolean().default(false),
    enabled: z.boolean().default(true),
    useForChat: z.boolean().default(true),
    useForClassification: z.boolean().default(true),
    useForAutoResolve: z.boolean().default(true),
    useForEmail: z.boolean().default(true),
    teamId: z.number().nullable().optional(),
    priority: z.number().int().min(1).max(100).default(50),
    contextWindow: z.number().int().min(1000).max(100000).default(8000),
    maxTokens: z.number().int().min(100).max(10000).default(1000),
    temperature: z.number().min(0).max(1).default(0.7),
    settings: z.record(z.any()).optional()
  })
  .omit({ id: true, createdAt: true, updatedAt: true });

// Get all AI providers
router.get('/', async (req: Request, res: Response) => {
  try {
    // Must be authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { tenantId, teamId, role } = req.user;
    let providers = [];

    // Creator and admin roles see all providers for the tenant
    if (isCreatorOrAdminRole(role)) {
      providers = await db.select().from(schema.aiProviders)
        .where(eq(schema.aiProviders.tenantId, tenantId));
    } else {
      // Regular users only see providers for their tenant and team
      providers = await db.select().from(schema.aiProviders)
        .where(and(
          eq(schema.aiProviders.tenantId, tenantId),
          or(
            eq(schema.aiProviders.teamId, teamId || 0),
            isNull(schema.aiProviders.teamId)
          ),
          eq(schema.aiProviders.enabled, true)
        ));
    }

    // Log access
    if (req.user) {
      try {
        await logAiProviderAccess({
          userId: req.user.id,
          tenantId,
          teamId,
          action: 'list',
          success: true,
          details: `Listed ${providers.length} AI providers`
        });
      } catch (logError) {
        console.error('Error logging AI provider access:', logError);
      }
    }

    return res.status(200).json(providers);
  } catch (error) {
    console.error('Error getting AI providers:', error);
    return res.status(500).json({ message: 'Error getting AI providers' });
  }
});

// Create a new AI provider
router.post('/', async (req: Request, res: Response) => {
  try {
    // Must be authenticated and have admin or creator role
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!isCreatorOrAdminRole(req.user.role)) {
      return res.status(403).json({ message: 'Only administrators and creators can create AI providers' });
    }

    const { tenantId } = req.user;

    // Validate request body
    const result = insertAIProviderSchema.safeParse({
      ...req.body,
      tenantId
    });

    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: result.error.errors 
      });
    }

    // If setting as default, unset any existing default providers in same scope
    if (result.data.isDefault) {
      if (result.data.teamId) {
        // Team-specific: unset defaults for that team
        await db.update(schema.aiProviders)
          .set({ isDefault: false })
          .where(and(
            eq(schema.aiProviders.tenantId, tenantId),
            eq(schema.aiProviders.teamId, result.data.teamId),
            eq(schema.aiProviders.isDefault, true)
          ));
      } else {
        // Tenant-wide: unset defaults for tenant-wide providers only
        await db.update(schema.aiProviders)
          .set({ isDefault: false })
          .where(and(
            eq(schema.aiProviders.tenantId, tenantId),
            isNull(schema.aiProviders.teamId),
            eq(schema.aiProviders.isDefault, true)
          ));
      }
    }

    // Create the provider
    const [provider] = await db.insert(schema.aiProviders)
      .values(result.data)
      .returning();

    // Log creation
    if (req.user) {
      try {
        await logAiProviderManagement({
          userId: req.user.id,
          tenantId,
          action: 'create',
          providerId: provider.id,
          details: {
            name: provider.name,
            type: provider.type,
            model: provider.model,
            teamScoped: result.data.teamId ? true : false
          }
        });
      } catch (logError) {
        console.error('Error logging AI provider creation:', logError);
      }
    }

    // Reload the provider cache
    try {
      await reloadProvidersFromDatabase(tenantId);
    } catch (cacheError) {
      console.warn('Error reloading AI provider cache:', cacheError);
    }

    return res.status(201).json(provider);
  } catch (error) {
    console.error('Error creating AI provider:', error);
    return res.status(500).json({ message: 'Error creating AI provider' });
  }
});

// Get a specific AI provider
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Must be authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { tenantId, teamId, role } = req.user;
    const providerId = parseInt(req.params.id);

    // Get the provider
    const provider = await db.select()
      .from(schema.aiProviders)
      .where(eq(schema.aiProviders.id, providerId))
      .limit(1);

    if (provider.length === 0) {
      return res.status(404).json({ message: 'AI provider not found' });
    }

    // Check permissions
    if (provider[0].tenantId !== tenantId && !isCreatorOrAdminRole(role)) {
      return res.status(403).json({ message: 'You do not have permission to view this AI provider' });
    }

    // Regular users can only see providers for their tenant and team
    if (!isCreatorOrAdminRole(role) && 
        provider[0].teamId !== null && 
        provider[0].teamId !== teamId) {
      return res.status(403).json({ message: 'You do not have permission to view this AI provider' });
    }

    // Log access
    if (req.user) {
      try {
        await logAiProviderAccess({
          userId: req.user.id,
          tenantId,
          teamId,
          action: 'view',
          success: true,
          details: `Viewed AI provider ${provider[0].name} (ID: ${providerId})`
        });
      } catch (logError) {
        console.error('Error logging AI provider access:', logError);
      }
    }

    return res.status(200).json(provider[0]);
  } catch (error) {
    console.error('Error getting AI provider:', error);
    return res.status(500).json({ message: 'Error getting AI provider' });
  }
});

// Update an AI provider
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    // Must be authenticated and have admin or creator role
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!isCreatorOrAdminRole(req.user.role)) {
      return res.status(403).json({ message: 'Only administrators and creators can update AI providers' });
    }

    const { tenantId } = req.user;
    const providerId = parseInt(req.params.id);

    // Get the existing provider
    const existingProvider = await db.select()
      .from(schema.aiProviders)
      .where(eq(schema.aiProviders.id, providerId))
      .limit(1);

    if (existingProvider.length === 0) {
      return res.status(404).json({ message: 'AI provider not found' });
    }

    // Check permissions
    if (existingProvider[0].tenantId !== tenantId && !isCreatorOrAdminRole(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to update this AI provider' });
    }

    // Validate request body
    const updateSchema = insertAIProviderSchema.partial();
    const result = updateSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid request data', 
        errors: result.error.errors 
      });
    }

    // If setting as default and it's not already default, unset any existing default providers
    if (result.data.isDefault === true && !existingProvider[0].isDefault) {
      const teamId = result.data.teamId !== undefined 
        ? result.data.teamId 
        : existingProvider[0].teamId;

      if (teamId) {
        // Team-specific: unset defaults for that team
        await db.update(schema.aiProviders)
          .set({ isDefault: false })
          .where(and(
            eq(schema.aiProviders.tenantId, tenantId),
            eq(schema.aiProviders.teamId, teamId),
            eq(schema.aiProviders.isDefault, true)
          ));
      } else {
        // Tenant-wide: unset defaults for tenant-wide providers
        await db.update(schema.aiProviders)
          .set({ isDefault: false })
          .where(and(
            eq(schema.aiProviders.tenantId, tenantId),
            isNull(schema.aiProviders.teamId),
            eq(schema.aiProviders.isDefault, true)
          ));
      }
    }

    // Special handling for the API key - don't update if empty string
    let updateData = result.data;
    if (updateData.apiKey === '') {
      delete updateData.apiKey;
    }

    // Update the provider
    const [updatedProvider] = await db.update(schema.aiProviders)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(schema.aiProviders.id, providerId))
      .returning();

    // Log update
    if (req.user) {
      try {
        await logAiProviderManagement({
          userId: req.user.id,
          tenantId,
          action: 'update',
          providerId,
          details: {
            name: updatedProvider.name,
            changes: Object.keys(updateData)
          }
        });
      } catch (logError) {
        console.error('Error logging AI provider update:', logError);
      }
    }

    // Reload the provider cache
    try {
      await reloadProvidersFromDatabase(tenantId);
    } catch (cacheError) {
      console.warn('Error reloading AI provider cache:', cacheError);
    }

    return res.status(200).json(updatedProvider);
  } catch (error) {
    console.error('Error updating AI provider:', error);
    return res.status(500).json({ message: 'Error updating AI provider' });
  }
});

// Delete an AI provider
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Must be authenticated and have admin or creator role
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!isCreatorOrAdminRole(req.user.role)) {
      return res.status(403).json({ message: 'Only administrators and creators can delete AI providers' });
    }

    const { tenantId } = req.user;
    const providerId = parseInt(req.params.id);

    // Get the existing provider
    const existingProvider = await db.select()
      .from(schema.aiProviders)
      .where(eq(schema.aiProviders.id, providerId))
      .limit(1);

    if (existingProvider.length === 0) {
      return res.status(404).json({ message: 'AI provider not found' });
    }

    // Check permissions
    if (existingProvider[0].tenantId !== tenantId && !isCreatorOrAdminRole(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to delete this AI provider' });
    }

    // Delete the provider
    await db.delete(schema.aiProviders)
      .where(eq(schema.aiProviders.id, providerId));

    // Log deletion
    if (req.user) {
      try {
        await logAiProviderManagement({
          userId: req.user.id,
          tenantId,
          action: 'delete',
          providerId,
          details: {
            name: existingProvider[0].name,
            type: existingProvider[0].type,
            model: existingProvider[0].model
          }
        });
      } catch (logError) {
        console.error('Error logging AI provider deletion:', logError);
      }
    }

    // Reload the provider cache
    try {
      await reloadProvidersFromDatabase(tenantId);
    } catch (cacheError) {
      console.warn('Error reloading AI provider cache:', cacheError);
    }

    return res.status(200).json({ 
      message: 'AI provider deleted successfully',
      provider: existingProvider[0]
    });
  } catch (error) {
    console.error('Error deleting AI provider:', error);
    return res.status(500).json({ message: 'Error deleting AI provider' });
  }
});

// Get AI provider status
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Must be authenticated
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // This is just a placeholder - in a real implementation, this would
    // check the actual connection to each AI provider
    const statusMock = {
      openai: true,
      gemini: true,
      anthropic: true,
      'aws-bedrock': true,
      custom: true
    };

    return res.status(200).json(statusMock);
  } catch (error) {
    console.error('Error checking AI provider status:', error);
    return res.status(500).json({ message: 'Error checking AI provider status' });
  }
});

export default router;