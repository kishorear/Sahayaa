import { InsertTicket, InsertMessage } from "@shared/schema";
import axios from "axios";

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey: string;
  enabled: boolean;
}

/**
 * Jira integration service for ticket synchronization
 */
export class JiraService {
  private apiUrl: string;
  private auth: { username: string; password: string };
  private projectKey: string;
  private enabled: boolean;

  constructor(config: JiraConfig) {
    if (!config.baseUrl || !config.email || !config.apiToken || !config.projectKey) {
      console.error("Invalid Jira configuration - missing required fields:", {
        baseUrl: config.baseUrl ? "provided" : "missing",
        email: config.email ? "provided" : "missing",
        apiToken: config.apiToken ? "provided" : "missing",
        projectKey: config.projectKey ? "provided" : "missing"
      });
      throw new Error("Invalid Jira configuration - missing required fields");
    }

    console.log("Initializing Jira Service with config:", {
      baseUrl: config.baseUrl,
      email: config.email,
      apiToken: config.apiToken ? "[REDACTED]" : "missing",
      projectKey: config.projectKey,
      enabled: config.enabled
    });
    
    // Make sure baseUrl doesn't have trailing slash
    const baseUrl = config.baseUrl.endsWith('/') 
      ? config.baseUrl.slice(0, -1) 
      : config.baseUrl;
      
    this.apiUrl = `${baseUrl}/rest/api/3`;
    this.auth = {
      username: config.email,
      password: config.apiToken
    };
    this.projectKey = config.projectKey;
    this.enabled = config.enabled;
    
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
  async createIssue(ticket: InsertTicket): Promise<{ id: string; key: string; url: string } | null> {
    if (!this.enabled) return null;

    try {
      const response = await axios.post(
        `${this.apiUrl}/issue`,
        {
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
                      text: ticket.description
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
        },
        {
          auth: this.auth,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      return {
        id: response.data.id,
        key: response.data.key,
        url: `${this.apiUrl.replace('/rest/api/3', '')}/browse/${response.data.key}`
      };
    } catch (error) {
      console.error("Error creating issue in Jira:", error);
      return null;
    }
  }

  /**
   * Add a comment to a Jira issue
   */
  async addComment(issueKey: string, message: InsertMessage): Promise<boolean> {
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