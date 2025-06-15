/**
 * TicketLookupAgent - Retrieves similar tickets from MCP FastAPI server
 * 
 * This agent:
 * 1. Uses MCP FastAPI service on port 8000 for relational ticket data
 * 2. Queries /tickets/similar/ endpoint for semantic similarity
 * 3. Returns top-3 similar tickets with {ticket_id, similarity_score, resolution_excerpt}
 * 4. Uses RedisMemory for session context sharing
 */

import axios from 'axios';
import { redisMemory } from '../../../services/redis_memory_service.js';

interface TicketLookupInput {
  normalizedPrompt: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'positive' | 'neutral' | 'negative';
  sessionId: string;
  tenantId?: number;
  topK?: number;
}

interface TicketResult {
  ticket_id: number;
  similarity_score: number;
  resolution_excerpt: string;
  title?: string;
  category?: string;
  status?: string;
  metadata?: Record<string, any>;
}

interface TicketLookupOutput {
  success: boolean;
  tickets: TicketResult[];
  searchQuery: string;
  totalFound: number;
  searchMethod: 'mcp_fastapi';
  processing_time_ms: number;
  error?: string;
}

export class TicketLookupAgent {
  private mcpServiceUrl: string = 'http://localhost:8000';

  constructor() {
    console.log('TicketLookupAgent: Initialized for MCP FastAPI service');
  }

  /**
   * Main lookup method - searches MCP FastAPI for similar tickets
   */
  async lookupSimilarTickets(input: TicketLookupInput): Promise<TicketLookupOutput> {
    const startTime = Date.now();
    
    try {
      console.log(`TicketLookupAgent: Looking up similar tickets for: "${input.normalizedPrompt}"`);
      
      // Retrieve session data from RedisMemory
      const sessionData = await redisMemory.getSessionData(input.sessionId);
      
      // Use MCP FastAPI service for ticket similarity search
      const response = await axios.post(`${this.mcpServiceUrl}/tickets/similar/`, {
        query: input.normalizedPrompt,
        tenant_id: input.tenantId || 1,
        top_k: input.topK || 3,
        urgency: input.urgency,
        sentiment: input.sentiment
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const results = response.data;
      const tickets: TicketResult[] = results.similar_tickets?.map((ticket: any) => ({
        ticket_id: ticket.id || ticket.ticket_id,
        similarity_score: ticket.similarity_score || ticket.score || 0,
        resolution_excerpt: ticket.resolution_excerpt || ticket.resolution?.substring(0, 200) + '...' || 'No resolution available',
        title: ticket.title || 'Untitled',
        category: ticket.category || 'General',
        status: ticket.status || 'Unknown',
        metadata: ticket.metadata || {}
      })) || [];

      // Store ticket hits in RedisMemory
      await redisMemory.updateSessionField(input.sessionId, 'ticket_hits', tickets);

      const processingTime = Date.now() - startTime;
      
      console.log(`TicketLookupAgent: Found ${tickets.length} similar tickets via MCP FastAPI in ${processingTime}ms`);

      return {
        success: true,
        tickets,
        searchQuery: input.normalizedPrompt,
        totalFound: tickets.length,
        searchMethod: 'mcp_fastapi',
        processing_time_ms: processingTime
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('TicketLookupAgent: MCP FastAPI lookup failed:', error.message);
      
      // No fallback allowed - MCP server is mandatory
      return {
        success: false,
        tickets: [],
        searchQuery: input.normalizedPrompt,
        totalFound: 0,
        searchMethod: 'mcp_fastapi',
        processing_time_ms: processingTime,
        error: `MCP FastAPI service unavailable: ${error.message}`
      };
    }
  }

  /**
   * Get ticket details by ID from MCP FastAPI
   */
  async getTicketById(ticketId: number, tenantId: number = 1): Promise<any> {
    try {
      const response = await axios.get(`${this.mcpServiceUrl}/tickets/${ticketId}`, {
        params: { tenant_id: tenantId },
        timeout: 5000
      });
      
      return response.data;
    } catch (error: any) {
      console.error(`TicketLookupAgent: Failed to get ticket ${ticketId}:`, error.message);
      return null;
    }
  }

  /**
   * Status check for the agent
   */
  async getStatus(): Promise<any> {
    try {
      const response = await axios.get(`${this.mcpServiceUrl}/health`, { timeout: 2000 });
      return {
        name: 'TicketLookupAgent',
        available: true,
        mcp_fastapi_connected: response.status === 200,
        ticket_count: response.data?.ticket_count || 0,
        capabilities: ['mcp_fastapi_search', 'redis_memory', 'ticket_similarity'],
        service_url: this.mcpServiceUrl
      };
    } catch (error) {
      return {
        name: 'TicketLookupAgent',
        available: false,
        mcp_fastapi_connected: false,
        ticket_count: 0,
        capabilities: ['redis_memory'],
        service_url: this.mcpServiceUrl,
        error: 'MCP FastAPI service not available - THIS IS REQUIRED'
      };
    }
  }
}

// Export singleton instance for use in other modules
export const ticketLookupAgent = new TicketLookupAgent();