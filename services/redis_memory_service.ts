/**
 * Redis Memory Service - Unified session store for agent workflow
 * Stores session data accessible by all agents throughout the workflow
 */

interface SessionData {
  normalized_prompt: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'positive' | 'neutral' | 'negative';
  masked_pii: string[];
  instruction_hits?: any[];
  ticket_hits?: any[];
  context?: any;
  created_at: string;
  updated_at: string;
}

export class RedisMemoryService {
  private memory: Map<string, SessionData> = new Map();

  /**
   * Store session data for an agent workflow
   */
  async setSessionData(sessionId: string, data: Partial<SessionData>): Promise<void> {
    const existing = this.memory.get(sessionId) || {} as SessionData;
    const updated: SessionData = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
      created_at: existing.created_at || new Date().toISOString()
    };
    
    this.memory.set(sessionId, updated);
    console.log(`RedisMemory: Updated session ${sessionId} with keys: ${Object.keys(data).join(', ')}`);
  }

  /**
   * Get session data for an agent workflow
   */
  async getSessionData(sessionId: string): Promise<SessionData | null> {
    const data = this.memory.get(sessionId);
    if (data) {
      console.log(`RedisMemory: Retrieved session ${sessionId} with keys: ${Object.keys(data).join(', ')}`);
    }
    return data || null;
  }

  /**
   * Update specific field in session data
   */
  async updateSessionField(sessionId: string, field: keyof SessionData, value: any): Promise<void> {
    const existing = this.memory.get(sessionId) || {} as SessionData;
    existing[field] = value;
    existing.updated_at = new Date().toISOString();
    
    this.memory.set(sessionId, existing);
    console.log(`RedisMemory: Updated ${field} for session ${sessionId}`);
  }

  /**
   * Clear session data
   */
  async clearSession(sessionId: string): Promise<void> {
    this.memory.delete(sessionId);
    console.log(`RedisMemory: Cleared session ${sessionId}`);
  }

  /**
   * Get all active sessions (for debugging)
   */
  async getActiveSessions(): Promise<string[]> {
    return Array.from(this.memory.keys());
  }
}

// Singleton instance
export const redisMemory = new RedisMemoryService();