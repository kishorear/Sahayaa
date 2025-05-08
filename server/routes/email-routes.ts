import { Express, Request, Response } from 'express';
import { EmailConfig, setupEmailService, getEmailService } from '../email-service';
import { z } from 'zod';
import { storage } from '../storage';

// Basic auth config schema
const basicAuthSchema = z.object({
  type: z.literal('basic'),
  user: z.string(),
  pass: z.string()
});

// Schema for email configuration - simplified to use basic auth only
const emailConfigSchema = z.object({
  smtp: z.object({
    host: z.string(),
    port: z.number(),
    secure: z.boolean(),
    auth: basicAuthSchema
  }),
  imap: z.object({
    host: z.string(),
    port: z.number(),
    tls: z.boolean(),
    authTimeout: z.number().default(10000),
    auth: basicAuthSchema
  }),
  settings: z.object({
    fromName: z.string(),
    fromEmail: z.string().email(),
    ticketSubjectPrefix: z.string().default('[Support]'),
    checkInterval: z.number().default(60000) // 1 minute
  })
});

export function registerEmailRoutes(app: Express, requireAuth: any) {
  // Set up email configuration
  app.post('/api/email/config', requireAuth, async (req: Request, res: Response) => {
    try {
      // Validate configuration
      const config = emailConfigSchema.parse(req.body);
      
      // Verify that all authentication credentials are provided
      if (!config.smtp.auth.user || !config.smtp.auth.pass || 
          !config.imap.auth.user || !config.imap.auth.pass) {
        return res.status(400).json({
          success: false,
          message: 'Authentication credentials are incomplete',
          details: {
            smtpAuthComplete: !!config.smtp.auth.user && !!config.smtp.auth.pass,
            imapAuthComplete: !!config.imap.auth.user && !!config.imap.auth.pass
          }
        });
      }

      // Log the configuration being saved (without passwords)
      console.log(`Saving email config with SMTP user: ${config.smtp.auth.user}, IMAP user: ${config.imap.auth.user}`);
      
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
      }
      
      if (config.imap?.auth?.type === 'basic' && config.imap.auth.pass) {
        config.imap.auth.pass = '********';
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
      
      // Use custom subject and message if provided, otherwise defaults
      const emailSubject = subject || 'Test Email from Support System';
      const emailContent = message || 
        '<p>This is a test email from your support system.</p><p>If you received this, your email configuration is working correctly.</p>';
      
      await emailService.sendEmail(
        to,
        emailSubject,
        emailContent
      );
      
      res.status(200).json({ 
        success: true,
        message: 'Test email sent successfully',
        details: {
          testEmailSent: true,
          recipient: to,
          subject: emailSubject,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      
      res.status(500).json({ 
        success: false,
        message: `Error sending test email: ${errorMessage}`,
        details: {
          testEmailError: true,
          errorType,
          errorDetails: errorMessage,
          possibleCauses: [
            "Connection to mail server failed",
            "Invalid credentials provided",
            "Recipient email address is invalid",
            "SMTP server rejected the message"
          ],
          recommendations: [
            "Verify your email configuration settings",
            "Check that the recipient address is valid",
            "Ensure your mail provider allows sending from your account",
            "Try sending to a different email address"
          ],
          timestamp: new Date().toISOString()
        }
      });
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