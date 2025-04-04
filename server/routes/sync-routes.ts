/**
 * Sync Routes
 *
 * Routes for synchronizing tickets with external systems like Jira and Zendesk
 */

import { Express, Request, Response } from 'express';
import { db } from '../db';
import { tickets, tenants } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { syncTicketWithJira } from '../integrations/jira-service';
import { syncTicketWithZendesk } from '../integrations/zendesk-service';
import { TenantIntegrationSettings } from '../integrations/integration-service';

/**
 * Register routes for syncing tickets with external systems
 */
export function registerSyncRoutes(app: Express, requireAuth: any) {
  /**
   * Sync a ticket with external systems (Jira, Zendesk)
   * This creates or updates tickets in external systems.
   */
  app.post('/api/tickets/:id/sync', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ticketId = parseInt(id);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({
          message: 'Invalid ticket ID'
        });
      }
      
      // Get the tenant ID from the authenticated user
      const tenantId = req.user?.tenantId || 1;
      
      // Get the ticket
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, ticketId),
        with: {
          messages: true,
          attachments: true
        }
      });
      
      if (!ticket) {
        return res.status(404).json({
          message: 'Ticket not found'
        });
      }
      
      // Make sure the ticket belongs to the tenant
      if (ticket.tenantId !== tenantId) {
        return res.status(403).json({
          message: 'You do not have permission to sync this ticket'
        });
      }
      
      // Get the tenant's integration settings
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId)
      });
      
      if (!tenant) {
        return res.status(404).json({
          message: 'Tenant not found'
        });
      }
      
      // Get the tenant's integration settings
      const integrationSettings = tenant.integrationSettings as TenantIntegrationSettings || {};
      
      // Object to store integration results
      const integrationResults: Record<string, any> = {};
      
      // Sync with Jira if enabled
      if (integrationSettings.jira?.enabled) {
        try {
          const jiraResult = await syncTicketWithJira(ticket, integrationSettings.jira);
          
          // Update the ticket with the Jira issue reference
          if (!jiraResult.error) {
            // Update the ticket's externalIntegrations property
            const externalIntegrations = (ticket.externalIntegrations as Record<string, any>) || {};
            externalIntegrations.jira = {
              id: jiraResult.id,
              key: jiraResult.key,
              url: jiraResult.url,
              status: jiraResult.status,
              created: jiraResult.created,
              updated: jiraResult.updated
            };
            
            // Update the ticket
            await db.update(tickets)
              .set({
                externalIntegrations,
                updatedAt: new Date()
              })
              .where(eq(tickets.id, ticketId));
          }
          
          integrationResults.jira = jiraResult;
        } catch (error) {
          console.error('Error syncing ticket with Jira:', error);
          integrationResults.jira = {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Sync with Zendesk if enabled
      if (integrationSettings.zendesk?.enabled) {
        try {
          const zendeskResult = await syncTicketWithZendesk(ticket, integrationSettings.zendesk);
          
          // Update the ticket with the Zendesk ticket reference
          if (!zendeskResult.error) {
            // Update the ticket's externalIntegrations property
            const externalIntegrations = (ticket.externalIntegrations as Record<string, any>) || {};
            externalIntegrations.zendesk = {
              id: zendeskResult.id,
              url: zendeskResult.url,
              status: zendeskResult.status,
              created: zendeskResult.created,
              updated: zendeskResult.updated
            };
            
            // Update the ticket
            await db.update(tickets)
              .set({
                externalIntegrations,
                updatedAt: new Date()
              })
              .where(eq(tickets.id, ticketId));
          }
          
          integrationResults.zendesk = zendeskResult;
        } catch (error) {
          console.error('Error syncing ticket with Zendesk:', error);
          integrationResults.zendesk = {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Return the results
      return res.status(200).json({
        message: 'Ticket synced with external systems',
        integrations: integrationResults
      });
    } catch (error) {
      console.error('Error syncing ticket:', error);
      
      return res.status(500).json({
        message: 'Error syncing ticket',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * Get the sync status for a ticket
   */
  app.get('/api/tickets/:id/sync-status', requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const ticketId = parseInt(id);
      
      if (isNaN(ticketId)) {
        return res.status(400).json({
          message: 'Invalid ticket ID'
        });
      }
      
      // Get the tenant ID from the authenticated user
      const tenantId = req.user?.tenantId || 1;
      
      // Get the ticket
      const ticket = await db.query.tickets.findFirst({
        where: eq(tickets.id, ticketId)
      });
      
      if (!ticket) {
        return res.status(404).json({
          message: 'Ticket not found'
        });
      }
      
      // Make sure the ticket belongs to the tenant
      if (ticket.tenantId !== tenantId) {
        return res.status(403).json({
          message: 'You do not have permission to view this ticket'
        });
      }
      
      // Get the tenant's integration settings
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId)
      });
      
      if (!tenant) {
        return res.status(404).json({
          message: 'Tenant not found'
        });
      }
      
      // Get the tenant's integration settings
      const integrationSettings = tenant.integrationSettings as TenantIntegrationSettings || {};
      
      // Get the active integrations
      const activeIntegrations: string[] = [];
      
      if (integrationSettings.jira?.enabled) {
        activeIntegrations.push('jira');
      }
      
      if (integrationSettings.zendesk?.enabled) {
        activeIntegrations.push('zendesk');
      }
      
      // Get the ticket's external integrations
      const externalIntegrations = ticket.externalIntegrations || {};
      
      // Return the sync status
      // Default to true if syncedAt doesn't exist yet
      const hasUnsyncedChanges = 
        ticket.externalIntegrations && Object.keys(ticket.externalIntegrations).length > 0
          ? true 
          : false;
      
      return res.status(200).json({
        ticket: {
          id: ticket.id,
          title: ticket.title,
          status: ticket.status
        },
        activeIntegrations,
        externalIntegrations,
        hasUnsyncedChanges
      });
    } catch (error) {
      console.error('Error getting ticket sync status:', error);
      
      return res.status(500).json({
        message: 'Error getting ticket sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}