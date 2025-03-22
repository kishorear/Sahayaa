import { Express, Request, Response } from "express";
import { z } from "zod";
import { 
  getIntegrationService, 
  setupIntegrationService,
  IntegrationConfig
} from "../integrations";
import { 
  ZendeskConfig 
} from "../integrations/zendesk";
import { 
  JiraConfig 
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
  // Get all integration configurations
  app.get('/api/integrations', requireAuth, (req: Request, res: Response) => {
    try {
      // In a production app, these would be stored in a database
      // For now, we'll return a default empty configuration
      res.status(200).json({
        zendesk: {
          enabled: false,
          subdomain: '',
          email: '',
          apiToken: '********' // Never return the actual token 
        },
        jira: {
          enabled: false,
          baseUrl: '',
          email: '',
          apiToken: '********', // Never return the actual token
          projectKey: ''
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
      
      // In a production app, you would save this configuration to a database
      
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
      
      const integrationService = getIntegrationService();
      const service = integrationService.getService(type);
      
      if (!service) {
        return res.status(400).json({ message: `${type} integration is not configured` });
      }
      
      // Check if the service is accessible and credentials are valid
      let connected = false;
      
      if (type === 'zendesk') {
        connected = await (service as any).verifyConnection();
      } else if (type === 'jira') {
        connected = await (service as any).verifyConnection();
      }
      
      if (connected) {
        res.status(200).json({ message: `Successfully connected to ${type}` });
      } else {
        res.status(400).json({ message: `Could not connect to ${type}. Please check your configuration.` });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid integration type' });
      }
      console.error(`Error testing ${req.params.type} integration:`, error);
      res.status(500).json({ message: 'Error testing integration connection' });
    }
  });
}