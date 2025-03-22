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
    this.apiUrl = `${config.baseUrl}/rest/api/3`;
    this.auth = {
      username: config.email,
      password: config.apiToken
    };
    this.projectKey = config.projectKey;
    this.enabled = config.enabled;
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
      await axios.get(`${this.apiUrl}/myself`, {
        auth: this.auth,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      return true;
    } catch (error) {
      console.error("Error verifying Jira connection:", error);
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