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
          message: 'Thank you for contacting us! Your message has been received and our team will respond within 24-48 hours.',
          emailSent: false,
          emailConfigured: false,
          confirmationMessage: `Dear ${name}, thank you for contacting Sahayaa AI regarding "${subject}". We have received your message and will respond shortly.`
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
        `Thank you for contacting Sahayaa AI - ${subject}`,
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; margin-bottom: 20px;">Thank you for contacting Sahayaa AI</h2>
          <p>Dear ${name},</p>
          <p>We have successfully received your message regarding "<strong>${subject}</strong>" and appreciate you taking the time to reach out to us.</p>
          <p>Our support team will review your inquiry and respond within 24-48 hours during business days. If your matter is urgent, please don't hesitate to follow up with us.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Your message:</strong></p>
            <p style="margin: 10px 0 0 0; font-style: italic;">"${message}"</p>
          </div>
          <p>Thank you for choosing Sahayaa AI for your customer support needs.</p>
          <p style="margin-top: 30px;">Best regards,<br>
          <strong>The Sahayaa AI Support Team</strong><br>
          <a href="mailto:support@sahayaa.ai" style="color: #2563eb;">support@sahayaa.ai</a></p>
        </div>`
      );
      
      return res.status(200).json({
        message: 'Thank you for contacting us! Your message has been received and our team will respond within 24-48 hours.',
        emailSent: true,
        emailConfigured: true,
        confirmationMessage: `Dear ${name}, thank you for contacting Sahayaa AI regarding "${subject}". We have received your message and a confirmation email has been sent to ${email}.`
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