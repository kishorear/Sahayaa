/**
 * Sync Routes
 * 
 * Routes for syncing tickets with external systems (Jira, Zendesk)
 */
import { Express, Request, Response } from 'express';
import { syncTicketWithIntegrations } from '../integrations/integration-service';

export function registerSyncRoutes(app: Express, requireAuth: any) {
  // Sync a ticket with Jira
  app.post('/api/integrations/jira/sync/:ticketId', requireAuth, async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.ticketId, 10);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({
          message: 'Invalid ticket ID'
        });
      }
      
      console.log(`Syncing ticket #${ticketId} with Jira...`);
      
      // Call the sync function
      const result = await syncTicketWithIntegrations(ticketId);
      
      return res.status(200).json({
        message: 'Ticket synchronized with Jira',
        externalIntegrations: result
      });
    } catch (error) {
      console.error('Error syncing ticket with Jira:', error);
      
      return res.status(500).json({
        message: 'Error syncing ticket with Jira',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Sync a ticket with Zendesk
  app.post('/api/integrations/zendesk/sync/:ticketId', requireAuth, async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.ticketId, 10);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({
          message: 'Invalid ticket ID'
        });
      }
      
      console.log(`Syncing ticket #${ticketId} with Zendesk...`);
      
      // Call the sync function
      const result = await syncTicketWithIntegrations(ticketId);
      
      return res.status(200).json({
        message: 'Ticket synchronized with Zendesk',
        externalIntegrations: result
      });
    } catch (error) {
      console.error('Error syncing ticket with Zendesk:', error);
      
      return res.status(500).json({
        message: 'Error syncing ticket with Zendesk',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Get integration status
  app.get('/api/integrations/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = req.user?.tenantId || 1;
      
      // Import here to avoid circular dependencies
      const { getIntegrationsStatus } = require('../integrations/integration-service');
      const status = await getIntegrationsStatus(tenantId);
      
      return res.status(200).json(status);
    } catch (error) {
      console.error('Error getting integration status:', error);
      
      return res.status(500).json({
        message: 'Error getting integration status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}