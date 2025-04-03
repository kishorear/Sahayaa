import { Request, Response, NextFunction, Express } from "express";
import { storage } from "../storage";
import { AiProviderTypeEnum, insertAiProviderSchema } from "@shared/schema";
import { getAIProviderStatus } from "../ai/service";
import { AIProviderFactory } from "../ai/providers";

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
 * Load AI provider configurations from database
 * 
 * @param specificTenantId Optional tenant ID to load providers for (loads all tenants if not specified)
 */
export async function loadAiProviders(specificTenantId?: number) {
  try {
    if (specificTenantId) {
      // Load providers for specific tenant
      try {
        const providers = await storage.getAiProviders(specificTenantId);
        
        // Initialize the factory with these configurations
        AIProviderFactory.loadProvidersFromDatabase(specificTenantId, providers);
        
        console.log(`Loaded ${providers.length} AI providers from database for tenant ${specificTenantId}`);
      } catch (tenantError) {
        console.error(`Error loading providers for tenant ${specificTenantId}:`, tenantError);
        
        // Try loading default providers for this tenant as fallback
        try {
          // Get OpenAI provider from environment
          if (process.env.OPENAI_API_KEY) {
            console.log(`Setting up default OpenAI provider for tenant ${specificTenantId} from environment`);
            AIProviderFactory.addProviderConfig(specificTenantId, {
              type: "openai",
              apiKey: process.env.OPENAI_API_KEY,
              model: "gpt-4o",
              isPrimary: true,
              useForChat: true,
              useForClassification: true,
              useForAutoResolve: true,
              useForEmail: true
            });
          }
        } catch (fallbackError) {
          console.error(`Failed to set up fallback providers for tenant ${specificTenantId}:`, fallbackError);
        }
      }
    } else {
      // Try to load providers for all tenants, but fall back to default tenant if there's an error
      try {
        const tenants = await storage.getAllTenants();
        
        for (const tenant of tenants) {
          try {
            const providers = await storage.getAiProviders(tenant.id);
            
            // Initialize the factory with these configurations
            AIProviderFactory.loadProvidersFromDatabase(tenant.id, providers);
            
            console.log(`Loaded ${providers.length} AI providers from database for tenant ${tenant.id}`);
          } catch (tenantError) {
            console.error(`Error loading providers for tenant ${tenant.id}:`, tenantError);
          }
        }
        
        // Always include default tenant (1) in case it wasn't in the list
        if (!tenants.some(t => t.id === 1)) {
          try {
            const providers = await storage.getAiProviders(1);
            AIProviderFactory.loadProvidersFromDatabase(1, providers);
          } catch (defaultTenantError) {
            console.error('Error loading providers for default tenant:', defaultTenantError);
          }
        }
      } catch (tenantsError) {
        console.error('Error fetching tenants:', tenantsError);
        
        // If we can't fetch tenants, try to load providers just for tenant ID 1
        try {
          const providers = await storage.getAiProviders(1);
          AIProviderFactory.loadProvidersFromDatabase(1, providers);
          console.log(`Loaded ${providers.length} AI providers for default tenant (ID: 1)`);
        } catch (defaultProviderError) {
          console.error('Error loading providers for default tenant:', defaultProviderError);
          
          // Last resort: Try setting up a default provider from environment
          try {
            // Get OpenAI provider from environment
            if (process.env.OPENAI_API_KEY) {
              console.log('Setting up default OpenAI provider from environment');
              AIProviderFactory.addProviderConfig(1, {
                type: "openai",
                apiKey: process.env.OPENAI_API_KEY,
                model: "gpt-4o",
                isPrimary: true,
                useForChat: true,
                useForClassification: true,
                useForAutoResolve: true,
                useForEmail: true
              });
            }
          } catch (fallbackError) {
            console.error('Failed to set up fallback providers:', fallbackError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to load AI providers from database:', error);
  }
}

/**
 * Register routes for AI Provider management
 */
export function registerAiProviderRoutes(app: Express, requireAuth: any, requireRole: any) {
  // Load AI providers at startup
  loadAiProviders();
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
      
      // Type is already validated by zod schema
      
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
      
      // Reload AI provider configurations for this tenant
      await loadAiProviders(req.user!.tenantId);
      
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
      
      // The updateAiProvider method now handles the isPrimary constraints properly in a transaction
      const updatedProvider = await storage.updateAiProvider(providerId, req.body, req.user!.tenantId);
      
      // Reload AI provider configurations for this tenant
      await loadAiProviders(req.user!.tenantId);
      
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
        // Reload AI provider configurations for this tenant
        await loadAiProviders(req.user!.tenantId);
        
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Failed to delete AI provider" });
      }
    } catch (error) {
      console.error("Error deleting AI provider:", error);
      res.status(500).json({ error: "Failed to delete AI provider" });
    }
  });

}