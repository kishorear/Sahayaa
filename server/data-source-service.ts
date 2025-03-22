import { storage } from './storage';
import { DataSource } from '@shared/schema';
import axios from 'axios';

/**
 * Fetches knowledge relevant to a query from all enabled data sources
 * @param query The user's question or message to search knowledge for
 * @returns Aggregated context from all data sources based on relevance
 */
export async function getKnowledgeForQuery(query: string): Promise<string> {
  try {
    // Get all enabled data sources, sorted by priority
    const dataSources = await storage.getEnabledDataSources();
    
    if (!dataSources.length) {
      return '';
    }
    
    // Process each data source and collect knowledge
    const knowledgePromises = dataSources.map(dataSource => 
      processDataSource(dataSource, query)
    );
    
    // Await all promises and combine the results
    const knowledgeResults = await Promise.all(knowledgePromises);
    const combinedKnowledge = knowledgeResults
      .filter(Boolean) // Remove empty results
      .join('\n\n');
      
    return combinedKnowledge;
  } catch (error) {
    console.error('Error fetching knowledge:', error);
    return '';
  }
}

/**
 * Process a specific data source to extract relevant knowledge
 * @param dataSource The data source to process
 * @param query The user's query
 * @returns Extracted knowledge as a string
 */
async function processDataSource(dataSource: DataSource, query: string): Promise<string> {
  try {
    const normalizedQuery = query.toLowerCase();
    
    switch (dataSource.type) {
      case 'kb':
        return processKnowledgeBase(dataSource, normalizedQuery);
      
      case 'url':
        return processUrl(dataSource, normalizedQuery);
      
      case 'custom':
        return processCustomData(dataSource, normalizedQuery);
        
      default:
        console.warn(`Unknown data source type: ${dataSource.type}`);
        return '';
    }
  } catch (error) {
    console.error(`Error processing data source ${dataSource.name}:`, error);
    return '';
  }
}

/**
 * Process knowledge base type data source
 */
function processKnowledgeBase(dataSource: DataSource, query: string): string {
  if (!dataSource.content) {
    return '';
  }
  
  try {
    const knowledgeBase = JSON.parse(dataSource.content);
    
    if (!Array.isArray(knowledgeBase)) {
      return '';
    }
    
    // Find relevant entries based on query similarity
    const relevantEntries = knowledgeBase.filter(entry => {
      const entryText = `${entry.question} ${entry.category} ${entry.tags?.join(' ') || ''}`.toLowerCase();
      // Basic keyword matching
      return query.split(' ').some(word => 
        word.length > 3 && entryText.includes(word)
      );
    });
    
    if (relevantEntries.length === 0) {
      return '';
    }
    
    // Format the knowledge into a useful context string
    return `Relevant knowledge from ${dataSource.name}:\n\n` + 
      relevantEntries.map(entry => 
        `Question: ${entry.question}\nSolution: ${entry.solution}`
      ).join('\n\n');
      
  } catch (error) {
    console.error(`Error parsing knowledge base for ${dataSource.name}:`, error);
    return '';
  }
}

/**
 * Process URL type data source (not fully implemented)
 * This would fetch content from the URL and extract relevant information
 */
async function processUrl(dataSource: DataSource, query: string): Promise<string> {
  if (!dataSource.content) {
    return '';
  }
  
  // In a production environment, this would:
  // 1. Fetch content from URL
  // 2. Parse the HTML
  // 3. Extract meaningful text
  // 4. Index and search for relevant sections
  
  // For this prototype, we'll just return a placeholder
  return `Knowledge source: ${dataSource.name} (URL: ${dataSource.content})`;
}

/**
 * Process custom data source
 */
function processCustomData(dataSource: DataSource, query: string): string {
  if (!dataSource.content) {
    return '';
  }
  
  try {
    // Parse custom data - could be JSON array of Q&A or other formats
    const customData = JSON.parse(dataSource.content);
    
    if (Array.isArray(customData)) {
      // Handle array of Q&A pairs
      const relevantItems = customData.filter(item => {
        const itemText = `${item.question || ''} ${item.answer || ''}`.toLowerCase();
        return query.split(' ').some(word => 
          word.length > 3 && itemText.includes(word)
        );
      });
      
      if (relevantItems.length === 0) {
        return '';
      }
      
      return `Relevant information from ${dataSource.name}:\n\n` + 
        relevantItems.map(item => 
          `Q: ${item.question || ''}\nA: ${item.answer || ''}`
        ).join('\n\n');
    } else {
      // Handle custom data format - just return a simple representation
      return `Knowledge from ${dataSource.name}: ${JSON.stringify(customData).slice(0, 200)}...`;
    }
  } catch (error) {
    // If it's not JSON, treat it as plain text
    return `Information from ${dataSource.name}: ${dataSource.content.slice(0, 200)}...`;
  }
}

/**
 * Format all knowledge sources into a single context string for AI
 */
export async function buildAIContext(query: string): Promise<string> {
  const knowledge = await getKnowledgeForQuery(query);
  
  if (!knowledge) {
    return '';
  }
  
  return `The following information may be relevant to the user's query:\n\n${knowledge}\n\nUse the above information to provide an accurate and helpful response to the user's query.`;
}