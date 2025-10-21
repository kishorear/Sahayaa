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
 * Checks custom roles from database first, then falls back to hardcoded industry roles
 */
export async function getUserPermissions(userId: number): Promise<RolePermissions | null> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return null;

    // Creator always has full permissions - bypass all checks
    if (user.role === 'creator' || user.role === 'administrator') {
      return getRolePermissions('none', 'admin');
    }

    const tenant = await storage.getTenantById(user.tenantId);
    if (!tenant) return null;

    const industryType = (tenant.industryType || 'none') as IndustryType;

    // First, check if this is a custom role from the database
    const customRole = await storage.getCustomUserRoleByKey(user.role, user.tenantId, industryType);
    if (customRole && customRole.active) {
      return customRole.permissions as RolePermissions;
    }

    // Fall back to hardcoded industry roles
    return getRolePermissions(industryType, user.role);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
}

/**
 * Check if current user has a specific permission
 * Checks custom roles from database first, then falls back to hardcoded industry roles
 */
export async function userHasPermission(
  req: Request,
  permission: keyof RolePermissions
): Promise<boolean> {
  if (!req.user) return false;

  try {
    // Creator always has all permissions
    if (req.user.role === 'creator' || req.user.role === 'administrator') {
      return true;
    }

    const tenant = await storage.getTenantById(req.user.tenantId);
    if (!tenant) return false;

    const industryType = (tenant.industryType || 'none') as IndustryType;

    // First, check if this is a custom role from the database
    const customRole = await storage.getCustomUserRoleByKey(req.user.role, req.user.tenantId, industryType);
    if (customRole && customRole.active) {
      const permissions = customRole.permissions as RolePermissions;
      return permissions[permission] || false;
    }

    // Fall back to hardcoded industry roles
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
 * Includes both custom roles from database and default hardcoded roles
 */
export async function getAvailableRolesForTenant(tenantId: number) {
  try {
    const tenant = await storage.getTenantById(tenantId);
    if (!tenant) return [];

    const industryType = (tenant.industryType || 'none') as IndustryType;
    
    // Get hardcoded industry roles
    const { getIndustryRoles } = await import("@shared/schema");
    const defaultRoles = getIndustryRoles(industryType);
    const hardcodedRoles = Object.values(defaultRoles).map(role => ({
      key: role.key,
      name: role.name,
      description: role.description,
      isCustom: false
    }));
    
    // Get custom roles from database
    const customRoles = await storage.getCustomUserRoles(tenantId, industryType);
    const customRoleList = customRoles
      .filter(role => role.active)
      .map(role => ({
        key: role.roleKey,
        name: role.roleName,
        description: role.description || '',
        isCustom: true
      }));
    
    // Combine both lists, custom roles first
    return [...customRoleList, ...hardcodedRoles];
  } catch (error) {
    console.error('Error getting available roles:', error);
    return [];
  }
}
