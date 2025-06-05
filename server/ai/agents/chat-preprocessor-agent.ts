import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Chat Preprocessor Agent
 * Purpose: Prepare raw user messages for the rest of the pipeline by normalizing language,
 * accurately assessing true urgency, stripping sensitive data, and preserving session context.
 */

export interface PreprocessorResult {
  normalized_prompt: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'positive' | 'neutral' | 'negative';
  masked_pii: string[];
  original_message: string;
  session_id: string;
}

export interface SessionContext {
  normalized_prompt: string;
  urgency: string;
  masked_pii: string[];
  sentiment: string;
  timestamp: string;
}

export class ChatPreprocessorAgent {
  private geminiClient: GoogleGenerativeAI | null = null;
  private sessionMemory: Map<string, SessionContext> = new Map();

  constructor() {
    this.initializeGemini();
  }

  /**
   * Initialize Gemini API client
   */
  private initializeGemini(): void {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.geminiClient = new GoogleGenerativeAI(apiKey);
    } else {
      console.warn('Chat Preprocessor: No Gemini API key found, using fallback methods');
    }
  }

  /**
   * Main preprocessing method
   */
  async preprocess(message: string, sessionId: string, context?: any): Promise<PreprocessorResult> {
    console.log(`Chat Preprocessor: Processing message for session ${sessionId}`);
    
    // Step 1: Normalize text
    const normalizedPrompt = await this.normalizeText(message);
    
    // Step 2: Detect and mask PII
    const { maskedText, piiPlaceholders } = this.detectAndMaskPII(normalizedPrompt);
    
    // Step 3: Determine urgency and sentiment
    const urgency = await this.determineUrgency(maskedText);
    const sentiment = await this.analyzeSentiment(maskedText);
    
    // Step 4: Store in session context
    const sessionContext: SessionContext = {
      normalized_prompt: maskedText,
      urgency,
      masked_pii: piiPlaceholders,
      sentiment,
      timestamp: new Date().toISOString()
    };
    
    this.storeSessionContext(sessionId, sessionContext);
    
    const result: PreprocessorResult = {
      normalized_prompt: maskedText,
      urgency,
      sentiment,
      masked_pii: piiPlaceholders,
      original_message: message,
      session_id: sessionId
    };
    
    console.log(`Chat Preprocessor: Completed processing - Urgency: ${urgency}, Sentiment: ${sentiment}, PII masked: ${piiPlaceholders.length}`);
    
    return result;
  }

  /**
   * Normalize text using Gemini API or fallback methods
   */
  private async normalizeText(message: string): Promise<string> {
    if (this.geminiClient) {
      try {
        const model = this.geminiClient.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const prompt = `Normalize this message by removing filler words, correcting grammar, and standardizing formatting while preserving the core meaning and intent:

"${message}"

Return only the normalized text without any explanations or quotes.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const normalizedText = response.text().trim();
        
        return normalizedText || this.fallbackNormalization(message);
      } catch (error) {
        console.error('Chat Preprocessor: Gemini normalization failed:', error);
        return this.fallbackNormalization(message);
      }
    } else {
      return this.fallbackNormalization(message);
    }
  }

  /**
   * Fallback text normalization without API
   */
  private fallbackNormalization(message: string): string {
    let normalized = message.trim();
    
    // Remove excessive punctuation
    normalized = normalized.replace(/[!]{2,}/g, '!');
    normalized = normalized.replace(/[?]{2,}/g, '?');
    normalized = normalized.replace(/[.]{3,}/g, '...');
    
    // Remove common filler words and phrases
    const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally'];
    const fillerPattern = new RegExp(`\\b(${fillerWords.join('|')})\\b`, 'gi');
    normalized = normalized.replace(fillerPattern, '');
    
    // Fix common abbreviations
    normalized = normalized.replace(/\bpls\b/gi, 'please');
    normalized = normalized.replace(/\bu\b/gi, 'you');
    normalized = normalized.replace(/\br\b/gi, 'are');
    normalized = normalized.replace(/\bur\b/gi, 'your');
    normalized = normalized.replace(/\basap\b/gi, 'as soon as possible');
    
    // Clean up extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    // Ensure proper sentence capitalization
    normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    
    return normalized;
  }

  /**
   * Determine urgency using Gemini API or fallback analysis
   */
  private async determineUrgency(message: string): Promise<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> {
    if (this.geminiClient) {
      try {
        const model = this.geminiClient.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const prompt = `Classify the urgency level of this support message. Consider both explicit urgency indicators and the actual impact described.

Message: "${message}"

Options: CRITICAL, HIGH, MEDIUM, LOW

Guidelines:
- CRITICAL: System down, security breach, data loss, blocking multiple users
- HIGH: Individual user blocked from critical functions, urgent deadline
- MEDIUM: Important feature not working, moderate impact
- LOW: General questions, feature requests, minor issues

Return only the urgency level (CRITICAL, HIGH, MEDIUM, or LOW).`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const urgencyText = response.text().trim().toUpperCase();
        
        const validUrgencies = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        if (validUrgencies.includes(urgencyText)) {
          return urgencyText as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
        }
        
        return this.fallbackUrgencyAnalysis(message);
      } catch (error) {
        console.error('Chat Preprocessor: Gemini urgency analysis failed:', error);
        return this.fallbackUrgencyAnalysis(message);
      }
    } else {
      return this.fallbackUrgencyAnalysis(message);
    }
  }

  /**
   * Fallback urgency analysis using keyword patterns
   */
  private fallbackUrgencyAnalysis(message: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    const lowerMessage = message.toLowerCase();
    
    // Critical indicators
    const criticalPatterns = [
      /system.*down/i, /server.*down/i, /security.*breach/i, /data.*lost/i,
      /can't.*access.*anything/i, /everything.*broken/i, /emergency/i,
      /critical.*error/i, /production.*down/i
    ];
    
    // High indicators
    const highPatterns = [
      /urgent/i, /asap/i, /immediately/i, /can't.*work/i, /blocked/i,
      /deadline/i, /important.*meeting/i, /client.*waiting/i,
      /error.*500/i, /can't.*login/i, /access.*denied/i
    ];
    
    // Low indicators
    const lowPatterns = [
      /question/i, /how.*do.*i/i, /feature.*request/i, /suggestion/i,
      /when.*will/i, /is.*it.*possible/i, /wondering/i, /curious/i
    ];
    
    if (criticalPatterns.some(pattern => pattern.test(lowerMessage))) {
      return 'CRITICAL';
    }
    
    if (highPatterns.some(pattern => pattern.test(lowerMessage))) {
      return 'HIGH';
    }
    
    if (lowPatterns.some(pattern => pattern.test(lowerMessage))) {
      return 'LOW';
    }
    
    return 'MEDIUM';
  }

  /**
   * Analyze sentiment using Gemini API or fallback analysis
   */
  private async analyzeSentiment(message: string): Promise<'positive' | 'neutral' | 'negative'> {
    if (this.geminiClient) {
      try {
        const model = this.geminiClient.getGenerativeModel({ model: "gemini-1.5-pro" });
        
        const prompt = `Analyze the sentiment of this message:

"${message}"

Return only one word: positive, neutral, or negative`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const sentimentText = response.text().trim().toLowerCase();
        
        const validSentiments = ['positive', 'neutral', 'negative'];
        if (validSentiments.includes(sentimentText)) {
          return sentimentText as 'positive' | 'neutral' | 'negative';
        }
        
        return this.fallbackSentimentAnalysis(message);
      } catch (error) {
        console.error('Chat Preprocessor: Gemini sentiment analysis failed:', error);
        return this.fallbackSentimentAnalysis(message);
      }
    } else {
      return this.fallbackSentimentAnalysis(message);
    }
  }

  /**
   * Fallback sentiment analysis using keyword patterns
   */
  private fallbackSentimentAnalysis(message: string): 'positive' | 'neutral' | 'negative' {
    const lowerMessage = message.toLowerCase();
    
    const positivePatterns = [
      /thanks?/i, /appreciate/i, /great/i, /awesome/i, /perfect/i,
      /excellent/i, /love/i, /happy/i, /pleased/i
    ];
    
    const negativePatterns = [
      /frustrated/i, /angry/i, /terrible/i, /awful/i, /hate/i,
      /broken/i, /useless/i, /disappointed/i, /annoyed/i,
      /ridiculous/i, /unacceptable/i
    ];
    
    if (positivePatterns.some(pattern => pattern.test(lowerMessage))) {
      return 'positive';
    }
    
    if (negativePatterns.some(pattern => pattern.test(lowerMessage))) {
      return 'negative';
    }
    
    return 'neutral';
  }

  /**
   * Detect and mask PII in text
   */
  private detectAndMaskPII(text: string): { maskedText: string; piiPlaceholders: string[] } {
    let maskedText = text;
    const piiPlaceholders: string[] = [];
    
    // Email pattern
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
    const emails = text.match(emailPattern);
    if (emails) {
      emails.forEach((email, index) => {
        const placeholder = `[REDACTED_EMAIL_${index + 1}]`;
        maskedText = maskedText.replace(email, placeholder);
        piiPlaceholders.push(`${placeholder}=${email}`);
      });
    }
    
    // Phone pattern (various formats)
    const phonePattern = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g;
    const phones = text.match(phonePattern);
    if (phones) {
      phones.forEach((phone, index) => {
        const placeholder = `[REDACTED_PHONE_${index + 1}]`;
        maskedText = maskedText.replace(phone, placeholder);
        piiPlaceholders.push(`${placeholder}=${phone}`);
      });
    }
    
    // SSN pattern
    const ssnPattern = /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g;
    const ssns = text.match(ssnPattern);
    if (ssns) {
      ssns.forEach((ssn, index) => {
        const placeholder = `[REDACTED_SSN_${index + 1}]`;
        maskedText = maskedText.replace(ssn, placeholder);
        piiPlaceholders.push(`${placeholder}=${ssn}`);
      });
    }
    
    // Credit card pattern (basic)
    const ccPattern = /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g;
    const creditCards = text.match(ccPattern);
    if (creditCards) {
      creditCards.forEach((cc, index) => {
        const placeholder = `[REDACTED_CARD_${index + 1}]`;
        maskedText = maskedText.replace(cc, placeholder);
        piiPlaceholders.push(`${placeholder}=${cc}`);
      });
    }
    
    return { maskedText, piiPlaceholders };
  }

  /**
   * Store session context in memory
   */
  private storeSessionContext(sessionId: string, context: SessionContext): void {
    this.sessionMemory.set(sessionId, context);
    
    // Clean up old sessions (keep last 1000)
    if (this.sessionMemory.size > 1000) {
      const oldestKey = this.sessionMemory.keys().next().value;
      this.sessionMemory.delete(oldestKey);
    }
  }

  /**
   * Retrieve session context
   */
  public getSessionContext(sessionId: string): SessionContext | null {
    return this.sessionMemory.get(sessionId) || null;
  }

  /**
   * Check if agent is available
   */
  public isAvailable(): boolean {
    return true; // Preprocessor can always work with fallback methods
  }

  /**
   * Get agent status and configuration
   */
  public getStatus(): any {
    return {
      name: 'ChatPreprocessorAgent',
      available: this.isAvailable(),
      geminiConfigured: !!this.geminiClient,
      sessionCount: this.sessionMemory.size,
      capabilities: [
        'text_normalization',
        'urgency_classification',
        'sentiment_analysis',
        'pii_detection',
        'session_management'
      ]
    };
  }
}