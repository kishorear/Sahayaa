import { Request, Response, NextFunction } from 'express';
import { getAiProviderAccessForUser } from '../service';
import { isCreatorOrAdminRole } from '../../utils';

/**
 * Middleware to check if the user has access to AI providers
 * This enforces tenant and team-scoped AI provider access control
 */
export const checkAiProviderAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip check if no user is authenticated (will be caught by auth middleware if needed)
    if (!req.isAuthenticated() || !req.user) {
      return next();
    }

    // Get the user's tenant and team IDs
    const tenantId = req.user.tenantId;
    const teamId = req.user.teamId;

    // Creator and admin roles have access to all AI providers
    if (isCreatorOrAdminRole(req.user.role)) {
      return next();
    }

    // Check if user has access to any AI providers based on their tenant and team
    const hasAccess = await getAiProviderAccessForUser(tenantId, teamId);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to AI providers. Please contact your administrator.'
      });
    }

    // User has access to at least one AI provider
    next();
  } catch (error) {
    console.error('Error checking AI provider access:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while checking AI provider access.'
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
  return await getAiProviderAccessForUser(tenantId, teamId);
}