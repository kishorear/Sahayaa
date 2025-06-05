/**
 * InstructionLookupAgent - Retrieves relevant instruction texts from vector database
 * 
 * This agent:
 * 1. Embeds the processed prompt using OpenAI's text-embedding-3-small model
 * 2. Queries the instruction_texts collection in Qdrant for semantic similarity
 * 3. Returns top-K relevant instruction texts with metadata
 * 4. Falls back to local vector storage if Qdrant is unavailable
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { QdrantClient } from '@qdrant/qdrant-js';
import fs from 'fs/promises';
import path from 'path';

interface InstructionLookupInput {
  normalizedPrompt: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'positive' | 'neutral' | 'negative';
  sessionId: string;
  topK?: number;
}

interface InstructionResult {
  text: string;
  filename: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

interface InstructionLookupOutput {
  success: boolean;
  instructions: InstructionResult[];
  searchQuery: string;
  totalFound: number;
  searchMethod: 'qdrant' | 'local_vector' | 'fallback';
  error?: string;
}

interface LocalVectorData {
  documents: Array<{
    id: string;
    text: string;
    filename: string;
    embedding: number[];
    metadata: Record<string, any>;
  }>;
  metadata: {
    version: string;
    totalDocuments: number;
    lastUpdated: string;
  };
}

export class InstructionLookupAgent {
  private genAI: GoogleGenerativeAI | null = null;
  private qdrantClient: QdrantClient | null = null;
  private localVectorPath: string;
  private localVectorData: LocalVectorData | null = null;

  constructor() {
    this.localVectorPath = path.join(process.cwd(), 'vector_storage', 'documents.json');
    this.initializeServices();
  }

  private async initializeServices() {
    try {
      // Initialize Google AI for embeddings if API key is available
      const googleApiKey = process.env.GOOGLE_API_KEY;
      if (googleApiKey) {
        this.genAI = new GoogleGenerativeAI(googleApiKey);
        console.log('InstructionLookupAgent: Google AI initialized for embeddings');
      }

      // Initialize Qdrant client
      try {
        this.qdrantClient = new QdrantClient({
          url: process.env.QDRANT_URL || 'http://localhost:6333',
          apiKey: process.env.QDRANT_API_KEY
        });
        
        // Test Qdrant connection
        await this.qdrantClient.getCollections();
        console.log('InstructionLookupAgent: Qdrant client initialized successfully');
      } catch (qdrantError) {
        console.warn('InstructionLookupAgent: Qdrant not available, will use local vector storage');
        this.qdrantClient = null;
      }

      // Load local vector data as fallback
      await this.loadLocalVectorData();

    } catch (error) {
      console.error('InstructionLookupAgent: Error during initialization:', error);
    }
  }

  private async loadLocalVectorData() {
    try {
      const data = await fs.readFile(this.localVectorPath, 'utf-8');
      this.localVectorData = JSON.parse(data);
      console.log(`InstructionLookupAgent: Loaded ${this.localVectorData?.documents.length || 0} documents from local storage`);
    } catch (error) {
      console.warn('InstructionLookupAgent: No local vector data found, will create empty storage');
      this.localVectorData = {
        documents: [],
        metadata: {
          version: '1.0',
          totalDocuments: 0,
          lastUpdated: new Date().toISOString()
        }
      };
    }
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
      console.error('InstructionLookupAgent: Error generating embedding:', error);
      throw error;
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async searchQdrant(queryEmbedding: number[], topK: number): Promise<InstructionResult[]> {
    if (!this.qdrantClient) {
      throw new Error('Qdrant client not available');
    }

    try {
      const searchResult = await this.qdrantClient.search('instruction_texts', {
        vector: queryEmbedding,
        limit: topK,
        with_payload: true
      });

      return searchResult.map(hit => ({
        text: hit.payload?.text as string || '',
        filename: hit.payload?.filename as string || 'unknown',
        relevanceScore: hit.score || 0,
        metadata: hit.payload as Record<string, any>
      }));
    } catch (error) {
      console.error('InstructionLookupAgent: Error searching Qdrant:', error);
      throw error;
    }
  }

  private async searchLocalVector(queryEmbedding: number[], topK: number): Promise<InstructionResult[]> {
    if (!this.localVectorData || this.localVectorData.documents.length === 0) {
      return [];
    }

    const similarities = this.localVectorData.documents.map(doc => {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      return {
        text: doc.text,
        filename: doc.filename,
        relevanceScore: similarity,
        metadata: doc.metadata
      };
    });

    // Sort by relevance score (highest first) and take topK
    return similarities
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK);
  }

  private getFallbackInstructions(): InstructionResult[] {
    return [
      {
        text: `# General Support Guidelines

## Customer Service Best Practices
1. Always greet the customer politely
2. Listen carefully to understand their issue
3. Provide clear, step-by-step solutions
4. Follow up to ensure the issue is resolved
5. Document the interaction for future reference

## Common Issue Categories
- Technical Problems: Check system status, verify configurations
- Account Issues: Verify identity, check account status
- Billing Questions: Review account history, explain charges
- Feature Requests: Document and forward to product team

## Escalation Guidelines
- Critical issues: Escalate immediately to senior support
- Complex technical issues: Involve technical team
- Billing disputes: Route to billing department`,
        filename: 'general_support_guidelines.md',
        relevanceScore: 0.5,
        metadata: { category: 'general', source: 'fallback' }
      }
    ];
  }

  async lookupInstructions(input: InstructionLookupInput): Promise<InstructionLookupOutput> {
    const startTime = Date.now();
    const { normalizedPrompt, topK = 3 } = input;

    console.log(`InstructionLookupAgent: Looking up instructions for: "${normalizedPrompt}"`);

    try {
      // Generate embedding for the normalized prompt
      let queryEmbedding: number[];
      try {
        queryEmbedding = await this.generateEmbedding(normalizedPrompt);
      } catch (embeddingError) {
        console.error('InstructionLookupAgent: Failed to generate embedding, using fallback');
        return {
          success: true,
          instructions: this.getFallbackInstructions(),
          searchQuery: normalizedPrompt,
          totalFound: 1,
          searchMethod: 'fallback',
          error: 'Embedding generation failed, used fallback instructions'
        };
      }

      let instructions: InstructionResult[] = [];
      let searchMethod: 'qdrant' | 'local_vector' | 'fallback' = 'fallback';

      // Try Qdrant first
      if (this.qdrantClient) {
        try {
          instructions = await this.searchQdrant(queryEmbedding, topK);
          searchMethod = 'qdrant';
          console.log(`InstructionLookupAgent: Found ${instructions.length} instructions via Qdrant`);
        } catch (qdrantError) {
          console.warn('InstructionLookupAgent: Qdrant search failed, trying local vector storage');
        }
      }

      // Fall back to local vector storage
      if (instructions.length === 0) {
        try {
          instructions = await this.searchLocalVector(queryEmbedding, topK);
          searchMethod = 'local_vector';
          console.log(`InstructionLookupAgent: Found ${instructions.length} instructions via local vector storage`);
        } catch (localError) {
          console.warn('InstructionLookupAgent: Local vector search failed, using fallback');
        }
      }

      // Final fallback to static instructions
      if (instructions.length === 0) {
        instructions = this.getFallbackInstructions();
        searchMethod = 'fallback';
        console.log('InstructionLookupAgent: Using fallback instructions');
      }

      const processingTime = Date.now() - startTime;
      console.log(`InstructionLookupAgent: Completed lookup in ${processingTime}ms using ${searchMethod}`);

      return {
        success: true,
        instructions,
        searchQuery: normalizedPrompt,
        totalFound: instructions.length,
        searchMethod
      };

    } catch (error) {
      console.error('InstructionLookupAgent: Error during instruction lookup:', error);
      
      return {
        success: false,
        instructions: this.getFallbackInstructions(),
        searchQuery: normalizedPrompt,
        totalFound: 0,
        searchMethod: 'fallback',
        error: error instanceof Error ? error.message : 'Unknown error during instruction lookup'
      };
    }
  }

  // Utility method to get agent status
  getStatus() {
    return {
      name: 'InstructionLookupAgent',
      available: true,
      qdrantConnected: !!this.qdrantClient,
      googleAIConfigured: !!this.genAI,
      localVectorDocuments: this.localVectorData?.documents.length || 0,
      capabilities: [
        'Semantic instruction search',
        'Vector similarity matching',
        'Multi-source fallback',
        'Relevance scoring'
      ]
    };
  }
}

// Export singleton instance
export const instructionLookupAgent = new InstructionLookupAgent();