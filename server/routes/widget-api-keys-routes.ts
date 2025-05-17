import type { Express, Request, Response } from "express";
import { z } from "zod";
import { randomBytes, createHmac } from "crypto";
import { storage } from "../storage";

/**
 * API Key generation schema
 */
const apiKeyGenerationSchema = z.object({
  tenantId: z.number(),
  userId: z.number(),
  domains: z.array(z.string().trim()).default([]),
  expiresIn: z.number().default(0), // 0 means never expires
  description: z.string().optional(),
  permissions: z.object({
    read: z.boolean().default(true),
    write: z.boolean().default(true),
    webhook: z.boolean().default(false)
  }).default({
    read: true,
    write: true,
    webhook: false
  })
});

/**
 * Format for API keys: wk_<prefix>_<id>_<secret>
 * Where:
 * - wk_ is a fixed prefix for all widget keys
 * - <prefix> is a 4-character identifier for the type (tenant, user, etc)
 * - <id> is a numeric identifier for the tenant/user
 * - <secret> is a random string for authentication
 */
function generateApiKey(keyType: string, id: number): string {
  const prefix = "wk"; // Widget Key
  const typePrefix = keyType.substring(0, 4).padEnd(4, "_");
  const secret = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", process.env.JWT_SECRET || "default-secret")
    .update(`${prefix}_${typePrefix}_${id}_${secret}`)
    .digest("hex")
    .substring(0, 8);
  
  return `${prefix}_${typePrefix}_${id}_${secret}_${signature}`;
}

/**
 * Verify an API key to ensure it hasn't been tampered with
 */
function verifyApiKey(apiKey: string): { valid: boolean, type?: string, id?: number, secret?: string } {
  try {
    const parts = apiKey.split("_");
    if (parts.length !== 5) return { valid: false };
    
    const [prefix, typePrefix, idStr, secret, providedSignature] = parts;
    if (prefix !== "wk") return { valid: false };
    
    const id = parseInt(idStr, 10);
    if (isNaN(id)) return { valid: false };
    
    // Recreate the signature to verify it matches
    const expectedSignature = createHmac("sha256", process.env.JWT_SECRET || "default-secret")
      .update(`${prefix}_${typePrefix}_${id}_${secret}`)
      .digest("hex")
      .substring(0, 8);
    
    if (providedSignature !== expectedSignature) return { valid: false };
    
    return {
      valid: true,
      type: typePrefix.trim(),
      id,
      secret
    };
  } catch (error) {
    console.error("Error verifying API key:", error);
    return { valid: false };
  }
}

/**
 * Register routes for widget API key management
 */
export function registerWidgetApiKeyRoutes(app: Express): void {
  /**
   * Generate a new API key for widget access
   * 
   * POST /api/widgets/keys
   */
  app.post('/api/widgets/keys', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const userRole = (req.user as any).role;
      
      // Only administrators, creators, or engineers can generate API keys
      if (!['administrator', 'creator', 'engineer'].includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden. Only administrators, creators, or engineers can generate API keys.' });
      }
      
      // Parse and validate request
      const validation = apiKeyGenerationSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: 'Invalid API key generation request',
          details: validation.error.errors
        });
      }
      
      const { tenantId, userId, domains, expiresIn, description, permissions } = validation.data;
      
      // Check that the user has permission for this tenant
      const user = req.user as any;
      if (user.tenantId !== tenantId && userRole !== 'creator') {
        return res.status(403).json({ 
          error: 'Forbidden. You can only generate API keys for your own tenant.'
        });
      }
      
      // Generate the API key
      const apiKey = generateApiKey("tent", tenantId);
      
      // Store the API key in the database
      const apiKeyData = {
        key: apiKey,
        tenantId,
        createdBy: userId,
        domains,
        expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : null,
        description: description || `Widget API key created by ${userId}`,
        permissions: permissions,
        lastUsed: null,
        useCount: 0,
        createdAt: new Date(),
        isRevoked: false
      };
      
      await storage.createApiKey(apiKeyData);
      
      // Return the generated API key
      res.status(201).json({
        apiKey,
        expiresAt: apiKeyData.expiresAt,
        description: apiKeyData.description,
        permissions: apiKeyData.permissions
      });
      
    } catch (error) {
      console.error('Error generating API key:', error);
      res.status(500).json({ error: 'Failed to generate API key' });
    }
  });
  
  /**
   * Get all API keys for a tenant
   * 
   * GET /api/widgets/keys
   */
  app.get('/api/widgets/keys', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const userRole = user.role;
      
      // Only administrators, creators, or engineers can view API keys
      if (!['administrator', 'creator', 'engineer'].includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden. Only administrators, creators, or engineers can view API keys.' });
      }
      
      // Get the tenant ID from the query or use the user's tenant ID
      let tenantId = user.tenantId;
      if (userRole === 'creator' && req.query.tenantId) {
        tenantId = parseInt(req.query.tenantId as string, 10);
      }
      
      // Get all API keys for the tenant
      const apiKeys = await storage.getApiKeysByTenant(tenantId);
      
      // Return the API keys (without the actual key values for security)
      res.status(200).json(apiKeys.map(key => ({
        id: key.id,
        keyPrefix: key.key.split('_').slice(0, 3).join('_') + '_...',
        tenantId: key.tenantId,
        createdBy: key.createdBy,
        createdAt: key.createdAt,
        domains: key.domains,
        expiresAt: key.expiresAt,
        description: key.description,
        permissions: key.permissions,
        lastUsed: key.lastUsed,
        useCount: key.useCount
      })));
      
    } catch (error) {
      console.error('Error getting API keys:', error);
      res.status(500).json({ error: 'Failed to get API keys' });
    }
  });
  
  /**
   * Revoke an API key
   * 
   * DELETE /api/widgets/keys/:id
   */
  app.delete('/api/widgets/keys/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const user = req.user as any;
      const userRole = user.role;
      
      // Only administrators, creators, or engineers can revoke API keys
      if (!['administrator', 'creator', 'engineer'].includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden. Only administrators, creators, or engineers can revoke API keys.' });
      }
      
      const apiKeyId = parseInt(req.params.id, 10);
      if (isNaN(apiKeyId)) {
        return res.status(400).json({ error: 'Invalid API key ID' });
      }
      
      // Get the API key to check tenant permissions
      const apiKey = await storage.getApiKeyById(apiKeyId);
      if (!apiKey) {
        return res.status(404).json({ error: 'API key not found' });
      }
      
      // Check that the user has permission for this tenant
      if (user.tenantId !== apiKey.tenantId && userRole !== 'creator') {
        return res.status(403).json({ 
          error: 'Forbidden. You can only revoke API keys for your own tenant.'
        });
      }
      
      // Revoke the API key
      await storage.deleteApiKey(apiKeyId);
      
      res.status(200).json({ message: 'API key revoked successfully' });
      
    } catch (error) {
      console.error('Error revoking API key:', error);
      res.status(500).json({ error: 'Failed to revoke API key' });
    }
  });
  
  /**
   * Verify an API key (for internal use)
   * 
   * GET /api/widgets/keys/verify
   */
  app.get('/api/widgets/keys/verify', async (req: Request, res: Response) => {
    try {
      const apiKey = req.headers.authorization?.split(' ')[1];
      if (!apiKey) {
        return res.status(401).json({ error: 'API key required' });
      }
      
      // Verify the API key format
      const verification = verifyApiKey(apiKey);
      if (!verification.valid) {
        return res.status(401).json({ error: 'Invalid API key format' });
      }
      
      // Check if the API key exists in the database
      const storedKey = await storage.getApiKeyByValue(apiKey);
      if (!storedKey) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      // Check if the API key is expired
      if (storedKey.expiresAt && new Date(storedKey.expiresAt) < new Date()) {
        return res.status(401).json({ error: 'API key expired' });
      }
      
      // Check domain restrictions if any
      if (storedKey.domains && storedKey.domains.length > 0) {
        const origin = req.headers.origin || '';
        const referer = req.headers.referer || '';
        
        // Extract domain from origin or referer
        let domain = '';
        try {
          if (origin) {
            domain = new URL(origin).hostname;
          } else if (referer) {
            domain = new URL(referer).hostname;
          }
        } catch (e) {
          // URL parsing error
        }
        
        // Check if domain is allowed
        if (domain && !storedKey.domains.some(d => {
          // Support wildcard subdomains
          if (d.startsWith('*.')) {
            const baseDomain = d.substring(2);
            return domain.endsWith(baseDomain);
          }
          return domain === d;
        })) {
          return res.status(403).json({ error: 'API key not authorized for this domain' });
        }
      }
      
      // Update the last used timestamp and use count
      await storage.updateApiKeyUsage(storedKey.id);
      
      // Return the tenant information
      const tenant = await storage.getTenantById(storedKey.tenantId);
      
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      
      res.status(200).json({
        valid: true,
        tenantId: storedKey.tenantId,
        permissions: storedKey.permissions,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          settings: tenant.settings
        }
      });
      
    } catch (error) {
      console.error('Error verifying API key:', error);
      res.status(500).json({ error: 'Failed to verify API key' });
    }
  });
}