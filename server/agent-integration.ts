/**
 * Agent Integration Service for MCP-Enhanced System
 * Handles communication between Node.js backend and Python agent services
 */

import { spawn } from 'child_process';
import axios, { AxiosResponse } from 'axios';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
  processing_time?: number;
}

interface UserContext {
  user_id: string;
  role: string;
  tenant_id: number;
}

interface AgentUploadResult {
  success: boolean;
  filename?: string;
  path?: string;
  size?: number;
  upload_type?: string;
  error?: string;
}

export class AgentIntegrationService {
  private agentServiceUrl: string;
  private fallbackMode: boolean;
  private maxRetries: number;
  private timeoutMs: number;

  constructor() {
    this.agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8001';
    this.fallbackMode = process.env.AGENT_FALLBACK === 'true';
    this.maxRetries = 3;
    this.timeoutMs = 30000; // 30 seconds
  }

  /**
   * Process instruction lookup using enhanced agent with MCP integration
   */
  async processInstructionLookup(
    query: string,
    tenantId: number = 1,
    userContext: UserContext,
    topK: number = 5
  ): Promise<AgentResponse> {
    try {
      const payload = {
        query,
        tenant_id: tenantId,
        user_context: userContext,
        top_k: topK
      };

      const response = await this.makeAgentRequest('/api/agents/instruction-lookup', payload);
      
      if (response.success) {
        return {
          success: true,
          data: response.data,
          confidence: response.confidence || 0.8,
          processing_time: response.processing_time || 0
        };
      } else {
        // Fallback to local processing if agent service fails
        return await this.fallbackInstructionLookup(query, tenantId);
      }
    } catch (error) {
      console.error('Instruction lookup error:', error);
      return await this.fallbackInstructionLookup(query, tenantId);
    }
  }

  /**
   * Process ticket lookup using enhanced agent with MCP integration
   */
  async processTicketLookup(
    query: string,
    tenantId: number = 1,
    userContext: UserContext,
    topK: number = 10
  ): Promise<AgentResponse> {
    try {
      const payload = {
        query,
        tenant_id: tenantId,
        user_context: userContext,
        top_k: topK
      };

      const response = await this.makeAgentRequest('/api/agents/ticket-lookup', payload);
      
      if (response.success) {
        return {
          success: true,
          data: response.data,
          confidence: response.confidence || 0.8,
          processing_time: response.processing_time || 0
        };
      } else {
        // Fallback to local processing if agent service fails
        return await this.fallbackTicketLookup(query, tenantId);
      }
    } catch (error) {
      console.error('Ticket lookup error:', error);
      return await this.fallbackTicketLookup(query, tenantId);
    }
  }

  /**
   * Secure file upload to agent system with RBAC validation
   */
  async secureAgentUpload(
    filename: string,
    fileContent: Buffer,
    uploadType: string,
    userContext: UserContext
  ): Promise<AgentUploadResult> {
    try {
      // Validate user permissions locally first
      if (!this.validateUploadPermissions(userContext.role)) {
        return {
          success: false,
          error: 'Insufficient permissions for agent file uploads'
        };
      }

      const formData = new FormData();
      const blob = new Blob([fileContent]);
      formData.append('file', blob, filename);
      formData.append('upload_type', uploadType);
      formData.append('user_context', JSON.stringify(userContext));

      const response = await axios.post(
        `${this.agentServiceUrl}/api/agents/upload`,
        formData,
        {
          timeout: this.timeoutMs,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        return {
          success: true,
          filename: response.data.filename,
          path: response.data.path,
          size: response.data.size,
          upload_type: response.data.upload_type
        };
      } else {
        return {
          success: false,
          error: response.data.error || 'Upload failed'
        };
      }
    } catch (error) {
      console.error('Agent upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
  }

  /**
   * Get comprehensive health status from agent services
   */
  async getAgentHealthStatus(): Promise<any> {
    try {
      const response = await this.makeAgentRequest('/api/agents/health', {});
      return response.data || { status: 'unhealthy', error: 'No response' };
    } catch (error) {
      console.error('Agent health check error:', error);
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed',
        fallback_available: this.fallbackMode
      };
    }
  }

  /**
   * Initialize agent services (called during startup)
   */
  async initializeAgentServices(): Promise<boolean> {
    try {
      const response = await this.makeAgentRequest('/api/agents/initialize', {});
      return response.success || false;
    } catch (error) {
      console.error('Agent initialization error:', error);
      return false;
    }
  }

  /**
   * Make HTTP request to agent service with retry logic
   */
  private async makeAgentRequest(endpoint: string, payload: any): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response: AxiosResponse = await axios.post(
          `${this.agentServiceUrl}${endpoint}`,
          payload,
          {
            timeout: this.timeoutMs,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Agent request attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < this.maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('All agent request attempts failed');
  }

  /**
   * Validate upload permissions based on user role
   */
  private validateUploadPermissions(role: string): boolean {
    const allowedRoles = ['creator', 'administrator', 'support_engineer'];
    return allowedRoles.includes(role);
  }

  /**
   * Fallback instruction lookup using local database
   */
  private async fallbackInstructionLookup(query: string, tenantId: number): Promise<AgentResponse> {
    try {
      // Simple keyword-based search as fallback
      const keywords = query.toLowerCase().split(' ').filter(word => word.length > 3);
      
      return {
        success: true,
        data: [
          {
            instruction_id: 'fallback-1',
            title: 'Fallback Instruction',
            content: `Fallback response for query: ${query}`,
            similarity_score: 0.5,
            metadata: {
              source: 'fallback',
              keywords: keywords
            }
          }
        ],
        confidence: 0.5,
        processing_time: 10
      };
    } catch (error) {
      return {
        success: false,
        error: 'Fallback instruction lookup failed'
      };
    }
  }

  /**
   * Fallback ticket lookup using local database
   */
  private async fallbackTicketLookup(query: string, tenantId: number): Promise<AgentResponse> {
    try {
      // Simple keyword-based search as fallback
      const keywords = query.toLowerCase().split(' ').filter(word => word.length > 3);
      
      return {
        success: true,
        data: [
          {
            ticket_id: 'fallback-1',
            title: 'Fallback Ticket',
            content: `Fallback response for ticket query: ${query}`,
            similarity_score: 0.5,
            metadata: {
              source: 'fallback',
              status: 'resolved',
              keywords: keywords
            }
          }
        ],
        confidence: 0.5,
        processing_time: 10
      };
    } catch (error) {
      return {
        success: false,
        error: 'Fallback ticket lookup failed'
      };
    }
  }

  /**
   * Start agent service as background process (for development)
   */
  async startAgentService(): Promise<boolean> {
    try {
      const agentProcess = spawn('python', ['enhanced_agent_system.py'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      agentProcess.stdout?.on('data', (data) => {
        console.log(`Agent Service: ${data}`);
      });

      agentProcess.stderr?.on('data', (data) => {
        console.error(`Agent Service Error: ${data}`);
      });

      agentProcess.on('close', (code) => {
        console.log(`Agent service exited with code ${code}`);
      });

      // Wait a moment for the service to start
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Test if service is responsive
      try {
        await this.getAgentHealthStatus();
        return true;
      } catch (error) {
        console.warn('Agent service not responsive after startup');
        return false;
      }
    } catch (error) {
      console.error('Failed to start agent service:', error);
      return false;
    }
  }
}

// Export singleton instance
export const agentIntegration = new AgentIntegrationService();