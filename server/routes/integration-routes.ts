/**
 * Integration Routes
 *
 * Routes for managing tenant integration settings
 */

import { Express, Request, Response } from 'express';
import { db } from '../db';
import { tenants } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { TenantIntegrationSettings } from '../integrations/integration-service';

// Define the interface for Jira and Zendesk configurations
interface JiraConfig {
  enabled: boolean;
  host: string;
  username: string;
  apiToken: string;
  projectKey: string;
}

interface ZendeskConfig {
  enabled: boolean;
  subdomain: string;
  username: string;
  apiToken: string;
}

// Validation schemas
const jiraConfigSchema = z.object({
  enabled: z.boolean(),
  host: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  apiToken: z.string().min(1),
  projectKey: z.string().min(1),
  // Allow baseUrl and email as alternatives to host and username
  baseUrl: z.string().min(1).optional(),
  email: z.string().min(1).optional()
});

const zendeskConfigSchema = z.object({
  enabled: z.boolean(),
  subdomain: z.string().min(1),
  username: z.string().min(1),
  apiToken: z.string().min(1)
});

const integrationSettingsSchema = z.object({
  jira: jiraConfigSchema.optional(),
  zendesk: zendeskConfigSchema.optional()
});

/**
 * Register routes for managing integration settings
 */
export function registerIntegrationRoutes(app: Express, requireAuth: any, requireRole?: any) {
  /**
   * Get tenant integration settings
   */
  app.get('/api/integrations/settings', requireAuth, async (req: Request, res: Response) => {
    try {
      // Get the tenant ID from the authenticated user
      const tenantId = req.user?.tenantId || 1;
      
      // Get the tenant
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId)
      });
      
      if (!tenant) {
        return res.status(404).json({
          message: 'Tenant not found'
        });
      }
      
      // Get the integration settings
      const integrationSettings = tenant.integrationSettings as TenantIntegrationSettings || {};
      
      // Return sanitized integration settings (remove sensitive data)
      const sanitizedSettings: Record<string, any> = {};
      
      if (integrationSettings.jira) {
        sanitizedSettings.jira = {
          enabled: integrationSettings.jira.enabled,
          host: integrationSettings.jira.host,
          username: integrationSettings.jira.username,
          projectKey: integrationSettings.jira.projectKey,
          // Don't include the API token
        };
      }
      
      if (integrationSettings.zendesk) {
        sanitizedSettings.zendesk = {
          enabled: integrationSettings.zendesk.enabled,
          subdomain: integrationSettings.zendesk.subdomain,
          username: integrationSettings.zendesk.username,
          // Don't include the API token
        };
      }
      
      return res.status(200).json({
        settings: sanitizedSettings
      });
    } catch (error) {
      console.error('Error getting integration settings:', error);
      
      return res.status(500).json({
        message: 'Error getting integration settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * Update tenant integration settings
   * Requires admin or support role
   */
  const roleMiddleware = requireRole ? requireRole(['admin', 'support']) : (req: Request, res: Response, next: () => void) => next();
  
  app.post('/api/integrations/settings', requireAuth, roleMiddleware, async (req: Request, res: Response) => {
    try {
      // Get the tenant ID from the authenticated user
      const tenantId = req.user?.tenantId || 1;
      
      // Validate the request body
      let updatedSettings;
      try {
        updatedSettings = integrationSettingsSchema.parse(req.body);
      } catch (error) {
        console.error('Invalid integration settings:', error);
        
        return res.status(400).json({
          message: 'Invalid integration settings',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      // Get the tenant
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId)
      });
      
      if (!tenant) {
        return res.status(404).json({
          message: 'Tenant not found'
        });
      }
      
      // Get the existing integration settings
      const existingSettings = tenant.integrationSettings as TenantIntegrationSettings || {};
      
      // Update the settings
      const newSettings: TenantIntegrationSettings = {
        ...existingSettings
      };
      
      // Update Jira settings if provided
      if (updatedSettings.jira) {
        // Map fields from frontend to backend with proper type conversion
        const host = String(updatedSettings.jira.host || updatedSettings.jira.baseUrl || '');
        const username = String(updatedSettings.jira.username || updatedSettings.jira.email || '');
        
        const jiraConfig: JiraConfig = {
          enabled: updatedSettings.jira.enabled,
          host,
          username,
          apiToken: updatedSettings.jira.apiToken,
          projectKey: updatedSettings.jira.projectKey
        };
        
        newSettings.jira = jiraConfig;
      }
      
      // Update Zendesk settings if provided
      if (updatedSettings.zendesk) {
        const zendeskConfig: ZendeskConfig = {
          enabled: updatedSettings.zendesk.enabled,
          subdomain: updatedSettings.zendesk.subdomain,
          username: updatedSettings.zendesk.username,
          apiToken: updatedSettings.zendesk.apiToken
        };
        
        newSettings.zendesk = zendeskConfig;
      }
      
      // Update the tenant
      await db.update(tenants)
        .set({
          integrationSettings: newSettings,
          updatedAt: new Date()
        })
        .where(eq(tenants.id, tenantId));
      
      // Return sanitized integration settings (remove sensitive data)
      const sanitizedSettings: Record<string, any> = {};
      
      if (newSettings.jira) {
        sanitizedSettings.jira = {
          enabled: newSettings.jira.enabled,
          host: newSettings.jira.host,
          username: newSettings.jira.username,
          projectKey: newSettings.jira.projectKey,
          // Don't include the API token
        };
      }
      
      if (newSettings.zendesk) {
        sanitizedSettings.zendesk = {
          enabled: newSettings.zendesk.enabled,
          subdomain: newSettings.zendesk.subdomain,
          username: newSettings.zendesk.username,
          // Don't include the API token
        };
      }
      
      return res.status(200).json({
        message: 'Integration settings updated',
        settings: sanitizedSettings
      });
    } catch (error) {
      console.error('Error updating integration settings:', error);
      
      return res.status(500).json({
        message: 'Error updating integration settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * Test integration connection (general endpoint)
   */
  app.post('/api/integrations/test', requireAuth, async (req: Request, res: Response) => {
    try {
      const { type, config } = req.body;
      
      if (!type || !config) {
        return res.status(400).json({
          message: 'Missing required parameters'
        });
      }
      
      // Test the integration connection
      if (type === 'jira') {
        try {
          // Validate the config
          const validatedConfig = jiraConfigSchema.parse(config);
          
          // Map frontend property names to backend property names
          const host = String(validatedConfig.host || validatedConfig.baseUrl || '');
          const username = String(validatedConfig.username || validatedConfig.email || '');
          
          const jiraConfig: JiraConfig = {
            enabled: validatedConfig.enabled,
            host,
            username,
            apiToken: validatedConfig.apiToken,
            projectKey: validatedConfig.projectKey
          };
          
          console.log('Testing Jira connection with mapped config:', {
            ...jiraConfig,
            apiToken: '[REDACTED]' // Don't log the actual token
          });
          
          // Import the Jira client
          const { testJiraConnection } = await import('../integrations/jira-service');
          
          // Test the connection
          const result = await testJiraConnection(jiraConfig);
          
          return res.status(200).json({
            success: result.success,
            message: result.message
          });
        } catch (error) {
          console.error('Error testing Jira connection:', error);
          
          return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'Invalid Jira configuration'
          });
        }
      } else if (type === 'zendesk') {
        try {
          // Validate the config
          const zendeskConfig = zendeskConfigSchema.parse(config);
          
          // Import the Zendesk client
          const { testZendeskConnection } = await import('../integrations/zendesk-service');
          
          // Test the connection
          const result = await testZendeskConnection(zendeskConfig);
          
          return res.status(200).json({
            success: result.success,
            message: result.message
          });
        } catch (error) {
          console.error('Error testing Zendesk connection:', error);
          
          return res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'Invalid Zendesk configuration'
          });
        }
      } else {
        return res.status(400).json({
          message: `Unsupported integration type: ${type}`
        });
      }
    } catch (error) {
      console.error('Error testing integration connection:', error);
      
      return res.status(500).json({
        message: 'Error testing integration connection',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  /**
   * Test Jira connection (specific endpoint for frontend)
   */
  app.post('/api/integrations/jira/test', requireAuth, async (req: Request, res: Response) => {
    try {
      console.log('Received Jira test request with body:', {
        ...req.body,
        apiToken: req.body.apiToken ? '[REDACTED]' : undefined
      });
      
      // Map the request directly
      const formValues = req.body;
      
      // Validate form values directly
      if (!formValues.baseUrl) {
        return res.status(400).json({
          success: false,
          message: 'Base URL is required'
        });
      }
      
      if (!formValues.email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }
      
      if (!formValues.apiToken) {
        return res.status(400).json({
          success: false,
          message: 'API Token is required'
        });
      }
      
      if (!formValues.projectKey) {
        return res.status(400).json({
          success: false,
          message: 'Project Key is required'
        });
      }
      
      // Create Jira config with frontend field names mapped to backend names
      const jiraConfig: JiraConfig = {
        enabled: formValues.enabled,
        host: String(formValues.baseUrl || ''),
        username: String(formValues.email || ''),
        apiToken: formValues.apiToken,
        projectKey: formValues.projectKey
      };
      
      console.log('Testing Jira connection with mapped config:', {
        ...jiraConfig,
        apiToken: '[REDACTED]' // Don't log the actual token
      });
      
      // Import the Jira client
      const { testJiraConnection } = await import('../integrations/jira-service');
      
      // Test the connection
      const result = await testJiraConnection(jiraConfig);
      
      return res.status(200).json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      console.error('Error testing Jira connection:', error);
      
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Invalid Jira configuration'
      });
    }
  });
}