import { ZendeskService, ZendeskConfig, setupZendeskService, getZendeskService } from './zendesk';
import { JiraService, JiraConfig, setupJiraService, getJiraService } from './jira';
import { InsertTicket, InsertMessage } from '@shared/schema';

// Interface for any third-party ticket system configuration
export type IntegrationConfig = 
  | { type: 'zendesk'; config: ZendeskConfig }
  | { type: 'jira'; config: JiraConfig };

/**
 * Main integration service that manages all third-party integrations
 */
export class IntegrationService {
  private zendeskService: ZendeskService | null = null;
  private jiraService: JiraService | null = null;

  constructor() {
    // Services will be set up later via configuration
  }

  /**
   * Configure integrations from settings
   */
  setupIntegrations(integrations: IntegrationConfig[]): void {
    console.log('Setting up integrations:', integrations.map(i => ({
      type: i.type,
      config: {
        ...i.config,
        apiToken: i.config.apiToken ? '[REDACTED]' : 'missing'
      }
    })));
    
    for (const integration of integrations) {
      if (integration.type === 'zendesk') {
        console.log('Setting up Zendesk integration with config:', {
          subdomain: integration.config.subdomain,
          email: integration.config.email,
          enabled: integration.config.enabled,
          apiToken: integration.config.apiToken ? '[REDACTED]' : 'missing'
        });
        
        // Ensure all required fields are present
        if (!integration.config.subdomain || !integration.config.email || !integration.config.apiToken) {
          console.error('Missing required fields for Zendesk integration:', {
            hasSubdomain: !!integration.config.subdomain,
            hasEmail: !!integration.config.email,
            hasApiToken: !!integration.config.apiToken
          });
          continue; // Skip this integration
        }
        
        try {
          this.zendeskService = setupZendeskService(integration.config);
          console.log('Zendesk integration set up successfully');
        } catch (error) {
          console.error('Error setting up Zendesk integration:', error);
        }
      } else if (integration.type === 'jira') {
        console.log('Setting up Jira integration with config:', {
          baseUrl: integration.config.baseUrl,
          email: integration.config.email,
          projectKey: integration.config.projectKey,
          enabled: integration.config.enabled,
          apiToken: integration.config.apiToken ? '[REDACTED]' : 'missing'
        });
        
        // Ensure all required fields are present
        if (!integration.config.baseUrl || !integration.config.email || 
            !integration.config.apiToken || !integration.config.projectKey) {
          console.error('Missing required fields for Jira integration:', {
            hasBaseUrl: !!integration.config.baseUrl,
            hasEmail: !!integration.config.email,
            hasApiToken: !!integration.config.apiToken,
            hasProjectKey: !!integration.config.projectKey
          });
          continue; // Skip this integration
        }
        
        try {
          this.jiraService = setupJiraService(integration.config);
          console.log('Jira integration set up successfully');
        } catch (error) {
          console.error('Error setting up Jira integration:', error);
        }
      }
    }
  }

  /**
   * Get specific integration service
   */
  getService(type: 'zendesk' | 'jira'): ZendeskService | JiraService | null {
    if (type === 'zendesk') {
      return this.zendeskService || getZendeskService();
    } else if (type === 'jira') {
      return this.jiraService || getJiraService();
    }
    return null;
  }

  /**
   * Create tickets in all enabled third-party systems
   */
  async createTicketInThirdParty(ticket: InsertTicket): Promise<Record<string, any>> {
    const result: Record<string, any> = {};

    if (this.zendeskService?.isEnabled()) {
      result.zendesk = await this.zendeskService.createTicket(ticket);
    }

    if (this.jiraService?.isEnabled()) {
      result.jira = await this.jiraService.createIssue(ticket);
    }

    return result;
  }

  /**
   * Add a comment to tickets in all enabled third-party systems
   */
  async addCommentToThirdParty(
    externalIds: { zendesk?: number; jira?: string },
    message: InsertMessage
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    if (this.zendeskService?.isEnabled() && externalIds.zendesk) {
      result.zendesk = await this.zendeskService.addComment(externalIds.zendesk, message);
    }

    if (this.jiraService?.isEnabled() && externalIds.jira) {
      result.jira = await this.jiraService.addComment(externalIds.jira, message);
    }

    return result;
  }

  /**
   * Update ticket status in all enabled third-party systems
   */
  async updateStatusInThirdParty(
    externalIds: { zendesk?: number; jira?: string },
    status: string
  ): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    if (this.zendeskService?.isEnabled() && externalIds.zendesk) {
      result.zendesk = await this.zendeskService.updateTicketStatus(externalIds.zendesk, status);
    }

    if (this.jiraService?.isEnabled() && externalIds.jira) {
      result.jira = await this.jiraService.updateIssueStatus(externalIds.jira, status);
    }

    return result;
  }

  /**
   * Verify connections to all configured third-party systems
   */
  async verifyConnections(): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};

    if (this.zendeskService?.isEnabled()) {
      result.zendesk = await this.zendeskService.verifyConnection();
    }

    if (this.jiraService?.isEnabled()) {
      result.jira = await this.jiraService.verifyConnection();
    }

    return result;
  }
  
  /**
   * Sync existing tickets to all enabled third-party systems
   * @param tickets Array of tickets to synchronize
   * @returns Object mapping ticket IDs to their external reference IDs
   */
  async syncExistingTickets(tickets: any[]): Promise<{
    zendesk: Record<number, { id: number; url: string }>;
    jira: Record<number, { id: string; key: string; url: string }>;
  }> {
    const result: {
      zendesk: Record<number, { id: number; url: string }>;
      jira: Record<number, { id: string; key: string; url: string }>;
    } = {
      zendesk: {},
      jira: {}
    };

    if (this.zendeskService?.isEnabled()) {
      console.log('Syncing tickets to Zendesk...');
      result.zendesk = await this.zendeskService.syncExistingTickets(tickets);
    }

    if (this.jiraService?.isEnabled()) {
      console.log('Syncing tickets to Jira...');
      result.jira = await this.jiraService.syncExistingTickets(tickets);
    }

    return result;
  }
}

// Singleton instance
let integrationService: IntegrationService | null = null;

export function setupIntegrationService(): IntegrationService {
  if (!integrationService) {
    integrationService = new IntegrationService();
  }
  return integrationService;
}

export function getIntegrationService(): IntegrationService {
  if (!integrationService) {
    integrationService = setupIntegrationService();
  }
  return integrationService;
}