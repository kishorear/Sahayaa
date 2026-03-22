/**
 * InstructionLookupAgent - Retrieves relevant instruction texts from ChromaDB
 * 
 * This agent:
 * 1. Embeds the processed prompt using Google Gemini embeddings
 * 2. Queries the ChromaDB instruction_texts collection for semantic similarity
 * 3. Returns top-3 relevant instruction entries with {filename, text_excerpt, score}
 * 4. Uses RedisMemory for session context sharing
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import { redisMemory } from '../../../services/redis_memory_service.js';

interface InstructionLookupInput {
  normalizedPrompt: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'positive' | 'neutral' | 'negative';
  sessionId: string;
  topK?: number;
}

interface InstructionResult {
  filename: string;
  text_excerpt: string;
  score: number;
  metadata?: Record<string, any>;
}

interface InstructionLookupOutput {
  success: boolean;
  instructions: InstructionResult[];
  searchQuery: string;
  totalFound: number;
  searchMethod: 'chromadb';
  processing_time_ms: number;
  error?: string;
}

export class InstructionLookupAgent {
  private genAI: GoogleGenerativeAI | null = null;
  private chromaServiceUrl: string = 'http://localhost:8000';

  constructor() {
    this.initializeGemini();
  }

  private initializeGemini(): void {
    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (googleApiKey) {
      this.genAI = new GoogleGenerativeAI(googleApiKey);
      console.log('InstructionLookupAgent: Google AI initialized for ChromaDB embeddings');
    } else {
      console.warn('InstructionLookupAgent: GOOGLE_API_KEY not available');
    }
  }

  /**
   * Main lookup method - searches ChromaDB for relevant instructions
   */
  async lookupInstructions(input: InstructionLookupInput): Promise<InstructionLookupOutput> {
    const startTime = Date.now();
    
    try {
      console.log(`InstructionLookupAgent: Looking up instructions for: "${input.normalizedPrompt}"`);
      
      // Store input in RedisMemory for context sharing
      await redisMemory.setSessionData(input.sessionId, {
        normalized_prompt: input.normalizedPrompt,
        urgency: input.urgency,
        sentiment: input.sentiment
      });

      // Use Python ChromaDB service for instruction lookup
      const response = await axios.post('http://localhost:3001/api/chromadb/search-instructions', {
        query: input.normalizedPrompt,
        top_k: input.topK || 3,
        collection: 'instruction_texts'
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const results = response.data;
      const instructions: InstructionResult[] = results.results?.map((result: any) => ({
        filename: result.metadata?.filename || 'Unknown',
        text_excerpt: result.text?.substring(0, 200) + '...' || 'No content',
        score: result.score || 0,
        metadata: result.metadata || {}
      })) || [];

      // Store instruction hits in RedisMemory
      await redisMemory.updateSessionField(input.sessionId, 'instruction_hits', instructions);

      const processingTime = Date.now() - startTime;
      
      console.log(`InstructionLookupAgent: Found ${instructions.length} instructions via ChromaDB in ${processingTime}ms`);

      return {
        success: true,
        instructions,
        searchQuery: input.normalizedPrompt,
        totalFound: instructions.length,
        searchMethod: 'chromadb',
        processing_time_ms: processingTime
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      console.error('InstructionLookupAgent: ChromaDB lookup failed:', error.message);
      
      // Fallback to local ChromaDB Python service
      return this.fallbackToLocalChromaDB(input, processingTime);
    }
  }

  /**
   * Fallback to direct Python ChromaDB service
   */
  private async fallbackToLocalChromaDB(input: InstructionLookupInput, baseProcessingTime: number): Promise<InstructionLookupOutput> {
    try {
      // Call Python ChromaDB service directly
      const response = await axios.post('http://localhost:8001/chromadb/instructions/search', {
        query: input.normalizedPrompt,
        top_k: input.topK || 3
      }, {
        timeout: 5000
      });

      const results = response.data;
      const instructions: InstructionResult[] = results.instructions?.map((inst: any) => ({
        filename: inst.filename || 'instruction.txt',
        text_excerpt: inst.text_excerpt || inst.text?.substring(0, 200) + '...' || 'No content',
        score: inst.score || 0,
        metadata: inst.metadata || {}
      })) || [];

      // Store in RedisMemory
      await redisMemory.updateSessionField(input.sessionId, 'instruction_hits', instructions);

      const totalProcessingTime = baseProcessingTime + (Date.now() - Date.now());
      
      console.log(`InstructionLookupAgent: Fallback found ${instructions.length} instructions`);

      return {
        success: true,
        instructions,
        searchQuery: input.normalizedPrompt,
        totalFound: instructions.length,
        searchMethod: 'chromadb',
        processing_time_ms: totalProcessingTime
      };

    } catch (fallbackError: any) {
      console.error('InstructionLookupAgent: All ChromaDB methods failed:', fallbackError.message);
      
      return {
        success: false,
        instructions: [],
        searchQuery: input.normalizedPrompt,
        totalFound: 0,
        searchMethod: 'chromadb',
        processing_time_ms: baseProcessingTime + 50,
        error: 'ChromaDB service unavailable'
      };
    }
  }

  /**
   * Status check for the agent
   */
  async getStatus(): Promise<any> {
    try {
      const response = await axios.get('http://localhost:3001/api/chromadb/status', { timeout: 2000 });
      return {
        name: 'InstructionLookupAgent',
        available: true,
        chromadb_connected: response.status === 200,
        google_ai_configured: this.genAI !== null,
        instruction_count: response.data?.instruction_texts?.count || 0,
        capabilities: ['chromadb_search', 'redis_memory', 'gemini_embeddings']
      };
    } catch (error) {
      return {
        name: 'InstructionLookupAgent',
        available: false,
        chromadb_connected: false,
        google_ai_configured: this.genAI !== null,
        instruction_count: 0,
        capabilities: ['redis_memory'],
        error: 'ChromaDB service not available'
      };
    }
  }
}

// Export singleton instance for use in other modules
export const instructionLookupAgent = new InstructionLookupAgent();