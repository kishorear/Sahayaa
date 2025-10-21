import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { 
  IndustryType, 
  RolePermissions, 
  hasPermission as checkPermission,
  getRolePermissions 
} from "@shared/schema";

/**
 * Get user's permissions based on their role and company's industry type
 */
export async function getUserPermissions(userId: number): Promise<RolePermissions | null> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return null;

    const tenant = await storage.getTenant(user.tenantId);
    if (!tenant) return null;

    const industryType = (tenant.industryType || 'none') as IndustryType;
    return getRolePermissions(industryType, user.role);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
}

/**
 * Check if current user has a specific permission
 */
export async function userHasPermission(
  req: Request,
  permission: keyof RolePermissions
): Promise<boolean> {
  if (!req.user) return false;

  try {
    const tenant = await storage.getTenant(req.user.tenantId);
    if (!tenant) return false;

    const industryType = (tenant.industryType || 'none') as IndustryType;
    return checkPermission(industryType, req.user.role, permission);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Middleware to require a specific permission
 */
export function requirePermission(permission: keyof RolePermissions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const hasAccess = await userHasPermission(req, permission);
      if (hasAccess) {
        next();
      } else {
        res.status(403).json({ 
          message: `Forbidden: You don't have permission to ${permission.replace('can', '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`
        });
      }
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({ message: "Error checking permissions" });
    }
  };
}

/**
 * Middleware to require any of the specified permissions
 */
export function requireAnyPermission(permissions: Array<keyof RolePermissions>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      for (const permission of permissions) {
        const hasAccess = await userHasPermission(req, permission);
        if (hasAccess) {
          return next();
        }
      }
      
      res.status(403).json({ 
        message: "Forbidden: You don't have the required permissions"
      });
    } catch (error) {
      console.error('Error checking permissions:', error);
      res.status(500).json({ message: "Error checking permissions" });
    }
  };
}

/**
 * Middleware to require all of the specified permissions
 */
export function requireAllPermissions(permissions: Array<keyof RolePermissions>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      for (const permission of permissions) {
        const hasAccess = await userHasPermission(req, permission);
        if (!hasAccess) {
          return res.status(403).json({ 
            message: `Forbidden: You don't have permission to ${permission.replace('can', '').replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`
          });
        }
      }
      
      next();
    } catch (error) {
      console.error('Error checking permissions:', error);
      res.status(500).json({ message: "Error checking permissions" });
    }
  };
}

/**
 * Helper to get all available roles for a tenant's industry
 */
export async function getAvailableRolesForTenant(tenantId: number) {
  try {
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) return [];

    const industryType = (tenant.industryType || 'none') as IndustryType;
    const { getIndustryRoles } = await import("@shared/schema");
    const roles = getIndustryRoles(industryType);
    
    return Object.values(roles).map(role => ({
      key: role.key,
      name: role.name,
      description: role.description
    }));
  } catch (error) {
    console.error('Error getting available roles:', error);
    return [];
  }
}
