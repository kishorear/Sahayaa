import { Request, Response, NextFunction } from 'express';
import { getAiProviderAccessForUser } from '../service';
import { logAiProviderAccess } from '../audit-log';

/**
 * Middleware to check if a user has access to AI provider features
 * Enforces tenant and team-scoped access control
 */
export function checkAiProviderAccess(req: Request, res: Response, next: NextFunction) {
  // Skip access check for non-authenticated requests
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      message: 'Authentication required to access AI features'
    });
  }

  const userId = req.user.id;
  const tenantId = req.user.tenantId;
  const teamId = req.user.teamId;
  
  // Check if user has access to AI providers based on their tenant and team
  getAiProviderAccessForUser(tenantId, teamId)
    .then(hasAccess => {
      if (hasAccess) {
        // Log successful access
        logAiProviderAccess(
          userId,
          tenantId,
          teamId,
          'middleware_access',
          true,
          {
            path: req.path,
            method: req.method,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        ).catch(err => console.error('Failed to log successful AI access:', err));
        
        next();
      } else {
        // Log failed access attempt
        logAiProviderAccess(
          userId,
          tenantId,
          teamId,
          'middleware_access',
          false,
          {
            path: req.path,
            method: req.method,
            reason: 'No AI providers available for tenant/team',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          }
        ).catch(err => console.error('Failed to log failed AI access:', err));
        
        res.status(403).json({
          message: 'You do not have access to AI features. Contact your administrator to set up AI providers for your team.'
        });
      }
    })
    .catch(error => {
      console.error('Error checking AI provider access:', error);
      res.status(500).json({ message: 'Error checking AI provider access' });
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
  
  try {
    return await getAiProviderAccessForUser(
      req.user.tenantId,
      req.user.teamId
    );
  } catch (error) {
    console.error('Error in hasAiProviderAccess:', error);
    return false;
  }
}