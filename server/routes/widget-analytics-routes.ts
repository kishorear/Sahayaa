import { Express, Request, Response } from 'express';
import { storage } from '../storage';
import { tenantApiKeyAuth } from '../tenant-middleware';
import { InsertWidgetAnalytics } from '@shared/schema';
import { z } from 'zod';
import { insertWidgetAnalyticsSchema } from '@shared/schema';

// Create a validation schema for widget analytics update
const updateWidgetAnalyticsSchema = z.object({
  interactions: z.number().optional(),
  messagesReceived: z.number().optional(),
  messagesSent: z.number().optional(),
  ticketsCreated: z.number().optional(),
  lastActivity: z.date().optional(),
  lastClientIp: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

export function registerWidgetAnalyticsRoutes(app: Express, requireAuth: any) {
  // Get analytics for a specific API key
  // Public route used by the widget to fetch its own analytics
  app.get('/api/widget-analytics/:apiKey', async (req: Request, res: Response) => {
    try {
      const apiKey = req.params.apiKey;
      const analytics = await storage.getWidgetAnalyticsByApiKey(apiKey);
      
      if (!analytics) {
        return res.status(404).json({ message: 'Widget analytics not found' });
      }
      
      return res.json(analytics);
    } catch (error) {
      console.error('Error fetching widget analytics:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Create or update widget analytics
  // Public route used by the widget to update its analytics
  app.post('/api/widget-analytics/:apiKey', tenantApiKeyAuth, async (req: Request, res: Response) => {
    try {
      const apiKey = req.params.apiKey;
      const tenant = req.tenant;
      
      if (!tenant) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      // Check if analytics already exist for this API key
      let analytics = await storage.getWidgetAnalyticsByApiKey(apiKey);
      
      if (analytics) {
        // Validate update data
        const validatedData = updateWidgetAnalyticsSchema.parse(req.body);
        
        // Update existing analytics
        analytics = await storage.updateWidgetAnalytics(analytics.id, {
          ...validatedData,
          lastActivity: new Date(),
          lastClientIp: req.ip || null
        });
        
        return res.json(analytics);
      } else {
        // Validate create data
        const validatedData: InsertWidgetAnalytics = {
          apiKey,
          tenantId: tenant.id,
          adminId: req.body.adminId,
          clientWebsite: req.body.clientWebsite || null,
          interactions: req.body.interactions || 0,
          messagesReceived: req.body.messagesReceived || 0,
          messagesSent: req.body.messagesSent || 0,
          ticketsCreated: req.body.ticketsCreated || 0,
          lastActivity: new Date(),
          lastClientIp: req.ip || null,
          metadata: req.body.metadata || {}
        };
        
        // Create new analytics
        analytics = await storage.createWidgetAnalytics(validatedData);
        
        return res.status(201).json(analytics);
      }
    } catch (error) {
      console.error('Error updating widget analytics:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid data format', errors: error.errors });
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Get all analytics for an admin user
  // Protected route used by the admin dashboard
  app.get('/api/admin/widget-analytics', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const analytics = await storage.getWidgetAnalyticsByAdminId(userId, tenantId);
      return res.json(analytics);
    } catch (error) {
      console.error('Error fetching admin widget analytics:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });
}