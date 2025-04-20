import express from 'express';
import { 
  getAiProviderAccessForUser, 
  getAvailableAIProviders, 
  getDefaultAIProvider 
} from '../ai/service';
import { logAiProviderAccess } from '../ai/audit-log';

const router = express.Router();

// Check if AI provider features are available for the current user
router.get('/availability', async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const teamId = req.user.teamId;

    const isAvailable = await getAiProviderAccessForUser(tenantId, teamId);
    
    // Log the access check
    logAiProviderAccess(
      userId,
      tenantId,
      teamId,
      'check_availability',
      true,
      {
        result: isAvailable,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    ).catch(err => console.error('Failed to log AI availability check:', err));
    
    return res.json({
      available: isAvailable
    });
  } catch (error) {
    console.error('Error checking AI availability:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get available AI providers for the current user
router.get('/providers', async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const teamId = req.user.teamId;
    const role = req.user.role;

    const providers = await getAvailableAIProviders(tenantId, teamId, role);
    
    // Remove sensitive information like API keys before sending to client
    const sanitizedProviders = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      provider: provider.provider,
      model: provider.model,
      teamId: provider.teamId,
      isDefault: provider.isDefault,
      hasApiKey: !!provider.apiKey // Only send if key exists, not the actual key
    }));
    
    // Log the providers request
    logAiProviderAccess(
      userId,
      tenantId,
      teamId,
      'list_providers',
      true,
      {
        count: providers.length,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    ).catch(err => console.error('Failed to log AI providers list access:', err));
    
    return res.json({
      providers: sanitizedProviders
    });
  } catch (error) {
    console.error('Error fetching AI providers:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Get default AI provider for the current user
router.get('/providers/default', async (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const teamId = req.user.teamId;

    const provider = await getDefaultAIProvider(tenantId, teamId);
    
    if (!provider) {
      return res.json({
        provider: null
      });
    }
    
    // Sanitize provider data - remove API key
    const sanitizedProvider = {
      id: provider.id,
      name: provider.name,
      provider: provider.provider,
      model: provider.model,
      teamId: provider.teamId,
      isDefault: provider.isDefault,
      hasApiKey: !!provider.apiKey
    };
    
    // Log the default provider request
    logAiProviderAccess(
      userId,
      tenantId,
      teamId,
      'get_default_provider',
      true,
      {
        providerId: provider.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    ).catch(err => console.error('Failed to log default AI provider access:', err));
    
    return res.json({
      provider: sanitizedProvider
    });
  } catch (error) {
    console.error('Error fetching default AI provider:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;