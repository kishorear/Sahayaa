import { Express, Request, Response } from "express";
import { z } from "zod";
import { 
  getIntegrationService, 
  initializeIntegrationsForTenant,
  IntegrationConfig
} from "../integrations";
import { 
  ZendeskConfig,
  ZendeskService
} from "../integrations/zendesk";
import { 
  JiraConfig,
  JiraService
} from "../integrations/jira";
import { userHasPermission } from "../permissions";
import { integrationSettingsService } from "../integration-settings-service";
import { storage } from '../storage';
import multer from 'multer';
import fs from 'fs/promises';

// Validation schemas for integration configurations
const zendeskConfigSchema = z.object({
  subdomain: z.string().min(1, "Subdomain is required"),
  email: z.string().email("A valid email is required"),
  apiToken: z.string().min(1, "API token is required"),
  enabled: z.boolean().default(true)
});

// Improve Jira schema with better error messages and stricter validation
const jiraConfigSchema = z.object({
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

// Multer configuration for file uploads
const upload = multer({
  dest: '/tmp/', // Temporary directory for uploads
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export function registerIntegrationRoutes(app: Express, requireAuth: any) {
  // Note: Test endpoint removed - tenant-specific integration system is now fully operational
  
  // Test endpoint to verify database integration settings functionality (with auth)
  app.post('/api/integrations/test-db', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const tenantId = req.user.tenantId;
      console.log(`Testing database integration settings for tenant ${tenantId}`);
      
      // Test saving a JIRA configuration
      const testJiraConfig = {
        baseUrl: 'https://test-tenant.atlassian.net',
        email: 'test@tenant.com',
        apiToken: 'test-token-123',
        projectKey: 'TEST',
        enabled: true
      };
      
      // Save test settings
      await integrationSettingsService.saveIntegrationSettings(tenantId, 'jira', testJiraConfig, true);
      console.log(`Saved test JIRA settings for tenant ${tenantId}`);
      
      // Retrieve test settings
      const savedSettings = await integrationSettingsService.getIntegrationSettingsByService(tenantId, 'jira');
      console.log(`Retrieved JIRA settings for tenant ${tenantId}:`, savedSettings ? 'found' : 'not found');
      
      // Get all settings
      const allSettings = await integrationSettingsService.getIntegrationSettings(tenantId);
      console.log(`Total settings for tenant ${tenantId}: ${allSettings.length}`);
      
      res.json({
        message: 'Database integration settings test completed',
        tenantId,
        testResults: {
          settingsSaved: true,
          settingsRetrieved: !!savedSettings,
          totalSettings: allSettings.length,
          jiraConfig: savedSettings ? {
            enabled: savedSettings.isEnabled,
            baseUrl: (savedSettings.configuration as any).baseUrl,
            email: (savedSettings.configuration as any).email,
            projectKey: (savedSettings.configuration as any).projectKey,
            apiToken: '[REDACTED]'
          } : null
        }
      });
    } catch (error) {
      console.error('Database integration settings test failed:', error);
      res.status(500).json({ 
        message: 'Database test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

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
      enabled: true,
      baseUrl: 'https://your-jira-instance.atlassian.net',
      email: 'test@example.com',
      apiToken: 'dummy-token-for-testing',
      maskedToken: '********',
      projectKey: 'TEST'
    }
  };
  
  // Initialize the integration service with database settings
  // Note: This will be called for each tenant when they login and access integrations
  // This function is now exported from the integrations module
  // async function initializeIntegrationsForTenant is already available

  // Integration services are now tenant-specific and loaded from database
  try {
    console.log('Integration system initialized - tenant-specific configurations will be loaded from database');
  } catch (error) {
    console.error('Error initializing fallback integration services:', error);
  }
  
  // Get all integration configurations from database
  app.get('/api/integrations', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if user has permissions to view integrations
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Verify user has permission to access integrations
      const hasAccessIntegrationsPermission = await userHasPermission(req, 'canAccessIntegrations');
      if (!hasAccessIntegrationsPermission) {
        return res.status(403).json({ message: 'Forbidden: Insufficient permissions to access integrations' });
      }
      
      const tenantId = req.user.tenantId;
      console.log(`Loading integration settings from database for tenant ${tenantId}`);
      
      // Initialize integrations for this tenant from database
      await initializeIntegrationsForTenant(tenantId);
      
      // Load settings from database
      const settings = await integrationSettingsService.getIntegrationSettings(tenantId);
      
      const response: any = {
        zendesk: {
          enabled: false,
          subdomain: '',
          email: '',
          apiToken: '********'
        },
        jira: {
          enabled: false,
          baseUrl: '',
          email: '',
          apiToken: '********',
          projectKey: ''
        }
      };
      
      // Process settings and mask sensitive data
      for (const setting of settings) {
        if (setting.serviceType === 'jira') {
          const config = setting.configuration as any;
          response.jira = {
            enabled: setting.isEnabled,
            baseUrl: config.baseUrl || '',
            email: config.email || '',
            projectKey: config.projectKey || '',
            apiToken: '********' // Always mask for security
          };
        } else if (setting.serviceType === 'zendesk') {
          const config = setting.configuration as any;
          response.zendesk = {
            enabled: setting.isEnabled,
            subdomain: config.subdomain || '',
            email: config.email || '',
            apiToken: '********' // Always mask for security
          };
        }
      }
      
      console.log(`Loaded ${settings.length} integration settings from database for tenant ${tenantId} and initialized services`);
      
      // Return the settings with masked API tokens
      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching integration settings from database:', error);
      res.status(500).json({ 
        message: 'Error fetching integration settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Configure a specific integration
  app.post('/api/integrations/:type', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if user has permissions to modify integrations
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Only users with integration management permission can update integrations
      const hasManageIntegrationsPermission = await userHasPermission(req, 'canManageIntegrations');
      if (!hasManageIntegrationsPermission) {
        return res.status(403).json({ message: 'You do not have permission to manage integrations' });
      }
      
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
          config = jiraConfigSchema.parse(req.body);
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
        const jiraConfig = config as JiraConfig;
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

      // Save the configuration to database with tenant isolation
      const tenantId = req.user.tenantId;
      console.log(`Saving ${type} integration configuration to database for tenant ${tenantId}`);
      
      try {
        // Save to database using the integration settings service
        await integrationSettingsService.saveIntegrationSettings(
          tenantId,
          type,
          config,
          config.enabled
        );
        
        console.log(`Successfully saved ${type} configuration to database for tenant ${tenantId}`);
        
        // Also maintain backwards compatibility with in-memory storage
        if (type === 'jira') {
          const jiraConfig = config as JiraConfig;
          integrationSettings.jira = {
            enabled: jiraConfig.enabled,
            baseUrl: jiraConfig.baseUrl.trim(),
            email: jiraConfig.email.trim(),
            apiToken: jiraConfig.apiToken,
            maskedToken: '********',
            projectKey: jiraConfig.projectKey.trim()
          };
          
          // Log the saved configuration (without sensitive data)
          console.log('Saved Jira configuration to database:', {
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
          console.log('Saved Zendesk configuration to database:', {
            enabled: integrationSettings.zendesk.enabled,
            subdomain: integrationSettings.zendesk.subdomain,
            email: integrationSettings.zendesk.email,
            apiToken: '[REDACTED]'
          });
        }
      } catch (dbError) {
        console.error(`Error saving ${type} integration settings to database:`, dbError);
        // Continue with in-memory fallback but inform user
        return res.status(500).json({ 
          message: `Failed to save ${type} integration settings to persistent storage: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
          fallbackToMemory: true
        });
      }

      console.log(`Setting up ${type} integration service...`);
      
      // Configure the integration service for this tenant
      const integrationService = getIntegrationService(tenantId);
      
      console.log(`Integration configuration being set up for ${type}`);
      
      // Type-safe creation of integration config
      if (type === 'jira') {
        const jiraConfig = config as JiraConfig;
        console.log('Jira config prepared:', {
          baseUrl: jiraConfig.baseUrl,
          email: jiraConfig.email,
          projectKey: jiraConfig.projectKey,
          enabled: jiraConfig.enabled,
          apiToken: '[REDACTED]'
        });
        
        const integrations: IntegrationConfig[] = [{
          type: 'jira',
          config: { ...jiraConfig }
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
      // Check if user has permissions to sync tickets
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Only users with integration management permission can sync tickets
      const hasManageIntegrationsPermission = await userHasPermission(req, 'canManageIntegrations');
      if (!hasManageIntegrationsPermission) {
        return res.status(403).json({ message: 'You do not have permission to sync tickets with integrations' });
      }
      
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
      
      // Get the integration service for this tenant
      const integrationService = getIntegrationService(req.user.tenantId);
      
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
      // Check if user has permissions to test integrations
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Only users with integration access permission can test integrations
      const hasAccessIntegrationsPermission = await userHasPermission(req, 'canAccessIntegrations');
      if (!hasAccessIntegrationsPermission) {
        return res.status(403).json({ message: 'You do not have permission to test integrations' });
      }
      
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
          const testConfig = jiraConfigSchema.parse(req.body);
          
          // Double-check required fields to be absolutely certain (defense in depth)
          const missingFields = [];
          if (!testConfig.baseUrl) missingFields.push('baseUrl');
          if (!testConfig.email) missingFields.push('email');
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
            baseUrl: testConfig.baseUrl.trim(),
            email: testConfig.email.trim(),
            projectKey: testConfig.projectKey.trim(),
            enabled: true // Always enable for testing
          };
          
          console.log('Testing Jira connection with:', {
            baseUrl: sanitizedConfig.baseUrl,
            email: sanitizedConfig.email,
            apiToken: sanitizedConfig.apiToken ? '[REDACTED]' : 'missing',
            projectKey: sanitizedConfig.projectKey
          });
          
          // Create a temporary Jira service instance for testing
          console.log('Creating Jira service instance for testing...');
          const tempJiraService = new JiraService({
            baseUrl: sanitizedConfig.baseUrl,
            email: sanitizedConfig.email,
            apiToken: sanitizedConfig.apiToken,
            projectKey: sanitizedConfig.projectKey,
            enabled: true
          });
          
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
              details: `Connection verified with ${sanitizedConfig.baseUrl}`
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

  // Upload attachment to existing JIRA issue
  app.post('/api/integrations/jira/upload-attachment/:issueKey', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Allow users with integration access to upload attachments
      const hasAccessIntegrationsPermission = await userHasPermission(req, 'canAccessIntegrations');
      if (!hasAccessIntegrationsPermission) {
        return res.status(403).json({ message: 'You do not have permission to access integrations' });
      }

      const { issueKey } = req.params;
      const file = req.file;
      const tenantId = req.user.tenantId;

      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      if (!issueKey) {
        return res.status(400).json({ message: 'JIRA issue key is required' });
      }

      console.log(`Uploading attachment to JIRA issue ${issueKey} for tenant ${tenantId}`);

      // Get JIRA service for this tenant
      const integrationService = getIntegrationService(tenantId);
      if (!integrationService) {
        return res.status(500).json({ message: 'Integration service not available' });
      }

      const jiraService = integrationService.getJiraService();
      if (!jiraService || !jiraService.isEnabled()) {
        return res.status(400).json({ message: 'JIRA integration not configured or disabled' });
      }

      // Upload attachment to JIRA
      const success = await jiraService.addAttachment(issueKey, file.path, file.originalname);

      if (success) {
        // Clean up local file after successful upload
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.warn(`Failed to clean up uploaded file: ${file.path}`, cleanupError);
        }

        res.json({
          message: 'Attachment uploaded successfully to JIRA',
          issueKey,
          filename: file.originalname,
          success: true
        });
      } else {
        res.status(500).json({
          message: 'Failed to upload attachment to JIRA',
          issueKey,
          filename: file.originalname,
          success: false
        });
      }
    } catch (error) {
      console.error('Error uploading attachment to JIRA:', error);
      res.status(500).json({
        message: 'Internal server error during attachment upload',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Sync ticket attachments to JIRA
  app.post('/api/integrations/jira/sync-attachments/:ticketId', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Allow users with integration access to sync attachments
      const hasAccessIntegrationsPermission = await userHasPermission(req, 'canAccessIntegrations');
      if (!hasAccessIntegrationsPermission) {
        return res.status(403).json({ message: 'You do not have permission to access integrations' });
      }

      const { ticketId } = req.params;
      const tenantId = req.user.tenantId;

      console.log(`Syncing ticket attachments to JIRA for ticket ${ticketId}, tenant ${tenantId}`);

      // Get ticket with attachments
      const ticket = await storage.getTicket(parseInt(ticketId));
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Verify tenant isolation
      if (ticket.tenantId !== tenantId) {
        return res.status(403).json({ message: 'Access denied - ticket does not belong to your tenant' });
      }

      // Check if ticket has JIRA integration
      const externalIntegrations = ticket.externalIntegrations as any;
      if (!externalIntegrations?.jira) {
        return res.status(400).json({ message: 'Ticket is not linked to a JIRA issue' });
      }

      const jiraIssueKey = externalIntegrations.jira;

      // Get JIRA service
      const integrationService = getIntegrationService(tenantId);
      if (!integrationService) {
        return res.status(500).json({ message: 'Integration service not available' });
      }

      const jiraService = integrationService.getJiraService();
      if (!jiraService || !jiraService.isEnabled()) {
        return res.status(400).json({ message: 'JIRA integration not configured or disabled' });
      }

      // Get ticket attachments from our custom schema
      const messages = await storage.getMessagesByTicketId(parseInt(ticketId));
      const attachments: any[] = [];
      
      // Find messages with attachments
      for (const message of messages) {
        if (message.attachments && message.attachments.length > 0) {
          attachments.push(...message.attachments);
        }
      }

      if (attachments.length === 0) {
        return res.json({
          message: 'No attachments found for this ticket',
          ticketId,
          jiraIssueKey,
          uploadedCount: 0
        });
      }

      // Upload attachments to JIRA
      let uploadedCount = 0;
      for (const attachment of attachments) {
        try {
          // Create temporary file from base64 data
          const buffer = Buffer.from(attachment.data, 'base64');
          const tempPath = `/tmp/${Date.now()}-${attachment.filename}`;
          await fs.writeFile(tempPath, buffer);
          
          const success = await jiraService.addAttachment(jiraIssueKey, tempPath, attachment.filename);
          if (success) {
            uploadedCount++;
          }
          
          // Clean up temp file
          try {
            await fs.unlink(tempPath);
          } catch (cleanupError) {
            console.warn(`Failed to clean up temp file: ${tempPath}`, cleanupError);
          }
        } catch (attachmentError) {
          console.error(`Error uploading attachment ${attachment.filename}:`, attachmentError);
        }
      }

      res.json({
        message: `Successfully uploaded ${uploadedCount}/${attachments.length} attachments to JIRA issue ${jiraIssueKey}`,
        ticketId,
        jiraIssueKey,
        totalAttachments: attachments.length,
        uploadedCount,
        success: uploadedCount > 0
      });

    } catch (error) {
      console.error('Error syncing attachments to JIRA:', error);
      res.status(500).json({
        message: 'Internal server error during attachment sync',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Upload attachment to existing Zendesk ticket
  app.post('/api/integrations/zendesk/upload-attachment/:ticketId', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Allow users with integration access to upload attachments
      const hasAccessIntegrationsPermission = await userHasPermission(req, 'canAccessIntegrations');
      if (!hasAccessIntegrationsPermission) {
        return res.status(403).json({ message: 'You do not have permission to access integrations' });
      }

      const { ticketId } = req.params;
      const file = req.file;
      const tenantId = req.user.tenantId;

      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      if (!ticketId) {
        return res.status(400).json({ message: 'Zendesk ticket ID is required' });
      }

      console.log(`Uploading attachment to Zendesk ticket ${ticketId} for tenant ${tenantId}`);

      // Get Zendesk service for this tenant
      const integrationService = getIntegrationService(tenantId);
      if (!integrationService) {
        return res.status(500).json({ message: 'Integration service not available' });
      }

      const zendeskService = integrationService.getZendeskService();
      if (!zendeskService || !zendeskService.isEnabled()) {
        return res.status(400).json({ message: 'Zendesk integration not configured or disabled' });
      }

      // Upload attachment to Zendesk
      const success = await zendeskService.addAttachment(parseInt(ticketId), file.path, file.originalname);

      if (success) {
        // Clean up local file after successful upload
        try {
          await fs.unlink(file.path);
        } catch (cleanupError) {
          console.warn(`Failed to clean up uploaded file: ${file.path}`, cleanupError);
        }

        res.json({
          message: 'Attachment uploaded successfully to Zendesk',
          ticketId,
          filename: file.originalname,
          success: true
        });
      } else {
        res.status(500).json({
          message: 'Failed to upload attachment to Zendesk',
          ticketId,
          filename: file.originalname,
          success: false
        });
      }
    } catch (error) {
      console.error('Error uploading attachment to Zendesk:', error);
      res.status(500).json({
        message: 'Internal server error during attachment upload',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Sync ticket attachments to Zendesk
  app.post('/api/integrations/zendesk/sync-attachments/:ticketId', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Allow users with integration access to sync attachments
      const hasAccessIntegrationsPermission = await userHasPermission(req, 'canAccessIntegrations');
      if (!hasAccessIntegrationsPermission) {
        return res.status(403).json({ message: 'You do not have permission to access integrations' });
      }

      const { ticketId } = req.params;
      const tenantId = req.user.tenantId;

      console.log(`Syncing ticket attachments to Zendesk for ticket ${ticketId}, tenant ${tenantId}`);

      // Get ticket with attachments
      const ticket = await storage.getTicket(parseInt(ticketId));
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }

      // Verify tenant isolation
      if (ticket.tenantId !== tenantId) {
        return res.status(403).json({ message: 'Access denied - ticket does not belong to your tenant' });
      }

      // Check if ticket has Zendesk integration
      const externalIntegrations = ticket.externalIntegrations as any;
      if (!externalIntegrations?.zendesk) {
        return res.status(400).json({ message: 'Ticket is not linked to a Zendesk ticket' });
      }

      const zendeskTicketId = externalIntegrations.zendesk;

      // Get Zendesk service
      const integrationService = getIntegrationService(tenantId);
      if (!integrationService) {
        return res.status(500).json({ message: 'Integration service not available' });
      }

      const zendeskService = integrationService.getZendeskService();
      if (!zendeskService || !zendeskService.isEnabled()) {
        return res.status(400).json({ message: 'Zendesk integration not configured or disabled' });
      }

      // Get ticket attachments from our custom schema
      const messages = await storage.getMessagesByTicketId(parseInt(ticketId));
      const attachments: any[] = [];
      
      // Find messages with attachments
      for (const message of messages) {
        if (message.attachments && message.attachments.length > 0) {
          attachments.push(...message.attachments);
        }
      }

      if (attachments.length === 0) {
        return res.json({
          message: 'No attachments found for this ticket',
          ticketId,
          zendeskTicketId,
          uploadedCount: 0
        });
      }

      // Upload attachments to Zendesk
      let uploadedCount = 0;
      for (const attachment of attachments) {
        try {
          // Create temporary file from base64 data
          const buffer = Buffer.from(attachment.data, 'base64');
          const tempPath = `/tmp/${Date.now()}-${attachment.filename}`;
          await fs.writeFile(tempPath, buffer);
          
          const success = await zendeskService.addAttachment(parseInt(zendeskTicketId), tempPath, attachment.filename);
          if (success) {
            uploadedCount++;
          }
          
          // Clean up temp file
          try {
            await fs.unlink(tempPath);
          } catch (cleanupError) {
            console.warn(`Failed to clean up temp file: ${tempPath}`, cleanupError);
          }
        } catch (attachmentError) {
          console.error(`Error uploading attachment ${attachment.filename}:`, attachmentError);
        }
      }

      res.json({
        message: `Successfully uploaded ${uploadedCount}/${attachments.length} attachments to Zendesk ticket ${zendeskTicketId}`,
        ticketId,
        zendeskTicketId,
        totalAttachments: attachments.length,
        uploadedCount,
        success: uploadedCount > 0
      });

    } catch (error) {
      console.error('Error syncing attachments to Zendesk:', error);
      res.status(500).json({
        message: 'Internal server error during attachment sync',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}