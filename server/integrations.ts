/**
 * Integration Service Factory
 * 
 * This file provides a factory for getting integration services
 * and maintains compatibility with the existing codebase.
 */

// Import types from the integration service
import { 
  TenantIntegrationSettings, 
  getIntegrationSettingsForTenant
} from './integrations/integration-service';

/**
 * Legacy integration service interface
 * This allows us to maintain compatibility with existing code
 */
interface IntegrationService {
  createTicketInThirdParty: (ticket: any) => Promise<Record<string, any>>;
  updateStatusInThirdParty: (externalTickets: Record<string, any>, status: string) => Promise<boolean>;
  addCommentToThirdParty: (externalTickets: Record<string, any>, message: any) => Promise<boolean>;
}

/**
 * Get the appropriate integration service
 * @returns The integration service
 */
export function getIntegrationService(): IntegrationService {
  // Simple implementation that does nothing but logs
  return {
    /**
     * Create a ticket in third-party systems
     * This is just a stub implementation that logs the request
     */
    createTicketInThirdParty: async (ticket: any): Promise<Record<string, any>> => {
      console.log('Legacy createTicketInThirdParty called - this is now handled by sync routes');
      console.log('Ticket:', ticket.id);
      return {};
    },
    
    /**
     * Update ticket status in third-party systems
     * This is just a stub implementation that logs the request
     */
    updateStatusInThirdParty: async (externalTickets: Record<string, any>, status: string): Promise<boolean> => {
      console.log('Legacy updateStatusInThirdParty called - this is now handled by sync routes');
      console.log('External tickets:', Object.keys(externalTickets).join(', '));
      console.log('New status:', status);
      return true;
    },
    
    /**
     * Add a comment to third-party systems
     * This is just a stub implementation that logs the request
     */
    addCommentToThirdParty: async (externalTickets: Record<string, any>, message: any): Promise<boolean> => {
      console.log('Legacy addCommentToThirdParty called - this is now handled by sync routes');
      console.log('External tickets:', Object.keys(externalTickets).join(', '));
      console.log('Message:', message.content ? message.content.substring(0, 50) + '...' : 'No content');
      return true;
    }
  };
}