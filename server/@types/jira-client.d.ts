declare module 'jira-client' {
  export interface JiraClientOptions {
    protocol: string;
    host: string;
    username: string;
    password: string;
    apiVersion: string;
    strictSSL: boolean;
  }

  export default class JiraClient {
    constructor(options: JiraClientOptions);
    
    // Add issue methods
    addNewIssue(issueData: any): Promise<{id: string; key: string}>;
    updateIssue(issueKey: string, issueData: any): Promise<any>;
    getProject(projectKey: string): Promise<any>;
    listTransitions(issueKey: string): Promise<{transitions: any[]}>;
    transitionIssue(issueKey: string, transitionData: any): Promise<any>;
    addComment(issueKey: string, comment: string): Promise<any>;
  }
}