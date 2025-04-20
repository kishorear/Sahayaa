import { Request, Response, NextFunction } from 'express';
import { storage } from '../../storage';

/**
 * Middleware to check if the user has access to AI providers
 * This enforces tenant and team-scoped AI provider access control
 */
export const checkAiProviderAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip access check for admins and creators who can access everything
    if (req.user?.role === 'creator' || req.user?.role === 'administrator') {
      return next();
    }

    // No user means no access
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required to access AI services' 
      });
    }

    const { tenantId, teamId } = req.user;
    
    // Check if user has access to any AI providers
    const hasAccess = await hasAiProviderAccess(tenantId, teamId);
    
    if (!hasAccess) {
      // Log the blocked attempt
      console.log(`AI access denied for user ${req.user.id} (tenant: ${tenantId}, team: ${teamId})`);
      
      return res.status(403).json({ 
        message: 'No AI providers configured for your tenant or team. Please contact your administrator.' 
      });
    }
    
    // User has access, proceed
    next();
  } catch (error) {
    console.error('Error checking AI provider access:', error);
    // Default to denied access on error to be safe
    return res.status(500).json({ 
      message: 'Error verifying AI provider access' 
    });
  }
};

/**
 * Check if a user has access to any AI providers based on their tenant and team
 * 
 * @param tenantId The user's tenant ID
 * @param teamId The user's team ID (can be null)
 * @returns Boolean indicating if the user has access to any AI providers
 */
export async function hasAiProviderAccess(tenantId: number, teamId: number | null): Promise<boolean> {
  try {
    // Get all enabled AI providers for the tenant
    const aiProviders = await storage.getAiProviders(tenantId);
    
    if (!aiProviders || aiProviders.length === 0) {
      // No AI providers configured for this tenant
      return false;
    }
    
    if (!teamId) {
      // User not in a team, check for tenant-wide providers (null teamId)
      return aiProviders.some(provider => provider.teamId === null);
    }
    
    // Check if there are any providers for the user's specific team
    const teamProviders = aiProviders.filter(provider => provider.teamId === teamId);
    if (teamProviders.length > 0) {
      return true;
    }
    
    // Check if there are any tenant-wide providers (null teamId)
    return aiProviders.some(provider => provider.teamId === null);
  } catch (error) {
    console.error(`Error checking AI provider access for tenant ${tenantId}, team ${teamId}:`, error);
    return false;
  }
}