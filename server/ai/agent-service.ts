/**
 * Agent Service - Integrated multi-agent system
 * Combines preprocessing, classification, resolution, and response generation
 */

import axios, { AxiosResponse } from 'axios';
import { ChatPreprocessorAgent, PreprocessorResult } from './agents/chat-preprocessor-agent';
import { TicketLookupAgent } from './agents/ticket-lookup-agent';
import { TicketFormatterAgent } from './agents/ticket-formatter-agent';
import { SupportTeamOrchestrator } from './agents/support-team-orchestrator';

interface AgentServiceConfig {
  baseUrl: string;
  timeout?: number;
}

interface ClassifyTicketRequest {
  title: string;
  description: string;
  context?: string;
  tenant_id?: number;
}

interface ClassifyTicketResponse {
  category: string;
  complexity: 'simple' | 'medium' | 'complex';
  assignedTo: string;
  canAutoResolve: boolean;
  aiNotes: string;
}

interface AutoResolveRequest {
  title: string;
  description: string;
  previousMessages?: any[];
  context?: string;
  tenant_id?: number;
}

interface AutoResolveResponse {
  resolved: boolean;
  response: string;
}

interface ChatResponseRequest {
  ticketContext: {
    id: number;
    title: string;
    description: string;
    category: string;
    tenantId?: number;
  };
  messageHistory: any[];
  userMessage: string;
  knowledgeContext?: string;
}

interface AgentWorkflowRequest {
  user_message: string;
  user_context?: any;
  tenant_id?: number;
  user_id?: string;
  team_id?: number;
}

interface AgentWorkflowResponse {
  success: boolean;
  ticket_id?: number;
  ticket_title: string;
  status: string;
  category: string;
  urgency: string;
  resolution_steps: string[];
  resolution_steps_count: number;
  confidence_score: number;
  processing_time_ms: number;
  created_at: string;
  source: string;
  error?: string;
}

export class AgentService {
  private baseUrl: string;
  private timeout: number;
  private preprocessorAgent: ChatPreprocessorAgent;
  private ticketLookupAgent: TicketLookupAgent;
  private ticketFormatterAgent: TicketFormatterAgent;
  private orchestrator: SupportTeamOrchestrator;

  constructor(config: AgentServiceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.preprocessorAgent = new ChatPreprocessorAgent();
    this.ticketLookupAgent = new TicketLookupAgent();
    this.ticketFormatterAgent = new TicketFormatterAgent();
    this.orchestrator = new SupportTeamOrchestrator();
  }

  /**
   * Main workflow endpoint - processes user message and returns complete ticket
   */
  async processWorkflow(request: AgentWorkflowRequest): Promise<AgentWorkflowResponse> {
    try {
      console.log('AgentService: Processing workflow request:', request.user_message?.substring(0, 50) + '...');
      
      // Use the SupportTeam Orchestrator to handle the complete workflow
      const orchestratorInput = {
        user_message: request.user_message,
        session_id: `${request.user_id || 'anon'}_${Date.now()}`,
        user_context: request.user_context,
        tenant_id: request.tenant_id,
        user_id: request.user_id
      };

      const result = await this.orchestrator.processUserMessage(orchestratorInput);
      
      if (result.success) {
        // Extract resolution steps from the formatted ticket
        const steps = this.extractStepsFromTicket(result.formatted_ticket);
        
        return {
          success: true,
          ticket_id: result.ticket_id,
          ticket_title: this.extractTitleFromTicket(result.formatted_ticket),
          status: 'resolved',
          category: result.processing_steps.preprocessing?.category || 'general',
          urgency: result.processing_steps.preprocessing?.urgency_level || 'medium',
          resolution_steps: steps,
          resolution_steps_count: steps.length,
          confidence_score: result.confidence_score,
          processing_time_ms: result.total_processing_time_ms,
          created_at: new Date().toISOString(),
          source: 'support_team_orchestrator'
        };
      } else {
        return {
          success: false,
          ticket_title: 'Processing failed',
          status: 'error',
          category: 'system',
          urgency: 'medium',
          resolution_steps: ['Unable to process request: ' + (result.error || 'Unknown error')],
          resolution_steps_count: 1,
          confidence_score: 0,
          processing_time_ms: result.total_processing_time_ms,
          created_at: new Date().toISOString(),
          source: 'support_team_orchestrator',
          error: result.error
        };
      }
    } catch (error) {
      console.error('AgentService: Workflow processing failed:', error);
      
      return {
        success: false,
        ticket_title: 'Error processing request',
        status: 'error',
        category: 'system',
        urgency: 'medium',
        resolution_steps: ['An error occurred while processing the request'],
        resolution_steps_count: 1,
        confidence_score: 0,
        processing_time_ms: 0,
        created_at: new Date().toISOString(),
        source: 'agent_service_error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private extractStepsFromTicket(formattedTicket: string): string[] {
    // Extract numbered steps from the formatted ticket
    const lines = formattedTicket.split('\n');
    const steps: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Match patterns like "1. Step text" or "• Step text"
      if (/^\d+\.\s/.test(trimmed) || /^•\s/.test(trimmed) || /^-\s/.test(trimmed)) {
        // Remove the numbering/bullet and add to steps
        const step = trimmed.replace(/^\d+\.\s/, '').replace(/^[•-]\s/, '').trim();
        if (step.length > 0) {
          steps.push(step);
        }
      }
    }
    
    // If no numbered steps found, try to extract from general content
    if (steps.length === 0) {
      steps.push('Please review the detailed instructions provided in your ticket');
    }
    
    return steps;
  }

  private extractTitleFromTicket(formattedTicket: string): string {
    // Extract title from ticket format like "Ticket #123 • Title"
    const lines = formattedTicket.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('Ticket #') && trimmed.includes('•')) {
        const titlePart = trimmed.split('•')[1]?.trim();
        if (titlePart) {
          return titlePart;
        }
      }
    }
    
    // Fallback: use first meaningful line
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 5 && !trimmed.toLowerCase().includes('dear customer')) {
        return trimmed.substring(0, 50);
      }
    }
    
    return 'Support Request';
  }

  /**
   * Classify a ticket (replacement for direct OpenAI classifyTicket calls)
   */
  async classifyTicket(request: ClassifyTicketRequest): Promise<ClassifyTicketResponse> {
    try {
      console.log(`Agent Service: Classifying ticket - ${request.title.substring(0, 30)}...`);
      
      const response: AxiosResponse<ClassifyTicketResponse> = await axios.post(
        `${this.baseUrl}/classify`,
        request,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Agent Service: Classification result - Category: ${response.data.category}, Complexity: ${response.data.complexity}`);
      return response.data;

    } catch (error) {
      console.error('Agent Service: Classification failed:', error);
      
      // Return fallback classification instead of throwing
      const fallbackClassification: ClassifyTicketResponse = {
        category: "other",
        complexity: "medium",
        assignedTo: "support",
        canAutoResolve: false,
        aiNotes: "Classification failed - assigned to support team for manual review"
      };

      if (axios.isAxiosError(error) && error.code !== 'ECONNREFUSED') {
        console.log('Agent Service: Using fallback classification due to service error');
        return fallbackClassification;
      }

      throw new Error('Agent service is not available for ticket classification');
    }
  }

  /**
   * Attempt to auto-resolve a ticket (replacement for direct OpenAI attemptAutoResolve calls)
   */
  async attemptAutoResolve(request: AutoResolveRequest): Promise<AutoResolveResponse> {
    try {
      console.log(`Agent Service: Attempting auto-resolve for - ${request.title.substring(0, 30)}...`);
      
      const response: AxiosResponse<AutoResolveResponse> = await axios.post(
        `${this.baseUrl}/auto-resolve`,
        request,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Agent Service: Auto-resolve result - Resolved: ${response.data.resolved}`);
      return response.data;

    } catch (error) {
      console.error('Agent Service: Auto-resolve failed:', error);
      
      // Return fallback response instead of throwing
      const fallbackResponse: AutoResolveResponse = {
        resolved: false,
        response: "I apologize, but I'm unable to process your request right now. A support representative will assist you shortly."
      };

      if (axios.isAxiosError(error) && error.code !== 'ECONNREFUSED') {
        console.log('Agent Service: Using fallback response due to service error');
        return fallbackResponse;
      }

      throw new Error('Agent service is not available for auto-resolution');
    }
  }

  /**
   * Generate a chat response (replacement for direct OpenAI generateChatResponse calls)
   */
  async generateChatResponse(request: ChatResponseRequest): Promise<string> {
    try {
      console.log(`Agent Service: Generating chat response for message: ${request.userMessage.substring(0, 30)}...`);
      
      const response: AxiosResponse<string> = await axios.post(
        `${this.baseUrl}/chat-response`,
        request,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Agent Service: Chat response generated successfully`);
      return response.data;

    } catch (error) {
      console.error('Agent Service: Chat response generation failed:', error);
      
      // Return fallback response instead of throwing
      const fallbackResponse = "I understand your question. Let me connect you with a support representative who can provide the best assistance for your specific needs.";

      if (axios.isAxiosError(error) && error.code !== 'ECONNREFUSED') {
        console.log('Agent Service: Using fallback chat response due to service error');
        return fallbackResponse;
      }

      throw new Error('Agent service is not available for chat response generation');
    }
  }

  /**
   * Check if the agent service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/health`,
        { timeout: 5000 }
      );
      return response.status === 200;
    } catch (error) {
      console.warn('Agent Service: Health check failed:', error);
      return false;
    }
  }

  /**
   * Get service status information
   */
  async getServiceStatus(): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/health`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      console.error('Agent Service: Status check failed:', error);
      return {
        status: 'unavailable',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if agent service is available (required method)
   */
  isAvailable(): boolean {
    return this.preprocessorAgent.isAvailable();
  }

  /**
   * Preprocess message using Chat Preprocessor Agent
   */
  async preprocessMessage(message: string, sessionId: string, context?: any): Promise<PreprocessorResult> {
    return await this.preprocessorAgent.preprocess(message, sessionId, context);
  }

  /**
   * Lookup similar tickets using TicketLookupAgent
   */
  async lookupSimilarTickets(query: string, topK: number = 3) {
    return await this.ticketLookupAgent.lookupSimilarTickets(query, topK);
  }

  /**
   * Get ticket lookup agent status
   */
  getTicketLookupStatus() {
    return this.ticketLookupAgent.getStatus();
  }

  /**
   * Format ticket using TicketFormatterAgent
   */
  async formatTicket(input: any) {
    return await this.ticketFormatterAgent.formatTicket(input);
  }

  /**
   * Get ticket formatter agent status
   */
  getTicketFormatterStatus() {
    return this.ticketFormatterAgent.getStatus();
  }

  /**
   * Get preprocessor agent status
   */
  getPreprocessorStatus(): any {
    return this.preprocessorAgent.getStatus();
  }
}

// Default instance
const agentService = new AgentService({
  baseUrl: process.env.AGENT_SERVICE_URL || 'http://localhost:8001'
});

export default agentService;