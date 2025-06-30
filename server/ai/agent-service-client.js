/**
 * Agent Service Integration for Node.js Backend
 * Provides HTTP client to communicate with the Python agent orchestrator
 * Replaces direct OpenAI calls with agent workflow calls
 */

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8001';

class AgentService {
  constructor() {
    this.baseUrl = AGENT_SERVICE_URL;
    this.timeout = 30000; // 30 second timeout
  }

  /**
   * Process complete support request through agent workflow
   * @param {Object} request - Support request data
   * @returns {Promise<Object>} Complete ticket with resolution
   */
  async processWorkflow(request) {
    try {
      const response = await fetch(`${this.baseUrl}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`Agent service error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Agent service timeout');
      }
      throw error;
    }
  }

  /**
   * Classify ticket using agent workflow
   * @param {Object} ticketData - Ticket classification data
   * @returns {Promise<Object>} Classification result
   */
  async classifyTicket(ticketData) {
    try {
      const response = await fetch(`${this.baseUrl}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketData),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`Agent service classification error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Agent service classification timeout');
      }
      throw error;
    }
  }

  /**
   * Attempt auto-resolution using agent workflow
   * @param {Object} resolutionData - Auto-resolution data
   * @returns {Promise<Object>} Resolution result
   */
  async attemptAutoResolve(resolutionData) {
    try {
      const response = await fetch(`${this.baseUrl}/auto-resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resolutionData),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`Agent service auto-resolve error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Agent service auto-resolve timeout');
      }
      throw error;
    }
  }

  /**
   * Generate chat response using agent workflow
   * @param {Object} chatData - Chat response data
   * @returns {Promise<Object>} Chat response
   */
  async generateChatResponse(chatData) {
    try {
      const response = await fetch(`${this.baseUrl}/chat-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatData),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`Agent service chat error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Agent service chat timeout');
      }
      throw error;
    }
  }

  /**
   * Check agent service health
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Agent service health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Agent service unavailable: ${error.message}`);
    }
  }

  /**
   * Check if agent service is available
   * @returns {Promise<boolean>} Service availability
   */
  async isAvailable() {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.warn('Agent service not available:', error.message);
      return false;
    }
  }
}

// Export singleton instance
const agentService = new AgentService();
export default agentService;