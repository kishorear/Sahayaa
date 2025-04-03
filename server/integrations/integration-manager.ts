/**
 * Integration Manager
 * 
 * This module provides a service for managing integrations with third-party services.
 */

import { db } from "../db";
import { integrations, Ticket, Message, InsertMessage } from "../../shared/schema";
import { getJiraService } from "./jira-service";
import { getZendeskService } from "./zendesk-service";
import { JiraConfig, ZendeskConfig } from "./integration-service";
import { eq } from "drizzle-orm";

/**
 * The IntegrationManager class handles interactions with third-party services
 */
class IntegrationManager {
  // Keep track of enabled integrations by tenant
  private enabledIntegrations: Map<number, Array<{type: string, config: any}>> = new Map();
  
  /**
   * Initializes the integration service with the provided configurations
   */
  setupIntegrations(integrations: Array<{type: string, config: any}>, tenantId: number = 1): void {
    this.enabledIntegrations.set(tenantId, integrations);
    console.log(`Set up ${integrations.length} integrations for tenant ${tenantId}`);
  }
  
  /**
   * Verifies connections to all enabled third-party services
   */
  async verifyConnections(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // We need to properly await these checks
    try {
      // Convert map entries to array to avoid iteration issues
      const entries = Array.from(this.enabledIntegrations.entries());
      
      for (let i = 0; i < entries.length; i++) {
        const [tenantId, integrations] = entries[i];
        
        for (let j = 0; j < integrations.length; j++) {
          const integration = integrations[j];
          
          if (integration.type === 'jira' && integration.config.enabled) {
            try {
              const jiraService = getJiraService();
              results.jira = await jiraService.testConnection(integration.config);
            } catch (error) {
              console.error('Error verifying Jira connection:', error);
              results.jira = false;
            }
          }
          
          if (integration.type === 'zendesk' && integration.config.enabled) {
            try {
              const zendeskService = getZendeskService();
              results.zendesk = await zendeskService.testConnection(integration.config);
            } catch (error) {
              console.error('Error verifying Zendesk connection:', error);
              results.zendesk = false;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in verifyConnections:', error);
    }
    
    return results;
  }
  
  /**
   * Synchronizes existing tickets with third-party systems
   */
  async syncExistingTickets(tickets: Ticket[]): Promise<Record<string, Record<number, any>>> {
    const results: Record<string, Record<number, any>> = {
      jira: {},
      zendesk: {}
    };
    
    // Process each ticket
    for (const ticket of tickets) {
      // Skip tickets that already have external integrations
      if (ticket.externalIntegrations && Object.keys(ticket.externalIntegrations).length > 0) {
        continue;
      }
      
      try {
        // Create in third-party systems
        const thirdPartyResults = await this.createTicketInThirdParty(ticket);
        
        // Record results
        if (thirdPartyResults.jira && !thirdPartyResults.jira.error) {
          results.jira[ticket.id] = thirdPartyResults.jira;
        }
        
        if (thirdPartyResults.zendesk && !thirdPartyResults.zendesk.error) {
          results.zendesk[ticket.id] = thirdPartyResults.zendesk;
        }
      } catch (error) {
        console.error(`Error syncing ticket ${ticket.id} to third-party systems:`, error);
      }
    }
    
    return results;
  }
  /**
   * Create a ticket in enabled third-party integrations
   */
  async createTicketInThirdParty(ticket: Ticket): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    try {
      // Get all enabled integrations for the tenant
      const enabledIntegrations = await db.select()
        .from(integrations)
        .where(
          eq(integrations.tenantId, ticket.tenantId)
        );
      
      // Process integrations
      for (const integration of enabledIntegrations) {
        if (!integration.enabled || !integration.syncEnabled) {
          continue;
        }
        
        try {
          switch (integration.type) {
            case 'jira':
              if (integration.syncDirection === 'outbound' || integration.syncDirection === 'bidirectional') {
                const jiraService = getJiraService();
                const config = integration.config as JiraConfig;
                
                const jiraIssue = await jiraService.createIssue(
                  config,
                  ticket.title,
                  ticket.description,
                  ticket.category
                );
                
                results.jira = {
                  key: jiraIssue.key,
                  id: jiraIssue.id,
                  url: `${config.host}/browse/${jiraIssue.key}`
                };
              }
              break;
              
            case 'zendesk':
              if (integration.syncDirection === 'outbound' || integration.syncDirection === 'bidirectional') {
                const zendeskService = getZendeskService();
                const config = integration.config as ZendeskConfig;
                
                const zendeskTicket = await zendeskService.createTicket(
                  config,
                  ticket.title,
                  ticket.description,
                  ticket.category
                );
                
                results.zendesk = {
                  id: zendeskTicket.id,
                  url: `https://${config.subdomain}.zendesk.com/agent/tickets/${zendeskTicket.id}`
                };
              }
              break;
              
            default:
              console.warn(`Unsupported integration type: ${integration.type}`);
          }
        } catch (error) {
          console.error(`Error creating ticket in ${integration.type}:`, error);
          results[integration.type] = { error: error instanceof Error ? error.message : String(error) };
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error getting integrations:', error);
      return results;
    }
  }
  
  /**
   * Add a comment to a ticket in third-party systems
   */
  async addCommentToThirdParty(
    externalTickets: Record<string, any>,
    message: InsertMessage | Message
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    // Skip AI messages with auto-resolve notices (don't want to expose internal operation)
    if (message.sender === 'ai' && message.metadata && 
        (message.metadata as any).isAutoResolved) {
      return results;
    }
    
    try {
      // Format the comment with sender info
      const senderName = message.sender === 'user' ? 'Customer' : 
                        message.sender === 'ai' ? 'AI Assistant' : 
                        message.sender === 'admin' ? 'Admin' : 
                        message.sender === 'support-agent' ? 'Support Agent' : 
                        message.sender === 'engineer' ? 'Engineer' : 
                        'Support System';
      
      const formattedComment = `${senderName}: ${message.content}`;
      
      // Check for Jira integration
      if (externalTickets.jira && externalTickets.jira.key) {
        try {
          // Get all Jira integrations for this tenant
          const jiraIntegrations = await db.select()
            .from(integrations)
            .where(
              eq(integrations.type, 'jira')
            );
          
          for (const integration of jiraIntegrations) {
            if (integration.enabled && 
                (integration.syncDirection === 'outbound' || integration.syncDirection === 'bidirectional')) {
              const jiraService = getJiraService();
              const config = integration.config as JiraConfig;
              
              await jiraService.addComment(
                config,
                externalTickets.jira.key,
                formattedComment
              );
              
              results.jira = true;
              break; // Use the first enabled integration
            }
          }
        } catch (error) {
          console.error('Error adding comment to Jira:', error);
          results.jira = false;
        }
      }
      
      // Check for Zendesk integration
      if (externalTickets.zendesk && externalTickets.zendesk.id) {
        try {
          // Get all Zendesk integrations for this tenant
          const zendeskIntegrations = await db.select()
            .from(integrations)
            .where(
              eq(integrations.type, 'zendesk')
            );
          
          for (const integration of zendeskIntegrations) {
            if (integration.enabled && 
                (integration.syncDirection === 'outbound' || integration.syncDirection === 'bidirectional')) {
              const zendeskService = getZendeskService();
              const config = integration.config as ZendeskConfig;
              
              await zendeskService.addComment(
                config,
                externalTickets.zendesk.id,
                formattedComment
              );
              
              results.zendesk = true;
              break; // Use the first enabled integration
            }
          }
        } catch (error) {
          console.error('Error adding comment to Zendesk:', error);
          results.zendesk = false;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error adding comment to third-party systems:', error);
      return results;
    }
  }
  
  /**
   * Update ticket status in third-party systems
   */
  async updateStatusInThirdParty(
    externalTickets: Record<string, any>,
    status: string
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    try {
      // Check for Jira integration
      if (externalTickets.jira && externalTickets.jira.key) {
        try {
          // Get all Jira integrations for this tenant
          const jiraIntegrations = await db.select()
            .from(integrations)
            .where(
              eq(integrations.type, 'jira')
            );
          
          for (const integration of jiraIntegrations) {
            if (integration.enabled && 
                (integration.syncDirection === 'outbound' || integration.syncDirection === 'bidirectional')) {
              const jiraService = getJiraService();
              const config = integration.config as JiraConfig;
              
              await jiraService.updateStatus(
                config,
                externalTickets.jira.key,
                status
              );
              
              results.jira = true;
              break; // Use the first enabled integration
            }
          }
        } catch (error) {
          console.error('Error updating Jira ticket status:', error);
          results.jira = false;
        }
      }
      
      // Check for Zendesk integration
      if (externalTickets.zendesk && externalTickets.zendesk.id) {
        try {
          // Get all Zendesk integrations for this tenant
          const zendeskIntegrations = await db.select()
            .from(integrations)
            .where(
              eq(integrations.type, 'zendesk')
            );
          
          for (const integration of zendeskIntegrations) {
            if (integration.enabled && 
                (integration.syncDirection === 'outbound' || integration.syncDirection === 'bidirectional')) {
              const zendeskService = getZendeskService();
              const config = integration.config as ZendeskConfig;
              
              await zendeskService.updateTicket(
                config,
                externalTickets.zendesk.id,
                undefined, // subject
                undefined, // comment
                status
              );
              
              results.zendesk = true;
              break; // Use the first enabled integration
            }
          }
        } catch (error) {
          console.error('Error updating Zendesk ticket status:', error);
          results.zendesk = false;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error updating status in third-party systems:', error);
      return results;
    }
  }
}

// Singleton instance
let integrationManager: IntegrationManager | null = null;

export function getIntegrationService(): IntegrationManager {
  if (!integrationManager) {
    integrationManager = new IntegrationManager();
  }
  return integrationManager;
}