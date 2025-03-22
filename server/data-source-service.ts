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
      console.log('No enabled data sources found for knowledge retrieval');
      return '';
    }
    
    console.log(`Processing ${dataSources.length} data sources for query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);
    
    // Process each data source and collect knowledge
    const knowledgePromises = dataSources.map(dataSource => 
      processDataSource(dataSource, query)
        .catch(err => {
          console.error(`Error processing data source "${dataSource.name}":`, err);
          return ''; // Return empty string on error to continue with other sources
        })
    );
    
    // Await all promises and combine the results
    const knowledgeResults = await Promise.all(knowledgePromises);
    
    // Log how many sources returned knowledge
    const nonEmptyResults = knowledgeResults.filter(Boolean).length;
    console.log(`Retrieved knowledge from ${nonEmptyResults} out of ${dataSources.length} data sources`);
    
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
      console.warn(`Knowledge base "${dataSource.name}" is not an array`);
      return '';
    }
    
    console.log(`Processing knowledge base "${dataSource.name}" with ${knowledgeBase.length} entries`);
    
    // Extract keywords from the query (words longer than 3 characters)
    const keywords = query.split(/\s+/)
      .map(word => word.toLowerCase().replace(/[^\w\s]/g, ''))
      .filter(word => word.length > 3);
    
    if (keywords.length === 0) {
      console.log(`No significant keywords found in query: "${query}"`);
      return '';
    }
    
    // Score and rank entries based on keyword matches
    const initialScoredEntries = knowledgeBase.map(entry => {
      const entryText = `${entry.question} ${entry.category} ${entry.tags?.join(' ') || ''}`.toLowerCase();
      
      // Calculate keyword match score
      let score = 0;
      let matchedKeywords = 0;
      
      keywords.forEach(keyword => {
        if (entryText.includes(keyword)) {
          score += 1;
          matchedKeywords += 1;
          
          // Bonus points for keyword in the question (more relevant)
          if (entry.question.toLowerCase().includes(keyword)) {
            score += 0.5;
          }
          
          // Bonus points for exact category match
          if (entry.category?.toLowerCase() === keyword) {
            score += 1;
          }
          
          // Bonus points for tag matches
          if (entry.tags?.some((tag: string) => tag.toLowerCase() === keyword)) {
            score += 0.5;
          }
        }
      });
      
      // Only consider entries that match at least 1 keyword
      return matchedKeywords > 0 ? { entry, score } : null;
    }).filter(Boolean);
    
    // Filter out nulls before sorting
    const nonNullScoredEntries = initialScoredEntries.filter((item): item is {entry: any, score: number} => item !== null);
    
    // Sort by score (highest first)
    nonNullScoredEntries.sort((a, b) => b.score - a.score);
    
    // Get top entries from the filtered and sorted array
    const topEntries = nonNullScoredEntries.slice(0, 3); // Limit to 3 most relevant entries
    
    if (topEntries.length === 0) {
      console.log(`No relevant entries found in "${dataSource.name}" for query: "${query}"`);
      return '';
    }
    
    console.log(`Found ${topEntries.length} relevant entries in "${dataSource.name}"`);
    
    // Format the knowledge into a useful context string
    return `Relevant knowledge from ${dataSource.name}:\n\n` + 
      topEntries.map(item => {
        if (item === null) return '';
        return `Question: ${item.entry.question}\nSolution: ${item.entry.solution}`;
      }).filter(Boolean).join('\n\n');
      
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
      console.log(`Processing custom data source "${dataSource.name}" with ${customData.length} entries`);
      
      // Extract keywords from the query (words longer than 3 characters)
      const keywords = query.split(/\s+/)
        .map(word => word.toLowerCase().replace(/[^\w\s]/g, ''))
        .filter(word => word.length > 3);
      
      if (keywords.length === 0) {
        console.log(`No significant keywords found in query: "${query}"`);
        return '';
      }
      
      // Score and rank entries based on keyword matches
      const initialScoredItems = customData.map(item => {
        const itemText = `${item.question || ''} ${item.answer || ''}`.toLowerCase();
        
        // Calculate keyword match score
        let score = 0;
        let matchedKeywords = 0;
        
        keywords.forEach(keyword => {
          if (itemText.includes(keyword)) {
            score += 1;
            matchedKeywords += 1;
            
            // Bonus points for keyword in the question (more relevant)
            if ((item.question || '').toLowerCase().includes(keyword)) {
              score += 0.5;
            }
          }
        });
        
        // Only consider items that match at least 1 keyword
        return matchedKeywords > 0 ? { item, score } : null;
      }).filter(Boolean);
      
      // Filter out nulls before sorting
      const nonNullScoredItems = initialScoredItems.filter((item): item is {item: any, score: number} => item !== null);
      
      // Sort by score (highest first)
      nonNullScoredItems.sort((a, b) => b.score - a.score);
      
      // Use the filtered and sorted array
      const topItems = nonNullScoredItems.slice(0, 3); // Limit to 3 most relevant entries
      
      if (topItems.length === 0) {
        console.log(`No relevant items found in "${dataSource.name}" for query: "${query}"`);
        return '';
      }
      
      console.log(`Found ${topItems.length} relevant items in "${dataSource.name}"`);
      
      return `Relevant information from ${dataSource.name}:\n\n` + 
        topItems.map(scored => {
          if (scored === null) return '';
          return `Q: ${scored.item.question || ''}\nA: ${scored.item.answer || ''}`;
        }).filter(Boolean).join('\n\n');
    } else {
      // Handle custom data format - just return a simple representation
      console.log(`Custom data source "${dataSource.name}" contains non-array data`);
      return `Knowledge from ${dataSource.name}: ${JSON.stringify(customData).slice(0, 200)}${JSON.stringify(customData).length > 200 ? '...' : ''}`;
    }
  } catch (error) {
    // If it's not JSON, treat it as plain text
    console.log(`Custom data source "${dataSource.name}" contains non-JSON data, treating as plain text`);
    return `Information from ${dataSource.name}: ${dataSource.content.slice(0, 200)}${dataSource.content.length > 200 ? '...' : ''}`;
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