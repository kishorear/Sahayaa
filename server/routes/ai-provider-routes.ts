import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { InsertAiProvider, insertAiProviderSchema } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User {
      id: number;
      role: string;
      tenantId: number;
    }
  }
}

/**
 * Register routes for AI Provider management
 */
export function registerAiProviderRoutes(app: Express, requireAuth: any, requireRole: any) {
  // Get all AI providers for a tenant
  app.get('/api/ai-providers', requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId || 1;
      const providers = await storage.getAiProviders(tenantId);
      res.json(providers);
    } catch (error) {
      console.error("Error fetching AI providers:", error);
      res.status(500).json({ error: "Failed to fetch AI providers" });
    }
  });
  
  // Get a specific AI provider
  app.get('/api/ai-providers/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const tenantId = req.user?.tenantId;
      
      if (isNaN(providerId)) {
        return res.status(400).json({ error: "Invalid provider ID" });
      }
      
      const provider = await storage.getAiProviderById(providerId, tenantId);
      
      if (!provider) {
        return res.status(404).json({ error: "AI provider not found" });
      }
      
      res.json(provider);
    } catch (error) {
      console.error("Error fetching AI provider:", error);
      res.status(500).json({ error: "Failed to fetch AI provider" });
    }
  });
  
  // Create a new AI provider
  app.post('/api/ai-providers', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId || 1;
      
      // Validate input
      const validationSchema = insertAiProviderSchema.extend({
        isPrimary: z.boolean().optional(),
        enabled: z.boolean().optional(),
        useForChat: z.boolean().optional(),
        useForClassification: z.boolean().optional(),
        useForAutoResolve: z.boolean().optional(),
        useForEmail: z.boolean().optional()
      });
      
      const providerData = validationSchema.parse({
        ...req.body,
        tenantId
      });
      
      const newProvider = await storage.createAiProvider(providerData as InsertAiProvider);
      res.status(201).json(newProvider);
    } catch (error) {
      console.error("Error creating AI provider:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.format() });
      }
      res.status(500).json({ error: "Failed to create AI provider" });
    }
  });
  
  // Update an AI provider
  app.patch('/api/ai-providers/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const tenantId = req.user?.tenantId;
      
      if (isNaN(providerId)) {
        return res.status(400).json({ error: "Invalid provider ID" });
      }
      
      // Check provider exists
      const existingProvider = await storage.getAiProviderById(providerId, tenantId);
      
      if (!existingProvider) {
        return res.status(404).json({ error: "AI provider not found" });
      }
      
      // Don't allow changing tenantId
      const { tenantId: _, ...updates } = req.body;
      
      const updatedProvider = await storage.updateAiProvider(providerId, updates, tenantId);
      res.json(updatedProvider);
    } catch (error) {
      console.error("Error updating AI provider:", error);
      res.status(500).json({ error: "Failed to update AI provider" });
    }
  });
  
  // Delete an AI provider
  app.delete('/api/ai-providers/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const tenantId = req.user?.tenantId;
      
      if (isNaN(providerId)) {
        return res.status(400).json({ error: "Invalid provider ID" });
      }
      
      const result = await storage.deleteAiProvider(providerId, tenantId);
      
      if (!result) {
        return res.status(404).json({ error: "AI provider not found or could not be deleted" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting AI provider:", error);
      res.status(500).json({ error: "Failed to delete AI provider" });
    }
  });
  
  // Get status of AI providers
  app.get('/api/ai-providers/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId || 1;
      const { getAIProviderStatus } = await import('../ai/service');
      const status = await getAIProviderStatus(tenantId);
      res.json(status);
    } catch (error) {
      console.error("Error checking AI provider status:", error);
      res.status(500).json({ error: "Failed to check AI provider status" });
    }
  });
}