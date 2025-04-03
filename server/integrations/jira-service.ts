/**
 * Jira Service
 * 
 * Service for interacting with the Jira API.
 */

import JiraClient from 'jira-client';
import { JiraConfig } from './integration-service';

class JiraService {
  private clients: Map<string, JiraClient> = new Map();
  
  /**
   * Get or create a Jira client for the given configuration
   */
  private getClient(config: JiraConfig): JiraClient {
    const cacheKey = `${config.host}:${config.username}`;
    
    if (!this.clients.has(cacheKey)) {
      const client = new JiraClient({
        protocol: 'https',
        host: config.host.replace(/^https?:\/\//, ''), // Remove protocol if present
        username: config.username,
        password: config.apiToken,
        apiVersion: '2',
        strictSSL: true
      });
      
      this.clients.set(cacheKey, client);
    }
    
    return this.clients.get(cacheKey)!;
  }
  
  /**
   * Create a new Jira issue
   */
  async createIssue(
    config: JiraConfig, 
    summary: string, 
    description: string,
    issueCategory: string
  ): Promise<{ id: string; key: string }> {
    try {
      const client = this.getClient(config);
      
      // Map support ticket category to Jira component or label if needed
      const labels = [issueCategory, 'support-ticket'];
      
      // Create issue data
      const issueData = {
        fields: {
          project: {
            key: config.projectKey
          },
          summary: summary,
          description: description,
          issuetype: {
            name: config.issueType || 'Task'
          },
          labels: labels
        }
      };
      
      // Add custom fields or additional properties if needed
      
      // Create the issue
      const issue = await client.addNewIssue(issueData);
      
      return {
        id: issue.id,
        key: issue.key
      };
    } catch (error) {
      console.error('Error creating Jira issue:', error);
      throw new Error(`Failed to create Jira issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Test a Jira connection
   */
  async testConnection(config: JiraConfig): Promise<boolean> {
    try {
      const client = this.getClient(config);
      
      // Try to get the project to validate credentials and project existence
      await client.getProject(config.projectKey);
      
      return true;
    } catch (error) {
      console.error('Jira connection test failed:', error);
      return false;
    }
  }
  
  /**
   * Update a Jira issue
   */
  async updateIssue(
    config: JiraConfig,
    issueKey: string,
    summary?: string,
    description?: string,
    status?: string
  ): Promise<boolean> {
    try {
      const client = this.getClient(config);
      const updateData: any = {
        fields: {}
      };
      
      // Add fields that should be updated
      if (summary) {
        updateData.fields.summary = summary;
      }
      
      if (description) {
        updateData.fields.description = description;
      }
      
      // Update the issue
      await client.updateIssue(issueKey, updateData);
      
      // If status change is requested, transition the issue
      if (status) {
        const transitions = await client.listTransitions(issueKey);
        const transition = transitions.transitions.find(
          (t: any) => t.name.toLowerCase() === status.toLowerCase()
        );
        
        if (transition) {
          await client.transitionIssue(issueKey, {
            transition: { id: transition.id }
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating Jira issue ${issueKey}:`, error);
      return false;
    }
  }
  
  /**
   * Add a comment to a Jira issue
   */
  async addComment(
    config: JiraConfig,
    issueKey: string,
    comment: string
  ): Promise<boolean> {
    try {
      const client = this.getClient(config);
      
      await client.addComment(issueKey, comment);
      
      return true;
    } catch (error) {
      console.error(`Error adding comment to Jira issue ${issueKey}:`, error);
      return false;
    }
  }
  
  /**
   * Update status of a Jira issue
   */
  async updateStatus(
    config: JiraConfig,
    issueKey: string,
    status: string
  ): Promise<boolean> {
    try {
      const client = this.getClient(config);
      
      // Map internal status to Jira workflow status
      const statusMap: Record<string, string> = {
        'new': 'To Do',
        'in_progress': 'In Progress',
        'resolved': 'Done',
        'closed': 'Done',
        'pending': 'In Progress'
      };
      
      // Get the Jira status name from the map or use as-is
      const jiraStatus = statusMap[status] || status;
      
      // Get available transitions
      const transitions = await client.listTransitions(issueKey);
      
      // Find transition that matches or is similar to the status
      const transition = transitions.transitions.find(
        (t: any) => t.name.toLowerCase() === jiraStatus.toLowerCase() ||
                    t.name.toLowerCase().includes(jiraStatus.toLowerCase())
      );
      
      if (transition) {
        await client.transitionIssue(issueKey, {
          transition: { id: transition.id }
        });
        return true;
      } else {
        console.warn(`No matching transition found for status ${jiraStatus} in issue ${issueKey}`);
        return false;
      }
    } catch (error) {
      console.error(`Error updating status of Jira issue ${issueKey}:`, error);
      return false;
    }
  }
}

// Singleton instance
let jiraService: JiraService | null = null;

export function getJiraService(): JiraService {
  if (!jiraService) {
    jiraService = new JiraService();
  }
  return jiraService;
}