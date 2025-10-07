// SendGrid email service integration - based on blueprint:javascript_sendgrid
import { MailService } from '@sendgrid/mail';
import { log } from './vite';

export interface SendGridEmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export class SendGridService {
  private mailService: MailService;
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(apiKey: string, fromEmail: string, fromName: string) {
    if (!apiKey) {
      throw new Error("SendGrid API key is required");
    }

    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.fromName = fromName;
    
    this.mailService = new MailService();
    this.mailService.setApiKey(apiKey);
    
    log('SendGrid service initialized', 'email');
  }

  async sendEmail(
    to: string,
    subject: string,
    content: string,
    isHtml: boolean = true
  ): Promise<boolean> {
    try {
      const emailParams: any = {
        to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
      };

      if (isHtml) {
        emailParams.html = content;
      } else {
        emailParams.text = content;
      }

      await this.mailService.send(emailParams);
      log(`SendGrid email sent to ${to}: ${subject}`, 'email');
      return true;
    } catch (error) {
      log(`SendGrid email error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'email');
      console.error('SendGrid email error:', error);
      return false;
    }
  }

  async sendTicketUpdateEmail(
    ticketId: number,
    recipientEmail: string,
    subject: string,
    message: string,
    ticketSubjectPrefix: string = '[Ticket #]'
  ): Promise<void> {
    const emailSubject = `${ticketSubjectPrefix}${ticketId}: ${subject}`;
    const emailContent = `<p>${message}</p>`;
    
    await this.sendEmail(recipientEmail, emailSubject, emailContent, true);
  }

  async testConnection(): Promise<boolean> {
    try {
      // SendGrid doesn't have a direct connection test, 
      // so we'll just verify the API key is set
      return !!this.apiKey;
    } catch (error) {
      log(`SendGrid connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'email');
      return false;
    }
  }

  getConfig() {
    return {
      provider: 'sendgrid',
      fromEmail: this.fromEmail,
      fromName: this.fromName,
    };
  }
}
