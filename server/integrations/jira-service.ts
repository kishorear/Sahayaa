/**
 * Jira Integration Service
 * 
 * Handles integration with Jira for ticket synchronization
 */

import JiraApi from 'jira-client';
import { JiraConfig } from './integration-service';

// Define the correct methods that exist on jira-client
// This matches what's in the actual jira-client library
interface JiraClient {
  // Auth methods
  // For authentication checking - renamed to avoid confusion
  myself(): Promise<any>;
  
  // Project methods
  getProject(projectId: string): Promise<any>;
  
  // Issue methods
  findIssue(issueId: string): Promise<any>;  // Correct name in library
  addNewIssue(issue: any): Promise<any>;
  updateIssue(issueId: string, issueUpdate: any): Promise<any>;
}

// Jira issue fields mapping
interface JiraFields {
  summary: string;
  description: string;
  issuetype: { id: string };
  project: { key: string };
  [key: string]: any;
}

/**
 * Create a Jira client instance
 */
function createJiraClient(config: JiraConfig): JiraClient {
  try {
    // Parse the host URL to extract the protocol and hostname
    const url = new URL(config.host);
    
    // Create the Jira client with the correct type assertion
    return new JiraApi({
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      username: config.username,
      password: config.apiToken,
      apiVersion: '2',
      strictSSL: true
    }) as unknown as JiraClient;
  } catch (error) {
    console.error('Error creating Jira client:', error);
    throw new Error('Failed to create Jira client: Invalid configuration');
  }
}

/**
 * Verify Jira connection and configuration
 */
export async function verifyJiraConnection(config: JiraConfig): Promise<boolean> {
  try {
    const jira = createJiraClient(config);
    
    // Try to get myself to verify connection (custom method name in jira-client)
    const user = await jira.myself();
    
    // Verify project key exists
    const project = await jira.getProject(config.projectKey);
    
    console.log(`Successfully connected to Jira as ${user.displayName}, project ${project.name} found`);
    return true;
  } catch (error) {
    console.error('Jira connection verification failed:', error);
    return false;
  }
}

/**
 * Format the ticket description for Jira
 */
function formatJiraDescription(ticket: any): string {
  // Get ticket messages in chronological order
  const messages = [...(ticket.messages || [])].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  
  // Format the message content
  let description = `h2. Support Ticket Information\n\n`;
  description += `* *ID:* ${ticket.id}\n`;
  description += `* *Created:* ${new Date(ticket.createdAt).toISOString()}\n`;
  description += `* *Status:* ${ticket.status}\n`;
  description += `* *Priority:* ${ticket.priority}\n`;
  description += `* *Category:* ${ticket.category || 'Uncategorized'}\n\n`;
  
  if (ticket.metadata) {
    description += `h2. Additional Information\n\n`;
    for (const [key, value] of Object.entries(ticket.metadata)) {
      if (key !== 'jiraIssueKey' && key !== 'zendeskTicketId') {
        description += `* *${key}:* ${value}\n`;
      }
    }
    description += '\n';
  }
  
  if (messages.length > 0) {
    description += `h2. Conversation History\n\n`;
    messages.forEach((message: any) => {
      description += `h4. ${message.role} (${new Date(message.createdAt).toLocaleString()})\n`;
      description += `${message.content}\n\n`;
    });
  }
  
  return description;
}

/**
 * Create or update a Jira issue for a ticket
 */
export async function syncTicketWithJira(ticket: any, config: JiraConfig): Promise<Record<string, any>> {
  try {
    const jira = createJiraClient(config);
    
    // Check if the ticket already has a Jira issue
    let issueKey = ticket.externalIntegrations?.jira?.key;
    let issueExists = false;
    
    if (issueKey) {
      try {
        // Check if the issue still exists
        await jira.findIssue(issueKey);
        issueExists = true;
      } catch (error) {
        console.warn(`Jira issue ${issueKey} not found, will create a new one`);
        issueExists = false;
      }
    }
    
    // Format ticket data for Jira
    const summary = `[Support] ${ticket.title}`;
    const description = formatJiraDescription(ticket);
    
    // Create fields object for Jira
    const fields: JiraFields = {
      summary,
      description,
      issuetype: { id: '10001' }, // Default to "Task" - can be customized
      project: { key: config.projectKey }
    };
    
    // Add custom fields if defined
    if (ticket.priority) {
      // Map priority to Jira priority if needed
      fields.priority = { name: mapPriorityToJira(ticket.priority) };
    }
    
    // Create/update the issue
    let issue;
    if (issueExists) {
      // Update existing issue
      await jira.updateIssue(issueKey, { fields: { 
        summary, 
        description,
        priority: fields.priority
      }});
      
      // Get the updated issue
      issue = await jira.findIssue(issueKey);
    } else {
      // Create new issue
      issue = await jira.addNewIssue({ fields });
      issueKey = issue.key;
    }
    
    // Get the issue URL
    const issueUrl = `${config.host}/browse/${issueKey}`;
    
    // Return the issue information
    return {
      id: issue.id,
      key: issueKey,
      url: issueUrl,
      status: issue.fields.status.name,
      summary: issue.fields.summary,
      description: issue.fields.description,
      created: issue.fields.created,
      updated: issue.fields.updated
    };
  } catch (error) {
    console.error('Error syncing ticket with Jira:', error);
    
    // Return error information
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Map ticket priority to Jira priority
 */
function mapPriorityToJira(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'high':
    case 'urgent':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return 'Medium';
  }
}

/**
 * Test the connection to Jira
 * @param config The Jira configuration
 * @returns Result with success flag and message
 */
export async function testJiraConnection(config: JiraConfig): Promise<{ success: boolean; message: string }> {
  try {
    const jira = createJiraClient(config);
    
    // Try to get myself to verify connection
    const user = await jira.myself();
    
    // Try to get the project to verify project key
    await jira.getProject(config.projectKey);
    
    return {
      success: true,
      message: `Successfully connected to Jira as ${user.displayName}`
    };
  } catch (error) {
    console.error('Error testing Jira connection:', error);
    
    // Check for specific errors to provide better error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('401')) {
      return {
        success: false,
        message: 'Authentication failed. Please check your username and API token.'
      };
    } else if (errorMessage.includes('404') && errorMessage.includes('project')) {
      return {
        success: false,
        message: `Project key "${config.projectKey}" not found. Please check your project key.`
      };
    } else if (errorMessage.includes('connect')) {
      return {
        success: false,
        message: 'Could not connect to Jira. Please check your host URL.'
      };
    }
    
    return {
      success: false,
      message: `Connection failed: ${errorMessage}`
    };
  }
}