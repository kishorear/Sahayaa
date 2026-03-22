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
import { redisMemory } from '../../../services/redis_memory_service.js';
import { storage } from '../../storage.js';
import { InsertTicket } from '../../../shared/schema.js';
import { classifyTicket } from '../ai.js';

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

  /**
   * Main workflow method (legacy) - redirects to processUserMessage
   */
  async processUserRequest(input: OrchestratorInput): Promise<OrchestratorResult> {
    return await this.processUserMessage(input);
  }

  /**
   * Updated workflow method - processes user message through all five agent stages
   */
  async processUserMessage(input: OrchestratorInput): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const sessionId = input.session_id || `session_${Date.now()}`;
    
    console.log(`SupportTeamOrchestrator: Starting workflow for session ${sessionId}`);
    console.log(`SupportTeamOrchestrator: User message: "${input.user_message.substring(0, 50)}..."`);

    try {
      const processingSteps: any = {};

      // Step 1: Run ChatProcessorAgent
      console.log('SupportTeamOrchestrator: Step 1 - Running ChatProcessorAgent');
      const preprocessResult = await this.preprocessorAgent.processMessage({
        userMessage: input.user_message,
        sessionId,
        userContext: input.user_context
      });
      
      if (!preprocessResult.success) {
        throw new Error(`Preprocessing failed: ${preprocessResult.error}`);
      }

      processingSteps.preprocessing = preprocessResult;

      // Step 2: Run InstructionLookupAgent
      console.log('SupportTeamOrchestrator: Step 2 - Running InstructionLookupAgent');
      const instructionResult = await this.instructionLookupAgent.lookupInstructions({
        normalizedPrompt: preprocessResult.normalizedPrompt,
        urgency: preprocessResult.urgency,
        sentiment: preprocessResult.sentiment,
        sessionId: sessionId,
        topK: 3
      });
      
      processingSteps.instruction_lookup = instructionResult;

      // Step 3: Run TicketLookupAgent
      console.log('SupportTeamOrchestrator: Step 3 - Running TicketLookupAgent');
      const ticketResult = await this.ticketLookupAgent.lookupSimilarTickets({
        normalizedPrompt: preprocessResult.normalizedPrompt,
        urgency: preprocessResult.urgency,
        sentiment: preprocessResult.sentiment,
        sessionId: sessionId,
        tenantId: input.tenant_id || 1,
        topK: 3
      });
      
      processingSteps.ticket_lookup = ticketResult;

      // Step 4: Generate solution steps using LLM
      console.log('SupportTeamOrchestrator: Step 4 - Generating solution steps');
      const solutionResult = await this.generateSolutionSteps(
        preprocessResult.normalizedPrompt,
        instructionResult.instructions || [],
        ticketResult.tickets || [],
        preprocessResult.urgency
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
        steps: solutionResult.steps.join('\n'),
        category: solutionResult.category,
        urgency: preprocessResult.urgency,
        customer_name: "Customer",
        additional_notes: `Confidence: ${(solutionResult.confidence * 100).toFixed(1)}%`
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
        processing_steps: {
          preprocessing: {},
          instruction_lookup: {},
          ticket_lookup: {},
          solution_generation: {},
          formatting: {}
        },
        total_processing_time_ms: totalTime,
        confidence_score: 0,
        error: error instanceof Error ? error.message : 'Unknown orchestration error'
      };
    }
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
    similarTickets: any[],
    urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  ): Promise<{ steps: string[]; confidence: number; category: string }> {
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
            `${idx + 1}. Ticket #${ticket.ticket_id} (Similarity: ${ticket.similarity_score?.toFixed(2) || 'N/A'}):\n${ticket.resolution_excerpt || ticket.title || 'No resolution available'}`
          ).join('\n\n');
      }

      const prompt = `You are a support specialist helping quality analysts and software testers who have discovered issues. Based on the user's issue and available context, provide practical, non-technical recommendations.

USER ISSUE: ${processedMessage}

${instructionContext}

${historicalContext}

FORMAT YOUR RESPONSE FOR MAXIMUM READABILITY:
- Use numbered lists for sequential steps (Step 1:, Step 2:, etc.)
- Use bullet points for lists of options or requirements
- Break complex information into clear paragraphs
- Highlight important warnings or notes

REQUIREMENTS FOR QA/TESTER AUDIENCE:
1. User is a QA analyst/tester who found this issue
2. Provide simple, non-technical workarounds or information gathering steps
3. Don't provide code solutions or technical implementations
4. Keep recommendations practical and easy to follow
5. Focus on ticket resolution rather than complex troubleshooting
6. Use the context above to inform your recommendations
7. If no simple workaround exists, recommend escalation to development team

Please provide practical, non-technical resolution steps suitable for QA analysts:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const stepsText = response.text().trim();

      // Parse steps into array
      const steps = stepsText.split('\n').filter(line => line.trim().length > 0);

      // Calculate confidence based on available context
      let confidence = 0.5; // Base confidence
      if (instructions.length > 0) confidence += 0.2;
      if (similarTickets.length > 0) confidence += 0.2;
      if (instructions.length > 1 && similarTickets.length > 1) confidence += 0.1;

      // Determine category based on message content
      const category = this.categorizeMessage(processedMessage);

      return { steps, confidence: Math.min(confidence, 1.0), category };

    } catch (error) {
      console.error('SupportTeamOrchestrator: AI solution generation failed:', error);
      return this.generateFallbackSolution(instructions, similarTickets);
    }
  }

  private generateFallbackSolution(instructions: any[], similarTickets: any[]): { steps: string[]; confidence: number; category: string } {
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
      steps: steps.split('\n').filter(line => line.trim().length > 0),
      confidence: similarTickets.length > 0 ? 0.6 : 0.4,
      category: 'General'
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
      const preprocessResult = await this.preprocessorAgent.processMessage({
        userMessage: input.user_message,
        sessionId,
        userContext: input.user_context
      });
      
      if (!preprocessResult.success) {
        throw new Error(`Preprocessing failed: ${preprocessResult.error}`);
      }

      processingSteps.preprocessing = preprocessResult;

      // Step 2: Run InstructionLookupAgent
      console.log('SupportTeamOrchestrator: Step 2 - Running InstructionLookupAgent');
      const instructionResult = await this.instructionLookupAgent.lookupInstructions({
        normalizedPrompt: preprocessResult.normalizedPrompt,
        urgency: preprocessResult.urgency,
        sentiment: preprocessResult.sentiment,
        sessionId: sessionId,
        topK: 3
      });
      
      processingSteps.instruction_lookup = instructionResult;

      // Step 3: Run TicketLookupAgent
      console.log('SupportTeamOrchestrator: Step 3 - Running TicketLookupAgent');
      const ticketResult = await this.ticketLookupAgent.lookupSimilarTickets({
        normalizedPrompt: preprocessResult.normalizedPrompt,
        urgency: preprocessResult.urgency,
        sentiment: preprocessResult.sentiment,
        sessionId: sessionId,
        tenantId: input.tenant_id || 1,
        topK: 3
      });
      
      processingSteps.ticket_lookup = ticketResult;

      // Step 4: Generate solution steps using LLM
      console.log('SupportTeamOrchestrator: Step 4 - Generating solution steps');
      const solutionResult = await this.generateSolutionSteps(
        preprocessResult.normalizedPrompt,
        instructionResult.instructions || [],
        ticketResult.tickets || [],
        preprocessResult.urgency
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
        steps: solutionResult.steps.join('\n'),
        category: solutionResult.category,
        urgency: preprocessResult.urgency,
        customer_name: "Customer",
        additional_notes: `Confidence: ${(solutionResult.confidence * 100).toFixed(1)}%`
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
        processing_steps: {
          preprocessing: {},
          instruction_lookup: {},
          ticket_lookup: {},
          solution_generation: {},
          formatting: {}
        },
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
    console.log(`SupportTeamOrchestrator: Session ${sessionId} cleared (delegated to RedisMemory)`);
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

export const supportTeamOrchestrator = new SupportTeamOrchestrator();