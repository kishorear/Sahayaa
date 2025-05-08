import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { getEmailService } from '../email-service';

// Schema for email support requests
const emailSupportSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export function registerEmailSupportRoutes(app: Express) {
  // Handle email support requests without AI response
  app.post('/api/email-support', async (req: Request, res: Response) => {
    try {
      // Validate the request
      const validatedData = emailSupportSchema.parse(req.body);
      const { email, subject, message } = validatedData;
      
      // Get tenantId from the session or use default
      const tenantId = req.user?.tenantId || 1;
      
      // Simple auto-response text - no AI, just standard message
      const responseText = 
        "Thank you for contacting our support team. Your message has been received and we will review it shortly. " +
        "A support ticket has been created and a team member will get back to you as soon as possible.";
      
      // Format the full email response
      const fullEmailResponse = 
        `Dear Customer,\n\n${responseText}\n\nBest regards,\nThe Support Team`;
        
      // Get the email service
      const emailService = getEmailService();
      
      // Flag to track if emails were sent
      let emailsSent = false;
      
      // If email service is configured, send the emails
      if (emailService) {
        try {
          // Send the auto-response email to the customer
          await emailService.sendEmail(
            email,
            `Re: ${subject}`,
            `<p>${fullEmailResponse.replace(/\n/g, '<br/>')}</p>`
          );
          
          // Also send a notification to the support team email address
          const supportEmail = emailService.getConfig().settings.fromEmail;
          
          // Format the notification email for support team
          const notificationContent = `
            <h2>New Email Support Request</h2>
            <p><strong>From:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `;
          
          // Send notification to the support team
          await emailService.sendEmail(
            supportEmail,
            `[Support Request] ${subject}`,
            notificationContent
          );
          
          emailsSent = true;
        } catch (emailError) {
          console.error('Error sending emails:', emailError);
          // Continue processing even if email sending fails
        }
      } else {
        console.warn('Email service not configured. Processing support request without sending emails.');
      }
      
      // Log this as a support interaction by creating a ticket
      try {
        // Create a ticket in the system for tracking
        const ticket = await storage.createTicket({
          title: subject,
          description: message,
          status: 'new', // No longer automatically resolved - needs human review
          category: 'email_support',
          complexity: 'medium', // Default complexity
          tenantId,
          source: 'email',
          clientMetadata: { email, createdBy: 'email_support_system' }
        });
        
        // Add the initial message
        await storage.createMessage({
          ticketId: ticket.id,
          sender: 'customer',
          content: message,
        });
        
        // Add the auto-response message
        await storage.createMessage({
          ticketId: ticket.id,
          sender: 'system',
          content: responseText,
        });
      } catch (error) {
        console.error('Error logging email support interaction:', error);
        // Don't fail the request if logging fails
      }
      
      return res.status(200).json({
        message: emailsSent 
          ? 'Support request processed successfully' 
          : 'Support request processed successfully, but email delivery is not configured',
        autoResponse: responseText,
        emailSent: emailsSent,
        emailConfigured: !!emailService
      });
      
    } catch (error: any) {
      console.error('Error processing email support request:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid request data',
          errors: error.errors
        });
      }
      
      return res.status(500).json({
        message: 'Error processing support request',
        error: error.message || 'Unknown error'
      });
    }
  });
  
  // Handle regular contact form submissions
  app.post('/api/contact', async (req: Request, res: Response) => {
    try {
      const { name, email, subject, message } = req.body;
      
      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          message: 'Name, email, subject, and message are required'
        });
      }
      
      // Get the email service
      const emailService = getEmailService();
      
      if (!emailService) {
        // Rather than returning an error, we'll just log without sending emails
        console.warn('Email service not configured. Processing contact form without sending emails.');
        
        return res.status(200).json({
          message: 'Contact form submitted successfully, but email delivery is not configured',
          emailSent: false,
          emailConfigured: false
        });
      }
      
      // Format the notification email to be sent to the support team
      const notificationContent = `
        <h2>New Contact Form Submission</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `;
      
      // Get the support email address from the email configuration
      const supportEmail = emailService.getConfig().settings.fromEmail;
      
      // Send notification to the support team
      await emailService.sendEmail(
        supportEmail,
        `Contact Form: ${subject}`,
        notificationContent
      );
      
      // Send confirmation to the customer
      await emailService.sendEmail(
        email,
        `We received your message: ${subject}`,
        `<p>Dear ${name},</p>
        <p>Thank you for contacting us. We have received your message and will get back to you shortly.</p>
        <p>Best regards,<br>The Support Team</p>`
      );
      
      return res.status(200).json({
        message: 'Contact form submitted successfully',
        emailSent: true,
        emailConfigured: true
      });
      
    } catch (error: any) {
      console.error('Error processing contact form:', error);
      
      return res.status(500).json({
        message: 'Error processing contact form',
        error: error.message || 'Unknown error'
      });
    }
  });
}