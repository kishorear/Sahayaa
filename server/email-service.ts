import nodemailer from 'nodemailer';
import * as IMAP from 'imap';
import { simpleParser } from 'mailparser';
import { storage } from './storage';
import { InsertTicket, InsertMessage } from '@shared/schema';
import { EventEmitter } from 'events';
import { log } from './vite';

// Email processing events
export const emailEvents = new EventEmitter();

// Authentication config for email
export type AuthType = 'basic';

export interface BasicAuthConfig {
  user: string;
  pass: string;
}

// Email auth config is simplified to basic auth only
export interface EmailAuthConfig {
  type: AuthType;
  user: string;
  pass: string;
}

// Email configuration - these would come from environment variables
export interface EmailConfig {
  // SMTP settings for sending emails
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: EmailAuthConfig;
  };
  // IMAP settings for receiving emails
  imap: {
    host: string;
    port: number;
    tls: boolean;
    authTimeout: number;
    auth: EmailAuthConfig;
  };
  // General email settings
  settings: {
    fromName: string;
    fromEmail: string;
    ticketSubjectPrefix: string;
    checkInterval: number; // in milliseconds
  };
}

// Sample template for responses
const EMAIL_TEMPLATES = {
  ticketCreated: (ticketId: number, ticketTitle: string) => `
    <div>
      <p>Thank you for contacting our support team. Your ticket has been created successfully.</p>
      <p>Ticket #${ticketId}: ${ticketTitle}</p>
      <p>We'll get back to you as soon as possible. Please keep this email for reference.</p>
    </div>
  `,
  ticketResolved: (solution: string) => `
    <div>
      <p>Good news! We've automatically resolved your support request.</p>
      <p>${solution}</p>
      <p>If this doesn't solve your issue, please reply to this email and our support team will assist you further.</p>
    </div>
  `,
  ticketResponse: (response: string) => `
    <div>
      <p>${response}</p>
      <p>If you have any further questions, please reply to this email.</p>
    </div>
  `
};

export class EmailService {
  private transporter: nodemailer.Transporter;
  private imapClient: IMAP;
  private config: EmailConfig;
  private checkingEmails: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  
  /**
   * Get the email service configuration
   * This is used for accessing settings like the "from" email address
   */
  public getConfig(): EmailConfig {
    return this.config;
  }

  constructor(config: EmailConfig) {
    this.config = config;

    // Initialize SMTP transport with basic authentication
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.auth.user,
        pass: config.smtp.auth.pass
      }
    });

    // Initialize IMAP client with basic authentication
    this.imapClient = new IMAP({
      user: config.imap.auth.user,
      password: config.imap.auth.pass,
      host: config.imap.host,
      port: config.imap.port,
      tls: config.imap.tls,
      authTimeout: config.imap.authTimeout
    });

    // Set up event listeners for IMAP client
    this.imapClient.on('error', (err: Error) => {
      log(`IMAP Error: ${err.message}`, 'email');
    });
  }

  // No OAuth-related methods needed

  // Start monitoring emails
  public startEmailMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(() => {
      this.checkEmails();
    }, this.config.settings.checkInterval);

    log('Email monitoring started', 'email');
  }

  // Stop monitoring emails
  public stopEmailMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    log('Email monitoring stopped', 'email');
  }

  // Check for new emails
  private async checkEmails(): Promise<void> {
    if (this.checkingEmails) {
      return; // Already checking
    }

    this.checkingEmails = true;

    this.imapClient.once('ready', () => {
      this.imapClient.openBox('INBOX', false, (err, box) => {
        if (err) {
          log(`Error opening inbox: ${err.message}`, 'email');
          this.checkingEmails = false;
          this.imapClient.end();
          return;
        }

        // Search for unread emails
        this.imapClient.search(['UNSEEN'], (err, results) => {
          if (err) {
            log(`Error searching emails: ${err.message}`, 'email');
            this.checkingEmails = false;
            this.imapClient.end();
            return;
          }

          if (results.length === 0) {
            this.checkingEmails = false;
            this.imapClient.end();
            return;
          }

          const fetch = this.imapClient.fetch(results, { bodies: [''], markSeen: true });

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) {
                  log(`Error parsing email: ${err.message}`, 'email');
                  return;
                }

                try {
                  // Process the email to create a ticket
                  await this.processEmail(parsed);
                } catch (error) {
                  log(`Error processing email: ${error.message}`, 'email');
                }
              });
            });
          });

          fetch.once('error', (err) => {
            log(`Fetch error: ${err.message}`, 'email');
            this.checkingEmails = false;
          });

          fetch.once('end', () => {
            this.imapClient.end();
            this.checkingEmails = false;
          });
        });
      });
    });

    this.imapClient.once('error', (err) => {
      log(`IMAP connection error: ${err.message}`, 'email');
      this.checkingEmails = false;
    });

    this.imapClient.once('end', () => {
      this.checkingEmails = false;
    });

    this.imapClient.connect();
  }

  // Process an email to create a ticket
  private async processEmail(email: any): Promise<void> {
    // Extract sender email
    const fromEmail = email.from?.value[0]?.address;
    const fromName = email.from?.value[0]?.name || fromEmail;
    const subject = email.subject || 'No Subject';
    const textContent = email.text || '';
    const htmlContent = email.html || '';

    if (!fromEmail) {
      log('Email missing sender information', 'email');
      return;
    }

    try {
      // Check if this is a reply to an existing ticket
      const ticketId = this.extractTicketIdFromSubject(subject);
      
      if (ticketId) {
        // This is a reply to an existing ticket
        await this.handleTicketReply(ticketId, fromEmail, fromName, textContent, htmlContent);
      } else {
        // This is a new ticket
        await this.createTicketFromEmail(fromEmail, fromName, subject, textContent, htmlContent);
      }
    } catch (error) {
      log(`Error processing email from ${fromEmail}: ${error.message}`, 'email');
    }
  }

  // Extract ticket ID from email subject if it's a reply
  private extractTicketIdFromSubject(subject: string): number | null {
    const prefix = this.config.settings.ticketSubjectPrefix;
    const regex = new RegExp(`${prefix}#(\\d+)`);
    const match = subject.match(regex);
    
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    
    return null;
  }

  // Handle a reply to an existing ticket
  private async handleTicketReply(
    ticketId: number, 
    fromEmail: string, 
    fromName: string, 
    textContent: string, 
    htmlContent: string
  ): Promise<void> {
    // Get the ticket
    const ticket = await storage.getTicketById(ticketId);
    
    if (!ticket) {
      log(`Ticket #${ticketId} not found for email reply from ${fromEmail}`, 'email');
      return;
    }

    // Create a message in the ticket
    const message: InsertMessage = {
      ticketId: ticketId,
      sender: 'user',
      content: textContent || 'Empty message',
      metadata: {
        fromEmail,
        fromName,
        hasHtml: !!htmlContent
      }
    };

    await storage.createMessage(message);
    
    // Update the ticket status if it was resolved
    if (ticket.status === 'resolved') {
      await storage.updateTicket(ticketId, { 
        status: 'in_progress', 
        aiResolved: false 
      });
    }

    // Send notification email with receipt confirmation
    await this.sendEmail(
      fromEmail,
      `${this.config.settings.ticketSubjectPrefix}#${ticketId}: Reply Received - ${ticket.title}`,
      `<div>
        <p>Thank you for your reply to support ticket #${ticketId}.</p>
        <p>Our support team has been notified and will review your message as soon as possible.</p>
        <p>Ticket Title: ${ticket.title}</p>
      </div>`
    );

    // Emit event for the system to know a new message was added
    emailEvents.emit('ticketUpdated', ticketId);
  }

  // Create a new ticket from an email
  private async createTicketFromEmail(
    fromEmail: string, 
    fromName: string, 
    subject: string, 
    textContent: string, 
    htmlContent: string
  ): Promise<void> {
    // Create a new ticket with source set to email and basic categorization
    const newTicket: InsertTicket = {
      title: subject,
      description: textContent || 'No description provided',
      status: 'new',
      category: 'email',
      complexity: 'medium' as any, // Default complexity for manual processing
      assignedTo: '', // Will need to be assigned manually by support staff
      source: 'email' // Clearly mark this as an email-generated ticket
    };

    const ticket = await storage.createTicket(newTicket);

    // Create initial message
    const message: InsertMessage = {
      ticketId: ticket.id,
      sender: 'user',
      content: textContent || 'Empty message',
      metadata: {
        fromEmail,
        fromName,
        hasHtml: !!htmlContent
      }
    };

    await storage.createMessage(message);

    // Send ticket created confirmation
    await this.sendEmail(
      fromEmail,
      `${this.config.settings.ticketSubjectPrefix}#${ticket.id}: Created - ${subject}`,
      EMAIL_TEMPLATES.ticketCreated(ticket.id, subject)
    );

    // Emit event for the system to know a new ticket was created
    emailEvents.emit('ticketCreated', ticket.id);
  }

  // Send an email
  public async sendEmail(to: string, subject: string, htmlContent: string): Promise<void> {
    try {
      // Send the email with basic authentication
      await this.transporter.sendMail({
        from: `"${this.config.settings.fromName}" <${this.config.settings.fromEmail}>`,
        to,
        subject,
        html: htmlContent
      });
      
      log(`Email sent to ${to}: ${subject}`, 'email');
    } catch (error) {
      log(`Error sending email to ${to}: ${error.message}`, 'email');
      throw error;
    }
  }

  // Send a notification email about a ticket update
  public async sendTicketUpdateEmail(
    ticketId: number, 
    recipientEmail: string, 
    subject: string, 
    message: string
  ): Promise<void> {
    return this.sendEmail(
      recipientEmail,
      `${this.config.settings.ticketSubjectPrefix}#${ticketId}: ${subject}`,
      EMAIL_TEMPLATES.ticketResponse(message)
    );
  }
}

// Initialize as null and set up in startup
let emailService: EmailService | null = null;

export function setupEmailService(config: EmailConfig): EmailService {
  emailService = new EmailService(config);
  return emailService;
}

export function getEmailService(): EmailService | null {
  return emailService;
}