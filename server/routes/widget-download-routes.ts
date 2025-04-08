import { Express, Request, Response } from 'express';
import { generateWidgetPackage, WidgetConfig } from '../widget-generator';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Register routes for widget download functionality
 * @param app Express application
 */
export function registerWidgetDownloadRoutes(app: Express) {
  /**
   * Route to download the customized widget package
   * Accepts configuration parameters to personalize the widget
   */
  app.get('/api/widgets/download', async (req: Request, res: Response) => {
    try {
      // Get configuration from query parameters
      const tenantId = parseInt(req.query.tenantId as string) || 1;
      const userId = parseInt(req.query.userId as string) || 1;
      const primaryColor = (req.query.primaryColor as string) || '#6366F1';
      const position = (req.query.position as string) || 'right';
      const greetingMessage = (req.query.greetingMessage as string) || 'How can I help you today?';
      const autoOpen = (req.query.autoOpen as string) === 'true';
      const branding = (req.query.branding as string) !== 'false';
      const reportData = (req.query.reportData as string) !== 'false';
      
      // Get the user from database - using a more basic query to avoid column name case sensitivity issues
      const user = await db.execute(
        sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
      ).then(result => result.rows[0]);
      
      if (!user) {
        return res.status(404).json({ 
          error: 'User not found',
          message: 'The specified user does not exist.'
        });
      }
      
      // Generate a unique API key
      const apiKey = `${userId}_${tenantId}_${new Date().getTime()}`;
      
      // Create widget configuration
      const config: WidgetConfig = {
        tenantId,
        apiKey,
        primaryColor,
        position,
        greetingMessage,
        autoOpen,
        branding,
        reportData,
        adminId: userId
      };
      
      // Generate and send the widget package
      await generateWidgetPackage(config, res);
      
    } catch (error) {
      console.error('Error generating widget package:', error);
      res.status(500).json({ 
        error: 'Server error',
        message: 'An error occurred while generating the widget package.'
      });
    }
  });
}