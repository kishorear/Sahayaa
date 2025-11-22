import { InsertTicket, InsertMessage } from "@shared/schema";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

// Extended InsertMessage type for integration purposes
interface ExtendedInsertMessage extends InsertMessage {
  senderName?: string;
  tenantId?: number;
}

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
          priority: this.mapComplexityToPriority(ticket.complexity || 'medium'),
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
    } catch (error: any) {
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
    } catch (error: any) {
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

            // Sync attachments if available and ticket was created successfully (no error)
            if (!zendeskTicket.error && ticket.attachments && ticket.attachments.length > 0) {
              console.log(`Syncing ${ticket.attachments.length} attachments for ticket #${ticket.id}`);
              const attachmentPaths = ticket.attachments.map((attachment: any) => ({
                filePath: attachment.filePath || `/tmp/${attachment.filename}`, // Path to stored file
                filename: attachment.filename
              }));
              const uploadedCount = await this.addMultipleAttachments(zendeskTicket.id, attachmentPaths);
              console.log(`Successfully uploaded ${uploadedCount}/${ticket.attachments.length} attachments to Zendesk ticket ${zendeskTicket.id}`);
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
    } catch (error: any) {
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
   * Add attachment to a Zendesk ticket
   * @param ticketId The Zendesk ticket ID
   * @param filePath Full path to the file to attach
   * @param filename Original filename (optional)
   * @returns Promise<boolean> true if successful
   */
  async addAttachment(ticketId: number, filePath: string, filename?: string): Promise<boolean> {
    if (!this.enabled) {
      console.log('Zendesk service not enabled, skipping attachment upload');
      return false;
    }

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return false;
      }

      console.log(`Adding attachment to Zendesk ticket ${ticketId}: ${filePath}`);
      
      // First, upload the file to get an upload token
      const uploadToken = await this.uploadFile(filePath, filename);
      if (!uploadToken) {
        console.error('Failed to get upload token from Zendesk');
        return false;
      }

      // Then attach the file to the ticket using the upload token
      const response = await axios.put(
        `${this.apiUrl}/tickets/${ticketId}`,
        {
          ticket: {
            comment: {
              body: `Attachment: ${filename || path.basename(filePath)}`,
              uploads: [uploadToken]
            }
          }
        },
        {
          auth: this.auth,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        console.log(`Successfully uploaded attachment to Zendesk ticket ${ticketId}:`, filename || path.basename(filePath));
        return true;
      } else {
        console.error('Unexpected response from Zendesk attachment upload:', response.data);
        return false;
      }
    } catch (error: any) {
      console.error(`Error adding attachment to Zendesk ticket ${ticketId}:`, error);
      if (error.response) {
        console.error('Zendesk attachment upload error details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
      return false;
    }
  }

  /**
   * Upload file to Zendesk and get upload token
   * @param filePath Path to the file
   * @param filename Original filename
   * @returns Promise<string | null> Upload token or null if failed
   */
  private async uploadFile(filePath: string, filename?: string): Promise<string | null> {
    try {
      const form = new FormData();
      const fileStream = fs.createReadStream(filePath);
      const attachmentName = filename || path.basename(filePath);
      
      form.append('file', fileStream, {
        filename: attachmentName,
        contentType: this.getMimeType(filePath)
      });

      const response = await axios.post(
        `${this.apiUrl}/uploads?filename=${encodeURIComponent(attachmentName)}`,
        form,
        {
          auth: this.auth,
          headers: {
            ...form.getHeaders(),
            'Accept': 'application/json'
          }
        }
      );

      if (response.data && response.data.upload && response.data.upload.token) {
        return response.data.upload.token;
      } else {
        console.error('Invalid upload response from Zendesk:', response.data);
        return null;
      }
    } catch (error: any) {
      console.error('Error uploading file to Zendesk:', error);
      return null;
    }
  }

  /**
   * Add multiple attachments to a Zendesk ticket
   * @param ticketId The Zendesk ticket ID
   * @param attachments Array of {filePath, filename} objects
   * @returns Promise<number> Number of successfully uploaded attachments
   */
  async addMultipleAttachments(ticketId: number, attachments: Array<{filePath: string, filename?: string}>): Promise<number> {
    if (!this.enabled) return 0;

    let successCount = 0;
    console.log(`Adding ${attachments.length} attachments to Zendesk ticket ${ticketId}`);

    // Upload all files first to get tokens
    const uploadTokens: string[] = [];
    for (const attachment of attachments) {
      const token = await this.uploadFile(attachment.filePath, attachment.filename);
      if (token) {
        uploadTokens.push(token);
        successCount++;
      }
      
      // Small delay between uploads to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // If we have tokens, attach them all in one comment
    if (uploadTokens.length > 0) {
      try {
        await axios.put(
          `${this.apiUrl}/tickets/${ticketId}`,
          {
            ticket: {
              comment: {
                body: `${uploadTokens.length} attachment(s) uploaded`,
                uploads: uploadTokens
              }
            }
          },
          {
            auth: this.auth,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );
      } catch (error) {
        console.error('Error attaching files to Zendesk ticket:', error);
        successCount = 0; // Reset success count if final attachment failed
      }
    }

    console.log(`Successfully uploaded ${successCount}/${attachments.length} attachments to Zendesk ticket ${ticketId}`);
    return successCount;
  }

  /**
   * Get MIME type for file extension
   * @param filePath Path to the file
   * @returns MIME type string
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.csv': 'text/csv',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
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