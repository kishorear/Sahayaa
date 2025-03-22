import { ZendeskService, ZendeskConfig, setupZendeskService, getZendeskService } from './zendesk';
import { JiraService, JiraConfig, setupJiraService, getJiraService } from './jira';
import { InsertTicket, InsertMessage } from '@shared/schema';

// Interface for any third-party ticket system configuration
export interface IntegrationConfig {
  type: 'zendesk' | 'jira';
  config: ZendeskConfig | JiraConfig;
}

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
    for (const integration of integrations) {
      if (integration.type === 'zendesk' && integration.config) {
        this.zendeskService = setupZendeskService(integration.config as ZendeskConfig);
      } else if (integration.type === 'jira' && integration.config) {
        this.jiraService = setupJiraService(integration.config as JiraConfig);
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