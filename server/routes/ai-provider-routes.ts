import { Request, Response, NextFunction, Express } from "express";
import { storage } from "../storage";
import { AiProviderTypeEnum, insertAiProviderSchema } from "@shared/schema";
import { getAIProviderStatus } from "../ai/service";

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
  /**
   * Get all AI providers for the current tenant
   */
  app.get('/api/ai-providers', requireAuth, async (req: Request, res: Response) => {
    try {
      const providers = await storage.getAiProviders(req.user!.tenantId);
      res.json(providers);
    } catch (error) {
      console.error("Error fetching AI providers:", error);
      res.status(500).json({ error: "Failed to fetch AI providers" });
    }
  });

  /**
   * Get a specific AI provider by ID
   */
  app.get('/api/ai-providers/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const provider = await storage.getAiProviderById(providerId, req.user!.tenantId);
      
      if (!provider) {
        return res.status(404).json({ error: "AI provider not found" });
      }
      
      res.json(provider);
    } catch (error) {
      console.error("Error fetching AI provider:", error);
      res.status(500).json({ error: "Failed to fetch AI provider" });
    }
  });

  /**
   * Create a new AI provider
   */
  app.post('/api/ai-providers', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      // Validate request body against schema
      const validatedData = insertAiProviderSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId
      });
      
      // Ensure type is valid
      if (!Object.values(AiProviderTypeEnum.Values).includes(validatedData.type)) {
        return res.status(400).json({ error: "Invalid provider type" });
      }
      
      // If setting as primary, update all other providers to not be primary
      if (validatedData.isPrimary) {
        const providers = await storage.getAiProviders(req.user!.tenantId);
        for (const provider of providers) {
          if (provider.isPrimary) {
            await storage.updateAiProvider(provider.id, { isPrimary: false }, req.user!.tenantId);
          }
        }
      }
      
      const newProvider = await storage.createAiProvider(validatedData);
      res.status(201).json(newProvider);
    } catch (error) {
      console.error("Error creating AI provider:", error);
      res.status(500).json({ error: "Failed to create AI provider" });
    }
  });

  /**
   * Update an existing AI provider
   */
  app.patch('/api/ai-providers/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const provider = await storage.getAiProviderById(providerId, req.user!.tenantId);
      
      if (!provider) {
        return res.status(404).json({ error: "AI provider not found" });
      }
      
      // If setting as primary, update all other providers to not be primary
      if (req.body.isPrimary) {
        const providers = await storage.getAiProviders(req.user!.tenantId);
        for (const p of providers) {
          if (p.isPrimary && p.id !== providerId) {
            await storage.updateAiProvider(p.id, { isPrimary: false }, req.user!.tenantId);
          }
        }
      }
      
      // Update the provider
      const updatedProvider = await storage.updateAiProvider(providerId, req.body, req.user!.tenantId);
      res.json(updatedProvider);
    } catch (error) {
      console.error("Error updating AI provider:", error);
      res.status(500).json({ error: "Failed to update AI provider" });
    }
  });

  /**
   * Delete an AI provider
   */
  app.delete('/api/ai-providers/:id', requireAuth, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const providerId = parseInt(req.params.id);
      const provider = await storage.getAiProviderById(providerId, req.user!.tenantId);
      
      if (!provider) {
        return res.status(404).json({ error: "AI provider not found" });
      }
      
      // Prevent deletion of primary provider
      if (provider.isPrimary) {
        return res.status(400).json({ error: "Cannot delete primary AI provider" });
      }
      
      const deleted = await storage.deleteAiProvider(providerId, req.user!.tenantId);
      
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete AI provider" });
      }
    } catch (error) {
      console.error("Error deleting AI provider:", error);
      res.status(500).json({ error: "Failed to delete AI provider" });
    }
  });

  /**
   * Get status of all AI providers
   */
  app.get('/api/ai-providers/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const status = await getAIProviderStatus(req.user!.tenantId);
      res.json(status);
    } catch (error) {
      console.error("Error checking AI provider status:", error);
      res.status(500).json({ error: "Failed to check AI provider status" });
    }
  });
}