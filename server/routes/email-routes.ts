import { Express, Request, Response } from 'express';
import { EmailConfig, setupEmailService, getEmailService } from '../email-service';
import { z } from 'zod';
import { storage } from '../storage';
import nodemailer from 'nodemailer';
import IMAP from 'imap';

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
    // Flag to track if we've already sent a response
    let responseSent = false;
    
    try {
      // Validate configuration
      const config = emailConfigSchema.parse(req.body);
      
      // Verify that SMTP authentication credentials are provided
      if (!config.smtp.auth.user || !config.smtp.auth.pass) {
        responseSent = true;
        return res.status(400).json({
          success: false,
          message: 'SMTP authentication credentials are incomplete',
          details: {
            smtpAuthComplete: !!config.smtp.auth.user && !!config.smtp.auth.pass
          }
        });
      }
      
      // Log if IMAP is not being configured
      if (!config.imap.auth.user || !config.imap.auth.pass) {
        console.log('Note: IMAP credentials not provided - SMTP-only configuration');
      }

      // Log the configuration being saved (without passwords)
      console.log(`Saving email config with SMTP user: ${config.smtp.auth.user}, IMAP user: ${config.imap.auth.user || 'not provided'}`);
      
      // Let the client know we're testing connection first
      responseSent = true;
      res.status(202).json({
        success: true,
        message: 'Verifying SMTP connection...',
        details: {
          smtpStatus: 'connecting',
          step: 'smtp_verification',
          timestamp: new Date().toISOString()
        }
      });
      
      // Verify SMTP connection before saving configuration
      try {
        // For Gmail, port 587 needs secure:false with STARTTLS
        const isPort587 = config.smtp.port === 587;
        const isPort465 = config.smtp.port === 465;
        
        // Force proper secure setting based on port
        const secureOption = isPort465;
        
        // Update config to match the correct settings
        config.smtp.secure = secureOption;
        
        console.log(`Testing SMTP connection for ${config.smtp.host}:${config.smtp.port} (secure: ${secureOption})`);
        
        // Create a temporary nodemailer transport to test connection with proper TLS settings
        const testTransport = nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: secureOption, // true for 465, false for other ports
          auth: {
            user: config.smtp.auth.user,
            pass: config.smtp.auth.pass
          },
          tls: {
            // Don't fail on invalid certs
            rejectUnauthorized: false,
          }
        });
        
        // Verify SMTP connection
        await testTransport.verify();
        console.log('SMTP connection test successful');
      } catch (smtpError: unknown) {
        // SMTP connection failed
        const errorMessage = smtpError instanceof Error ? smtpError.message : 'Unknown SMTP error';
        console.error(`SMTP connection test failed: ${errorMessage}`);
        
        const errorType = smtpError instanceof Error 
          ? smtpError.constructor.name 
          : 'UnknownError';
        
        // If we already sent the initial connecting response, we shouldn't send another response
        // Instead, the client will poll the /api/email/status endpoint to get the final status
        // So we'll just continue and let the process finish without email service setup
        if (responseSent) {
          console.log('Response already sent (202), not sending SMTP error response');
          // Break out of the function since we can't complete the setup
          return;
        }
        
        responseSent = true;
        return res.status(400).json({
          success: false,
          message: 'SMTP connection test failed',
          error: errorMessage,
          details: {
            smtpTest: 'failed',
            errorType,
            possibleCauses: [
              "Invalid SMTP server address or port",
              "Incorrect credentials",
              "Server rejects connection",
              "SSL/TLS configuration issue",
              "Firewall blocking connection"
            ],
            recommendations: [
              "Verify SMTP server address and port",
              "Check username and password",
              "For Gmail: Try port 587 with secure:false",
              "For Gmail: Use an app password if you have 2FA enabled",
              "Ensure your mail provider allows SMTP access"
            ]
          }
        });
      }
      
      // Setup email service with the validated config
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
      
      // Check if IMAP was configured
      const hasValidImapConfig = 
        config.imap && 
        config.imap.auth && 
        config.imap.auth.user && 
        config.imap.auth.pass;
      
      // Test IMAP connection if credentials were provided
      let imapTestResult: {success: boolean, error: string | null} = { success: false, error: null };
      if (hasValidImapConfig) {
        try {
          // Create a test IMAP client
          const testImapClient = new IMAP({
            user: config.imap.auth.user,
            password: config.imap.auth.pass,
            host: config.imap.host,
            port: config.imap.port,
            tls: config.imap.tls,
            authTimeout: config.imap.authTimeout,
            // Set a short connection timeout for testing
            connTimeout: 5000
          });
          
          // Create a promise that resolves/rejects based on IMAP connection
          const imapConnectionTest = new Promise<void>((resolve, reject) => {
            testImapClient.once('ready', () => {
              console.log('IMAP connection test successful');
              testImapClient.end();
              resolve();
            });
            
            testImapClient.once('error', (err: Error) => {
              console.error(`IMAP connection test failed: ${err.message}`);
              reject(err);
            });
            
            // Connect to IMAP server
            testImapClient.connect();
          });
          
          // Wait for the connection test with a timeout
          await Promise.race([
            imapConnectionTest,
            new Promise<void>((_, reject) => setTimeout(() => 
              reject(new Error('IMAP connection timeout')), 10000))
          ]);
          
          imapTestResult.success = true;
        } catch (imapError: unknown) {
          const errorMessage = imapError instanceof Error ? imapError.message : 'Unknown IMAP error';
          console.error(`IMAP connection failed: ${errorMessage}`);
          imapTestResult.error = errorMessage;
          
          // We continue with SMTP-only mode even if IMAP fails
          console.log('Continuing with SMTP-only mode due to IMAP connection failure');
        }
      }
      
      // Send a comprehensive response with confirmation details
      let responseMessage = 'SMTP-only email configuration saved';
      let imapStatus = 'not_configured';
      
      if (hasValidImapConfig) {
        if (imapTestResult.success) {
          responseMessage = 'Email configuration saved and monitoring started';
          imapStatus = 'connected';
        } else {
          responseMessage = 'Email configuration saved with SMTP only (IMAP connection failed)';
          imapStatus = 'connection_failed';
        }
      }
      
      // Check if we've already sent an intermediate response (the 202)
      if (!responseSent) {
        // If we haven't sent any response yet (the 202 connecting response), 
        // we can go ahead and send the final success response
        res.status(200).json({ 
          success: true,
          message: responseMessage,
          details: {
            configSaved: true,
            serviceName: 'Email Integration Service',
            serviceStatus: 'running',
            tenantId: req.user?.tenantId || 1,
            smtpConfigured: true,
            smtpStatus: 'connected',
            imapConfigured: hasValidImapConfig,
            imapStatus,
            imapError: imapTestResult.error,
            monitoringActive: hasValidImapConfig && imapTestResult.success,
            supportEmailSending: true,
            supportEmailReceiving: hasValidImapConfig && imapTestResult.success,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        // We've already sent the 202 response, so we can't send another.
        // The client will poll the email status endpoint to get the updated configuration.
        console.log('Response already sent (202), skipping final success response');
      }
    } catch (error: unknown) {
      // If Zod validation failed, this happens immediately before any response is sent
      if (error instanceof z.ZodError) {
        responseSent = true;
        return res.status(400).json({ 
          message: 'Invalid email configuration', 
          errors: error.errors 
        });
      }
      
      // Create a detailed error response with helpful debugging information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      
      // Only send an error response if we haven't sent one already
      if (!responseSent) {
        responseSent = true;
        res.status(500).json({ 
          success: false,
          message: `Error setting up email: ${errorMessage}`,
          details: {
            errorType,
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
      } else {
        console.log(`Error occurred but response already sent: ${errorMessage}`);
      }
    }
  });
  
  // Get email configuration status - public endpoint for use in the contact page and diagnostic tools
  app.get('/api/email/status', async (req: Request, res: Response) => {
    try {
      const emailService = getEmailService();
      
      // Check if email service is configured
      if (!emailService) {
        // Try to get configuration from database
        const tenantId = req.user?.tenantId || 1;
        const tenant = await storage.getTenantById(tenantId);
        
        if (tenant?.settings && typeof tenant.settings === 'object' && 'emailConfig' in tenant.settings) {
          // Found in database but not loaded in memory
          return res.status(200).json({ 
            configured: true,
            active: false,
            mode: 'saved_but_inactive',
            message: 'Email configuration exists but service is not running',
            details: {
              reason: 'Service not initialized',
              configSource: 'database',
              timestamp: new Date().toISOString()
            }
          });
        }
        
        // No configuration found at all
        return res.status(200).json({ 
          configured: false,
          active: false,
          mode: 'not_configured',
          message: 'Email support is not configured',
          details: {
            configRequired: true,
            configureLink: '/admin/email-settings',
            timestamp: new Date().toISOString()
          }
        });
      }
      
      // Email service is configured and running
      const config = emailService.getConfig();
      
      // Check if IMAP is configured (receiving capability)
      const hasImapConfig = 
        config.imap && 
        config.imap.auth && 
        config.imap.auth.user && 
        config.imap.auth.pass;
        
      // Don't include sensitive information, just the configuration status
      return res.status(200).json({ 
        configured: true,
        active: true,
        mode: hasImapConfig ? 'full' : 'smtp_only',
        message: hasImapConfig 
          ? 'Email system fully configured (send and receive)' 
          : 'Email system configured for sending only (SMTP)',
        supportEmail: config.settings.fromEmail,
        details: {
          fromName: config.settings.fromName,
          canSendEmails: true,
          canReceiveEmails: hasImapConfig,
          ticketSubjectPrefix: config.settings.ticketSubjectPrefix,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error getting email status: ${errorMessage}`);
      
      return res.status(500).json({
        configured: false,
        active: false,
        mode: 'error',
        message: 'Error retrieving email configuration status',
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      
      console.error(`Test email error: ${errorMessage}`);
      
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      
      console.error(`Error sending ticket email: ${errorMessage}`);
      
      res.status(500).json({ 
        success: false,
        message: `Error sending email: ${errorMessage}`,
        error: {
          type: errorType,
          details: errorMessage,
          timestamp: new Date().toISOString()
        }
      });
    }
  });
}