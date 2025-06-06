/**
 * TicketFormatterAgent - Fourth agent in the multi-agent pipeline
 * 
 * Purpose: Takes newly created ticket metadata (ID and subject) plus solution steps
 * and assembles a final, well-formatted professional ticket response suitable for
 * sending back to the user or ticketing system.
 * 
 * Responsibilities:
 * 1. Receive ticket ID, subject, and solution steps
 * 2. Apply professional formatting template
 * 3. Generate final formatted ticket response
 * 4. Return ready-to-send ticket content
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

interface TicketFormatterInput {
  id: number;
  subject: string;
  steps: string;
  category?: string;
  urgency?: string;
  customer_name?: string;
  additional_notes?: string;
}

interface TicketFormatterResult {
  success: boolean;
  formatted_ticket: string;
  ticket_id: number;
  subject: string;
  template_used: string;
  processing_time_ms: number;
  error?: string;
}

interface TicketFormatterStatus {
  name: string;
  available: boolean;
  google_ai_configured: boolean;
  template_formats: string[];
  capabilities: string[];
}

export class TicketFormatterAgent {
  private genAI: GoogleGenerativeAI | null = null;
  private defaultTemplate: string;
  private templates: Record<string, string>;

  constructor() {
    this.initializeGoogleAI();
    this.initializeTemplates();
  }

  private initializeGoogleAI(): void {
    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (googleApiKey) {
      this.genAI = new GoogleGenerativeAI(googleApiKey);
      console.log('TicketFormatterAgent: Google AI initialized for template processing');
    } else {
      console.warn('TicketFormatterAgent: GOOGLE_API_KEY not available');
    }
  }

  private initializeTemplates(): void {
    // Default professional template
    this.defaultTemplate = `Ticket #{id} • {subject}

Dear {customer_name},

We have reviewed your request and are pleased to provide you with a solution. Below are the steps to resolve your issue:

{steps}

{additional_notes}

If you need further assistance or have any questions, please don't hesitate to reply to this email or contact our support team.

Thank you for choosing our services.

Best regards,
Support Team`;

    // Multiple template options for different scenarios
    this.templates = {
      'standard': this.defaultTemplate,
      
      'urgent': `URGENT - Ticket #{id} • {subject}

Dear {customer_name},

We understand the urgency of your request and have prioritized your case. Please follow these immediate steps:

{steps}

{additional_notes}

Our team is monitoring this ticket closely. If these steps don't resolve the issue, please contact us immediately.

Urgent Support Team`,

      'billing': `Ticket #{id} • Billing: {subject}

Dear {customer_name},

Thank you for contacting our billing department. We have reviewed your account and provided the following resolution:

{steps}

{additional_notes}

For any billing-related questions, please contact our billing team directly.

Best regards,
Billing Support Team`,

      'technical': `Ticket #{id} • Technical Support: {subject}

Dear {customer_name},

Our technical team has analyzed your issue. Please follow these technical steps:

{steps}

{additional_notes}

If you encounter any difficulties during these steps, please provide the error messages and we'll assist further.

Technical Support Team`,

      'simple': `Ticket #{id}

Hello {customer_name},

Here's how to resolve your issue:

{steps}

{additional_notes}

Thanks,
Support Team`
    };
  }

  private selectTemplate(input: TicketFormatterInput): string {
    // Select template based on urgency and category
    if (input.urgency === 'CRITICAL' || input.urgency === 'HIGH') {
      return this.templates['urgent'];
    }
    
    if (input.category === 'billing') {
      return this.templates['billing'];
    }
    
    if (input.category === 'technical') {
      return this.templates['technical'];
    }
    
    return this.templates['standard'];
  }

  private formatSteps(steps: string): string {
    // If steps are already formatted as a list, return as-is
    if (steps.includes('1.') || steps.includes('•') || steps.includes('-')) {
      return steps;
    }

    // Split by common delimiters and format as numbered list
    const stepArray = steps.split(/[.\n]/).filter(step => step.trim().length > 0);
    
    if (stepArray.length <= 1) {
      return steps; // Return original if can't split meaningfully
    }

    return stepArray
      .map((step, index) => `${index + 1}. ${step.trim()}`)
      .join('\n');
  }

  private async enhanceWithAI(template: string, input: TicketFormatterInput): Promise<string> {
    if (!this.genAI) {
      return this.applyBasicTemplate(template, input);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Please enhance this customer support ticket template while maintaining professionalism:

Template: ${template}

Input Data:
- Ticket ID: ${input.id}
- Subject: ${input.subject}
- Steps: ${input.steps}
- Category: ${input.category || 'general'}
- Urgency: ${input.urgency || 'normal'}
- Customer Name: ${input.customer_name || 'Customer'}

Requirements:
1. Keep the professional tone
2. Ensure all placeholder values are properly substituted
3. Format the steps clearly
4. Make the language helpful and reassuring
5. Keep it concise but complete

Return only the final formatted ticket content.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();

    } catch (error) {
      console.error('TicketFormatterAgent: AI enhancement failed, using basic template:', error);
      return this.applyBasicTemplate(template, input);
    }
  }

  private applyBasicTemplate(template: string, input: TicketFormatterInput): string {
    let formatted = template;
    
    // Apply substitutions
    formatted = formatted.replace(/{id}/g, input.id.toString());
    formatted = formatted.replace(/{subject}/g, input.subject);
    formatted = formatted.replace(/{steps}/g, this.formatSteps(input.steps));
    formatted = formatted.replace(/{customer_name}/g, input.customer_name || 'Customer');
    formatted = formatted.replace(/{additional_notes}/g, input.additional_notes || '');
    
    // Clean up any empty lines from missing additional_notes
    formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return formatted.trim();
  }

  async formatTicket(input: TicketFormatterInput): Promise<TicketFormatterResult> {
    const startTime = Date.now();
    
    console.log(`TicketFormatterAgent: Formatting ticket #${input.id} - ${input.subject.substring(0, 30)}...`);

    try {
      // Select appropriate template
      const template = this.selectTemplate(input);
      const templateName = this.getTemplateName(template);
      
      console.log(`TicketFormatterAgent: Using ${templateName} template`);

      // Apply formatting with AI enhancement if available
      const formattedTicket = await this.enhanceWithAI(template, input);
      
      const processingTime = Date.now() - startTime;
      
      console.log(`TicketFormatterAgent: Completed formatting in ${processingTime}ms`);

      return {
        success: true,
        formatted_ticket: formattedTicket,
        ticket_id: input.id,
        subject: input.subject,
        template_used: templateName,
        processing_time_ms: processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error('TicketFormatterAgent: Formatting failed:', error);

      return {
        success: false,
        formatted_ticket: '',
        ticket_id: input.id,
        subject: input.subject,
        template_used: 'error',
        processing_time_ms: processingTime,
        error: error instanceof Error ? error.message : 'Unknown formatting error'
      };
    }
  }

  private getTemplateName(template: string): string {
    for (const [name, tmpl] of Object.entries(this.templates)) {
      if (tmpl === template) {
        return name;
      }
    }
    return 'custom';
  }

  getStatus(): TicketFormatterStatus {
    return {
      name: 'TicketFormatterAgent',
      available: true,
      google_ai_configured: this.genAI !== null,
      template_formats: Object.keys(this.templates),
      capabilities: [
        'Professional ticket formatting',
        'Multi-template support',
        'AI-enhanced content generation',
        'Step formatting and organization',
        'Context-aware template selection'
      ]
    };
  }

  getAvailableTemplates(): string[] {
    return Object.keys(this.templates);
  }

  async testFormatting(): Promise<TicketFormatterResult> {
    const testInput: TicketFormatterInput = {
      id: 12345,
      subject: "VPN connectivity issue",
      steps: "1. Restart your router\n2. Reinstall the VPN client\n3. Update VPN server address to vpn.example.com",
      category: "technical",
      urgency: "MEDIUM",
      customer_name: "John Smith",
      additional_notes: "This issue has been escalated from Level 1 support."
    };

    return await this.formatTicket(testInput);
  }
}