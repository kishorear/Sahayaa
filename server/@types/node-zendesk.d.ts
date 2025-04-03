declare module 'node-zendesk' {
  export interface ZendeskClientOptions {
    username: string;
    token: string;
    remoteUri: string;
    // Add any other options that the client accepts
  }

  export interface ZendeskClient {
    tickets: {
      create: (ticket: any, callback: (err: Error, req: any, result: any) => void) => void;
      update: (id: string, ticket: any, callback: (err: Error) => void) => void;
    };
    ticketfields: {
      list: (callback: (err: Error) => void) => void;
    };
    // Add other client methods as needed
  }

  export function createClient(options: ZendeskClientOptions): ZendeskClient;
}