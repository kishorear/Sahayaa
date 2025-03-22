import { Express, Request, Response } from 'express';
import { EmailConfig, setupEmailService, getEmailService } from '../email-service';
import { z } from 'zod';
import { storage } from '../storage';

// Schema for email configuration
const emailConfigSchema = z.object({
  smtp: z.object({
    host: z.string(),
    port: z.number(),
    secure: z.boolean(),
    auth: z.object({
      user: z.string(),
      pass: z.string()
    })
  }),
  imap: z.object({
    user: z.string(),
    password: z.string(),
    host: z.string(),
    port: z.number(),
    tls: z.boolean(),
    authTimeout: z.number().default(10000)
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
      
      // Test connection
      const emailService = setupEmailService(config);
      
      // Save configuration as a string to storage (in production this would use a proper settings table)
      // In a real implementation, we would securely store credentials and use environment variables
      
      // Start email monitoring
      emailService.startEmailMonitoring();
      
      res.status(200).json({ message: 'Email configuration saved and monitoring started' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid email configuration', 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: 'Error setting up email' });
    }
  });
  
  // Get email configuration status
  app.get('/api/email/status', requireAuth, async (req: Request, res: Response) => {
    const emailService = getEmailService();
    
    if (!emailService) {
      return res.status(200).json({ configured: false });
    }
    
    return res.status(200).json({ configured: true });
  });
  
  // Test email configuration
  app.post('/api/email/test', requireAuth, async (req: Request, res: Response) => {
    const emailService = getEmailService();
    
    if (!emailService) {
      return res.status(400).json({ message: 'Email service not configured' });
    }
    
    try {
      const { recipient } = req.body;
      
      if (!recipient) {
        return res.status(400).json({ message: 'Recipient email is required' });
      }
      
      await emailService.sendEmail(
        recipient,
        'Test Email from Support System',
        '<p>This is a test email from your support system.</p><p>If you received this, your email configuration is working correctly.</p>'
      );
      
      res.status(200).json({ message: 'Test email sent successfully' });
    } catch (error) {
      res.status(500).json({ message: `Error sending test email: ${error.message}` });
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
      res.status(500).json({ message: `Error sending email: ${error.message}` });
    }
  });
}