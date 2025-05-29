import type { Express, Request, Response } from "express";
import { z } from "zod";
import { generateAuthWidgetPackage, type WidgetConfig } from "../widget-auth-generator";
import { storage } from "../storage";
import { randomBytes, createHmac } from "crypto";

/**
 * Widget download request validation schema
 */
const widgetAuthDownloadSchema = z.object({
  tenantId: z.string().transform(val => parseInt(val, 10)),
  userId: z.string().transform(val => parseInt(val, 10)),
  primaryColor: z.string().default('6366F1'),
  position: z.enum(['right', 'left', 'center']).default('right'),
  greetingMessage: z.string().default('How can I help you today?'),
  autoOpen: z.string().transform(val => val === 'true').default('false'),
  branding: z.string().transform(val => val === 'true').default('true'),
  reportData: z.string().transform(val => val === 'true').default('true'),
  requireAuth: z.string().transform(val => val === 'true').default('true')
});

/**
 * Generate a tenant-specific API key
 */
function generateTenantApiKey(tenantId: number): string {
  const prefix = "wk"; // Widget Key
  const typePrefix = "tent"; // tenant
  const secret = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", process.env.JWT_SECRET || "default-secret")
    .update(`${prefix}_${typePrefix}_${tenantId}_${secret}`)
    .digest("hex")
    .substring(0, 8);
  
  return `${prefix}_${typePrefix}_${tenantId}_${secret}_${signature}`;
}

/**
 * Register routes for widget download with authentication functionality
 */
export function registerWidgetAuthDownloadRoutes(app: Express): void {
  /**
   * Download custom widget package with authentication support
   * 
   * GET /api/widgets/download-auth
   */
  app.get('/api/widgets/download-auth', async (req: Request, res: Response) => {
    try {
      // Validate query parameters
      const queryResult = widgetAuthDownloadSchema.safeParse(req.query);
      
      if (!queryResult.success) {
        return res.status(400).json({ 
          error: 'Invalid widget configuration',
          details: queryResult.error.format()
        });
      }
      
      const queryParams = queryResult.data;
      
      // Get or create API key for the tenant
      let apiKey: string;
      
      // Check if tenant already has an API key
      const existingApiKeys = await storage.getApiKeysByTenant(queryParams.tenantId);
      
      if (existingApiKeys.length > 0) {
        // Use the first active API key
        apiKey = existingApiKeys[0].key;
      } else {
        // Generate a new API key for this tenant
        apiKey = generateTenantApiKey(queryParams.tenantId);
        
        // Store the new API key in the database
        await storage.createApiKey({
          key: apiKey,
          tenantId: queryParams.tenantId,
          createdBy: queryParams.userId,
          domains: [],
          expiresAt: null, // Never expires
          description: `Widget API key for tenant ${queryParams.tenantId}`,
          permissions: {
            read: true,
            write: true,
            webhook: false
          },
          lastUsed: null,
          useCount: 0,
          createdAt: new Date(),
          isRevoked: false
        });
      }
      
      // Create widget configuration
      const widgetConfig: WidgetConfig = {
        tenantId: queryParams.tenantId,
        adminId: queryParams.userId,
        apiKey,
        primaryColor: queryParams.primaryColor,
        position: queryParams.position,
        greetingMessage: queryParams.greetingMessage,
        autoOpen: queryParams.autoOpen,
        branding: queryParams.branding,
        reportData: queryParams.reportData,
        requireAuth: queryParams.requireAuth
      };
      
      // Generate and download the widget package with authentication
      await generateAuthWidgetPackage(widgetConfig, res);
      
    } catch (error) {
      console.error('Error generating auth widget package:', error);
      res.status(500).json({ error: 'Failed to generate widget package with authentication' });
    }
  });
}