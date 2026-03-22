import { Request, Response, NextFunction } from 'express';
import { getAiProviderAccessForUser } from '../service';
import { logAiProviderAccess } from '../audit-log';

/**
 * Middleware to check if a user has access to AI providers
 * This ensures users can only access AI features if they have
 * provider access configured for their tenant and team
 */
export async function checkAiProviderAccess(req: Request, res: Response, next: NextFunction) {
  // Skip check if no authenticated user
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const { id: userId, tenantId, teamId, role } = req.user;

    // Admin and creator users always have access to AI features
    if (role === 'admin' || role === 'creator') {
      // Log the check but continue
      logAiProviderAccess(
        userId,
        tenantId,
        teamId,
        'provider_access_check',
        true,
        { reason: `User has ${role} role with automatic access` }
      ).catch(err => console.error('Failed to log AI provider access:', err));
      
      return next();
    }
    
    // Check if the user has access to AI providers
    const hasAccess = await getAiProviderAccessForUser(tenantId, teamId);
    
    // Log the access check
    logAiProviderAccess(
      userId,
      tenantId,
      teamId,
      'provider_access_check',
      hasAccess,
      { reason: hasAccess ? 'User has provider access' : 'No providers available for user' }
    ).catch(err => console.error('Failed to log AI provider access:', err));
    
    if (hasAccess) {
      return next();
    }
    
    // If no access, return a 403 Forbidden response
    return res.status(403).json({
      message: 'AI features are not available for your account',
      details: 'Contact your administrator to set up AI providers for your team'
    });
  } catch (error) {
    console.error('Error checking AI provider access:', error);
    
    // Log the error
    logAiProviderAccess(
      req.user.id,
      req.user.tenantId,
      req.user.teamId,
      'provider_access_check',
      false,
      { error: String(error) }
    ).catch(err => console.error('Failed to log AI provider access:', err));
    
    // Continue to avoid breaking the application completely
    // but log an error for investigation
    return next();
  }
}