import nodemailer from 'nodemailer';
import * as IMAP from 'imap';
import { simpleParser } from 'mailparser';
import { storage } from './storage';
import { InsertTicket, InsertMessage } from '@shared/schema';
import { EventEmitter } from 'events';
import { log } from './vite';
import { generateChatResponse } from './ai';
import { AIProviderFactory } from './ai/providers';

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
    enableAiResponses?: boolean; // Toggle for AI-generated responses to emails
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
    // Determine settings based on port and provider
    const isPort465 = config.smtp.port === 465;
    const isPort587 = config.smtp.port === 587;
    const isGmail = config.smtp.host.includes('gmail.com');
    
    // Set secure flag based on port (in general, 465 uses SSL and needs secure: true)
    config.smtp.secure = isPort465; 
    
    console.log(`Setting up SMTP transport for ${config.smtp.host}:${config.smtp.port} (secure: ${config.smtp.secure}, isGmail: ${isGmail})`);
    
    // Default transport config
    let transportConfig: any = {
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.auth.user,
        pass: config.smtp.auth.pass
      },
      tls: {
        // Don't fail on invalid certs
        rejectUnauthorized: false
      }
    };
    
    // For Gmail, use service shorthand which auto-configures everything
    if (isGmail) {
      console.log('[DEBUG] Using Gmail-specific SMTP service configuration');
      
      // Special handling for Gmail
      transportConfig = {
        service: 'gmail', // Nodemailer will auto-configure the correct settings
        auth: {
          user: config.smtp.auth.user,
          pass: config.smtp.auth.pass // This should be an app password if 2FA is enabled
        },
        tls: {
          rejectUnauthorized: false
        }
      };
      
      // Log diagnostic information
      console.log(`[DEBUG] Gmail configuration - User: ${config.smtp.auth.user}`);
      console.log('[DEBUG] Gmail password length:', config.smtp.auth.pass ? config.smtp.auth.pass.length : 'null/undefined');
      console.log('[DEBUG] Note: Gmail requires app passwords if 2FA is enabled (https://myaccount.google.com/apppasswords)');
    }
    
    // Special handling for port 587 (STARTTLS) for non-Gmail providers
    if (isPort587 && !isGmail) {
      console.log('Using port 587 special configuration for non-Gmail provider');
      transportConfig.secure = false;
      transportConfig.requireTLS = true;
    }
    
    // Create the transporter with our configuration
    this.transporter = nodemailer.createTransport(transportConfig);

    // Check if IMAP credentials are provided
    const hasValidImapConfig = 
      config.imap && 
      config.imap.auth && 
      config.imap.auth.user && 
      config.imap.auth.pass;
    
    // Initialize imapClient with a dummy value to satisfy TypeScript
    this.imapClient = this.createDummyImapClient();
    
    // Initialize IMAP client only if authentication credentials are provided
    if (hasValidImapConfig) {
      try {
        // Create a real IMAP client for email receiving
        const imapConfig: IMAP.Config = {
          user: config.imap.auth.user,
          password: config.imap.auth.pass,
          host: config.imap.host,
          port: config.imap.port,
          tls: config.imap.tls,
          authTimeout: config.imap.authTimeout,
          // Add timeout to prevent hanging connections
          connTimeout: 10000
        };
        
        this.imapClient = new IMAP(imapConfig);
        
        // Set up event listeners for IMAP client
        this.imapClient.on('error', (err: Error) => {
          log(`IMAP Error: ${err.message}`, 'email');
          emailEvents.emit('imap-error', { error: err.message });
        });
        
        this.imapClient.on('end', () => {
          log('IMAP connection ended', 'email');
        });
        
        log('IMAP client configured successfully', 'email');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`Error initializing IMAP client: ${errorMessage}`, 'email');
        
        // Create a dummy IMAP client since the real one failed to initialize
        // This is already done above, so no need to call createDummyImapClient again
      }
    } else {
      log('IMAP configuration not provided - Email receiving functionality will be disabled', 'email');
      // The dummy client is already created, so no need to call createDummyImapClient again
    }
  }
  
  /**
   * Creates a dummy IMAP client that won't be used but prevents null errors
   * This allows the service to operate in SMTP-only mode
   * @returns IMAP client instance that won't be used for actual connections
   */
  private createDummyImapClient(): IMAP {
    // Create a dummy IMAP client - it won't be used but prevents null errors
    const dummyConfig: IMAP.Config = {
      user: 'dummy',
      password: 'dummy',
      host: 'localhost',
      port: 143,
      tls: false,
      authTimeout: 1000
    };
    
    log('Creating dummy IMAP client for SMTP-only mode', 'email');
    return new IMAP(dummyConfig);
  }

  // No OAuth-related methods needed

  // Start monitoring emails
  public startEmailMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Skip setting up email monitoring if IMAP is not configured
    const hasValidImapConfig = 
      this.config.imap && 
      this.config.imap.auth && 
      this.config.imap.auth.user && 
      this.config.imap.auth.pass;
    
    if (!hasValidImapConfig) {
      log('Email monitoring not started - SMTP-only mode active (IMAP not configured)', 'email');
      return;
    }

    this.checkInterval = setInterval(() => {
      this.checkEmails();
    }, this.config.settings.checkInterval);

    log('Email monitoring started - checking for new emails every ' + 
      (this.config.settings.checkInterval / 1000) + ' seconds', 'email');
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
    // Skip email checking if IMAP is not configured properly
    const hasValidImapConfig = 
      this.config.imap && 
      this.config.imap.auth && 
      this.config.imap.auth.user && 
      this.config.imap.auth.pass;
    
    if (!hasValidImapConfig) {
      log('Skipping email check - IMAP not configured', 'email');
      return;
    }
    
    if (this.checkingEmails) {
      log('Email check already in progress, skipping', 'email');
      return; // Already checking
    }

    this.checkingEmails = true;
    let connectionTimeout: NodeJS.Timeout | null = null;
    
    try {
      // Add a safety timeout to prevent hanging if IMAP connection fails silently
      const safetyPromise = new Promise<void>((_resolve, reject) => {
        connectionTimeout = setTimeout(() => {
          reject(new Error('IMAP connection timeout - safety mechanism'));
          this.checkingEmails = false;
          
          if (this.imapClient && this.imapClient.state !== 'disconnected') {
            try {
              this.imapClient.end();
            } catch (endError) {
              // Ignore errors during forced disconnect
            }
          }
        }, 30000); // 30 second safety timeout
      });
      
      // Create a promise for the actual IMAP operations
      const checkEmailsPromise = new Promise<void>((resolve, reject) => {
        // Set up event handlers
        this.imapClient.once('ready', () => {
          log('IMAP connection ready, opening inbox', 'email');
          
          this.imapClient.openBox('INBOX', false, (err, box) => {
            if (err) {
              log(`Error opening inbox: ${err.message}`, 'email');
              reject(err);
              return;
            }

            // Search for unread emails
            this.imapClient.search(['UNSEEN'], (err, results) => {
              if (err) {
                log(`Error searching emails: ${err.message}`, 'email');
                reject(err);
                return;
              }

              log(`Found ${results.length} unread emails`, 'email');
              
              if (results.length === 0) {
                resolve();
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
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                      log(`Error processing email: ${errorMessage}`, 'email');
                    }
                  });
                });
              });

              fetch.once('error', (err) => {
                log(`Fetch error: ${err.message}`, 'email');
                // Don't reject here, let the process continue for other emails
              });

              fetch.once('end', () => {
                log('Email fetch completed', 'email');
                resolve();
              });
            });
          });
        });

        this.imapClient.once('error', (err) => {
          log(`IMAP connection error: ${err.message}`, 'email');
          reject(err);
        });

        this.imapClient.once('end', () => {
          log('IMAP connection ended', 'email');
          resolve();
        });

        // Start the connection
        log('Connecting to IMAP server...', 'email');
        this.imapClient.connect();
      });
      
      // Race between the actual operation and the safety timeout
      await Promise.race([checkEmailsPromise, safetyPromise]);
      
      // Clear the safety timeout if we got here
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
      }
      
      log('Email check completed successfully', 'email');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Error checking emails: ${errorMessage}`, 'email');
      
      // Emit error event so the system can be aware of issues
      emailEvents.emit('email-check-error', { error: errorMessage });
    } finally {
      // Clean up
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      // Make sure the connection is properly closed
      if (this.imapClient && this.imapClient.state !== 'disconnected') {
        try {
          this.imapClient.end();
        } catch (endError) {
          // Ignore errors during disconnection
        }
      }
      
      this.checkingEmails = false;
    }
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
  
  /**
   * Generate an AI response for an email-based ticket
   * This uses the configured AI provider for the tenant to generate a helpful response
   * 
   * @param ticketId The ID of the ticket to generate a response for
   * @returns True if an AI response was successfully generated and sent
   */
  private async generateAndSendAIResponse(ticketId: number): Promise<boolean> {
    try {
      log(`Attempting to generate AI response for ticket #${ticketId}`, 'email');
      
      // Get the ticket details including tenant
      const ticket = await storage.getTicketById(ticketId);
      if (!ticket) {
        log(`Ticket #${ticketId} not found for AI response generation`, 'email');
        return false;
      }
      
      // Get the messages in this ticket
      const messages = await storage.getMessagesByTicketId(ticketId);
      if (!messages || messages.length === 0) {
        log(`No messages found in ticket #${ticketId} for AI response`, 'email');
        return false;
      }
      
      // Convert the messages to ChatMessage format for the AI
      const chatMessages = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
      
      // Get the user's email who created the ticket
      const lastUserMessageObj = messages.filter(msg => msg.sender === 'user').pop();
      if (!lastUserMessageObj || !lastUserMessageObj.metadata || !lastUserMessageObj.metadata.fromEmail) {
        log(`Could not determine user email for ticket #${ticketId}`, 'email');
        return false;
      }
      
      const userEmail = lastUserMessageObj.metadata.fromEmail;
      
      // Get the user's most recent message content
      const lastUserMessageText = lastUserMessageObj.content || '';
      
      // Generate AI response using the correct parameter order
      const aiResponse = await generateChatResponse(
        {
          id: ticketId,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          tenantId: ticket.tenantId
        },
        chatMessages,
        lastUserMessageText
      );
      
      if (!aiResponse) {
        log(`Failed to generate AI response for ticket #${ticketId}`, 'email');
        return false;
      }
      
      log(`AI response generated for ticket #${ticketId}`, 'email');
      
      // Create a new message in the ticket with the AI response
      const aiMessage = await storage.createMessage({
        ticketId,
        sender: 'assistant',
        content: aiResponse,
        metadata: {
          generatedBy: 'ai',
          system: true
        }
      });
      
      // Send email with the AI response
      const emailSubject = `${this.config.settings.ticketSubjectPrefix}#${ticketId}: Re: ${ticket.title}`;
      const emailHtml = `
        <div>
          <p>Thank you for contacting our support team. Here's an automated response to your inquiry:</p>
          <div style="padding: 15px; border-left: 4px solid #0066cc; background-color: #f9f9f9; margin: 15px 0;">
            ${aiResponse.replace(/\n/g, '<br>')}
          </div>
          <p>This is an automated response. If you need further assistance, please reply to this email.</p>
          <p>Ticket #${ticketId} remains open in our system and our support team will review it.</p>
        </div>
      `;
      
      await this.sendEmail(userEmail, emailSubject, emailHtml);
      log(`AI response email sent to ${userEmail} for ticket #${ticketId}`, 'email');
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log(`Error generating AI response for ticket #${ticketId}: ${errorMessage}`, 'email');
      return false;
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

    // Try to generate an AI response to the user's reply only if enabled in settings
    if (this.config.settings.enableAiResponses !== false) { // Default to true if undefined
      try {
        const aiResponseSent = await this.generateAndSendAIResponse(ticketId);
        if (aiResponseSent) {
          log(`AI response successfully generated and sent for ticket reply #${ticketId}`, 'email');
        } else {
          log(`AI response generation skipped for ticket reply #${ticketId}`, 'email');
        }
      } catch (aiError) {
        // Don't fail if AI response generation fails
        log(`Error generating AI response for ticket reply #${ticketId}: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`, 'email');
      }
    } else {
      log(`AI responses are disabled in configuration - skipping for ticket reply #${ticketId}`, 'email');
    }

    // Emit event for the system to know a new message was added
    emailEvents.emit('ticketUpdated', ticketId);
  }

  /**
   * Detect errors in message content using AI
   * 
   * @param content The message content to analyze for errors
   * @param tenantId Optional tenant ID for AI provider context
   * @returns An object containing error detection results
   */
  private async detectErrorsInContent(
    content: string,
    subject: string,
    tenantId?: number
  ): Promise<{ 
    hasError: boolean; 
    errorTitle: string; 
    errorDescription: string;
    errorCategory: string;
    errorSeverity: 'low' | 'medium' | 'high';
  }> {
    try {
      if (!content || content.trim().length === 0) {
        return { 
          hasError: false, 
          errorTitle: '',
          errorDescription: '',
          errorCategory: '',
          errorSeverity: 'low'
        };
      }
      
      // Call AI provider to analyze content for errors
      const provider = AIProviderFactory.getProviderForOperation(tenantId || 1, 'chat');
      
      if (!provider) {
        log(`No AI provider available for error detection`, 'email');
        return { 
          hasError: false, 
          errorTitle: '',
          errorDescription: '',
          errorCategory: '',
          errorSeverity: 'low'
        };
      }
      
      const systemPrompt = `
        You are an error detection system that analyzes customer support emails.
        Determine if the email describes an error, issue, or problem that needs technical attention.
        If an error is detected, provide a concise error title, detailed description, category, and severity level.
        Format your response as JSON with the following fields:
        - hasError: boolean indicating if an error is detected
        - errorTitle: a concise title for the error (only if hasError is true)
        - errorDescription: detailed explanation of the error (only if hasError is true)
        - errorCategory: one of [software_bug, configuration_issue, user_error, hardware_problem, security_incident, performance_issue, other] (only if hasError is true)
        - errorSeverity: one of [low, medium, high] (only if hasError is true)
      `;
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Subject: ${subject}\n\nEmail Content: ${content}` }
      ];
      
      // Call AI provider with appropriate parameters
      const response = await provider.generateChatResponse(messages, '', '');
      
      // Parse response as JSON
      try {
        const result = JSON.parse(response);
        
        // Validate result structure and return
        return {
          hasError: !!result.hasError,
          errorTitle: result.hasError ? (result.errorTitle || 'Unspecified Error') : '',
          errorDescription: result.hasError ? (result.errorDescription || 'No description provided') : '',
          errorCategory: result.hasError ? (result.errorCategory || 'other') : '',
          errorSeverity: result.hasError ? 
            (result.errorSeverity === 'low' || result.errorSeverity === 'medium' || result.errorSeverity === 'high' 
              ? result.errorSeverity 
              : 'medium') 
            : 'low'
        };
      } catch (parseError) {
        log(`Error parsing AI response for error detection: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`, 'email');
        return { 
          hasError: false, 
          errorTitle: '',
          errorDescription: '',
          errorCategory: '',
          errorSeverity: 'low'
        };
      }
    } catch (error) {
      log(`Error detecting errors in content: ${error instanceof Error ? error.message : 'Unknown error'}`, 'email');
      return { 
        hasError: false, 
        errorTitle: '',
        errorDescription: '',
        errorCategory: '',
        errorSeverity: 'low'
      };
    }
  }

  /**
   * Create an error ticket based on detected error in email
   * 
   * @param errorInfo Information about the detected error
   * @param originalTicketId ID of the original ticket that contains the error
   * @param fromEmail Email of the sender for notifications
   * @returns The created error ticket ID or null if creation failed
   */
  private async createErrorTicket(
    errorInfo: { 
      errorTitle: string; 
      errorDescription: string;
      errorCategory: string;
      errorSeverity: 'low' | 'medium' | 'high';
    },
    originalTicketId: number,
    fromEmail: string,
    fromName: string
  ): Promise<number | null> {
    try {
      // Determine complexity based on severity
      let complexity: 'simple' | 'medium' | 'complex';
      switch (errorInfo.errorSeverity) {
        case 'low':
          complexity = 'simple';
          break;
        case 'high':
          complexity = 'complex';
          break;
        default:
          complexity = 'medium';
      }
      
      // Create a new ticket for the error
      const errorTicket: InsertTicket = {
        title: `[ERROR] ${errorInfo.errorTitle}`,
        description: `${errorInfo.errorDescription}\n\nThis error was automatically detected in ticket #${originalTicketId}.`,
        status: 'new',
        category: errorInfo.errorCategory || 'technical_issue',
        complexity: complexity as any,
        assignedTo: '', // Will need assignment by support team
        source: 'auto_detected'
        // Note: priority is handled in classification process, not directly set here
      };
      
      const ticket = await storage.createTicket(errorTicket);
      
      // Create initial message to document error detection
      const message: InsertMessage = {
        ticketId: ticket.id,
        sender: 'system',
        content: `This ticket was automatically created after detecting an error in ticket #${originalTicketId}.\n\nError category: ${errorInfo.errorCategory}\nSeverity: ${errorInfo.errorSeverity}\n\nOriginal description: ${errorInfo.errorDescription}`,
        metadata: {
          fromEmail,
          fromName,
          autoDetected: true,
          originalTicketId,
          errorSeverity: errorInfo.errorSeverity
        }
      };
      
      await storage.createMessage(message);
      
      log(`Created error ticket #${ticket.id} from detecting error in ticket #${originalTicketId}`, 'email');
      
      return ticket.id;
    } catch (error) {
      log(`Failed to create error ticket: ${error instanceof Error ? error.message : 'Unknown error'}`, 'email');
      return null;
    }
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

    // Try to generate an AI response only if enabled in settings
    if (this.config.settings.enableAiResponses !== false) { // Default to true if undefined
      try {
        // First, detect if there are errors in the email content
        const errorDetection = await this.detectErrorsInContent(textContent, subject, ticket.tenantId);
        
        // If an error is detected, create a separate error ticket
        if (errorDetection.hasError) {
          const errorTicketId = await this.createErrorTicket(
            errorDetection,
            ticket.id,
            fromEmail,
            fromName
          );
          
          if (errorTicketId) {
            log(`Error detected in email. Created error ticket #${errorTicketId} linked to original ticket #${ticket.id}`, 'email');
            
            // Update the original ticket with a reference to the error ticket
            await storage.createMessage({
              ticketId: ticket.id,
              sender: 'system',
              content: `An error has been detected in this email and a separate ticket #${errorTicketId} has been created to track and resolve it.`,
              metadata: {
                errorTicketId,
                autoDetected: true
              }
            });
          }
        }
        
        // Proceed with generating AI response for the original ticket
        const aiResponseSent = await this.generateAndSendAIResponse(ticket.id);
        if (aiResponseSent) {
          log(`AI response successfully generated and sent for new ticket #${ticket.id}`, 'email');
        } else {
          log(`AI response generation skipped for new ticket #${ticket.id}`, 'email');
        }
      } catch (aiError) {
        // Don't fail if AI processing fails
        log(`Error in AI processing for new ticket #${ticket.id}: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`, 'email');
      }
    } else {
      log(`AI responses are disabled in configuration - skipping for new ticket #${ticket.id}`, 'email');
    }

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
  // Validate SMTP configuration
  if (!config.smtp || !config.smtp.auth || !config.smtp.auth.user || !config.smtp.auth.pass) {
    throw new Error('SMTP configuration is incomplete');
  }
  
  // Set default values for IMAP if not provided to prevent runtime errors
  const hasValidImapConfig = 
    config.imap && 
    config.imap.auth && 
    config.imap.auth.user && 
    config.imap.auth.pass;
  
  // Log SMTP/IMAP configuration mode
  if (hasValidImapConfig) {
    log('Setting up email service with both SMTP and IMAP', 'email');
  } else {
    log('Setting up email service in SMTP-only mode (no IMAP credentials provided)', 'email');
    
    // Ensure empty IMAP config has defaults to prevent null reference errors
    if (!config.imap) {
      config.imap = {
        host: 'localhost',
        port: 143,
        tls: false,
        authTimeout: 10000,
        auth: {
          type: 'basic',
          user: '',
          pass: ''
        }
      };
    }
  }
  
  // Create the email service
  emailService = new EmailService(config);
  
  log('Email service initialized successfully', 'email');
  return emailService;
}

export function getEmailService(): EmailService | null {
  return emailService;
}