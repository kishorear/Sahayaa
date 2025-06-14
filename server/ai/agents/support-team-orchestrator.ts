/**
 * SupportTeam Parent Orchestrator Agent - Fifth agent in the multi-agent pipeline
 * 
 * Purpose: Coordinates all four sub-agents in the correct sequence, manages shared context,
 * and handles overall error checking. Ensures the complete workflow from user message
 * to final formatted ticket response.
 * 
 * Responsibilities:
 * 1. Accept raw user message from chat widget
 * 2. Run ChatProcessorAgent to normalize and detect urgency
 * 3. Run InstructionLookupAgent to find relevant instructions
 * 4. Run TicketLookupAgent to find similar past tickets
 * 5. Call LLM to draft solution steps using historical context
 * 6. Run TicketFormatterAgent to create professional ticket response
 * 7. Return final formatted output to frontend
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatPreprocessorAgent } from './chat-preprocessor-agent.js';
import { InstructionLookupAgent } from './instruction-lookup-agent.js';
import { TicketLookupAgent } from './ticket-lookup-agent.js';
import { TicketFormatterAgent } from './ticket-formatter-agent.js';

interface OrchestratorInput {
  user_message: string;
  session_id?: string;
  user_context?: {
    url?: string;
    title?: string;
    userAgent?: string;
    timestamp?: string;
  };
  tenant_id?: number;
  user_id?: string;
}

interface OrchestratorResult {
  success: boolean;
  ticket_id: number;
  formatted_ticket: string;
  processing_steps: {
    preprocessing: any;
    instruction_lookup: any;
    ticket_lookup: any;
    solution_generation: any;
    formatting: any;
  };
  total_processing_time_ms: number;
  confidence_score: number;
  error?: string;
}

interface OrchestratorStatus {
  name: string;
  available: boolean;
  sub_agents_status: {
    preprocessor: boolean;
    instruction_lookup: boolean;
    ticket_lookup: boolean;
    formatter: boolean;
  };
  llm_configured: boolean;
  capabilities: string[];
}

export class SupportTeamOrchestrator {
  private genAI: GoogleGenerativeAI | null = null;
  private preprocessorAgent: ChatPreprocessorAgent;
  private instructionLookupAgent: InstructionLookupAgent;
  private ticketLookupAgent: TicketLookupAgent;
  private formatterAgent: TicketFormatterAgent;
  private sessionMemory: Map<string, any> = new Map();

  constructor() {
    this.initializeGoogleAI();
    this.initializeSubAgents();
  }

  private initializeGoogleAI(): void {
    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (googleApiKey) {
      this.genAI = new GoogleGenerativeAI(googleApiKey);
      console.log('SupportTeamOrchestrator: Google AI initialized for solution generation');
    } else {
      console.warn('SupportTeamOrchestrator: GOOGLE_API_KEY not available');
    }
  }

  private initializeSubAgents(): void {
    this.preprocessorAgent = new ChatPreprocessorAgent();
    this.instructionLookupAgent = new InstructionLookupAgent();
    this.ticketLookupAgent = new TicketLookupAgent();
    this.formatterAgent = new TicketFormatterAgent();
    
    console.log('SupportTeamOrchestrator: All sub-agents initialized');
  }

  private storeSessionData(sessionId: string, key: string, value: any): void {
    const sessionKey = `${sessionId}:${key}`;
    this.sessionMemory.set(sessionKey, value);
  }

  private getSessionData(sessionId: string, key: string): any {
    const sessionKey = `${sessionId}:${key}`;
    return this.sessionMemory.get(sessionKey);
  }

  private extractSubject(userMessage: string): string {
    // Extract a concise subject from the user message
    const words = userMessage.split(' ').filter(word => word.length > 0);
    
    // Take first 5 meaningful words or until we hit common stop patterns
    const stopWords = ['i', 'am', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but'];
    const meaningfulWords = words.filter(word => 
      !stopWords.includes(word.toLowerCase()) && word.length > 2
    );
    
    const subjectWords = meaningfulWords.slice(0, 4);
    return subjectWords.join(' ') || words.slice(0, 5).join(' ');
  }

  private async generateSolutionSteps(
    processedMessage: string,
    instructions: any[],
    similarTickets: any[]
  ): Promise<{ steps: string; confidence: number }> {
    if (!this.genAI) {
      // Fallback solution generation without AI
      return this.generateFallbackSolution(instructions, similarTickets);
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Build context from instructions and historical resolutions
      let instructionContext = '';
      if (instructions.length > 0) {
        instructionContext = '\n\nRELEVANT SUPPORT INSTRUCTIONS:\n' +
          instructions.map((inst, idx) => 
            `${idx + 1}. From ${inst.filename || 'Support Guide'} (Score: ${inst.score?.toFixed(2) || 'N/A'}):\n${inst.text}`
          ).join('\n\n');
      }

      let historicalContext = '';
      if (similarTickets.length > 0) {
        historicalContext = '\n\nSIMILAR PAST RESOLUTIONS:\n' +
          similarTickets.map((ticket, idx) => 
            `${idx + 1}. Ticket #${ticket.ticket_id} (Similarity: ${ticket.score?.toFixed(2) || 'N/A'}):\n${ticket.resolution || ticket.title || 'No resolution available'}`
          ).join('\n\n');
      }

      const prompt = `You are a professional technical support specialist. Based on the user's issue and available context, provide clear, step-by-step resolution instructions.

USER ISSUE: ${processedMessage}

${instructionContext}

${historicalContext}

REQUIREMENTS:
1. Provide clear, numbered step-by-step instructions
2. Keep instructions professional and easy to follow
3. Use the context above to inform your solution
4. Focus on the most likely resolution based on similar past cases
5. Include verification steps where appropriate
6. Keep the tone helpful and reassuring

Please provide step-by-step resolution instructions:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const steps = response.text().trim();

      // Calculate confidence based on available context
      let confidence = 0.5; // Base confidence
      if (instructions.length > 0) confidence += 0.2;
      if (similarTickets.length > 0) confidence += 0.2;
      if (instructions.length > 1 && similarTickets.length > 1) confidence += 0.1;

      return { steps, confidence: Math.min(confidence, 1.0) };

    } catch (error) {
      console.error('SupportTeamOrchestrator: AI solution generation failed:', error);
      return this.generateFallbackSolution(instructions, similarTickets);
    }
  }

  private generateFallbackSolution(instructions: any[], similarTickets: any[]): { steps: string; confidence: number } {
    let steps = "Based on similar issues, here are the recommended steps:\n\n";
    
    if (similarTickets.length > 0) {
      // Use the best matching ticket's resolution
      const bestTicket = similarTickets[0];
      steps += `1. Review the resolution from similar case #${bestTicket.ticket_id}:\n   ${bestTicket.resolution || bestTicket.title || 'Contact support for specific guidance'}\n\n`;
    }

    if (instructions.length > 0) {
      steps += "2. Refer to the relevant support documentation for detailed guidance\n\n";
    }

    steps += "3. If the issue persists, please contact our support team with:\n";
    steps += "   - Details of steps already attempted\n";
    steps += "   - Any error messages encountered\n";
    steps += "   - Your system configuration details";

    return { 
      steps, 
      confidence: similarTickets.length > 0 ? 0.6 : 0.4
    };
  }

  async processUserMessage(input: OrchestratorInput): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const sessionId = input.session_id || `session_${Date.now()}`;
    
    console.log(`SupportTeamOrchestrator: Starting workflow for session ${sessionId}`);
    console.log(`SupportTeamOrchestrator: User message: "${input.user_message.substring(0, 50)}..."`);

    try {
      const processingSteps: any = {};

      // Step 1: Run ChatProcessorAgent
      console.log('SupportTeamOrchestrator: Step 1 - Running ChatProcessorAgent');
      const preprocessResult = await this.preprocessorAgent.preprocess(
        input.user_message, 
        sessionId, 
        input.user_context
      );
      
      // Handle the actual response format from ChatPreprocessorAgent
      if (!preprocessResult || !preprocessResult.normalized_prompt) {
        throw new Error(`Preprocessing failed: Invalid response format`);
      }

      processingSteps.preprocessing = {
        success: true,
        processed_message: preprocessResult.normalized_prompt,
        urgency_level: preprocessResult.urgency,
        sentiment: preprocessResult.sentiment,
        original_message: preprocessResult.original_message,
        session_id: preprocessResult.session_id
      };
      this.storeSessionData(sessionId, 'processed_message', preprocessResult.normalized_prompt);
      this.storeSessionData(sessionId, 'urgency', preprocessResult.urgency);

      // Step 2: Run InstructionLookupAgent
      console.log('SupportTeamOrchestrator: Step 2 - Running InstructionLookupAgent');
      const instructionResult = await this.instructionLookupAgent.lookupInstructions({
        normalizedPrompt: preprocessResult.normalized_prompt,
        urgency: preprocessResult.urgency as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
        sentiment: preprocessResult.sentiment as 'positive' | 'neutral' | 'negative',
        sessionId: sessionId,
        topK: 3
      });
      
      processingSteps.instruction_lookup = instructionResult;
      this.storeSessionData(sessionId, 'instructions', instructionResult.instructions);

      // Step 3: Run TicketLookupAgent
      console.log('SupportTeamOrchestrator: Step 3 - Running TicketLookupAgent');
      const ticketResult = await this.ticketLookupAgent.lookupSimilarTickets(
        preprocessResult.normalized_prompt
      );
      
      processingSteps.ticket_lookup = ticketResult;
      this.storeSessionData(sessionId, 'similar_tickets', ticketResult.similar_tickets);

      // Step 4: Generate solution steps using LLM
      console.log('SupportTeamOrchestrator: Step 4 - Generating solution steps');
      const solutionResult = await this.generateSolutionSteps(
        preprocessResult.normalized_prompt,
        instructionResult.instructions || [],
        ticketResult.similar_tickets || []
      );
      
      processingSteps.solution_generation = {
        success: true,
        steps: solutionResult.steps,
        confidence_score: solutionResult.confidence,
        processing_time_ms: Date.now() - startTime
      };

      // Step 5: Run TicketFormatterAgent
      console.log('SupportTeamOrchestrator: Step 5 - Running TicketFormatterAgent');
      const ticketId = Math.floor(Math.random() * 90000) + 10000; // Generate realistic ticket ID
      const subject = this.extractSubject(input.user_message);
      
      const formatResult = await this.formatterAgent.formatTicket({
        id: ticketId,
        subject: subject,
        steps: solutionResult.steps,
        category: this.categorizeMessage(input.user_message),
        urgency: preprocessResult.urgency_level,
        customer_name: "Customer"
      });

      if (!formatResult.success) {
        throw new Error(`Formatting failed: ${formatResult.error}`);
      }

      processingSteps.formatting = formatResult;

      const totalTime = Date.now() - startTime;
      
      console.log(`SupportTeamOrchestrator: Workflow completed successfully in ${totalTime}ms`);
      console.log(`SupportTeamOrchestrator: Generated ticket #${ticketId} with ${solutionResult.confidence * 100}% confidence`);

      return {
        success: true,
        ticket_id: ticketId,
        formatted_ticket: formatResult.formatted_ticket,
        processing_steps: processingSteps,
        total_processing_time_ms: totalTime,
        confidence_score: solutionResult.confidence
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      
      console.error('SupportTeamOrchestrator: Workflow failed:', error);

      return {
        success: false,
        ticket_id: 0,
        formatted_ticket: '',
        processing_steps: {},
        total_processing_time_ms: totalTime,
        confidence_score: 0,
        error: error instanceof Error ? error.message : 'Unknown orchestration error'
      };
    }
  }

  private categorizeMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('billing') || lowerMessage.includes('payment') || lowerMessage.includes('invoice')) {
      return 'billing';
    }
    
    if (lowerMessage.includes('vpn') || lowerMessage.includes('connection') || lowerMessage.includes('network')) {
      return 'technical';
    }
    
    if (lowerMessage.includes('account') || lowerMessage.includes('login') || lowerMessage.includes('password')) {
      return 'account';
    }
    
    return 'general';
  }

  getStatus(): OrchestratorStatus {
    return {
      name: 'SupportTeamOrchestrator',
      available: true,
      sub_agents_status: {
        preprocessor: true,
        instruction_lookup: true,
        ticket_lookup: true,
        formatter: true
      },
      llm_configured: this.genAI !== null,
      capabilities: [
        'Complete workflow orchestration',
        'Multi-agent coordination',
        'Session memory management',
        'Context-aware solution generation',
        'Professional ticket formatting',
        'Error handling and recovery'
      ]
    };
  }

  clearSession(sessionId: string): void {
    const keysToDelete = Array.from(this.sessionMemory.keys()).filter(key => 
      key.startsWith(`${sessionId}:`)
    );
    
    keysToDelete.forEach(key => this.sessionMemory.delete(key));
    console.log(`SupportTeamOrchestrator: Cleared session data for ${sessionId}`);
  }

  async testWorkflow(): Promise<OrchestratorResult> {
    const testInput: OrchestratorInput = {
      user_message: "I need help with VPN connectivity issues, my credentials aren't working and it's urgent",
      session_id: `test_${Date.now()}`,
      user_context: {
        url: "https://example.com/support",
        title: "Support Request",
        userAgent: "Test Browser"
      },
      tenant_id: 1,
      user_id: "test_user"
    };

    return await this.processUserMessage(testInput);
  }
}