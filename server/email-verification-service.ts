import { ResendService } from './resend-service';
import crypto from 'crypto';

export interface VerificationEmailParams {
  to: string;
  name: string;
  code: string;
}

export class EmailVerificationService {
  private resendService: ResendService;

  constructor() {
    this.resendService = new ResendService();
    console.log('Email verification service initialized with Resend');
  }

  /**
   * Generate a 6-digit verification code
   */
  generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Calculate verification code expiry time (10 minutes from now)
   */
  getVerificationExpiry(): Date {
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);
    return expiry;
  }

  /**
   * Check if a verification code is still valid
   */
  isCodeValid(expiry: Date | null): boolean {
    if (!expiry) return false;
    return new Date() < expiry;
  }

  /**
   * Send verification email with 6-digit code
   */
  async sendVerificationEmail(params: VerificationEmailParams): Promise<boolean> {
    const { to, name, code } = params;

    const subject = 'Verify Your Email - Sahayaa AI';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 30px;
            margin: 20px 0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4F46E5;
          }
          .code-container {
            background-color: white;
            border: 2px solid #4F46E5;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            color: #4F46E5;
            letter-spacing: 8px;
            margin: 10px 0;
          }
          .message {
            color: #666;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 14px;
            color: #666;
            text-align: center;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Sahayaa AI</div>
            <h2>Welcome to Sahayaa AI!</h2>
          </div>
          
          <p>Hi ${name},</p>
          
          <p class="message">
            Thank you for signing up for a trial account. To complete your registration and start using Sahayaa AI, 
            please verify your email address by entering the verification code below:
          </p>
          
          <div class="code-container">
            <div>Your Verification Code</div>
            <div class="code">${code}</div>
            <div style="color: #666; font-size: 14px; margin-top: 10px;">
              This code will expire in 10 minutes
            </div>
          </div>
          
          <div class="warning">
            <strong>Security Tip:</strong> Never share this code with anyone. Sahayaa AI will never ask for your verification code.
          </div>
          
          <p class="message">
            If you didn't create an account with Sahayaa AI, you can safely ignore this email.
          </p>
          
          <div class="footer">
            <p>
              Need help? Contact us at <a href="mailto:support@sahayaa.ai">support@sahayaa.ai</a>
            </p>
            <p style="margin-top: 10px;">
              © ${new Date().getFullYear()} Sahayaa AI. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const success = await this.resendService.sendEmail(to, subject, htmlContent);
      if (success) {
        console.log(`Verification email sent successfully to ${to}`);
      } else {
        console.error(`Failed to send verification email to ${to}`);
      }
      return success;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return true; // Resend is always available via connector
  }
}
