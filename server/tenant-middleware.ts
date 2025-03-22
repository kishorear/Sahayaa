import { NextFunction, Request, Response } from "express";
import { Tenant } from "@shared/schema";
import { storage } from "./storage";

// Extended Express Request to include tenant information
declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
    }
  }
}

/**
 * Middleware to authenticate requests using API key in headers
 * Used for external/widget integrations
 */
export const tenantApiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({ message: "API key is required" });
  }
  
  try {
    const tenant = await storage.getTenantByApiKey(apiKey);
    
    if (!tenant || !tenant.active) {
      return res.status(401).json({ message: "Invalid or inactive API key" });
    }
    
    // Attach tenant to request
    req.tenant = tenant;
    next();
  } catch (error) {
    console.error("Tenant auth error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Middleware to determine tenant from subdomain
 * Used for web interface
 */
export const tenantSubdomainAuth = async (req: Request, res: Response, next: NextFunction) => {
  // Extract subdomain from host
  const hostname = req.hostname;
  let subdomain = 'default';
  
  // Check if this is a subdomain request
  const parts = hostname.split('.');
  if (parts.length > 2) {
    subdomain = parts[0];
  }
  
  try {
    // Skip for certain paths that don't need tenant context
    if (req.path === '/api/health' || req.path === '/api/ping') {
      return next();
    }
    
    const tenant = await storage.getTenantBySubdomain(subdomain);
    
    if (!tenant || !tenant.active) {
      if (subdomain !== 'default') {
        return res.status(404).json({ message: "Tenant not found or inactive" });
      }
      // For default subdomain, continue without tenant
    } else {
      // Attach tenant to request
      req.tenant = tenant;
    }
    
    next();
  } catch (error) {
    console.error("Tenant subdomain auth error:", error);
    next(); // Continue even if tenant determination fails
  }
};

/**
 * Middleware to restrict access to tenant resources
 * Ensures a user can only access resources belonging to their tenant
 */
export const tenantResourceGuard = (req: Request, res: Response, next: NextFunction) => {
  // If user is not authenticated, skip (auth middleware will handle)
  if (!req.user) {
    return next();
  }
  
  // If tenant is specified in request by previous middleware
  if (req.tenant) {
    // Make sure user belongs to this tenant
    if (req.user.tenantId !== req.tenant.id) {
      return res.status(403).json({ message: "Access denied: tenant mismatch" });
    }
  } else {
    // For API access where tenant is not in URL but determined by user
    // Just proceed - user's tenantId will be used for data filtering
  }
  
  next();
};