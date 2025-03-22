import { InsertTicket, InsertMessage } from "@shared/schema";
import axios from "axios";

export interface ZendeskConfig {
  subdomain: string;
  email: string;
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
    this.auth = {
      username: `${config.email}/token`,
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
  async createTicket(ticket: InsertTicket): Promise<{ id: number; url: string } | null> {
    if (!this.enabled) return null;

    try {
      const response = await axios.post(
        `${this.apiUrl}/tickets`,
        {
          ticket: {
            subject: ticket.title,
            comment: { body: ticket.description },
            priority: this.mapComplexityToPriority(ticket.complexity),
            tags: [ticket.category],
            custom_fields: [
              { id: 123456789, value: ticket.aiNotes }, // Replace with actual custom field IDs
            ],
          }
        },
        { auth: this.auth }
      );

      return {
        id: response.data.ticket.id,
        url: `https://${this.apiUrl.split('//')[1].split('/')[0]}/agent/tickets/${response.data.ticket.id}`
      };
    } catch (error) {
      console.error("Error creating ticket in Zendesk:", error);
      return null;
    }
  }

  /**
   * Add a comment to a Zendesk ticket
   */
  async addComment(zendeskTicketId: number, message: InsertMessage): Promise<boolean> {
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
   * Verify connection to Zendesk API
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await axios.get(`${this.apiUrl}/users/me`, { auth: this.auth });
      return true;
    } catch (error) {
      console.error("Error verifying Zendesk connection:", error);
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