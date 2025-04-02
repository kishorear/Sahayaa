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
 */
export async function getContextForQuery(
  query: string, 
  options: ContextOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  try {
    // Retrieve all documents
    const documents = await storage.getAllSupportDocuments(opts.tenantId);
    
    if (!documents || documents.length === 0) {
      return "";
    }
    
    // Filter documents by status if needed
    const filteredDocuments = documents.filter(doc => {
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
    });
    
    // Score each document by relevance to the query
    const scoredDocuments: ScoredDocument[] = filteredDocuments.map(doc => ({
      document: doc,
      score: calculateRelevanceScore(query, doc)
    }));
    
    // Sort by score (descending) and filter by minimum score
    const relevantDocuments = scoredDocuments
      .filter(item => item.score >= (opts.minScore || 0))
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.maxDocuments || 5);
    
    if (relevantDocuments.length === 0) {
      return "";
    }
    
    // Format context string with documents
    let contextString = "### RELEVANT DOCUMENTS ###\n\n";
    
    relevantDocuments.forEach((item, index) => {
      const doc = item.document;
      contextString += `DOCUMENT ${index + 1} [relevance: ${Math.round(item.score * 100)}%]:\n`;
      contextString += `Title: ${doc.title}\n`;
      if (doc.summary) {
        contextString += `Summary: ${doc.summary}\n`;
      }
      if (doc.category) {
        contextString += `Category: ${doc.category}\n`;
      }
      if (doc.errorCodes && doc.errorCodes.length > 0) {
        contextString += `Error Codes: ${doc.errorCodes.join(', ')}\n`;
      }
      contextString += `Content:\n${doc.content}\n\n`;
    });
    
    contextString += "### END OF DOCUMENTS ###\n\n";
    return contextString;
    
  } catch (error) {
    console.error("Error retrieving context:", error);
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
 */
export async function enhanceModelContextWithDocuments(
  userQuery: string,
  systemPrompt: string,
  tenantId?: number
): Promise<{ enhancedPrompt: string, documents: string }> {
  // Get document context for the query
  const documentContext = await getContextForQuery(userQuery, { tenantId });
  
  // If we found relevant documents, update the system prompt
  const enhancedPrompt = documentContext 
    ? `${systemPrompt}\n\n${getContextSystemPrompt()}`
    : systemPrompt;
  
  return {
    enhancedPrompt,
    documents: documentContext
  };
}