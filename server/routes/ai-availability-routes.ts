import { Express, Request, Response } from 'express';
import { getAiProviderAccessForUser, getAvailableAIProviders, getDefaultAIProvider } from '../ai/service';
import { checkAiProviderAccess } from '../ai/middleware/check-ai-provider';
import { logAiProviderAccess } from '../ai/audit-log';

/**
 * Register routes for checking AI provider availability
 * This allows the frontend to conditionally render AI features
 * 
 * @param app Express application
 */
export function registerAIAvailabilityRoutes(app: Express) {
  // Check if AI features are available for the current user
  app.get('/api/ai/availability', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const { id: userId, tenantId, teamId, role } = req.user;
      
      // Admin and creator users always have access
      if (role === 'admin' || role === 'creator') {
        return res.json({ available: true });
      }
      
      const available = await getAiProviderAccessForUser(tenantId, teamId);
      
      // Log the availability check
      logAiProviderAccess(
        userId,
        tenantId,
        teamId,
        'availability_check',
        true,
        { available }
      ).catch(err => console.error('Failed to log AI availability check:', err));
      
      return res.json({ available });
    } catch (error) {
      console.error('Error checking AI availability:', error);
      return res.status(500).json({ 
        message: 'Error checking AI availability',
        available: false 
      });
    }
  });

  // Get all available AI providers for the current user
  app.get('/api/ai/providers', checkAiProviderAccess, async (req: Request, res: Response) => {
    try {
      const { id: userId, tenantId, teamId, role } = req.user!;
      
      const providers = await getAvailableAIProviders(tenantId, teamId, role);
      
      // Map to a safe response without sensitive data
      const safeProviders = providers.map(provider => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        model: provider.model,
        teamId: provider.teamId,
        isDefault: provider.isDefault,
        hasApiKey: !!provider.apiKey
      }));
      
      // Log the providers fetch
      logAiProviderAccess(
        userId,
        tenantId,
        teamId,
        'providers_list',
        true,
        { count: providers.length }
      ).catch(err => console.error('Failed to log AI providers list access:', err));
      
      return res.json({ providers: safeProviders });
    } catch (error) {
      console.error('Error fetching AI providers:', error);
      return res.status(500).json({ message: 'Error fetching AI providers' });
    }
  });

  // Get the default AI provider for the current user
  app.get('/api/ai/providers/default', checkAiProviderAccess, async (req: Request, res: Response) => {
    try {
      const { id: userId, tenantId, teamId } = req.user!;
      
      const provider = await getDefaultAIProvider(tenantId, teamId);
      
      // If no provider is found, return null
      if (!provider) {
        return res.json({ provider: null });
      }
      
      // Return a safe response without sensitive data
      const safeProvider = {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        model: provider.model,
        teamId: provider.teamId,
        isDefault: provider.isDefault,
        hasApiKey: !!provider.apiKey
      };
      
      // Log the default provider fetch
      logAiProviderAccess(
        userId,
        tenantId,
        teamId,
        'default_provider',
        true,
        { providerId: provider.id }
      ).catch(err => console.error('Failed to log AI default provider access:', err));
      
      return res.json({ provider: safeProvider });
    } catch (error) {
      console.error('Error fetching default AI provider:', error);
      return res.status(500).json({ message: 'Error fetching default AI provider' });
    }
  });
}