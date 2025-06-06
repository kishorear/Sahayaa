/**
 * Agent Service - Integrated multi-agent system
 * Combines preprocessing, classification, resolution, and response generation
 */

import axios, { AxiosResponse } from 'axios';
import { ChatPreprocessorAgent, PreprocessorResult } from './agents/chat-preprocessor-agent';
import { TicketLookupAgent } from './agents/ticket-lookup-agent';
import { TicketFormatterAgent } from './agents/ticket-formatter-agent';

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

  constructor(config: AgentServiceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 30000; // 30 seconds default
    this.preprocessorAgent = new ChatPreprocessorAgent();
    this.ticketLookupAgent = new TicketLookupAgent();
    this.ticketFormatterAgent = new TicketFormatterAgent();
  }

  /**
   * Main workflow endpoint - processes user message and returns complete ticket
   */
  async processWorkflow(request: AgentWorkflowRequest): Promise<AgentWorkflowResponse> {
    try {
      console.log(`Agent Service: Processing workflow for message: ${request.user_message.substring(0, 50)}...`);
      
      const response: AxiosResponse<AgentWorkflowResponse> = await axios.post(
        `${this.baseUrl}/process`,
        request,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`Agent Service: Workflow completed - Ticket #${response.data.ticket_id}, Status: ${response.data.status}`);
      return response.data;

    } catch (error) {
      console.error('Agent Service: Workflow processing failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Agent service is not available. Please ensure the agent service is running.');
        }
        if (error.response) {
          throw new Error(`Agent service error: ${error.response.status} - ${error.response.data?.detail || error.response.statusText}`);
        }
        if (error.request) {
          throw new Error('Agent service did not respond. Please check the service status.');
        }
      }
      
      throw new Error(`Agent service request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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