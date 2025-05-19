import type { Express, Request, Response } from "express";
import { z } from "zod";
import { generateAuthWidgetPackage, type WidgetConfig } from "../widget-auth-generator.js";

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
      
      // Generate API key for widget
      const apiKey = `wgt_${Math.random().toString(36).substring(2, 15)}`;
      
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