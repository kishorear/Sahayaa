import { Express, Request, Response } from 'express';
import { EmailConfig, setupEmailService, getEmailService } from '../email-service';
import { z } from 'zod';
import { storage } from '../storage';
import { google } from 'googleapis';

// Basic auth config schema
const basicAuthSchema = z.object({
  type: z.literal('basic'),
  user: z.string(),
  pass: z.string()
});

// OAuth2 auth config schema
const oauth2AuthSchema = z.object({
  type: z.literal('oauth2'),
  user: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  refreshToken: z.string(),
  accessToken: z.string().optional(),
  expires: z.number().optional()
});

// Combined auth schema with union type
const authConfigSchema = z.discriminatedUnion('type', [
  basicAuthSchema,
  oauth2AuthSchema
]);

// Schema for email configuration
const emailConfigSchema = z.object({
  smtp: z.object({
    host: z.string(),
    port: z.number(),
    secure: z.boolean(),
    auth: authConfigSchema
  }),
  imap: z.object({
    user: z.string(),
    host: z.string(),
    port: z.number(),
    tls: z.boolean(),
    authTimeout: z.number().default(10000),
    auth: authConfigSchema
  }),
  settings: z.object({
    fromName: z.string(),
    fromEmail: z.string().email(),
    ticketSubjectPrefix: z.string().default('[Support]'),
    checkInterval: z.number().default(60000) // 1 minute
  })
});

// Google API OAuth scopes
const GOOGLE_MAIL_SCOPES = [
  'https://mail.google.com/',                 // Full access to Gmail account (read/send/modify/delete)
  'https://www.googleapis.com/auth/gmail.send', // Send emails only
  'https://www.googleapis.com/auth/gmail.modify', // Read, send, modify but not delete
  'https://www.googleapis.com/auth/gmail.readonly' // Read only access
];

export function registerEmailRoutes(app: Express, requireAuth: any) {
  
  // Google OAuth2 authorization URL generation endpoint
  app.post('/api/email/oauth/google/authorize', requireAuth, async (req: Request, res: Response) => {
    try {
      const { clientId, clientSecret, redirectUri } = req.body;
      
      if (!clientId || !clientSecret) {
        return res.status(400).json({ 
          message: 'Client ID and Client Secret are required' 
        });
      }

      // Create an OAuth client
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri || 'https://developers.google.com/oauthplayground'
      );
      
      // Generate the authorization URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required to get a refresh token
        scope: GOOGLE_MAIL_SCOPES,
        prompt: 'consent' // Force user consent screen to get new refresh token
      });
      
      res.status(200).json({ 
        authUrl,
        message: 'Authorization URL generated successfully' 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        message: `Error generating authorization URL: ${errorMessage}` 
      });
    }
  });
  
  // Exchange authorization code for tokens
  app.post('/api/email/oauth/google/token', requireAuth, async (req: Request, res: Response) => {
    try {
      const { clientId, clientSecret, code, redirectUri } = req.body;
      
      if (!clientId || !clientSecret || !code) {
        return res.status(400).json({ 
          message: 'Client ID, Client Secret, and Authorization Code are required' 
        });
      }
      
      // Create an OAuth client
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri || 'https://developers.google.com/oauthplayground'
      );
      
      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      // Return tokens but mask sensitive data for security
      const tokenResponse = {
        accessToken: tokens.access_token ? '********' : undefined,
        refreshToken: tokens.refresh_token ? '********' : undefined, 
        expiryDate: tokens.expiry_date,
        hasRefreshToken: !!tokens.refresh_token,
        message: 'Authorization successful'
      };
      
      // Store the actual tokens in the session for temporary use
      if (req.session) {
        req.session.tempOAuth = {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date
        };
      }
      
      res.status(200).json(tokenResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        message: `Error exchanging authorization code for tokens: ${errorMessage}` 
      });
    }
  });
  
  // Configure email with OAuth tokens
  app.post('/api/email/oauth/configure', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.session?.tempOAuth) {
        return res.status(400).json({ 
          message: 'OAuth tokens not found in session. Please complete the authorization process first.' 
        });
      }
      
      const { 
        smtpHost, 
        smtpPort, 
        smtpSecure, 
        imapHost, 
        imapPort, 
        imapTls, 
        email, 
        fromName,
        ticketSubjectPrefix,
        checkInterval
      } = req.body;
      
      // Basic validation
      if (!smtpHost || !smtpPort || !imapHost || !imapPort || !email || !fromName) {
        return res.status(400).json({ 
          message: 'All email configuration fields are required' 
        });
      }
      
      // Build email configuration with OAuth tokens
      const config = {
        smtp: {
          host: smtpHost,
          port: Number(smtpPort),
          secure: smtpSecure !== undefined ? Boolean(smtpSecure) : true,
          auth: {
            type: 'oauth2',
            user: email,
            clientId: req.body.clientId,
            clientSecret: req.body.clientSecret,
            refreshToken: req.session.tempOAuth.refreshToken,
            accessToken: req.session.tempOAuth.accessToken,
            expires: req.session.tempOAuth.expiryDate
          }
        },
        imap: {
          user: email,
          host: imapHost,
          port: Number(imapPort),
          tls: imapTls !== undefined ? Boolean(imapTls) : true,
          authTimeout: 10000,
          auth: {
            type: 'oauth2',
            user: email,
            clientId: req.body.clientId,
            clientSecret: req.body.clientSecret,
            refreshToken: req.session.tempOAuth.refreshToken,
            accessToken: req.session.tempOAuth.accessToken,
            expires: req.session.tempOAuth.expiryDate
          }
        },
        settings: {
          fromName: fromName,
          fromEmail: email,
          ticketSubjectPrefix: ticketSubjectPrefix || '[Support]',
          checkInterval: Number(checkInterval) || 60000
        }
      };
      
      // Setup the email service
      const emailService = setupEmailService(config);
      
      // Save to tenant settings
      try {
        const tenantId = req.user?.tenantId || 1;
        const tenant = await storage.getTenantById(tenantId);
        
        if (tenant) {
          const updatedSettings = {
            ...(tenant.settings || {}),
            emailConfig: config
          };
          
          await storage.updateTenant(tenantId, {
            settings: updatedSettings
          });
        }
      } catch (storageError) {
        console.error('Error saving OAuth email config:', storageError);
      }
      
      // Start email monitoring
      emailService.startEmailMonitoring();
      
      // Clear temp OAuth tokens from session
      delete req.session.tempOAuth;
      
      res.status(200).json({ 
        message: 'Email configuration with OAuth saved and monitoring started' 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        message: `Error configuring email with OAuth: ${errorMessage}` 
      });
    }
  });
  // Set up email configuration
  app.post('/api/email/config', requireAuth, async (req: Request, res: Response) => {
    try {
      // Validate configuration
      const config = emailConfigSchema.parse(req.body);
      
      // Test connection
      const emailService = setupEmailService(config);
      
      // Save configuration to tenant settings
      // In a real implementation, we would securely store credentials
      try {
        const tenantId = req.user?.tenantId || 1;
        const tenant = await storage.getTenantById(tenantId);
        
        if (tenant) {
          // Update tenant settings with email configuration
          const updatedSettings = {
            ...(tenant.settings || {}),
            emailConfig: config
          };
          
          await storage.updateTenant(tenantId, {
            settings: updatedSettings
          });
          
          console.log(`Email configuration saved for tenant ${tenantId}`);
        } else {
          console.error(`Tenant ${tenantId} not found`);
        }
      } catch (storageError) {
        console.error('Error saving email configuration to database:', storageError);
        // We'll continue even if storage fails, as the in-memory service is still set up
      }
      
      // Start email monitoring
      emailService.startEmailMonitoring();
      
      // Send a comprehensive response with confirmation details
      res.status(200).json({ 
        success: true,
        message: 'Email configuration saved and monitoring started',
        details: {
          configSaved: true,
          serviceName: 'Email Integration Service',
          serviceStatus: 'running',
          tenantId: req.user?.tenantId || 1,
          smtpConfigured: true,
          imapConfigured: true,
          monitoringActive: true,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid email configuration', 
          errors: error.errors 
        });
      }
      // Create a detailed error response with helpful debugging information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ 
        success: false,
        message: `Error setting up email: ${errorMessage}`,
        details: {
          errorType: error.constructor.name,
          timestamp: new Date().toISOString(),
          tenantId: req.user?.tenantId || 1,
          configProcessed: false,
          possibleCauses: [
            "Connection to mail server failed",
            "Invalid credentials provided",
            "Server may be blocking connection",
            "Firewall or network issues"
          ],
          recommendations: [
            "Check mail server URLs and ports",
            "Verify username and password",
            "Ensure your mail provider allows third-party connections",
            "For Gmail, check 'Allow less secure apps' or use app passwords"
          ]
        }
      });
    }
  });
  
  // Get email configuration status - public endpoint for use in the contact page
  app.get('/api/email/status', async (req: Request, res: Response) => {
    const emailService = getEmailService();
    
    if (!emailService) {
      return res.status(200).json({ configured: false });
    }
    
    // Don't include sensitive information, just the configuration status
    return res.status(200).json({ 
      configured: true,
      // Include the support email address for displaying on the contact page
      supportEmail: emailService.getConfig().settings.fromEmail 
    });
  });
  
  // Get full email configuration - admin only
  app.get('/api/email/config', requireAuth, async (req: Request, res: Response) => {
    try {
      // Get current email configuration
      const emailService = getEmailService();
      
      if (!emailService) {
        // Try to get from database
        const tenantId = req.user?.tenantId || 1;
        const tenant = await storage.getTenantById(tenantId);
        
        if (tenant?.settings && typeof tenant.settings === 'object' && 'emailConfig' in tenant.settings) {
          // Found in database but not loaded in memory
          return res.status(200).json(tenant.settings.emailConfig);
        }
        
        // No config found
        return res.status(200).json({ 
          message: 'No email configuration found',
          config: null
        });
      }
      
      // Return the current configuration
      const config = emailService.getConfig();
      
      // Mask passwords/secrets for security
      if (config.smtp?.auth?.type === 'basic' && config.smtp.auth.pass) {
        config.smtp.auth.pass = '********';
      } else if (config.smtp?.auth?.type === 'oauth2') {
        // Mask OAuth secrets
        if (config.smtp.auth.clientSecret) {
          config.smtp.auth.clientSecret = '********';
        }
        if (config.smtp.auth.refreshToken) {
          config.smtp.auth.refreshToken = '********';
        }
        if (config.smtp.auth.accessToken) {
          config.smtp.auth.accessToken = '********';
        }
      }
      
      if (config.imap?.auth?.type === 'basic' && config.imap.auth.pass) {
        config.imap.auth.pass = '********';
      } else if (config.imap?.auth?.type === 'oauth2') {
        // Mask OAuth secrets
        if (config.imap.auth.clientSecret) {
          config.imap.auth.clientSecret = '********';
        }
        if (config.imap.auth.refreshToken) {
          config.imap.auth.refreshToken = '********';
        }
        if (config.imap.auth.accessToken) {
          config.imap.auth.accessToken = '********';
        }
      }
      
      return res.status(200).json(config);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message: `Error retrieving email configuration: ${errorMessage}` });
    }
  });
  
  // Test email configuration
  app.post('/api/email/test', requireAuth, async (req: Request, res: Response) => {
    const emailService = getEmailService();
    
    if (!emailService) {
      return res.status(400).json({ message: 'Email service not configured' });
    }
    
    try {
      const { to, subject, message } = req.body;
      
      if (!to) {
        return res.status(400).json({ message: 'Recipient email is required' });
      }
      
      await emailService.sendEmail(
        to,
        'Test Email from Support System',
        '<p>This is a test email from your support system.</p><p>If you received this, your email configuration is working correctly.</p>'
      );
      
      res.status(200).json({ message: 'Test email sent successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message: `Error sending test email: ${errorMessage}` });
    }
  });
  
  // Send email for a ticket
  app.post('/api/tickets/:ticketId/email', requireAuth, async (req: Request, res: Response) => {
    const emailService = getEmailService();
    
    if (!emailService) {
      return res.status(400).json({ message: 'Email service not configured' });
    }
    
    try {
      const ticketId = parseInt(req.params.ticketId);
      const { recipient, subject, message } = req.body;
      
      if (!recipient || !subject || !message) {
        return res.status(400).json({ message: 'Recipient, subject, and message are required' });
      }
      
      const ticket = await storage.getTicketById(ticketId);
      
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      await emailService.sendTicketUpdateEmail(ticketId, recipient, subject, message);
      
      // Create a message in the ticket to record this email
      await storage.createMessage({
        ticketId,
        sender: 'support',
        content: `Email sent to ${recipient}: ${message}`,
        metadata: {
          emailSent: true,
          recipient,
          subject
        }
      });
      
      res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      res.status(500).json({ message: `Error sending email: ${errorMessage}` });
    }
  });
}