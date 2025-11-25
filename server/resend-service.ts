import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {
    apiKey: connectionSettings.settings.api_key, 
    fromEmail: connectionSettings.settings.from_email
  };
}

export async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: connectionSettings.settings.from_email
  };
}

export class ResendService {
  /**
   * Send an email using Resend
   */
  async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      const { client, fromEmail } = await getUncachableResendClient();
      
      // Try to send with configured email first
      let response = await client.emails.send({
        from: fromEmail,
        to: to,
        subject: subject,
        html: htmlContent
      });

      // If domain is not verified, use fallback sender
      if (response.error && response.error.statusCode === 403) {
        console.log('Configured domain not verified, using fallback sender');
        response = await client.emails.send({
          from: 'onboarding@resend.dev',
          to: to,
          subject: subject,
          html: htmlContent
        });
      }

      if (response.error) {
        console.error('Resend error:', response.error);
        return false;
      }

      console.log('Email sent successfully via Resend:', response.data?.id);
      return true;
    } catch (error) {
      console.error('Failed to send email via Resend:', error);
      return false;
    }
  }
}
