/**
 * Integration Service
 * 
 * Central service for managing external integrations
 */

// Jira integration configuration
export interface JiraConfig {
  enabled: boolean;
  host: string;
  username: string; 
  apiToken: string;
  projectKey: string;
}

// Zendesk integration configuration
export interface ZendeskConfig {
  enabled: boolean;
  subdomain: string;
  username: string;
  apiToken: string;
}

// External integrations interface
export interface ExternalIntegrations {
  // Mapping of ticket ID to external system reference
  jira?: {
    id: string;
    key: string;
    url: string;
    status: string;
    created: string;
    updated: string;
  };
  
  zendesk?: {
    id: string;
    url: string;
    status: string;
    created: string;
    updated: string;
  };
}

// Tenant integration settings type
export interface TenantIntegrationSettings {
  jira?: JiraConfig;
  zendesk?: ZendeskConfig;
  // Can be extended for other integrations
}

/**
 * Get integration settings for a tenant
 * 
 * @param tenantId The tenant ID to get integration settings for
 * @returns The tenant's integration settings
 */
export async function getIntegrationSettingsForTenant(tenantId: number): Promise<TenantIntegrationSettings> {
  try {
    // Import database and schema to fetch tenant settings
    const { db } = await import('../db');
    const { tenants } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    // Get the tenant from the database
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId)
    });
    
    // If tenant not found, return empty settings
    if (!tenant) {
      console.warn(`Tenant with ID ${tenantId} not found when fetching integration settings`);
      return {};
    }
    
    // Get the integration settings from the tenant
    // If the settings are not found, return an empty object
    return (tenant.integrationSettings as TenantIntegrationSettings) || {};
  } catch (error) {
    console.error(`Error getting integration settings for tenant ${tenantId}:`, error);
    return {};
  }
}

/**
 * Check if a tenant has a specific integration enabled
 * 
 * @param tenantId The tenant ID to check
 * @param integrationType The integration type to check (jira, zendesk, etc)
 * @returns Whether the integration is enabled
 */
export async function isIntegrationEnabled(
  tenantId: number, 
  integrationType: 'jira' | 'zendesk'
): Promise<boolean> {
  try {
    const settings = await getIntegrationSettingsForTenant(tenantId);
    
    if (integrationType === 'jira') {
      return !!settings.jira?.enabled;
    } else if (integrationType === 'zendesk') {
      return !!settings.zendesk?.enabled;
    }
    
    return false;
  } catch (error) {
    console.error(`Error checking if integration ${integrationType} is enabled for tenant ${tenantId}:`, error);
    return false;
  }
}

/**
 * Handle ticket creation by optionally creating it in external systems
 * 
 * @param ticket The ticket that was created
 * @returns Promise that resolves when all integrations have been processed
 */
export async function handleTicketCreated(ticket: any): Promise<void> {
  try {
    if (!ticket || !ticket.tenantId) {
      console.warn('Cannot handle ticket creation: Invalid ticket or missing tenant ID');
      return;
    }
    
    const tenantId = ticket.tenantId;
    const settings = await getIntegrationSettingsForTenant(tenantId);
    
    // Check if any integrations are enabled
    const jiraEnabled = !!settings.jira?.enabled;
    const zendeskEnabled = !!settings.zendesk?.enabled;
    
    if (!jiraEnabled && !zendeskEnabled) {
      // No integrations enabled, nothing to do
      return;
    }
    
    // Log ticket creation event
    console.log(`Handling ticket creation for ticket #${ticket.id} in tenant ${tenantId}`);
    console.log(`Integrations enabled: Jira (${jiraEnabled}), Zendesk (${zendeskEnabled})`);
    
    // External systems will be handled by the API route that called this function
    // We can add custom logic here if needed before the external systems are called
  } catch (error) {
    console.error('Error handling ticket creation:', error);
  }
}