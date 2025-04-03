import { Express, Request, Response } from "express";
import { z } from "zod";
import { 
  getIntegrationService,
  getIntegrationsStatus
} from "../integrations";

// Define a temporary IntegrationConfig type for this file
type IntegrationConfig = {
  type: 'jira' | 'zendesk';
  config: any;
};
import { 
  ZendeskConfig,
  ZendeskService
} from "../integrations/zendesk";
import { 
  JiraService
} from "../integrations/jira";
import { JiraConfig } from "../integrations/integration-service";

// Validation schemas for integration configurations
const zendeskConfigSchema = z.object({
  subdomain: z.string().min(1, "Subdomain is required"),
  email: z.string().email("A valid email is required"),
  apiToken: z.string().min(1, "API token is required"),
  enabled: z.boolean().default(true)
});

// Improve Jira schema with better error messages and stricter validation
// This is the schema for the form data received from the frontend
// After validation, we'll map it to the JiraConfig format needed by the service
const jiraFormSchema = z.object({
  baseUrl: z.string()
    .url("Base URL must be a valid URL (e.g., https://yourcompany.atlassian.net)")
    .min(1, "Base URL is required"),
  email: z.string()
    .email("A valid email address is required")
    .min(1, "Email is required"),
  apiToken: z.string()
    .min(1, "API token is required")
    .refine(val => val.length > 5, "API token is too short - please provide a valid token"),
  projectKey: z.string()
    .min(1, "Project key is required")
    .regex(/^[A-Z][A-Z0-9_]+$/, "Project key must be in uppercase and contain only letters, numbers and underscores"),
  enabled: z.boolean().default(true)
});

const integrationTypeSchema = z.enum(['zendesk', 'jira']);

export function registerIntegrationRoutes(app: Express, requireAuth: any) {
  // Special debug endpoint to validate request body handling
  app.post('/api/integrations/debug', requireAuth, (req: Request, res: Response) => {
    console.log('Integration debug endpoint hit with:', {
      method: req.method,
      url: req.url,
      headers: {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length'],
      },
      bodyType: typeof req.body,
      body: req.body ? {
        ...req.body,
        apiToken: req.body.apiToken ? '[REDACTED]' : undefined
      } : null,
      rawBody: (req as any).rawBody ? '[available]' : '[not available]'
    });
    
    if (!(req as any).rawBody && req.headers['content-type']?.includes('application/json')) {
      console.warn('Raw body not captured for JSON request - verify express.json middleware setup');
    }
    
    return res.status(200).json({
      success: true,
      received: {
        contentType: req.headers['content-type'],
        bodyKeys: req.body ? Object.keys(req.body) : [],
        bodySize: req.body ? JSON.stringify(req.body).length : 0,
      }
    });
  });
  // In-memory integrations storage for this example (would be database in production)
  let integrationSettings = {
    zendesk: {
      enabled: false,
      subdomain: '',
      email: '',
      apiToken: '', 
      maskedToken: '********'
    },
    jira: {
      enabled: false,
      baseUrl: '',
      email: '',
      apiToken: '',
      maskedToken: '********',
      projectKey: ''
    }
  };
  
  // Initialize the integration service with any saved settings on startup
  try {
    const integrationService = getIntegrationService();
    // Initialize the integrations if needed in the future
    
    console.log('Integration service initialized');
  } catch (error) {
    console.error('Error initializing integration services:', error);
  }
  
  // Get all integration configurations
  app.get('/api/integrations', requireAuth, (req: Request, res: Response) => {
    try {
      // Return the settings with masked API tokens
      res.status(200).json({
        zendesk: {
          enabled: integrationSettings.zendesk.enabled,
          subdomain: integrationSettings.zendesk.subdomain,
          email: integrationSettings.zendesk.email,
          apiToken: integrationSettings.zendesk.maskedToken
        },
        jira: {
          enabled: integrationSettings.jira.enabled,
          baseUrl: integrationSettings.jira.baseUrl,
          email: integrationSettings.jira.email,
          apiToken: integrationSettings.jira.maskedToken,
          projectKey: integrationSettings.jira.projectKey
        }
      });
    } catch (error) {
      console.error('Error fetching integration settings:', error);
      res.status(500).json({ message: 'Error fetching integration settings' });
    }
  });

  // Configure a specific integration
  app.post('/api/integrations/:type', requireAuth, async (req: Request, res: Response) => {
    try {
      console.log('Received integration configuration request:', {
        type: req.params.type,
        body: {
          ...req.body,
          apiToken: req.body.apiToken ? '[REDACTED]' : undefined
        }
      });
      
      const type = integrationTypeSchema.parse(req.params.type);
      
      // Check for empty or null request body
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ 
          message: 'Empty request body. Configuration data is required.',
          requiredFields: type === 'jira' 
            ? ['baseUrl', 'email', 'apiToken', 'projectKey', 'enabled'] 
            : ['subdomain', 'email', 'apiToken', 'enabled']
        });
      }
      
      // Validate based on integration type with explicit error handling
      let config: ZendeskConfig | JiraConfig;
      
      if (type === 'zendesk') {
        try {
          config = zendeskConfigSchema.parse(req.body);
          console.log('Zendesk configuration validated successfully');
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            console.error('Zendesk validation errors:', validationError.errors);
            return res.status(400).json({ 
              message: 'Invalid Zendesk configuration', 
              errors: validationError.errors 
            });
          }
          throw validationError;
        }
      } else if (type === 'jira') {
        try {
          const formData = jiraFormSchema.parse(req.body);
          // Convert from form schema to service schema
          config = {
            host: formData.baseUrl,
            username: formData.email,
            apiToken: formData.apiToken,
            projectKey: formData.projectKey,
            issueType: "Task"
          };
          console.log('Jira configuration validated successfully');
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            console.error('Jira validation errors:', validationError.errors);
            const fieldErrors = validationError.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }));
            
            return res.status(400).json({ 
              message: 'Invalid Jira configuration',
              errors: fieldErrors
            });
          }
          throw validationError;
        }
        
        // Double-check required fields (defense in depth)
        const missingFields = [];
        if (!config.baseUrl) missingFields.push('baseUrl');
        if (!config.email) missingFields.push('email');
        if (!config.apiToken) missingFields.push('apiToken');
        if (!config.projectKey) missingFields.push('projectKey');
        
        if (missingFields.length > 0) {
          console.error('Missing required fields for Jira integration:', missingFields);
          return res.status(400).json({ 
            message: 'Missing required fields for Jira integration',
            missingFields
          });
        }
      } else {
        return res.status(400).json({ message: 'Invalid integration type' });
      }

      if (type === 'jira') {
        // Use 'any' to avoid TypeScript errors with field names
        const jiraConfig = config as any;
        console.log(`Saving Jira integration configuration with values:`, {
          baseUrl: jiraConfig.baseUrl, 
          email: jiraConfig.email,
          projectKey: jiraConfig.projectKey, 
          enabled: jiraConfig.enabled,
          apiToken: jiraConfig.apiToken ? '[REDACTED]' : 'missing'
        });
      } else {
        const zendeskConfig = config as ZendeskConfig;
        console.log(`Saving Zendesk integration configuration with values:`, {
          subdomain: zendeskConfig.subdomain,
          email: zendeskConfig.email,
          enabled: zendeskConfig.enabled,
          apiToken: zendeskConfig.apiToken ? '[REDACTED]' : 'missing'
        });
      }

      // Create a deep copy of the configuration to avoid reference issues
      // Save the configuration in memory
      if (type === 'jira') {
        // Use any to avoid type errors with field mapping
        const jiraConfig = config as any;
        integrationSettings.jira = {
          enabled: jiraConfig.enabled || false, // Default to false if undefined
          baseUrl: jiraConfig.baseUrl.trim(),
          email: jiraConfig.email.trim(),
          apiToken: jiraConfig.apiToken,
          maskedToken: '********',
          projectKey: jiraConfig.projectKey.trim()
        };
        
        // Log the saved configuration (without sensitive data)
        console.log('Saved Jira configuration:', {
          enabled: integrationSettings.jira.enabled,
          baseUrl: integrationSettings.jira.baseUrl,
          email: integrationSettings.jira.email,
          projectKey: integrationSettings.jira.projectKey,
          apiToken: '[REDACTED]'
        });
      } else if (type === 'zendesk') {
        const zendeskConfig = config as ZendeskConfig;
        integrationSettings.zendesk = {
          enabled: zendeskConfig.enabled,
          subdomain: zendeskConfig.subdomain.trim(),
          email: zendeskConfig.email.trim(),
          apiToken: zendeskConfig.apiToken,
          maskedToken: '********'
        };
        
        // Log the saved configuration (without sensitive data)
        console.log('Saved Zendesk configuration:', {
          enabled: integrationSettings.zendesk.enabled,
          subdomain: integrationSettings.zendesk.subdomain,
          email: integrationSettings.zendesk.email,
          apiToken: '[REDACTED]'
        });
      }

      console.log(`Setting up ${type} integration service...`);
      
      // Configure the integration service
      const integrationService = getIntegrationService();
      
      console.log(`Integration configuration being set up for ${type}`);
      
      // Type-safe creation of integration config
      if (type === 'jira') {
        // Use any to avoid type errors with field mapping
        const jiraConfig = config as any;
        console.log('Jira config prepared:', {
          baseUrl: jiraConfig.baseUrl,
          email: jiraConfig.email,
          projectKey: jiraConfig.projectKey,
          enabled: jiraConfig.enabled,
          apiToken: '[REDACTED]'
        });
        
        // Adapt the field names to match what JiraService expects
        const integrations: IntegrationConfig[] = [{
          type: 'jira',
          config: { 
            host: jiraConfig.baseUrl,           // Map form field baseUrl -> host
            username: jiraConfig.email,         // Map form field email -> username
            apiToken: jiraConfig.apiToken,
            projectKey: jiraConfig.projectKey,
            issueType: 'Task',                  // Set default issue type required by JiraConfig
            enabled: jiraConfig.enabled 
          }
        }];
        
        integrationService.setupIntegrations(integrations);
      } else if (type === 'zendesk') {
        const zendeskConfig = config as ZendeskConfig;
        console.log('Zendesk config prepared:', {
          subdomain: zendeskConfig.subdomain,
          email: zendeskConfig.email,
          enabled: zendeskConfig.enabled,
          apiToken: '[REDACTED]'
        });
        
        const integrations: IntegrationConfig[] = [{
          type: 'zendesk',
          config: { ...zendeskConfig }
        }];
        
        integrationService.setupIntegrations(integrations);
      }
      
      // Test the connection if enabled
      if (config.enabled) {
        console.log(`Testing connection to ${type}...`);
        const connectionResult = await integrationService.verifyConnections();
        
        console.log(`Connection test results for ${type}:`, connectionResult);
        
        if (!connectionResult[type]) {
          return res.status(400).json({ 
            message: `Could not connect to ${type}. Please check your configuration and ensure your credentials are correct.`,
            details: `The service could not authenticate with the provided credentials. Verify that your API token has the necessary permissions.`
          });
        }
        
        console.log(`Successfully connected to ${type}`);
      }
      
      // In a real production app, you would save this configuration to a database
      
      res.status(200).json({ 
        message: `${type} integration ${config.enabled ? 'enabled' : 'disabled'} successfully`,
        connectionVerified: config.enabled
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod validation errors in a user-friendly way
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({ 
          message: 'Invalid configuration', 
          errors: formattedErrors 
        });
      }
      
      // Log the full error for debugging
      console.error(`Error configuring ${req.params.type} integration:`, error);
      
      // Return a user-friendly error message
      res.status(500).json({ 
        message: 'Error configuring integration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Sync existing tickets with external integration
  app.post('/api/integrations/:type/sync', requireAuth, async (req: Request, res: Response) => {
    try {
      const type = integrationTypeSchema.parse(req.params.type);
      
      // Check if integration is enabled and configured
      if ((type === 'jira' && !integrationSettings.jira.enabled) || 
          (type === 'zendesk' && !integrationSettings.zendesk.enabled)) {
        return res.status(400).json({
          message: `${type} integration is not enabled. Please enable and configure it first.`
        });
      }
      
      // Get tickets to sync from storage
      // In a real implementation, you would get tickets from the database
      // For this example, we'll use a minimal implementation with mock tickets
      const storage = req.app.locals.storage;
      if (!storage) {
        return res.status(500).json({ message: 'Storage service not available' });
      }
      
      // Get tickets from storage
      let tickets;
      try {
        // Check if storage has the getAllTickets method available
        if (!storage.getAllTickets) {
          console.error('getAllTickets method not found in storage');
          return res.status(500).json({
            message: 'Database error: getAllTickets method not available'
          });
        }
        
        tickets = await storage.getAllTickets();
        console.log(`Retrieved ${tickets.length} tickets for synchronization`);
        
        if (!tickets || tickets.length === 0) {
          return res.status(404).json({
            message: 'No tickets found to synchronize'
          });
        }
      } catch (error) {
        console.error(`Error retrieving tickets for synchronization:`, error);
        return res.status(500).json({
          message: 'Failed to retrieve tickets from database',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Get the integration service
      const integrationService = getIntegrationService();
      
      // Sync tickets to the external service
      console.log(`Starting synchronization of ${tickets.length} tickets to ${type}...`);
      const results = await integrationService.syncExistingTickets(tickets);
      
      // Count how many tickets were synced to this specific integration type
      const syncedTickets = Object.keys(results[type] || {}).length;
      
      // Update tickets in storage with their external IDs
      if (syncedTickets > 0) {
        for (const [ticketId, externalInfo] of Object.entries(results[type] || {})) {
          try {
            console.log(`Updating ticket ${ticketId} with external ${type} reference:`, externalInfo);
            
            // Get the current ticket to access its existing externalIntegrations
            const ticket = await storage.getTicketById(parseInt(ticketId));
            if (!ticket) {
              console.error(`Could not find ticket with ID ${ticketId} in database`);
              continue;
            }
            
            // Create or update the externalIntegrations field
            const currentExternalIntegrations = ticket.externalIntegrations || {};
            const updatedExternalIntegrations = {
              ...currentExternalIntegrations,
              [type]: type === 'jira' ? (externalInfo as any).key : (externalInfo as any).id
            };
            
            // Update the ticket in the database with new external references
            await storage.updateTicket(
              parseInt(ticketId),
              { externalIntegrations: updatedExternalIntegrations }
            );
            
            console.log(`Successfully updated ticket ${ticketId} with ${type} reference: ${JSON.stringify(updatedExternalIntegrations)}`);
          } catch (error) {
            console.error(`Error updating external reference for ticket ${ticketId}:`, error);
          }
        }
      }
      
      return res.status(200).json({
        message: `Successfully synchronized ${syncedTickets} tickets with ${type}`,
        syncedCount: syncedTickets,
        totalTickets: tickets.length,
        externalIds: Object.keys(results[type] || {}).map(ticketId => ({
          ticketId,
          externalId: type === 'jira' 
            ? (results[type][parseInt(ticketId)] as any).key
            : (results[type][parseInt(ticketId)] as any).id,
          url: (results[type][parseInt(ticketId)] as any).url
        }))
      });
    } catch (error) {
      console.error(`Error synchronizing tickets with ${req.params.type}:`, error);
      
      return res.status(500).json({
        message: `Error synchronizing tickets with ${req.params.type}`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test integration connection
  app.post('/api/integrations/:type/test', requireAuth, async (req: Request, res: Response) => {
    try {
      // Debug the raw request before it's processed by any middleware
      console.log('Integration test endpoint hit:', {
        method: req.method,
        url: req.url,
        headers: {
          'content-type': req.headers['content-type'],
          'content-length': req.headers['content-length'],
        }
      });
      
      // Safe logging of the request body
      console.log('Received integration test request:', {
        type: req.params.type,
        bodyType: typeof req.body,
        bodyIsObject: req.body !== null && typeof req.body === 'object',
        contentType: req.headers['content-type'],
        hasApiToken: req.body && req.body.apiToken ? 'yes' : 'no',
        bodyKeys: req.body ? Object.keys(req.body) : [],
        body: req.body ? {
          ...req.body,
          apiToken: req.body.apiToken ? '[REDACTED]' : undefined
        } : null
      });
      
      // Make sure type is valid
      const type = integrationTypeSchema.parse(req.params.type);
      
      // Defensive check for various body issues
      if (!req.body) {
        return res.status(400).json({ 
          message: 'Missing request body. Configuration data is required for testing.',
          requestInfo: {
            contentType: req.headers['content-type'],
            contentLength: req.headers['content-length']
          },
          requiredFields: type === 'jira' 
            ? ['baseUrl', 'email', 'apiToken', 'projectKey'] 
            : ['subdomain', 'email', 'apiToken'],
          tip: "Make sure you're sending a JSON request body with 'Content-Type: application/json' header"
        });
      }
      
      // Check for empty object
      if (Object.keys(req.body).length === 0) {
        return res.status(400).json({ 
          message: 'Empty request body. Configuration data is required for testing.',
          requiredFields: type === 'jira' 
            ? ['baseUrl', 'email', 'apiToken', 'projectKey'] 
            : ['subdomain', 'email', 'apiToken'],
          tip: "Ensure all required fields are included in your request"
        });
      }
      
      // Create a temporary service specifically for testing with the provided credentials
      if (type === 'jira') {
        try {
          // Parse and validate using our enhanced schema
          console.log('Validating Jira configuration for testing...');
          const formData = jiraFormSchema.parse(req.body);
          // Convert from form schema to service schema
          const testConfig = {
            host: formData.baseUrl,
            username: formData.email,
            apiToken: formData.apiToken,
            projectKey: formData.projectKey,
            issueType: "Task"
          };
          
          // Double-check required fields to be absolutely certain (defense in depth)
          const missingFields = [];
          if (!testConfig.host) missingFields.push('host');
          if (!testConfig.username) missingFields.push('username');
          if (!testConfig.apiToken) missingFields.push('apiToken');
          if (!testConfig.projectKey) missingFields.push('projectKey');
          
          if (missingFields.length > 0) {
            console.error('Missing required fields for Jira integration test:', missingFields);
            return res.status(400).json({ 
              message: 'Missing required fields for Jira integration test',
              missingFields: missingFields
            });
          }
          
          // Trim any whitespace in string values
          const sanitizedConfig = {
            ...testConfig,
            host: testConfig.host.trim(),
            username: testConfig.username.trim(),
            projectKey: testConfig.projectKey.trim()
          };
          
          console.log('Testing Jira connection with:', {
            host: sanitizedConfig.host,
            username: sanitizedConfig.username,
            apiToken: sanitizedConfig.apiToken ? '[REDACTED]' : 'missing',
            projectKey: sanitizedConfig.projectKey
          });
          
          // Create a temporary Jira service instance for testing
          // Convert from form config to Jira service config
          console.log('Creating Jira service instance for testing...');
          
          // We need to adapt the form values to match the JiraConfig expected by the service
          const jiraServiceConfig: JiraConfig = {
            host: sanitizedConfig.host,
            username: sanitizedConfig.username,
            apiToken: sanitizedConfig.apiToken,
            projectKey: sanitizedConfig.projectKey,
            issueType: 'Task' // Default value
          };
          
          const tempJiraService = new JiraService(jiraServiceConfig);
          
          // Test the connection with timeouts
          console.log('Verifying Jira connection...');
          const connectionPromise = tempJiraService.verifyConnection();
          
          // Set a timeout for the connection test (30 seconds)
          const timeoutPromise = new Promise<false>((resolve) => {
            setTimeout(() => resolve(false), 30000);
          });
          
          // Use Promise.race to handle timeouts
          const connected = await Promise.race([connectionPromise, timeoutPromise]);
          
          if (connected) {
            console.log('Jira connection test successful!');
            res.status(200).json({ 
              message: `Successfully connected to Jira`,
              details: `Connection verified with ${sanitizedConfig.host}`
            });
          } else {
            console.error('Jira connection test failed');
            res.status(400).json({ 
              message: `Could not connect to Jira. Please verify your credentials and Jira URL.`,
              details: "Make sure your API token is correct and has the necessary permissions.",
              suggestions: [
                "Verify your Jira URL is correct (e.g., https://yourcompany.atlassian.net)",
                "Check that your API token has not expired and has the correct permissions",
                "Ensure your network allows connections to Jira",
                "Verify the project key exists in your Jira instance"
              ]
            });
          }
        } catch (validationError) {
          console.error('Jira test config validation error:', validationError);
          
          if (validationError instanceof z.ZodError) {
            // Format Zod validation errors in a user-friendly way
            const formattedErrors = validationError.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }));
            
            return res.status(400).json({ 
              message: 'Invalid Jira configuration', 
              errors: formattedErrors 
            });
          }
          
          return res.status(400).json({ 
            message: 'Could not connect to Jira',
            error: validationError instanceof Error ? validationError.message : 'Unknown error'
          });
        }
      } 
      else if (type === 'zendesk') {
        try {
          // Parse and validate the request body
          console.log('Validating Zendesk configuration for testing...');
          const testConfig = zendeskConfigSchema.parse(req.body);
          
          // Trim any whitespace in string values
          const sanitizedConfig = {
            ...testConfig,
            subdomain: testConfig.subdomain.trim(),
            email: testConfig.email.trim(),
            enabled: true // Always enable for testing
          };
          
          console.log('Testing Zendesk connection with:', {
            subdomain: sanitizedConfig.subdomain,
            email: sanitizedConfig.email,
            apiToken: sanitizedConfig.apiToken ? '[REDACTED]' : 'missing'
          });
          
          // Create a temporary Zendesk service instance for testing
          console.log('Creating Zendesk service instance for testing...');
          const tempZendeskService = new ZendeskService({
            subdomain: sanitizedConfig.subdomain,
            email: sanitizedConfig.email,
            apiToken: sanitizedConfig.apiToken,
            enabled: true
          });
          
          // Test the connection with timeouts
          console.log('Verifying Zendesk connection...');
          const connectionPromise = tempZendeskService.verifyConnection();
          
          // Set a timeout for the connection test (30 seconds)
          const timeoutPromise = new Promise<false>((resolve) => {
            setTimeout(() => resolve(false), 30000);
          });
          
          // Use Promise.race to handle timeouts
          const connected = await Promise.race([connectionPromise, timeoutPromise]);
          
          if (connected) {
            console.log('Zendesk connection test successful!');
            res.status(200).json({ 
              message: `Successfully connected to Zendesk`,
              details: `Connection verified with ${sanitizedConfig.subdomain}.zendesk.com`
            });
          } else {
            console.error('Zendesk connection test failed');
            res.status(400).json({ 
              message: `Could not connect to Zendesk. Please verify your credentials and subdomain.`,
              suggestions: [
                "Verify your Zendesk subdomain is correct (just the subdomain, not the full URL)",
                "Check that your API token is valid",
                "Ensure your email address has access to Zendesk"
              ]
            });
          }
        } catch (validationError) {
          console.error('Zendesk test config validation error:', validationError);
          
          if (validationError instanceof z.ZodError) {
            // Format Zod validation errors in a user-friendly way
            const formattedErrors = validationError.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }));
            
            return res.status(400).json({ 
              message: 'Invalid Zendesk configuration', 
              errors: formattedErrors
            });
          }
          
          return res.status(400).json({
            message: 'Could not connect to Zendesk',
            error: validationError instanceof Error ? validationError.message : 'Unknown error'
          });
        }
      }
      else {
        return res.status(400).json({ 
          message: `Unsupported integration type: ${type}`,
          supportedTypes: ['jira', 'zendesk']
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format Zod validation errors in a user-friendly way
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        
        return res.status(400).json({ 
          message: 'Invalid configuration', 
          errors: formattedErrors
        });
      }
      
      // Log the full error for debugging
      console.error(`Error testing ${req.params.type} integration:`, error);
      
      // Return a user-friendly error message
      res.status(500).json({ 
        message: 'Error testing integration connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}