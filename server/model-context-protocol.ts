/**
 * Model Context Protocol (MCP)
 * 
 * This module provides a unified way for AI providers to access document-based context
 * for generating more accurate responses. It searches and retrieves relevant documents
 * based on user queries and formats them as context for AI models.
 */

import { storage } from "./storage";
import type { SupportDocument } from "@shared/schema";

/**
 * Represents a document with a relevance score for context retrieval
 */
interface ScoredDocument {
  document: SupportDocument;
  score: number;
}

/**
 * Interface for context retrieval options
 */
interface ContextOptions {
  maxDocuments?: number;
  minScore?: number;
  tenantId?: number;
  includeDrafts?: boolean;
  categoryFilter?: string[];
  tagFilter?: string[];
}

/**
 * Default context retrieval options
 */
const DEFAULT_OPTIONS: ContextOptions = {
  maxDocuments: 5,
  minScore: 0.3,
  includeDrafts: false,
}

/**
 * Calculate relevance score between a query and document
 * Simple implementation using keyword matching
 * In production, this would use embeddings/vector search
 */
function calculateRelevanceScore(query: string, document: SupportDocument): number {
  const normalizedQuery = query.toLowerCase();
  const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 3);
  
  // Get all searchable text from the document
  const documentText = [
    document.title,
    document.content,
    document.summary || '',
    ...(document.tags || []),
    ...(document.errorCodes || []),
    ...(document.keywords || [])
  ].join(' ').toLowerCase();
  
  // Count matching words
  let matchCount = 0;
  for (const word of queryWords) {
    if (documentText.includes(word)) {
      matchCount++;
    }
  }
  
  // Calculate score (0-1)
  const score = queryWords.length > 0 ? matchCount / queryWords.length : 0;
  
  return score;
}

/**
 * Retrieve relevant context from documents based on a query
 * 
 * @param query - The user query to find relevant documents for
 * @param options - Optional configuration for document retrieval
 * @returns Formatted string containing relevant document content
 */
export async function getContextForQuery(
  query: string, 
  options: ContextOptions = {}
): Promise<string> {
  // Validate input query
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    console.warn("MCP: Empty or invalid query provided to getContextForQuery");
    return "";
  }
  
  // Merge default options with provided options
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Log operation start
  console.log(`MCP: Getting context for query "${query.substring(0, 30)}${query.length > 30 ? '...' : ''}"${opts.tenantId ? ` for tenant ${opts.tenantId}` : ''}`);
  
  try {
    // Retrieve all documents
    const documents = await storage.getAllSupportDocuments(opts.tenantId);
    
    // Check if we got any documents
    if (!documents || documents.length === 0) {
      console.log(`MCP: No documents found${opts.tenantId ? ` for tenant ${opts.tenantId}` : ''}`);
      return "";
    }
    
    console.log(`MCP: Retrieved ${documents.length} total documents, applying filters...`);
    
    // Filter documents by status if needed
    const filteredDocuments = documents.filter(doc => {
      try {
        // Basic document validation
        if (!doc || !doc.title || !doc.content) {
          console.warn(`MCP: Skipping invalid document (id: ${doc?.id || 'unknown'})`);
          return false;
        }
        
        // Only include published docs unless includeDrafts is true
        if (!opts.includeDrafts && doc.status !== 'published') {
          return false;
        }
        
        // Filter by category if specified
        if (opts.categoryFilter && opts.categoryFilter.length > 0) {
          if (!doc.category || !opts.categoryFilter.includes(doc.category)) {
            return false;
          }
        }
        
        // Filter by tags if specified
        if (opts.tagFilter && opts.tagFilter.length > 0 && doc.tags) {
          const hasMatchingTag = doc.tags.some(tag => 
            opts.tagFilter?.includes(tag)
          );
          if (!hasMatchingTag) {
            return false;
          }
        }
        
        return true;
      } catch (filterError) {
        console.error(`MCP: Error filtering document ${doc?.id || 'unknown'}:`, filterError);
        return false;
      }
    });
    
    console.log(`MCP: After filtering, ${filteredDocuments.length} documents remain`);
    
    // Handle case where no docs passed filtering
    if (filteredDocuments.length === 0) {
      return "";
    }
    
    // Score each document by relevance to the query
    const scoredDocuments: ScoredDocument[] = [];
    
    for (const doc of filteredDocuments) {
      try {
        const score = calculateRelevanceScore(query, doc);
        scoredDocuments.push({ document: doc, score });
      } catch (scoringError) {
        console.error(`MCP: Error scoring document ${doc.id}:`, scoringError);
        // Skip documents that fail scoring
      }
    }
    
    // Sort by score (descending) and filter by minimum score
    const relevantDocuments = scoredDocuments
      .filter(item => item.score >= (opts.minScore || 0))
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.maxDocuments || 5);
    
    console.log(`MCP: Found ${relevantDocuments.length} relevant documents above threshold score`);
    
    if (relevantDocuments.length === 0) {
      return "";
    }
    
    // Format context string with documents
    let contextString = "### RELEVANT DOCUMENTS ###\n\n";
    
    // Add each document to the context
    relevantDocuments.forEach((item, index) => {
      try {
        const doc = item.document;
        contextString += `DOCUMENT ${index + 1} [relevance: ${Math.round(item.score * 100)}%]:\n`;
        contextString += `Title: ${doc.title || 'Untitled'}\n`;
        if (doc.summary) {
          contextString += `Summary: ${doc.summary}\n`;
        }
        if (doc.category) {
          contextString += `Category: ${doc.category}\n`;
        }
        if (doc.errorCodes && doc.errorCodes.length > 0) {
          contextString += `Error Codes: ${doc.errorCodes.join(', ')}\n`;
        }
        if (doc.tags && doc.tags.length > 0) {
          contextString += `Tags: ${doc.tags.join(', ')}\n`;
        }
        contextString += `Content:\n${doc.content || 'No content available'}\n\n`;
      } catch (formattingError) {
        console.error(`MCP: Error formatting document for context:`, formattingError);
        // Skip document that can't be formatted properly
      }
    });
    
    contextString += "### END OF DOCUMENTS ###\n\n";
    
    // Trim context if it's extremely large to avoid token overflow
    if (contextString.length > 10000) {
      console.warn(`MCP: Context very large (${contextString.length} chars), truncating...`);
      contextString = contextString.substring(0, 10000) + "...\n\n### END OF DOCUMENTS (TRUNCATED) ###\n\n";
    }
    
    return contextString;
    
  } catch (error) {
    // Log the error with detailed information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`MCP: Error retrieving context for query: ${errorMessage}`, error);
    return "";
  }
}

/**
 * Format system instructions for AI to properly use context
 */
export function getContextSystemPrompt(): string {
  return `You are a helpful support assistant. When responding to user inquiries, refer to the relevant documents provided in your context, if available.
  
If the RELEVANT DOCUMENTS section exists in your context:
1. Prioritize this information over your general knowledge
2. Cite specific documents when providing solutions
3. If multiple documents are relevant, synthesize the information
4. If the documents don't address the specific question, acknowledge this and provide your best answer
  
Always be helpful, clear, and concise in your responses. Avoid mentioning technical details about how you retrieve or process the documents.`;
}

/**
 * Update model context to include document searches
 * This can be called before invoking any AI provider
 * 
 * @param userQuery - The user query to find relevant documents for
 * @param systemPrompt - The base system prompt to enhance
 * @param tenantId - Optional tenant ID to filter documents
 * @returns Object containing the enhanced prompt and retrieved documents
 */
export async function enhanceModelContextWithDocuments(
  userQuery: string,
  systemPrompt: string,
  tenantId?: number
): Promise<{ enhancedPrompt: string, documents: string }> {
  // Validate inputs
  if (!userQuery || typeof userQuery !== 'string') {
    console.warn("MCP: Invalid or empty user query provided");
    return { enhancedPrompt: systemPrompt, documents: "" };
  }
  
  if (!systemPrompt || typeof systemPrompt !== 'string') {
    console.warn("MCP: Invalid or empty system prompt provided");
    systemPrompt = "You are a helpful support assistant.";
  }
  
  try {
    console.log(`MCP: Searching for documents relevant to query "${userQuery.substring(0, 50)}${userQuery.length > 50 ? '...' : ''}"${tenantId ? ` for tenant ${tenantId}` : ''}`);
    
    // Measure performance of document retrieval
    const startTime = Date.now();
    
    // Get document context for the query
    const documentContext = await getContextForQuery(userQuery, { 
      tenantId,
      maxDocuments: 5,  // Limit to 5 most relevant docs
      minScore: 0.4     // Increased relevance threshold for better results
    });
    
    const duration = Date.now() - startTime;
    
    // Log results
    if (documentContext && documentContext.trim().length > 0) {
      console.log(`MCP: Found relevant documents (${documentContext.length} chars) in ${duration}ms${tenantId ? ` for tenant ${tenantId}` : ''}`);
    } else {
      console.log(`MCP: No relevant documents found in ${duration}ms${tenantId ? ` for tenant ${tenantId}` : ''}`);
    }
    
    // If we found relevant documents, update the system prompt
    const enhancedPrompt = documentContext 
      ? `${systemPrompt}\n\n${getContextSystemPrompt()}`
      : systemPrompt;
    
    return {
      enhancedPrompt,
      documents: documentContext
    };
  } catch (error) {
    // Log the error with detailed information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`MCP: Error enhancing context with documents: ${errorMessage}`, error);
    
    // Return the original prompt without enhancement
    return {
      enhancedPrompt: systemPrompt,
      documents: ""
    };
  }
}