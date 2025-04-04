/**
 * Integration Service
 * 
 * This module manages integrations with third-party services like Jira and Zendesk.
 * It provides methods to synchronize tickets between the support system and external services.
 */

import { db } from "../db";
import { integrations, tickets, Ticket, Integration } from "../../shared/schema";
import { getJiraService } from "./jira-service";
import { getZendeskService } from "./zendesk-service";
import { eq, and } from "drizzle-orm";

// Type definitions for integration configuration
export interface JiraConfig {
  host: string;
  username: string;
  apiToken: string;
  projectKey: string;
  issueType: string;
  enabled?: boolean; // Added to match usage in integration-routes.ts
}

export interface ZendeskConfig {
  subdomain: string;
  username: string;  // maps to email in the form
  apiToken: string;
  groupId?: string;
  enabled?: boolean; // Added to match usage in integration-routes.ts
}

// Event handler for ticket created event
export async function handleTicketCreated(ticket: Ticket): Promise<void> {
  try {
    console.log(`Processing integrations for new ticket #${ticket.id}`);
    
    // Get all enabled integrations for the tenant
    const enabledIntegrations = await db.select()
      .from(integrations)
      .where(
        and(
          eq(integrations.tenantId, ticket.tenantId),
          eq(integrations.enabled, true),
          eq(integrations.syncEnabled, true)
        )
      );
    
    if (enabledIntegrations.length === 0) {
      console.log(`No enabled integrations found for tenant ${ticket.tenantId}`);
      return;
    }
    
    // Process each enabled integration
    const externalIntegrations: Record<string, any> = ticket.externalIntegrations ? 
      (ticket.externalIntegrations as Record<string, any>) : {};
    
    for (const integration of enabledIntegrations) {
      // Skip if the integration doesn't support outbound sync
      if (integration.syncDirection !== 'outbound' && integration.syncDirection !== 'bidirectional') {
        continue;
      }
      
      // Skip if already synced with this integration
      if (externalIntegrations[integration.type]?.id) {
        console.log(`Ticket #${ticket.id} already synced with ${integration.type}`);
        continue;
      }
      
      // Create the ticket in the external system
      try {
        switch (integration.type) {
          case 'jira':
            await createJiraIssue(integration, ticket);
            break;
            
          case 'zendesk':
            await createZendeskTicket(integration, ticket);
            break;
            
          default:
            console.warn(`Unsupported integration type: ${integration.type}`);
        }
      } catch (error) {
        console.error(`Error creating ticket in ${integration.type}:`, error);
      }
    }
  } catch (error) {
    console.error("Error handling ticket creation for integrations:", error);
  }
}

// Create a Jira issue for a support ticket
async function createJiraIssue(integration: Integration, ticket: Ticket): Promise<void> {
  try {
    const jiraService = getJiraService();
    const config = integration.config as JiraConfig;
    
    // Create the issue in Jira
    const jiraIssue = await jiraService.createIssue(
      config, 
      ticket.title, 
      ticket.description,
      ticket.category
    );
    
    if (!jiraIssue || !jiraIssue.id) {
      throw new Error("Failed to create Jira issue - no issue ID returned");
    }
    
    // Update the ticket with the external reference
    const externalIntegrations = ticket.externalIntegrations ? 
      (ticket.externalIntegrations as Record<string, any>) : {};
    
    externalIntegrations.jira = {
      id: jiraIssue.id,
      key: jiraIssue.key,
      url: `${config.host}/browse/${jiraIssue.key}`
    };
    
    await db.update(tickets)
      .set({ externalIntegrations })
      .where(eq(tickets.id, ticket.id));
    
    console.log(`Created Jira issue: ${jiraIssue.key} for ticket #${ticket.id}`);
    
    // Update the last sync time for the integration
    await db.update(integrations)
      .set({ lastSyncTime: new Date() })
      .where(eq(integrations.id, integration.id));
      
  } catch (error) {
    console.error("Error creating Jira issue:", error);
    throw error;
  }
}

// Create a Zendesk ticket for a support ticket
async function createZendeskTicket(integration: Integration, ticket: Ticket): Promise<void> {
  try {
    const zendeskService = getZendeskService();
    const config = integration.config as ZendeskConfig;
    
    // Create the ticket in Zendesk
    const zendeskTicket = await zendeskService.createTicket(
      config,
      ticket.title,
      ticket.description,
      ticket.category
    );
    
    if (!zendeskTicket || !zendeskTicket.id) {
      throw new Error("Failed to create Zendesk ticket - no ticket ID returned");
    }
    
    // Update the ticket with the external reference
    const externalIntegrations = ticket.externalIntegrations ? 
      (ticket.externalIntegrations as Record<string, any>) : {};
    
    externalIntegrations.zendesk = {
      id: zendeskTicket.id,
      url: `https://${config.subdomain}.zendesk.com/agent/tickets/${zendeskTicket.id}`
    };
    
    await db.update(tickets)
      .set({ externalIntegrations })
      .where(eq(tickets.id, ticket.id));
    
    console.log(`Created Zendesk ticket: ${zendeskTicket.id} for ticket #${ticket.id}`);
    
    // Update the last sync time for the integration
    await db.update(integrations)
      .set({ lastSyncTime: new Date() })
      .where(eq(integrations.id, integration.id));
      
  } catch (error) {
    console.error("Error creating Zendesk ticket:", error);
    throw error;
  }
}

// Manually sync a ticket with external integrations
export async function syncTicketWithIntegrations(ticketId: number): Promise<Record<string, any>> {
  try {
    // Get the ticket
    const ticketResults = await db.select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);
    
    if (!ticketResults || ticketResults.length === 0) {
      throw new Error(`Ticket #${ticketId} not found`);
    }
    
    const ticket = ticketResults[0];
    
    // Process the ticket as if it was newly created
    await handleTicketCreated(ticket);
    
    // Return the updated external integrations
    return ticket.externalIntegrations ? 
      (ticket.externalIntegrations as Record<string, any>) : {};
  } catch (error) {
    console.error(`Error syncing ticket #${ticketId} with integrations:`, error);
    throw error;
  }
}

// Get status of integrations for a tenant
export async function getIntegrationsStatus(tenantId: number): Promise<Record<string, boolean>> {
  try {
    const results: Record<string, boolean> = {
      jira: false,
      zendesk: false
    };
    
    // Get all integrations for the tenant
    const tenantIntegrations = await db.select()
      .from(integrations)
      .where(eq(integrations.tenantId, tenantId));
    
    // Check if each integration is enabled
    for (const integration of tenantIntegrations) {
      if (results[integration.type] !== undefined) {
        results[integration.type] = integration.enabled;
      }
    }
    
    return results;
  } catch (error) {
    console.error(`Error getting integration status for tenant ${tenantId}:`, error);
    return { jira: false, zendesk: false };
  }
}