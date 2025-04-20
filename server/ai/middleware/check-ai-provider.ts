import { Request, Response, NextFunction } from 'express';
import { isCreatorOrAdminRole } from '../../utils';
import { logAiProviderAccess } from '../audit-log';
import { getAiProviderAccessForUser } from '../service';

/**
 * Middleware to check if a user has access to AI provider features
 * Enforces tenant and team-scoped access control
 */
export function checkAiProviderAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      message: 'Authentication required to access AI providers' 
    });
  }

  const userId = req.user.id;
  const tenantId = req.user.tenantId;
  const teamId = req.user.teamId;
  const userRole = req.user.role;
  
  // Creator and admin roles always have access
  if (isCreatorOrAdminRole(userRole)) {
    // Still log the access for audit purposes
    logAiProviderAccess(
      userId,
      tenantId,
      teamId,
      'middleware_access',
      true,
      { 
        role: userRole,
        path: req.path,
        method: req.method
      }
    ).catch(err => console.error('Failed to log AI provider access:', err));
    
    return next();
  }
  
  // For regular users, check if AI providers are available for their tenant/team
  getAiProviderAccessForUser(tenantId, teamId)
    .then(hasAccess => {
      // Log the access attempt
      logAiProviderAccess(
        userId,
        tenantId,
        teamId,
        'middleware_access',
        hasAccess,
        { 
          role: userRole,
          path: req.path,
          method: req.method
        }
      ).catch(err => console.error('Failed to log AI provider access:', err));
      
      if (hasAccess) {
        next();
      } else {
        res.status(403).json({
          message: 'AI provider access denied. No AI providers are configured for your tenant/team.',
          error: 'AI_PROVIDER_NOT_AVAILABLE'
        });
      }
    })
    .catch(error => {
      console.error('Error checking AI provider access:', error);
      
      // Log the failed access attempt
      logAiProviderAccess(
        userId,
        tenantId,
        teamId,
        'middleware_access',
        false,
        { 
          role: userRole,
          path: req.path,
          method: req.method,
          error: error.message
        }
      ).catch(err => console.error('Failed to log AI provider access failure:', err));
      
      res.status(500).json({
        message: 'Error checking AI provider access',
        error: 'INTERNAL_SERVER_ERROR'
      });
    });
}

/**
 * Utility function to check if a user has AI provider access
 * Returns a promise that resolves to true/false
 * Used for conditional checks in application logic
 */
export async function hasAiProviderAccess(req: Request): Promise<boolean> {
  if (!req.isAuthenticated() || !req.user) {
    return false;
  }

  const tenantId = req.user.tenantId;
  const teamId = req.user.teamId;
  const userRole = req.user.role;
  
  // Creator and admin roles always have access
  if (isCreatorOrAdminRole(userRole)) {
    return true;
  }
  
  // For regular users, check if AI providers are available for their tenant/team
  return getAiProviderAccessForUser(tenantId, teamId);
}