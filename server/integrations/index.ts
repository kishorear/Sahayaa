/**
 * Integration Service Module
 * 
 * This module exports the integration service and its related functions.
 */

import { handleTicketCreated, syncTicketWithIntegrations, getIntegrationsStatus } from './integration-service';
import { getJiraService } from './jira-service';
import { getZendeskService } from './zendesk-service';
import { getIntegrationService } from './integration-manager';

export {
  // Main integration functions
  handleTicketCreated,
  syncTicketWithIntegrations,
  getIntegrationsStatus,
  
  // Integration manager
  getIntegrationService,
  
  // Service accessors
  getJiraService,
  getZendeskService
};