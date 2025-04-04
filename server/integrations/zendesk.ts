import { InsertTicket, InsertMessage } from "@shared/schema";
import axios from "axios";

// Extended InsertMessage type for integration purposes
interface ExtendedInsertMessage extends InsertMessage {
  senderName?: string;
  tenantId?: number;
}

export interface ZendeskConfig {
  subdomain: string;
  email: string;     // Used in forms and UI
  username: string;  // Used in the API client, maps to email
  apiToken: string;
  enabled: boolean;
}

/**
 * Zendesk integration service for ticket synchronization
 */
export class ZendeskService {
  private apiUrl: string;
  private auth: { username: string; password: string };
  private enabled: boolean;

  constructor(config: ZendeskConfig) {
    this.apiUrl = `https://${config.subdomain}.zendesk.com/api/v2`;
    // Handle both username and email fields for backwards compatibility
    const username = config.username || config.email; 
    this.auth = {
      username: `${username}/token`,
      password: config.apiToken
    };
    this.enabled = config.enabled;
  }

  /**
   * Check if Zendesk integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Create a ticket in Zendesk from the local system
   */
  async createTicket(ticket: InsertTicket): Promise<{ id: number; url: string; error?: string } | null> {
    if (!this.enabled) {
      console.log('Zendesk service not enabled, skipping ticket creation');
      return null;
    }

    try {
      console.log(`Creating Zendesk ticket for ticket: "${ticket.title}"`);
      
      // Create the ticket data
      const ticketData = {
        ticket: {
          subject: ticket.title,
          comment: { 
            body: ticket.description || "No description provided." 
          },
          priority: this.mapComplexityToPriority(ticket.complexity),
          tags: [ticket.category],
          custom_fields: [
            // Replace with actual custom field IDs or remove if not needed
            { id: 123456789, value: ticket.aiNotes }, 
          ],
        }
      };
      
      console.log(`Sending API request to Zendesk at ${this.apiUrl}/tickets`);
      console.log('Ticket data:', JSON.stringify(ticketData, null, 2));
      
      // Make the API request with a timeout
      const response = await axios.post(
        `${this.apiUrl}/tickets`,
        ticketData,
        { 
          auth: this.auth,
          timeout: 10000 // 10 second timeout 
        }
      );
      
      console.log('Zendesk API response:', response.status, response.statusText);
      
      if (response.data && response.data.ticket && response.data.ticket.id) {
        console.log(`Successfully created Zendesk ticket with ID: ${response.data.ticket.id}`);
        return {
          id: response.data.ticket.id,
          url: `https://${this.apiUrl.split('//')[1].split('/')[0]}/agent/tickets/${response.data.ticket.id}`
        };
      } else {
        console.error('Invalid response from Zendesk API:', response.data);
        return {
          id: 0,
          url: '',
          error: 'Invalid response from Zendesk API'
        };
      }
    } catch (error) {
      console.error("Error creating ticket in Zendesk:", error);
      
      // Extract detailed error information
      let errorMessage = 'Unknown error occurred';
      let errorDetails = {};
      
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx
        errorMessage = `Zendesk API error: ${error.response.status} ${error.response.statusText}`;
        errorDetails = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        };
        
        if (error.response.data && error.response.data.error) {
          errorMessage += ` - ${error.response.data.error}`;
        } else if (error.response.data && error.response.data.details) {
          errorMessage += ` - ${JSON.stringify(error.response.data.details)}`;
        }
        
        console.error('Zendesk API error details:', errorDetails);
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response received from Zendesk API';
        console.error('No response received from Zendesk API:', error.request);
      } else {
        // Something happened in setting up the request
        errorMessage = `Error setting up request: ${error.message}`;
        console.error('Error setting up Zendesk API request:', error.message);
      }
      
      return {
        id: 0,
        url: '',
        error: errorMessage
      };
    }
  }

  /**
   * Add a comment to a Zendesk ticket
   */
  async addComment(zendeskTicketId: number, message: ExtendedInsertMessage): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      await axios.put(
        `${this.apiUrl}/tickets/${zendeskTicketId}`,
        {
          ticket: {
            comment: {
              body: message.content,
              public: message.sender === "user", // Staff messages can be internal notes
            }
          }
        },
        { auth: this.auth }
      );
      return true;
    } catch (error) {
      console.error("Error adding comment to Zendesk ticket:", error);
      return false;
    }
  }

  /**
   * Update a ticket status in Zendesk
   */
  async updateTicketStatus(zendeskTicketId: number, status: string): Promise<boolean> {
    if (!this.enabled) return false;

    const zendeskStatus = this.mapStatusToZendesk(status);
    
    try {
      await axios.put(
        `${this.apiUrl}/tickets/${zendeskTicketId}`,
        {
          ticket: {
            status: zendeskStatus,
          }
        },
        { auth: this.auth }
      );
      return true;
    } catch (error) {
      console.error("Error updating ticket status in Zendesk:", error);
      return false;
    }
  }

  /**
   * Sync existing tickets to Zendesk
   * @param tickets Array of tickets to synchronize with Zendesk
   * @returns Object mapping ticket IDs to their Zendesk IDs
   */
  async syncExistingTickets(tickets: any[]): Promise<Record<number, { id: number; url: string }>> {
    if (!this.enabled) return {};

    const results: Record<number, { id: number; url: string }> = {};

    console.log(`Starting sync of ${tickets.length} tickets to Zendesk...`);

    // Process tickets in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < tickets.length; i += batchSize) {
      const batch = tickets.slice(i, i + batchSize);
      
      // Process each ticket in the batch
      const batchPromises = batch.map(async (ticket) => {
        try {
          // Skip tickets that already have a Zendesk ID
          if (ticket.externalIntegrations?.zendesk) {
            console.log(`Ticket #${ticket.id} already synced to Zendesk (ID: ${ticket.externalIntegrations.zendesk})`);
            results[ticket.id] = {
              id: ticket.externalIntegrations.zendesk,
              url: `https://${this.apiUrl.split('//')[1].split('/')[0]}/agent/tickets/${ticket.externalIntegrations.zendesk}`
            };
            return;
          }

          // Create new ticket in Zendesk
          console.log(`Creating Zendesk ticket for ticket #${ticket.id}: ${ticket.title}`);
          const zendeskTicket = await this.createTicket({
            title: ticket.title,
            description: ticket.description,
            category: ticket.category,
            complexity: ticket.complexity,
            assignedTo: ticket.assignedTo,
            aiNotes: ticket.aiNotes,
            tenantId: ticket.tenantId
          });

          if (zendeskTicket) {
            if (!zendeskTicket.error) {
              console.log(`Created Zendesk ticket ID ${zendeskTicket.id} for ticket #${ticket.id}`);
              results[ticket.id] = zendeskTicket;
            } else {
              console.error(`Failed to create Zendesk ticket for ticket #${ticket.id}: ${zendeskTicket.error}`);
            }

            // Sync messages if available and ticket was created successfully (no error)
            if (!zendeskTicket.error && ticket.messages && ticket.messages.length > 0) {
              console.log(`Syncing ${ticket.messages.length} messages for ticket #${ticket.id}`);
              for (const message of ticket.messages) {
                await this.addComment(zendeskTicket.id, {
                  content: message.content,
                  sender: message.sender,
                  senderName: message.senderName || message.sender,
                  ticketId: ticket.id,
                  tenantId: ticket.tenantId
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error syncing ticket #${ticket.id} to Zendesk:`, error);
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < tickets.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Completed sync of ${Object.keys(results).length} tickets to Zendesk`);
    return results;
  }

  /**
   * Verify connection to Zendesk API
   */
  async verifyConnection(): Promise<boolean> {
    try {
      console.log(`Attempting to verify Zendesk connection to: ${this.apiUrl}/users/me`);
      console.log(`Using credentials: ${this.auth.username}, token: [REDACTED]`);
      
      // First validate that we have all required fields
      if (!this.apiUrl || !this.auth.username || !this.auth.password) {
        console.error("Missing required Zendesk configuration:", {
          apiUrl: !!this.apiUrl,
          email: !!this.auth.username,
          apiToken: !!this.auth.password
        });
        return false;
      }
      
      // Make the request with a timeout
      const response = await axios.get(`${this.apiUrl}/users/me`, { 
        auth: this.auth,
        timeout: 10000 // 10 second timeout for connection issues
      });
      
      // Verify we got a successful response with user data
      if (response.status === 200 && response.data && response.data.user) {
        console.log("Zendesk connection successful, authenticated as:", {
          name: response.data.user.name || 'Unknown',
          email: response.data.user.email || 'Unknown',
          role: response.data.user.role || 'Unknown'
        });
        return true;
      }
      
      console.error("Unexpected response format from Zendesk API:", response.data);
      return false;
    } catch (error) {
      console.error("Error verifying Zendesk connection:", error.message);
      
      // Handle different error types for better debugging
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx
        console.error("Response error details:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        // Provide more specific error messages based on status code
        if (error.response.status === 401) {
          console.error("Authentication failed. Please check your email and API token.");
        } else if (error.response.status === 404) {
          console.error("The URL is invalid or the resource doesn't exist. Check your subdomain.");
        } else if (error.response.status === 403) {
          console.error("Permission denied. Your API token may not have the necessary permissions.");
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received from server. Check your network connection and Zendesk subdomain.");
      } else {
        // Something happened in setting up the request
        console.error("Error setting up request:", error.message);
      }
      
      return false;
    }
  }

  /**
   * Map internal ticket complexity to Zendesk priority
   */
  private mapComplexityToPriority(complexity: string): string {
    switch (complexity) {
      case "simple": return "low";
      case "medium": return "normal";
      case "complex": return "high";
      default: return "normal";
    }
  }

  /**
   * Map internal status to Zendesk status
   */
  private mapStatusToZendesk(status: string): string {
    switch (status) {
      case "open": return "new";
      case "in_progress": return "open";
      case "resolved": return "solved";
      case "closed": return "closed";
      default: return "open";
    }
  }
}

// Singleton pattern for accessing the Zendesk service
let zendeskService: ZendeskService | null = null;

export function setupZendeskService(config: ZendeskConfig): ZendeskService {
  zendeskService = new ZendeskService(config);
  return zendeskService;
}

export function getZendeskService(): ZendeskService | null {
  return zendeskService;
}