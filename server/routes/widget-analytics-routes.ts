import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { tenantApiKeyAuth } from "../tenant-middleware";
import { insertWidgetAnalyticsSchema, WidgetAnalytics } from "@shared/schema";
import { z } from "zod";

/**
 * Register routes for Widget Analytics
 */
export function registerWidgetAnalyticsRoutes(app: Express, requireAuth: any) {
  // Get analytics for a specific widget via API key
  // This endpoint is used by the widget itself to get its own analytics
  app.get('/api/widget-analytics/:apiKey', async (req: Request, res: Response) => {
    try {
      const { apiKey } = req.params;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      const analytics = await storage.getWidgetAnalyticsByApiKey(apiKey);
      
      if (!analytics) {
        return res.status(404).json({ message: "Widget analytics not found" });
      }
      
      res.status(200).json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update widget analytics - this is called by the widget itself
  // Uses tenantApiKeyAuth middleware to authenticate based on API key
  app.post('/api/widget-analytics/:apiKey', tenantApiKeyAuth, async (req: Request, res: Response) => {
    try {
      const { apiKey } = req.params;
      
      if (!apiKey) {
        return res.status(400).json({ message: "API key is required" });
      }
      
      // Get existing analytics or create new ones
      let analytics = await storage.getWidgetAnalyticsByApiKey(apiKey);
      
      if (!analytics) {
        if (!req.tenant) {
          return res.status(404).json({ message: "Tenant not found for this API key" });
        }
        
        // Create new analytics record
        const validatedData = {
          apiKey,
          tenantId: req.tenant.id,
          adminId: req.tenant.adminId || 1, // Default to admin ID 1 if not specified
          clientWebsite: req.get('Referer') || null,
          interactions: 1,
          messagesReceived: 0,
          messagesSent: 0,
          ticketsCreated: 0,
          lastActivity: new Date(),
          lastClientIp: req.ip || null,
          clientInfo: req.headers['user-agent'] || null,
          metadata: {}
        };
        
        analytics = await storage.createWidgetAnalytics(validatedData);
      } else {
        // Update existing analytics
        const updates: Partial<WidgetAnalytics> = {
          interactions: (analytics.interactions || 0) + 1,
          lastActivity: new Date(),
          lastClientIp: req.ip || null,
          clientInfo: req.headers['user-agent'] || null
        };
        
        // Update specific counters based on action type
        const { action } = req.body;
        if (action === 'message_received') {
          updates.messagesReceived = (analytics.messagesReceived || 0) + 1;
        } else if (action === 'message_sent') {
          updates.messagesSent = (analytics.messagesSent || 0) + 1;
        } else if (action === 'ticket_created') {
          updates.ticketsCreated = (analytics.ticketsCreated || 0) + 1;
        }
        
        // If the referer has changed, update the website
        const referer = req.get('Referer');
        if (referer && (!analytics.clientWebsite || analytics.clientWebsite !== referer)) {
          updates.clientWebsite = referer;
        }
        
        analytics = await storage.updateWidgetAnalytics(analytics.id, updates);
      }
      
      res.status(200).json(analytics);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Admin endpoint - get all analytics for the current admin's tenant
  app.get('/api/admin/widget-analytics', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const analyticsData = await storage.getWidgetAnalyticsByAdminId(
        req.user.id, 
        req.user.tenantId
      );
      
      res.status(200).json(analyticsData);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
}