/**
 * Zendesk Service
 * 
 * Service for interacting with the Zendesk API.
 */

import zendesk from 'node-zendesk';
import { ZendeskConfig } from './integration-service';

class ZendeskService {
  private clients: Map<string, any> = new Map();
  
  /**
   * Get or create a Zendesk client for the given configuration
   */
  private getClient(config: ZendeskConfig): any {
    const cacheKey = `${config.subdomain}:${config.username}`;
    
    if (!this.clients.has(cacheKey)) {
      const client = zendesk.createClient({
        username: config.username,
        token: config.apiToken,
        remoteUri: `https://${config.subdomain}.zendesk.com/api/v2`
      });
      
      this.clients.set(cacheKey, client);
    }
    
    return this.clients.get(cacheKey);
  }
  
  /**
   * Create a new Zendesk ticket
   */
  async createTicket(
    config: ZendeskConfig,
    subject: string,
    description: string,
    ticketType: string
  ): Promise<{ id: string }> {
    return new Promise((resolve, reject) => {
      try {
        const client = this.getClient(config);
        
        // Create ticket data
        const ticketData: any = {
          ticket: {
            subject: subject,
            comment: {
              body: description
            },
            type: this.mapTicketType(ticketType),
            priority: 'normal',
            tags: ['support-system', ticketType]
          }
        };
        
        // Add group if specified in config
        if (config.groupId) {
          ticketData.ticket.group_id = config.groupId;
        }
        
        // Create the ticket
        client.tickets.create(ticketData, (err: Error, req: any, result: any) => {
          if (err) {
            console.error('Error creating Zendesk ticket:', err);
            return reject(new Error(`Failed to create Zendesk ticket: ${err.message}`));
          }
          
          resolve({
            id: result.id.toString()
          });
        });
      } catch (error) {
        console.error('Error creating Zendesk ticket:', error);
        reject(new Error(`Failed to create Zendesk ticket: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
  }
  
  /**
   * Test a Zendesk connection
   */
  async testConnection(config: ZendeskConfig): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const client = this.getClient(config);
        
        // Try to get ticket fields to validate credentials
        client.ticketfields.list((err: Error) => {
          if (err) {
            console.error('Zendesk connection test failed:', err);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        console.error('Zendesk connection test failed:', error);
        resolve(false);
      }
    });
  }
  
  /**
   * Update a Zendesk ticket
   */
  async updateTicket(
    config: ZendeskConfig,
    ticketId: string,
    subject?: string,
    comment?: string,
    status?: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const client = this.getClient(config);
        const updateData: any = {
          ticket: {}
        };
        
        // Add fields that should be updated
        if (subject) {
          updateData.ticket.subject = subject;
        }
        
        if (comment) {
          updateData.ticket.comment = {
            body: comment,
            public: false
          };
        }
        
        if (status) {
          updateData.ticket.status = this.mapTicketStatus(status);
        }
        
        // Update the ticket
        client.tickets.update(ticketId, updateData, (err: Error) => {
          if (err) {
            console.error(`Error updating Zendesk ticket ${ticketId}:`, err);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        console.error(`Error updating Zendesk ticket ${ticketId}:`, error);
        resolve(false);
      }
    });
  }
  
  /**
   * Add a comment to a Zendesk ticket
   */
  async addComment(
    config: ZendeskConfig,
    ticketId: string,
    comment: string,
    isPublic: boolean = false
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const client = this.getClient(config);
        
        const updateData = {
          ticket: {
            comment: {
              body: comment,
              public: isPublic
            }
          }
        };
        
        client.tickets.update(ticketId, updateData, (err: Error) => {
          if (err) {
            console.error(`Error adding comment to Zendesk ticket ${ticketId}:`, err);
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } catch (error) {
        console.error(`Error adding comment to Zendesk ticket ${ticketId}:`, error);
        resolve(false);
      }
    });
  }
  
  /**
   * Map internal ticket type to Zendesk ticket type
   */
  private mapTicketType(internalType: string): string {
    const typeMap: Record<string, string> = {
      'technical_issue': 'problem',
      'billing': 'question',
      'feature_request': 'task',
      'bug': 'incident',
      'inquiry': 'question'
    };
    
    return typeMap[internalType] || 'question';
  }
  
  /**
   * Map internal ticket status to Zendesk ticket status
   */
  private mapTicketStatus(internalStatus: string): string {
    const statusMap: Record<string, string> = {
      'new': 'new',
      'in_progress': 'open',
      'resolved': 'solved',
      'closed': 'closed',
      'pending': 'pending'
    };
    
    return statusMap[internalStatus] || 'open';
  }
}

// Singleton instance
let zendeskService: ZendeskService | null = null;

export function getZendeskService(): ZendeskService {
  if (!zendeskService) {
    zendeskService = new ZendeskService();
  }
  return zendeskService;
}