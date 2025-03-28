import { Express, Request, Response } from "express";
import { z } from "zod";
import { 
  getIntegrationService, 
  setupIntegrationService,
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

// Validation schemas for integration configurations
const zendeskConfigSchema = z.object({
  subdomain: z.string().min(1),
  email: z.string().email(),
  apiToken: z.string().min(1),
  enabled: z.boolean().default(true)
});

const jiraConfigSchema = z.object({
  baseUrl: z.string().url(),
  email: z.string().email(),
  apiToken: z.string().min(1),
  projectKey: z.string().min(1),
  enabled: z.boolean().default(true)
});

const integrationTypeSchema = z.enum(['zendesk', 'jira']);

export function registerIntegrationRoutes(app: Express, requireAuth: any) {
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
    const integrationService = setupIntegrationService();
    const integrations: IntegrationConfig[] = [];
    
    if (integrationSettings.jira.enabled) {
      integrations.push({
        type: 'jira',
        config: {
          baseUrl: integrationSettings.jira.baseUrl,
          email: integrationSettings.jira.email,
          apiToken: integrationSettings.jira.apiToken,
          projectKey: integrationSettings.jira.projectKey,
          enabled: integrationSettings.jira.enabled
        } as JiraConfig
      });
    }
    
    if (integrationSettings.zendesk.enabled) {
      integrations.push({
        type: 'zendesk',
        config: {
          subdomain: integrationSettings.zendesk.subdomain,
          email: integrationSettings.zendesk.email,
          apiToken: integrationSettings.zendesk.apiToken,
          enabled: integrationSettings.zendesk.enabled
        } as ZendeskConfig
      });
    }
    
    if (integrations.length > 0) {
      integrationService.setupIntegrations(integrations);
    }
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
      const type = integrationTypeSchema.parse(req.params.type);
      
      // Validate based on integration type
      let config: ZendeskConfig | JiraConfig;
      
      if (type === 'zendesk') {
        config = zendeskConfigSchema.parse(req.body);
      } else if (type === 'jira') {
        config = jiraConfigSchema.parse(req.body);
      } else {
        return res.status(400).json({ message: 'Invalid integration type' });
      }

      // Save the configuration
      if (type === 'jira') {
        const jiraConfig = config as JiraConfig;
        integrationSettings.jira = {
          enabled: jiraConfig.enabled,
          baseUrl: jiraConfig.baseUrl,
          email: jiraConfig.email,
          apiToken: jiraConfig.apiToken,
          maskedToken: '********',
          projectKey: jiraConfig.projectKey
        };
      } else if (type === 'zendesk') {
        const zendeskConfig = config as ZendeskConfig;
        integrationSettings.zendesk = {
          enabled: zendeskConfig.enabled,
          subdomain: zendeskConfig.subdomain,
          email: zendeskConfig.email,
          apiToken: zendeskConfig.apiToken,
          maskedToken: '********'
        };
      }

      // Configure the integration service
      const integrationService = setupIntegrationService();
      
      const integrations: IntegrationConfig[] = [{
        type,
        config
      }];
      
      integrationService.setupIntegrations(integrations);
      
      // Test the connection if enabled
      if (config.enabled) {
        const connectionResult = await integrationService.verifyConnections();
        
        if (!connectionResult[type]) {
          return res.status(400).json({ 
            message: `Could not connect to ${type}. Please check your configuration.` 
          });
        }
      }
      
      // In a real production app, you would save this configuration to a database
      
      res.status(200).json({ 
        message: `${type} integration ${config.enabled ? 'enabled' : 'disabled'} successfully`,
        connectionVerified: config.enabled
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid configuration', errors: error.errors });
      }
      console.error(`Error configuring ${req.params.type} integration:`, error);
      res.status(500).json({ message: 'Error configuring integration' });
    }
  });

  // Test integration connection
  app.post('/api/integrations/:type/test', requireAuth, async (req: Request, res: Response) => {
    try {
      const type = integrationTypeSchema.parse(req.params.type);
      
      // Create a temporary service specifically for testing with the provided credentials
      if (type === 'jira') {
        // Parse and validate the request body
        const testConfig = jiraConfigSchema.parse(req.body);
        
        // Create a temporary Jira service instance for testing
        const tempJiraService = new JiraService({
          baseUrl: testConfig.baseUrl,
          email: testConfig.email,
          apiToken: testConfig.apiToken,
          projectKey: testConfig.projectKey,
          enabled: true
        });
        
        // Test the connection
        const connected = await tempJiraService.verifyConnection();
        
        if (connected) {
          res.status(200).json({ message: `Successfully connected to Jira` });
        } else {
          res.status(400).json({ message: `Could not connect to Jira. Please check your configuration.` });
        }
      } 
      else if (type === 'zendesk') {
        // Parse and validate the request body
        const testConfig = zendeskConfigSchema.parse(req.body);
        
        // Create a temporary Zendesk service instance for testing
        const tempZendeskService = new ZendeskService({
          subdomain: testConfig.subdomain,
          email: testConfig.email,
          apiToken: testConfig.apiToken,
          enabled: true
        });
        
        // Test the connection
        const connected = await tempZendeskService.verifyConnection();
        
        if (connected) {
          res.status(200).json({ message: `Successfully connected to Zendesk` });
        } else {
          res.status(400).json({ message: `Could not connect to Zendesk. Please check your configuration.` });
        }
      }
      else {
        return res.status(400).json({ message: `Unsupported integration type: ${type}` });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid configuration', errors: error.errors });
      }
      console.error(`Error testing ${req.params.type} integration:`, error);
      res.status(500).json({ message: 'Error testing integration connection' });
    }
  });
}