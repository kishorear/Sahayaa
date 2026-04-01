import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.SAHAYAA_CONNECTORS_HOSTNAME;
  const xSahayaaToken = process.env.SAHAYAA_APP_TOKEN
    ? 'app ' + process.env.SAHAYAA_APP_TOKEN
    : process.env.SAHAYAA_DEPLOYMENT_TOKEN
    ? 'depl ' + process.env.SAHAYAA_DEPLOYMENT_TOKEN
    : null;

  if (!xSahayaaToken) {
    throw new Error('SAHAYAA_APP_TOKEN not found — set SAHAYAA_APP_TOKEN or SAHAYAA_DEPLOYMENT_TOKEN in your environment');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_SAHAYAA_TOKEN': xSahayaaToken
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
  // Use fallback sender until custom domain is verified in Resend dashboard
  // Once verified, change this to your custom domain email (e.g., 'Sahayaa <support@sahayaa.ai>')
  private static readonly FROM_EMAIL = 'Sahayaa <onboarding@resend.dev>';
  
  /**
   * Send an email using Resend
   */
  async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      const { client } = await getUncachableResendClient();
      
      const response = await client.emails.send({
        from: ResendService.FROM_EMAIL,
        to: to,
        subject: subject,
        html: htmlContent
      });

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
