import { ZendeskService, ZendeskConfig, setupZendeskService, getZendeskService } from './zendesk';
import { JiraService, JiraConfig, setupJiraService, getJiraService } from './jira';
import { InsertTicket, InsertMessage } from '@shared/schema';
import { integrationSettingsService } from '../integration-settings-service';

// Interface for any third-party ticket system configuration
export type IntegrationConfig = 
  | { type: 'zendesk'; config: ZendeskConfig }
  | { type: 'jira'; config: JiraConfig };

/**
 * Main integration service that manages all third-party integrations per tenant
 */
export class IntegrationService {
  private tenantId: number;
  private zendeskService: ZendeskService | null = null;
  private jiraService: JiraService | null = null;

  constructor(tenantId: number) {
    this.tenantId = tenantId;
    console.log(`IntegrationService: Creating service instance for tenant ${tenantId}`);
  }

  /**
   * Load and setup integrations from database for this tenant
   */
  async setupIntegrationsFromDatabase(): Promise<void> {
    try {
      console.log(`Loading integration configurations for tenant ${this.tenantId} from database`);
      
      const configurations = await integrationSettingsService.loadIntegrationConfigurations(this.tenantId);
      
      if (configurations.length === 0) {
        console.log(`No integration configurations found for tenant ${this.tenantId}`);
        return;
      }
      
      const integrationConfigs: IntegrationConfig[] = [];
      
      for (const config of configurations) {
        if (config.type === 'jira') {
          integrationConfigs.push({
            type: 'jira',
            config: {
              ...config.config,
              enabled: config.config.enabled
            } as JiraConfig
          });
        } else if (config.type === 'zendesk') {
          integrationConfigs.push({
            type: 'zendesk',
            config: {
              ...config.config,
              enabled: config.config.enabled
            } as ZendeskConfig
          });
        }
      }
      
      if (integrationConfigs.length > 0) {
        console.log(`Setting up ${integrationConfigs.length} integration configurations for tenant ${this.tenantId}`);
        this.setupIntegrations(integrationConfigs);
      } else {
        console.log(`No valid integration configurations found for tenant ${this.tenantId}`);
      }
    } catch (error) {
      console.error(`Error loading integration configurations for tenant ${this.tenantId}:`, error);
    }
  }

  /**
   * Save integration settings to database for this tenant
   */
  async saveIntegrationSettings(serviceType: string, configuration: any, isEnabled: boolean = true): Promise<void> {
    try {
      console.log(`Saving ${serviceType} integration settings for tenant ${this.tenantId}`);
      
      await integrationSettingsService.saveIntegrationSettings(this.tenantId, serviceType, configuration, isEnabled);
      
      // Reload integrations after saving
      await this.setupIntegrationsFromDatabase();
      
      console.log(`Successfully saved and reloaded ${serviceType} integration for tenant ${this.tenantId}`);
    } catch (error) {
      console.error(`Error saving ${serviceType} integration settings for tenant ${this.tenantId}:`, error);
      throw error;
    }
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
    let anyServiceEnabled = false;

    // Log what we're trying to do
    console.log(`Creating ticket in third-party systems: "${ticket.title}"`);
    console.log(`Ticket details: category=${ticket.category}, complexity=${ticket.complexity}, assignedTo=${ticket.assignedTo || 'Unassigned'}`);
    
    // Create ticket in Zendesk if enabled
    if (this.zendeskService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Attempting to create ticket in Zendesk: "${ticket.title}"`);
        console.log(`Zendesk is properly configured and enabled`);
        result.zendesk = await this.zendeskService.createTicket(ticket);
        if (result.zendesk) {
          if (!result.zendesk.error) {
            console.log(`Successfully created ticket in Zendesk with ID: ${result.zendesk.id}`);
          } else {
            console.error(`Failed to create ticket in Zendesk: ${result.zendesk.error}`);
          }
        } else {
          console.error(`Failed to create ticket in Zendesk: No result returned`);
        }
      } catch (error) {
        console.error(`Error creating ticket in Zendesk:`, error);
        result.zendesk = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    } else {
      console.log('Zendesk integration not enabled or not properly configured - skipping ticket creation');
    }

    // Create ticket in Jira if enabled
    if (this.jiraService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Attempting to create issue in Jira: "${ticket.title}"`);
        console.log(`Jira is properly configured and enabled`);
        result.jira = await this.jiraService.createIssue(ticket);
        if (result.jira) {
          if (!result.jira.error) {
            console.log(`Successfully created issue in Jira with key: ${result.jira.key}`);
          } else {
            console.error(`Failed to create issue in Jira: ${result.jira.error}`);
          }
        } else {
          console.error(`Failed to create issue in Jira: No result returned`);
        }
      } catch (error) {
        console.error(`Error creating issue in Jira:`, error);
        result.jira = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    } else {
      console.log('Jira integration not enabled or not properly configured - skipping issue creation');
    }
    
    // If no services were enabled, add a warning
    if (!anyServiceEnabled) {
      console.warn('WARNING: No third-party integration services were enabled. Make sure services are properly configured.');
    }

    // Log the overall result
    console.log(`Third-party ticket creation results:`, {
      zendesk: result.zendesk ? (result.zendesk.error ? `error: ${result.zendesk.error}` : 'success') : 'not created',
      jira: result.jira ? (result.jira.error ? `error: ${result.jira.error}` : 'success') : 'not created'
    });

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
    
    console.log(`Adding comment to external ticketing systems for ticket #${message.ticketId}`);
    console.log(`External references: ${JSON.stringify(externalIds)}`);
    
    // Add comment to Zendesk if enabled and we have an external ID
    if (this.zendeskService?.isEnabled() && externalIds.zendesk) {
      try {
        console.log(`Adding comment to Zendesk ticket #${externalIds.zendesk}`);
        result.zendesk = await this.zendeskService.addComment(externalIds.zendesk, message);
        console.log(`Comment ${result.zendesk ? 'successfully added' : 'failed to add'} to Zendesk ticket`);
      } catch (error) {
        console.error(`Error adding comment to Zendesk ticket:`, error);
        result.zendesk = false;
      }
    } else if (this.zendeskService?.isEnabled()) {
      console.log(`Zendesk integration is enabled but no external ID found for ticket #${message.ticketId}`);
    }

    // Add comment to Jira if enabled and we have an external ID
    if (this.jiraService?.isEnabled() && externalIds.jira) {
      try {
        console.log(`Adding comment to Jira issue ${externalIds.jira}`);
        result.jira = await this.jiraService.addComment(externalIds.jira, message);
        console.log(`Comment ${result.jira ? 'successfully added' : 'failed to add'} to Jira issue`);
      } catch (error) {
        console.error(`Error adding comment to Jira issue:`, error);
        result.jira = false;
      }
    } else if (this.jiraService?.isEnabled()) {
      console.log(`Jira integration is enabled but no external ID found for ticket #${message.ticketId}`);
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
    
    console.log(`Updating status to "${status}" in external ticketing systems`);
    console.log(`External references: ${JSON.stringify(externalIds)}`);
    
    // Update Zendesk status if enabled and we have an external ID
    if (this.zendeskService?.isEnabled() && externalIds.zendesk) {
      try {
        console.log(`Updating Zendesk ticket #${externalIds.zendesk} status to "${status}"`);
        result.zendesk = await this.zendeskService.updateTicketStatus(externalIds.zendesk, status);
        console.log(`Status ${result.zendesk ? 'successfully updated' : 'failed to update'} in Zendesk ticket`);
      } catch (error) {
        console.error(`Error updating status in Zendesk ticket:`, error);
        result.zendesk = false;
      }
    } else if (this.zendeskService?.isEnabled()) {
      console.log(`Zendesk integration is enabled but no external ID found to update status`);
    }

    // Update Jira status if enabled and we have an external ID
    if (this.jiraService?.isEnabled() && externalIds.jira) {
      try {
        console.log(`Updating Jira issue ${externalIds.jira} status to "${status}"`);
        result.jira = await this.jiraService.updateIssueStatus(externalIds.jira, status);
        console.log(`Status ${result.jira ? 'successfully updated' : 'failed to update'} in Jira issue`);
      } catch (error) {
        console.error(`Error updating status in Jira issue:`, error);
        result.jira = false;
      }
    } else if (this.jiraService?.isEnabled()) {
      console.log(`Jira integration is enabled but no external ID found to update status`);
    }
    
    return result;
  }

  /**
   * Verify connections to all configured third-party systems
   */
  async verifyConnections(): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    let anyServiceEnabled = false;
    
    console.log(`Verifying connections to third-party ticketing systems...`);
    
    // Verify Zendesk connection if enabled
    if (this.zendeskService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Verifying connection to Zendesk...`);
        result.zendesk = await this.zendeskService.verifyConnection();
        console.log(`Zendesk connection ${result.zendesk ? 'successful' : 'failed'}`);
      } catch (error) {
        console.error(`Error verifying Zendesk connection:`, error);
        result.zendesk = false;
      }
    } else {
      console.log(`Zendesk integration is not enabled - skipping connection verification`);
    }

    // Verify Jira connection if enabled
    if (this.jiraService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Verifying connection to Jira...`);
        result.jira = await this.jiraService.verifyConnection();
        console.log(`Jira connection ${result.jira ? 'successful' : 'failed'}`);
      } catch (error) {
        console.error(`Error verifying Jira connection:`, error);
        result.jira = false;
      }
    } else {
      console.log(`Jira integration is not enabled - skipping connection verification`);
    }
    
    // If no services were enabled, add a warning
    if (!anyServiceEnabled) {
      console.warn('WARNING: No third-party integration services were enabled. Make sure services are properly configured.');
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
    let anyServiceEnabled = false;
    
    console.log(`Syncing ${tickets.length} tickets to third-party systems...`);
    
    // Sync to Zendesk if enabled
    if (this.zendeskService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Syncing ${tickets.length} tickets to Zendesk...`);
        result.zendesk = await this.zendeskService.syncExistingTickets(tickets);
        const syncedCount = Object.keys(result.zendesk).length;
        console.log(`Successfully synced ${syncedCount} tickets to Zendesk`);
      } catch (error) {
        console.error(`Error syncing tickets to Zendesk:`, error);
        result.zendesk = {};
      }
    } else {
      console.log(`Zendesk integration is not enabled - skipping ticket synchronization`);
    }

    // Sync to Jira if enabled
    if (this.jiraService?.isEnabled()) {
      anyServiceEnabled = true;
      try {
        console.log(`Syncing ${tickets.length} tickets to Jira...`);
        result.jira = await this.jiraService.syncExistingTickets(tickets);
        const syncedCount = Object.keys(result.jira).length;
        console.log(`Successfully synced ${syncedCount} tickets to Jira`);
      } catch (error) {
        console.error(`Error syncing tickets to Jira:`, error);
        result.jira = {};
      }
    } else {
      console.log(`Jira integration is not enabled - skipping ticket synchronization`);
    }
    
    // If no services were enabled, add a warning
    if (!anyServiceEnabled) {
      console.warn('WARNING: No third-party integration services were enabled. Make sure services are properly configured.');
    }
    
    return result;
  }
}

// Tenant-specific integration service manager
class IntegrationServiceManager {
  private services: Map<number, IntegrationService> = new Map();

  /**
   * Get or create an integration service for a specific tenant
   */
  getServiceForTenant(tenantId: number): IntegrationService {
    if (!this.services.has(tenantId)) {
      console.log(`Creating new IntegrationService instance for tenant ${tenantId}`);
      const service = new IntegrationService(tenantId);
      this.services.set(tenantId, service);
    }
    return this.services.get(tenantId)!;
  }

  /**
   * Initialize integrations for a tenant (loads from database)
   */
  async initializeIntegrationsForTenant(tenantId: number): Promise<void> {
    const service = this.getServiceForTenant(tenantId);
    await service.setupIntegrationsFromDatabase();
  }

  /**
   * Clear cached service for a tenant (forces reload)
   */
  clearTenantCache(tenantId: number): void {
    this.services.delete(tenantId);
    console.log(`Cleared integration service cache for tenant ${tenantId}`);
  }
}

// Global tenant-specific integration service manager
export const integrationServiceManager = new IntegrationServiceManager();

// Convenience function for backward compatibility
export const getIntegrationService = (tenantId: number) => integrationServiceManager.getServiceForTenant(tenantId);

// Function to initialize integrations for a tenant
export const initializeIntegrationsForTenant = (tenantId: number) => integrationServiceManager.initializeIntegrationsForTenant(tenantId);