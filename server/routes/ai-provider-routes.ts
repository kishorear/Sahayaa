import { Router } from 'express';
import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

const router = Router();

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
  priority: z.number().int().min(1).max(100).default(50),
  contextWindow: z.number().int().min(1000).max(100000).default(8000),
  maxTokens: z.number().int().min(100).max(10000).default(1000),
  temperature: z.number().min(0).max(1).default(0.7),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Get all AI providers for a tenant
router.get('/tenants/:tenantId/ai-providers', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    
    // Check if user has access to this tenant
    if (req.user?.role !== 'creator' && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: 'You do not have permission to access AI providers for this tenant' });
    }
    
    const aiProviders = await db.select().from(schema.aiProviders)
      .where(eq(schema.aiProviders.tenantId, tenantId));
    
    return res.json(aiProviders);
  } catch (error) {
    console.error('Error fetching AI providers:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new AI provider for a tenant
router.post('/tenants/:tenantId/ai-providers', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    
    // Check if user has access to this tenant
    if (req.user?.role !== 'creator' && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: 'You do not have permission to create AI providers for this tenant' });
    }
    
    // Validate request body
    const result = insertAIProviderSchema.safeParse({
      ...req.body,
      tenantId
    });
    
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid request data', errors: result.error.errors });
    }
    
    // If setting as default, unset any existing default providers
    if (result.data.isDefault) {
      await db.update(schema.aiProviders)
        .set({ isDefault: false })
        .where(and(
          eq(schema.aiProviders.tenantId, tenantId),
          eq(schema.aiProviders.isDefault, true)
        ));
    }
    
    // Insert the new AI provider
    const [aiProvider] = await db.insert(schema.aiProviders)
      .values(result.data)
      .returning();
    
    return res.status(201).json(aiProvider);
  } catch (error) {
    console.error('Error creating AI provider:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Update an AI provider
router.patch('/tenants/:tenantId/ai-providers/:providerId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const providerId = parseInt(req.params.providerId);
    
    // Check if user has access to this tenant
    if (req.user?.role !== 'creator' && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: 'You do not have permission to update AI providers for this tenant' });
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
    
    // If setting as default and it's not already default, unset any existing default providers
    if (result.data.isDefault && !existingProvider[0].isDefault) {
      await db.update(schema.aiProviders)
        .set({ isDefault: false })
        .where(and(
          eq(schema.aiProviders.tenantId, tenantId),
          eq(schema.aiProviders.isDefault, true)
        ));
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
    
    return res.json(updatedProvider);
  } catch (error) {
    console.error('Error updating AI provider:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete an AI provider
router.delete('/tenants/:tenantId/ai-providers/:providerId', async (req, res) => {
  try {
    const tenantId = parseInt(req.params.tenantId);
    const providerId = parseInt(req.params.providerId);
    
    // Check if user has access to this tenant
    if (req.user?.role !== 'creator' && req.user?.tenantId !== tenantId) {
      return res.status(403).json({ message: 'You do not have permission to delete AI providers for this tenant' });
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
    
    return res.json({ message: 'AI provider deleted successfully' });
  } catch (error) {
    console.error('Error deleting AI provider:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;