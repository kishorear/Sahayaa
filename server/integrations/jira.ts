import { InsertTicket, InsertMessage } from "@shared/schema";
import axios from "axios";
import { JiraConfig } from "./integration-service";

// Extended InsertMessage type for integration purposes
interface ExtendedInsertMessage extends InsertMessage {
  senderName?: string;
  tenantId?: number;
}

// Using JiraConfig from integration-service.ts

/**
 * Jira integration service for ticket synchronization
 */
export class JiraService {
  private apiUrl: string;
  private auth: { username: string; password: string };
  private projectKey: string;
  private enabled: boolean;

  constructor(config: JiraConfig) {
    if (!config.host || !config.username || !config.apiToken || !config.projectKey) {
      console.error("Invalid Jira configuration - missing required fields:", {
        host: config.host ? "provided" : "missing",
        username: config.username ? "provided" : "missing",
        apiToken: config.apiToken ? "provided" : "missing",
        projectKey: config.projectKey ? "provided" : "missing"
      });
      throw new Error("Invalid Jira configuration - missing required fields");
    }

    console.log("Initializing Jira Service with config:", {
      host: config.host,
      username: config.username,
      apiToken: config.apiToken ? "[REDACTED]" : "missing",
      projectKey: config.projectKey,
      issueType: config.issueType || 'Task'
    });
    
    // Make sure host doesn't have trailing slash
    const baseUrl = config.host.endsWith('/') 
      ? config.host.slice(0, -1) 
      : config.host;
      
    this.apiUrl = `${baseUrl}/rest/api/3`;
    this.auth = {
      username: config.username,
      password: config.apiToken
    };
    this.projectKey = config.projectKey;
    this.enabled = true; // Always enabled when instantiated
    
    console.log("Jira Service initialized with API URL:", this.apiUrl);
  }

  /**
   * Check if Jira integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Create an issue in Jira from a local ticket
   */
  async createIssue(ticket: InsertTicket): Promise<{ id: string; key: string; url: string; error?: string } | null> {
    if (!this.enabled) {
      console.log('Jira service not enabled, skipping issue creation');
      return null;
    }

    try {
      console.log(`Creating Jira issue for ticket: "${ticket.title}"`);
      console.log(`Using Jira project key: "${this.projectKey}"`);
      
      // Create the issue data
      const issueData = {
        fields: {
          project: {
            key: this.projectKey
          },
          summary: ticket.title,
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: ticket.description || "No description provided."
                  }
                ]
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: `AI Notes: ${ticket.aiNotes || 'None'}`
                  }
                ]
              }
            ]
          },
          issuetype: {
            name: "Task"
          },
          priority: {
            name: this.mapComplexityToPriority(ticket.complexity)
          },
          labels: [ticket.category]
        }
      };
      
      console.log(`Sending API request to Jira at ${this.apiUrl}/issue`);
      console.log('Issue data:', JSON.stringify(issueData, null, 2));
      
      // Make the API request with a timeout
      const response = await axios.post(
        `${this.apiUrl}/issue`,
        issueData,
        {
          auth: this.auth,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log('Jira API response:', response.status, response.statusText);
      
      if (response.data && response.data.key) {
        console.log(`Successfully created Jira issue with key: ${response.data.key}`);
        return {
          id: response.data.id,
          key: response.data.key,
          url: `${this.apiUrl.replace('/rest/api/3', '')}/browse/${response.data.key}`
        };
      } else {
        console.error('Invalid response from Jira API:', response.data);
        return {
          id: '',
          key: '',
          url: '',
          error: 'Invalid response from Jira API'
        };
      }
    } catch (error) {
      console.error("Error creating issue in Jira:", error);
      
      // Extract detailed error information
      let errorMessage = 'Unknown error occurred';
      let errorDetails = {};
      
      if (error.response) {
        // The request was made and the server responded with a status code outside of 2xx
        errorMessage = `Jira API error: ${error.response.status} ${error.response.statusText}`;
        errorDetails = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        };
        
        if (error.response.data && error.response.data.errorMessages) {
          errorMessage += ` - ${error.response.data.errorMessages.join(', ')}`;
        } else if (error.response.data && error.response.data.errors) {
          errorMessage += ` - ${JSON.stringify(error.response.data.errors)}`;
        }
        
        console.error('Jira API error details:', errorDetails);
      } else if (error.request) {
        // The request was made but no response was received
        errorMessage = 'No response received from Jira API';
        console.error('No response received from Jira API:', error.request);
      } else {
        // Something happened in setting up the request
        errorMessage = `Error setting up request: ${error.message}`;
        console.error('Error setting up Jira API request:', error.message);
      }
      
      return {
        id: '',
        key: '',
        url: '',
        error: errorMessage
      };
    }
  }

  /**
   * Add a comment to a Jira issue
   */
  async addComment(issueKey: string, message: ExtendedInsertMessage): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      await axios.post(
        `${this.apiUrl}/issue/${issueKey}/comment`,
        {
          body: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: `${message.sender === 'user' ? 'Customer: ' : 'Support: '}${message.content}`
                  }
                ]
              }
            ]
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
      return true;
    } catch (error) {
      console.error("Error adding comment to Jira issue:", error);
      return false;
    }
  }

  /**
   * Update an issue status in Jira
   * Note: Jira workflow transitions are complex and may need customization based on your workflow
   */
  async updateIssueStatus(issueKey: string, status: string): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      // Get available transitions for this issue
      const transitionsResponse = await axios.get(
        `${this.apiUrl}/issue/${issueKey}/transitions`,
        {
          auth: this.auth,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      // Find transition that matches our status
      const transition = transitionsResponse.data.transitions.find(
        (t: any) => t.to.name.toLowerCase().includes(this.mapStatusToJira(status).toLowerCase())
      );

      if (!transition) {
        console.error(`No transition found for status: ${status}`);
        return false;
      }

      // Perform transition
      await axios.post(
        `${this.apiUrl}/issue/${issueKey}/transitions`,
        {
          transition: {
            id: transition.id
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

      return true;
    } catch (error) {
      console.error("Error updating issue status in Jira:", error);
      return false;
    }
  }

  /**
   * Sync existing tickets to Jira
   * @param tickets Array of tickets to synchronize with Jira
   * @returns Object mapping ticket IDs to their Jira keys
   */
  async syncExistingTickets(tickets: any[]): Promise<Record<number, { id: string; key: string; url: string }>> {
    if (!this.enabled) return {};

    const results: Record<number, { id: string; key: string; url: string }> = {};

    console.log(`Starting sync of ${tickets.length} tickets to Jira...`);

    // Process tickets in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < tickets.length; i += batchSize) {
      const batch = tickets.slice(i, i + batchSize);
      
      // Process each ticket in the batch
      const batchPromises = batch.map(async (ticket) => {
        try {
          // Skip tickets that already have a Jira ID
          if (ticket.externalIntegrations?.jira) {
            console.log(`Ticket #${ticket.id} already synced to Jira (${ticket.externalIntegrations.jira})`);
            results[ticket.id] = {
              id: "",
              key: ticket.externalIntegrations.jira,
              url: `${this.apiUrl.replace('/rest/api/3', '')}/browse/${ticket.externalIntegrations.jira}`
            };
            return;
          }

          // Create new issue in Jira
          console.log(`Creating Jira issue for ticket #${ticket.id}: ${ticket.title}`);
          const jiraIssue = await this.createIssue({
            title: ticket.title,
            description: ticket.description,
            category: ticket.category,
            complexity: ticket.complexity,
            assignedTo: ticket.assignedTo,
            aiNotes: ticket.aiNotes,
            tenantId: ticket.tenantId
          });

          if (jiraIssue) {
            if (!jiraIssue.error) {
              console.log(`Created Jira issue ${jiraIssue.key} for ticket #${ticket.id}`);
              results[ticket.id] = jiraIssue;

              // Sync messages if available and issue was created successfully (no error)
              if (ticket.messages && ticket.messages.length > 0) {
                console.log(`Syncing ${ticket.messages.length} messages for ticket #${ticket.id}`);
                for (const message of ticket.messages) {
                  await this.addComment(jiraIssue.key, {
                    content: message.content,
                    sender: message.sender,
                    senderName: message.senderName || message.sender,
                    ticketId: ticket.id,
                    tenantId: ticket.tenantId
                  });
                }
              }
            } else {
              console.error(`Failed to create Jira issue for ticket #${ticket.id}: ${jiraIssue.error}`);
            }
          }
        } catch (error) {
          console.error(`Error syncing ticket #${ticket.id} to Jira:`, error);
        }
      });

      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < tickets.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Completed sync of ${Object.keys(results).length} tickets to Jira`);
    return results;
  }

  /**
   * Verify connection to Jira API
   */
  async verifyConnection(): Promise<boolean> {
    try {
      console.log(`Attempting to verify Jira connection to: ${this.apiUrl}/myself`);
      console.log(`Using credentials: ${this.auth.username}, token: [REDACTED]`);
      
      // First validate that we have all required fields
      if (!this.apiUrl || !this.auth.username || !this.auth.password || !this.projectKey) {
        console.error("Missing required Jira configuration:", {
          apiUrl: !!this.apiUrl,
          username: !!this.auth.username,
          password: !!this.auth.password,
          projectKey: !!this.projectKey
        });
        return false;
      }
      
      // Use basic authentication with the API token
      const response = await axios.get(`${this.apiUrl}/myself`, {
        auth: this.auth,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000 // 10 second timeout for connection issues
      });
      
      // Verify we got a successful response with user data
      if (response.status === 200 && response.data) {
        console.log("Jira connection successful, authenticated as:", {
          displayName: response.data.displayName || 'Unknown',
          accountId: response.data.accountId || 'Unknown',
          emailAddress: response.data.emailAddress || 'Unknown'
        });
        
        // Now verify we can access the project
        try {
          const projectResponse = await axios.get(`${this.apiUrl}/project/${this.projectKey}`, {
            auth: this.auth,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          console.log(`Project ${this.projectKey} exists and is accessible:`, {
            name: projectResponse.data.name || 'Unknown',
            key: projectResponse.data.key || 'Unknown'
          });
          
          return true;
        } catch (projectError) {
          console.error(`Error accessing project ${this.projectKey}:`, 
            projectError.response?.status || projectError.message);
          console.error("Make sure the project key is correct and the user has access to it");
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error verifying Jira connection:", error.message);
      
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
          console.error("The URL is invalid or the resource doesn't exist. Check your base URL.");
        } else if (error.response.status === 403) {
          console.error("Permission denied. Your API token may not have the necessary permissions.");
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received from server. Check your network connection and Jira base URL.");
      } else {
        // Something happened in setting up the request
        console.error("Error setting up request:", error.message);
      }
      
      return false;
    }
  }

  /**
   * Map internal ticket complexity to Jira priority
   */
  private mapComplexityToPriority(complexity: string): string {
    switch (complexity) {
      case "simple": return "Low";
      case "medium": return "Medium";
      case "complex": return "High";
      default: return "Medium";
    }
  }

  /**
   * Map internal status to Jira status
   * Note: Jira statuses are highly customizable, so this may need adjustment
   */
  private mapStatusToJira(status: string): string {
    switch (status) {
      case "open": return "To Do";
      case "in_progress": return "In Progress";
      case "resolved": return "Done";
      case "closed": return "Done";
      default: return "To Do";
    }
  }
}

// Singleton pattern for accessing the Jira service
let jiraService: JiraService | null = null;

export function setupJiraService(config: JiraConfig): JiraService {
  jiraService = new JiraService(config);
  return jiraService;
}

export function getJiraService(): JiraService | null {
  return jiraService;
}