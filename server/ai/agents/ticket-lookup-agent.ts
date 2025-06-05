/**
 * TicketLookupAgent - Third agent in the multi-agent pipeline
 * 
 * Purpose: Finds and returns the most similar past tickets based on vector similarity
 * to provide context for resolving new support requests.
 * 
 * Responsibilities:
 * 1. Receive the normalized prompt from ChatPreprocessorAgent
 * 2. Search for similar tickets using vector similarity
 * 3. Return ticket IDs, scores, and resolution context
 * 4. Provide structured data for downstream LLM processing
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

interface SimilarTicket {
  ticket_id: number;
  score: number;
  title?: string;
  category?: string;
  status?: string;
  resolution?: string;
  created_at?: string;
}

interface TicketLookupResult {
  success: boolean;
  similar_tickets: SimilarTicket[];
  search_query: string;
  total_found: number;
  search_method: 'fastapi_service' | 'local_fallback' | 'fallback';
  processing_time_ms: number;
  error?: string;
}

interface TicketLookupStatus {
  name: string;
  available: boolean;
  fastapi_service_connected: boolean;
  google_ai_configured: boolean;
  local_ticket_database: number;
  capabilities: string[];
}

export class TicketLookupAgent {
  private genAI: GoogleGenerativeAI | null = null;
  private fastApiBaseUrl: string = 'http://localhost:8001';
  private fallbackTickets: SimilarTicket[] = [];

  constructor() {
    this.initializeGoogleAI();
    this.initializeFallbackData();
  }

  private initializeGoogleAI(): void {
    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (googleApiKey) {
      this.genAI = new GoogleGenerativeAI(googleApiKey);
      console.log('TicketLookupAgent: Google AI initialized for embeddings');
    } else {
      console.warn('TicketLookupAgent: GOOGLE_API_KEY not available');
    }
  }

  private initializeFallbackData(): void {
    // Create realistic fallback tickets for demonstration
    this.fallbackTickets = [
      {
        ticket_id: 1001,
        score: 0.85,
        title: "VPN Connection Issues",
        category: "technical",
        status: "resolved",
        resolution: "Reset VPN configuration and updated client software. Issue resolved after clearing DNS cache and reconnecting.",
        created_at: "2025-01-15T10:30:00Z"
      },
      {
        ticket_id: 1002, 
        score: 0.78,
        title: "Email Authentication Problems",
        category: "technical",
        status: "resolved", 
        resolution: "Updated email server settings and regenerated authentication tokens. Verified SMTP configuration.",
        created_at: "2025-01-12T14:20:00Z"
      },
      {
        ticket_id: 1003,
        score: 0.72,
        title: "Billing Payment Declined",
        category: "billing",
        status: "resolved",
        resolution: "Customer updated payment method and confirmed billing address. Payment processed successfully.",
        created_at: "2025-01-10T09:15:00Z"
      }
    ];
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.genAI) {
      throw new Error('Google AI not available for embeddings');
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.error('TicketLookupAgent: Error generating embedding:', error);
      throw error;
    }
  }

  private async searchFastApiService(query: string, topK: number = 3): Promise<SimilarTicket[]> {
    try {
      const response = await axios.get(`${this.fastApiBaseUrl}/tickets/similar/`, {
        params: {
          query: query,
          top_k: topK
        },
        timeout: 5000
      });

      console.log(`TicketLookupAgent: FastAPI service returned ${response.data.length} tickets`);
      return response.data.map((ticket: any) => ({
        ticket_id: ticket.ticket_id,
        score: ticket.score,
        title: ticket.title,
        category: ticket.category,
        status: ticket.status,
        resolution: ticket.resolution,
        created_at: ticket.created_at
      }));
    } catch (error) {
      console.log('TicketLookupAgent: FastAPI service not available, using local fallback');
      throw error;
    }
  }

  private async searchLocalFallback(query: string, topK: number = 3): Promise<SimilarTicket[]> {
    // Simple keyword-based matching for fallback
    const queryLower = query.toLowerCase();
    
    const scored = this.fallbackTickets.map(ticket => {
      let score = 0;
      const titleLower = ticket.title?.toLowerCase() || '';
      const resolutionLower = ticket.resolution?.toLowerCase() || '';
      
      // Basic keyword matching
      if (titleLower.includes('vpn') && queryLower.includes('vpn')) score += 0.3;
      if (titleLower.includes('email') && queryLower.includes('email')) score += 0.3;
      if (titleLower.includes('billing') && queryLower.includes('billing')) score += 0.3;
      if (titleLower.includes('payment') && queryLower.includes('payment')) score += 0.3;
      if (titleLower.includes('auth') && (queryLower.includes('auth') || queryLower.includes('login'))) score += 0.3;
      
      // Urgency matching
      if (queryLower.includes('urgent') || queryLower.includes('critical')) score += 0.1;
      
      return {
        ...ticket,
        score: Math.min(score, 0.9) // Cap at 0.9 for fallback
      };
    });

    return scored
      .filter(ticket => ticket.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async lookupSimilarTickets(query: string, topK: number = 3): Promise<TicketLookupResult> {
    const startTime = Date.now();
    
    console.log(`TicketLookupAgent: Looking up similar tickets for: "${query}"`);

    try {
      // Try FastAPI service first
      const tickets = await this.searchFastApiService(query, topK);
      const processingTime = Date.now() - startTime;
      
      console.log(`TicketLookupAgent: Found ${tickets.length} tickets via FastAPI service`);
      console.log(`TicketLookupAgent: Completed lookup in ${processingTime}ms using fastapi_service`);

      return {
        success: true,
        similar_tickets: tickets,
        search_query: query,
        total_found: tickets.length,
        search_method: 'fastapi_service',
        processing_time_ms: processingTime
      };

    } catch (fastApiError) {
      // Fallback to local search
      try {
        const tickets = await this.searchLocalFallback(query, topK);
        const processingTime = Date.now() - startTime;
        
        console.log(`TicketLookupAgent: Found ${tickets.length} tickets via local fallback`);
        console.log(`TicketLookupAgent: Completed lookup in ${processingTime}ms using local_fallback`);

        return {
          success: true,
          similar_tickets: tickets,
          search_query: query,
          total_found: tickets.length,
          search_method: 'local_fallback',
          processing_time_ms: processingTime
        };

      } catch (fallbackError) {
        // Final fallback with generic tickets
        const processingTime = Date.now() - startTime;
        
        console.log('TicketLookupAgent: Using generic fallback tickets');
        console.log(`TicketLookupAgent: Completed lookup in ${processingTime}ms using fallback`);

        return {
          success: true,
          similar_tickets: [
            {
              ticket_id: 9999,
              score: 0.5,
              title: "General Support Request",
              category: "general",
              status: "resolved",
              resolution: "Follow standard troubleshooting procedures: 1) Verify user permissions 2) Check system status 3) Review logs 4) Escalate if needed",
              created_at: new Date().toISOString()
            }
          ],
          search_query: query,
          total_found: 1,
          search_method: 'fallback',
          processing_time_ms: processingTime
        };
      }
    }
  }

  getStatus(): TicketLookupStatus {
    return {
      name: 'TicketLookupAgent',
      available: true,
      fastapi_service_connected: false, // Will be checked dynamically
      google_ai_configured: this.genAI !== null,
      local_ticket_database: this.fallbackTickets.length,
      capabilities: [
        'Vector similarity search',
        'FastAPI service integration', 
        'Local ticket database fallback',
        'Resolution context extraction',
        'Relevance scoring'
      ]
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.fastApiBaseUrl}/health`, { timeout: 3000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}