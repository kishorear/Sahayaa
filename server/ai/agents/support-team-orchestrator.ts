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
 * 6. Create actual ticket in database 
 * 7. Run TicketFormatterAgent to create professional ticket response
 * 8. Return final formatted output to frontend
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatPreprocessorAgent } from './chat-preprocessor-agent.js';
import { InstructionLookupAgent } from './instruction-lookup-agent.js';
import { TicketLookupAgent } from './ticket-lookup-agent.js';
import { TicketFormatterAgent } from './ticket-formatter-agent.js';
import { redisMemory } from '../../../services/redis_memory_service.js';
import { storage } from '../../storage.js';
import { InsertTicket } from '../../../shared/schema.js';
import { classifyTicket } from '../../ai.js';

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
   * Updated workflow method - processes user message through all agent stages and creates real tickets
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

      // Step 5: Create actual ticket in database
      console.log('SupportTeamOrchestrator: Step 5 - Creating ticket in database');
      const subject = this.extractSubject(input.user_message);
      
      // Classify the ticket properly using the AI system
      const classification = await classifyTicket(subject, preprocessResult.normalizedPrompt, input.tenant_id || 1);
      
      // Create comprehensive description from solution steps and context
      const fullDescription = this.buildTicketDescription(
        input.user_message,
        solutionResult.steps,
        instructionResult.instructions || [],
        ticketResult.tickets || []
      );
      
      // Create the ticket data
      const ticketData: InsertTicket = {
        title: subject,
        description: fullDescription,
        category: classification.category,
        complexity: classification.complexity,
        status: solutionResult.confidence > 0.7 ? "resolved" : "new",
        assignedTo: classification.assignedTo,
        aiNotes: `Agent workflow confidence: ${(solutionResult.confidence * 100).toFixed(1)}%\n${classification.aiNotes}`,
        aiResolved: solutionResult.confidence > 0.7,
        tenantId: input.tenant_id || 1,
        createdBy: input.user_id ? parseInt(input.user_id) : 1,
        source: 'agent_workflow',
        resolvedAt: solutionResult.confidence > 0.7 ? new Date() : undefined
      };
      
      // Create the actual ticket in the database
      const createdTicket = await storage.createTicket(ticketData);
      
      // Step 6: Run TicketFormatterAgent with real ticket data
      console.log('SupportTeamOrchestrator: Step 6 - Running TicketFormatterAgent');
      const formatResult = await this.formatterAgent.formatTicket({
        id: createdTicket.id,
        subject: createdTicket.title,
        steps: solutionResult.steps.join('\n'),
        category: createdTicket.category,
        urgency: this.mapUrgencyToTicketUrgency(preprocessResult.urgency),
        customer_name: "Customer",
        additional_notes: `Confidence: ${(solutionResult.confidence * 100).toFixed(1)}%`
      });

      if (!formatResult.success) {
        throw new Error(`Formatting failed: ${formatResult.error}`);
      }

      processingSteps.formatting = formatResult;

      const totalTime = Date.now() - startTime;
      
      console.log(`SupportTeamOrchestrator: Workflow completed successfully in ${totalTime}ms`);
      console.log(`SupportTeamOrchestrator: Created ticket #${createdTicket.id} with ${solutionResult.confidence * 100}% confidence`);

      return {
        success: true,
        ticket_id: createdTicket.id,
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

  private buildTicketDescription(
    originalMessage: string,
    solutionSteps: string[],
    instructions: any[],
    similarTickets: any[]
  ): string {
    let description = `**User Request:**\n${originalMessage}\n\n`;
    
    if (solutionSteps.length > 0) {
      description += `**Recommended Solution:**\n`;
      solutionSteps.forEach((step, index) => {
        description += `${index + 1}. ${step}\n`;
      });
      description += '\n';
    }
    
    if (instructions.length > 0) {
      description += `**Relevant Instructions Found:**\n`;
      instructions.slice(0, 2).forEach((instruction, index) => {
        description += `• ${instruction.title || instruction.filename}\n`;
      });
      description += '\n';
    }
    
    if (similarTickets.length > 0) {
      description += `**Similar Past Issues:**\n`;
      similarTickets.slice(0, 2).forEach((ticket, index) => {
        description += `• Ticket #${ticket.id}: ${ticket.title}\n`;
      });
    }
    
    return description.trim();
  }

  private mapUrgencyToTicketUrgency(agentUrgency: string): string {
    switch (agentUrgency.toLowerCase()) {
      case 'critical':
        return 'high';
      case 'high':
        return 'high';
      case 'medium':
        return 'medium';
      case 'low':
        return 'low';
      default:
        return 'medium';
    }
  }

  private async generateSolutionSteps(
    processedMessage: string,
    instructions: any[],
    similarTickets: any[],
    urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  ): Promise<{ steps: string[]; confidence: number; category: string }> {
    
    if (!this.genAI) {
      console.warn('SupportTeamOrchestrator: Google AI not available, using fallback solution generation');
      return {
        steps: [
          'Review the user request carefully',
          'Gather additional information if needed',
          'Provide appropriate solution based on available resources',
          'Follow up to ensure issue resolution'
        ],
        confidence: 0.6,
        category: 'general'
      };
    }

    try {
      // Build context from instructions and similar tickets
      let contextPrompt = `User Issue: ${processedMessage}\nUrgency Level: ${urgency}\n\n`;
      
      if (instructions.length > 0) {
        contextPrompt += 'Relevant Instructions:\n';
        instructions.slice(0, 3).forEach((instruction, index) => {
          contextPrompt += `${index + 1}. ${instruction.title || instruction.filename}: ${instruction.content?.substring(0, 200) || 'Content available'}\n`;
        });
        contextPrompt += '\n';
      }
      
      if (similarTickets.length > 0) {
        contextPrompt += 'Similar Past Tickets:\n';
        similarTickets.slice(0, 3).forEach((ticket, index) => {
          contextPrompt += `${index + 1}. ${ticket.title}: ${ticket.description?.substring(0, 150) || 'Description available'}\n`;
        });
        contextPrompt += '\n';
      }
      
      contextPrompt += `Please provide a step-by-step solution for this user's issue. Format as numbered steps that are:
1. Clear and actionable
2. Appropriate for the urgency level (${urgency})
3. Based on the provided context and instructions
4. Professional and helpful

IMPORTANT PRIVACY AND SECURITY GUIDELINES:
- DO NOT ask for personal information such as: zipcode/pincode, physical location, home address, phone numbers, social security numbers, or other sensitive personal data
- DO NOT request credentials, passwords, or access tokens
- If you need user-specific information, use generic placeholders or suggest they contact support
- Respect user privacy at all times

ESCALATION RULES:
- If the initial solution steps might not resolve the issue, include "If the above steps don't resolve your issue, we recommend creating a support ticket for personalized assistance" as the last step
- For complex or unclear issues, suggest ticket creation upfront

Respond with only the numbered steps, no additional explanation.`;

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(contextPrompt);
      const response = result.response;
      const text = response.text();
      
      // Parse the response into steps
      const steps: string[] = [];
      const lines = text.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (/^\d+\.\s/.test(trimmed)) {
          const step = trimmed.replace(/^\d+\.\s/, '').trim();
          if (step.length > 0) {
            steps.push(step);
          }
        }
      }
      
      // If no numbered steps found, try to extract from general content
      if (steps.length === 0) {
        const sentences = text.split('.').filter(s => s.trim().length > 10);
        sentences.slice(0, 4).forEach(sentence => {
          steps.push(sentence.trim());
        });
      }
      
      // Ensure we have at least some steps
      if (steps.length === 0) {
        steps.push('Review the user request and provide appropriate assistance');
      }
      
      // Calculate confidence based on context availability
      let confidence = 0.5; // Base confidence
      if (instructions.length > 0) confidence += 0.2;
      if (similarTickets.length > 0) confidence += 0.2;
      if (steps.length > 2) confidence += 0.1;
      
      // Determine category based on the processed message
      let category = 'general';
      const lowerMessage = processedMessage.toLowerCase();
      if (lowerMessage.includes('login') || lowerMessage.includes('password') || lowerMessage.includes('access')) {
        category = 'authentication';
      } else if (lowerMessage.includes('payment') || lowerMessage.includes('billing') || lowerMessage.includes('subscription')) {
        category = 'billing';
      } else if (lowerMessage.includes('bug') || lowerMessage.includes('error') || lowerMessage.includes('broken')) {
        category = 'technical_issue';
      } else if (lowerMessage.includes('feature') || lowerMessage.includes('enhancement') || lowerMessage.includes('request')) {
        category = 'feature_request';
      }
      
      return {
        steps: steps.slice(0, 6), // Limit to 6 steps maximum
        confidence: Math.min(confidence, 0.95), // Cap at 95%
        category
      };
      
    } catch (error) {
      console.error('SupportTeamOrchestrator: Error generating solution steps:', error);
      
      // Fallback solution generation
      return {
        steps: [
          'Acknowledge the user request',
          'Gather additional information if needed',
          'Provide solution based on available resources',
          'Follow up to ensure satisfaction'
        ],
        confidence: 0.4,
        category: 'general'
      };
    }
  }

  /**
   * Check orchestrator and sub-agent status
   */
  async getStatus(): Promise<OrchestratorStatus> {
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
        'chat_preprocessing',
        'instruction_lookup',
        'ticket_similarity_search',
        'solution_generation',
        'ticket_formatting',
        'database_integration'
      ]
    };
  }
}