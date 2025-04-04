/**
 * Zendesk Integration Service
 * 
 * Handles integration with Zendesk for ticket synchronization
 */

import * as zendesk from 'node-zendesk';
import { ZendeskConfig } from './integration-service';

/**
 * Create a Zendesk client instance
 */
function createZendeskClient(config: ZendeskConfig): any {
  try {
    return zendesk.createClient({
      username: config.username,
      token: config.apiToken,
      remoteUri: `https://${config.subdomain}.zendesk.com/api/v2`
    });
  } catch (error) {
    console.error('Error creating Zendesk client:', error);
    throw new Error('Failed to create Zendesk client: Invalid configuration');
  }
}

/**
 * Verify Zendesk connection and configuration
 */
export async function verifyZendeskConnection(config: ZendeskConfig): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const client = createZendeskClient(config);
      
      // Try to get current user to verify connection
      client.users.me((err: any, req: any, result: any) => {
        if (err) {
          console.error('Zendesk connection verification failed:', err);
          resolve(false);
          return;
        }
        
        console.log(`Successfully connected to Zendesk as ${result.name} (${result.email})`);
        resolve(true);
      });
    } catch (error) {
      console.error('Zendesk connection verification failed:', error);
      resolve(false);
    }
  });
}

/**
 * Format the ticket description for Zendesk
 */
function formatZendeskDescription(ticket: any): string {
  // Get ticket messages in chronological order
  const messages = [...(ticket.messages || [])].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // Format the message content
  let description = `Support Ticket Information\n\n`;
  description += `ID: ${ticket.id}\n`;
  description += `Created: ${new Date(ticket.createdAt).toISOString()}\n`;
  description += `Status: ${ticket.status}\n`;
  description += `Priority: ${ticket.priority}\n`;
  description += `Category: ${ticket.category || 'Uncategorized'}\n\n`;
  
  if (ticket.metadata) {
    description += `Additional Information\n\n`;
    for (const [key, value] of Object.entries(ticket.metadata)) {
      if (key !== 'jiraIssueKey' && key !== 'zendeskTicketId') {
        description += `${key}: ${value}\n`;
      }
    }
    description += '\n';
  }
  
  if (messages.length > 0) {
    description += `Conversation History\n\n`;
    messages.forEach((message: any) => {
      description += `${message.role} (${new Date(message.createdAt).toLocaleString()})\n`;
      description += `${message.content}\n\n`;
    });
  }
  
  return description;
}

/**
 * Create or update a Zendesk ticket
 */
export async function syncTicketWithZendesk(ticket: any, config: ZendeskConfig): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    try {
      const client = createZendeskClient(config);
      
      // Check if the ticket already has a Zendesk issue
      const zendeskTicketId = ticket.externalIntegrations?.zendesk?.id;
      
      // Format ticket data for Zendesk
      const subject = `[Support] ${ticket.title}`;
      const description = formatZendeskDescription(ticket);
      
      // Create ticket data object for Zendesk
      const ticketData = {
        ticket: {
          subject,
          comment: { body: description },
          priority: mapPriorityToZendesk(ticket.priority),
          tags: ['support_system', ticket.category].filter(Boolean)
        }
      };
      
      // Define the createNewTicket function
      const createNewTicket = () => {
        // Create new ticket
        client.tickets.create(ticketData, (err: any, req: any, result: any) => {
          if (err) {
            console.error('Error creating Zendesk ticket:', err);
            resolve({
              error: err.message || 'Unknown error',
              timestamp: new Date().toISOString()
            });
            return;
          }
          
          // Get the ticket URL
          const ticketUrl = `https://${config.subdomain}.zendesk.com/agent/tickets/${result.id}`;
          
          // Return the ticket information
          resolve({
            id: result.id,
            url: ticketUrl,
            status: result.status,
            subject: result.subject,
            description: result.description,
            created: result.created_at,
            updated: result.updated_at
          });
        });
      };
      
      if (zendeskTicketId) {
        // Update existing ticket
        client.tickets.update(zendeskTicketId, ticketData, (err: any, req: any, result: any) => {
          if (err) {
            console.error(`Error updating Zendesk ticket #${zendeskTicketId}:`, err);
            
            // Check if the ticket doesn't exist
            if (err.statusCode === 404) {
              console.log(`Zendesk ticket #${zendeskTicketId} not found, creating a new one`);
              createNewTicket();
            } else {
              resolve({
                error: err.message || 'Unknown error',
                timestamp: new Date().toISOString()
              });
            }
            return;
          }
          
          // Get the ticket URL
          const ticketUrl = `https://${config.subdomain}.zendesk.com/agent/tickets/${result.id}`;
          
          // Return the ticket information
          resolve({
            id: result.id,
            url: ticketUrl,
            status: result.status,
            subject: result.subject,
            description: result.description,
            created: result.created_at,
            updated: result.updated_at
          });
        });
      } else {
        createNewTicket();
      }
    } catch (error) {
      console.error('Error syncing ticket with Zendesk:', error);
      
      // Return error information
      resolve({
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });
}

/**
 * Map ticket priority to Zendesk priority
 */
function mapPriorityToZendesk(priority: string): string {
  switch (priority?.toLowerCase()) {
    case 'high':
    case 'urgent':
      return 'urgent';
    case 'medium':
      return 'normal';
    case 'low':
      return 'low';
    default:
      return 'normal';
  }
}

/**
 * Test the connection to Zendesk
 * @param config The Zendesk configuration
 * @returns Result with success flag and message
 */
export function testZendeskConnection(config: ZendeskConfig): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    try {
      const client = createZendeskClient(config);
      
      // Try to get current user to verify connection
      client.users.me((err: any, req: any, result: any) => {
        if (err) {
          console.error('Zendesk connection test failed:', err);
          
          // Check for specific errors to provide better error messages
          if (err.statusCode === 401) {
            resolve({
              success: false,
              message: 'Authentication failed. Please check your username and API token.'
            });
          } else if (err.statusCode === 404) {
            resolve({
              success: false,
              message: 'Invalid Zendesk subdomain. Please check your subdomain.'
            });
          } else if (err.code === 'ENOTFOUND') {
            resolve({
              success: false,
              message: 'Could not connect to Zendesk. Please check your subdomain.'
            });
          } else {
            resolve({
              success: false,
              message: `Connection failed: ${err.message || 'Unknown error'}`
            });
          }
          return;
        }
        
        resolve({
          success: true,
          message: `Successfully connected to Zendesk as ${result.name} (${result.email})`
        });
      });
    } catch (error) {
      console.error('Error in Zendesk connection test:', error);
      
      resolve({
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
}