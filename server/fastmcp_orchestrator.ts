/**
 * FastMCP Orchestrator Integration
 * Manages FastMCP service as subprocess and provides fallback logic.
 */

import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { EventEmitter } from 'events';

interface FastMCPConfig {
  port: number;
  host: string;
  timeout: number;
  maxRetries: number;
  healthCheckInterval: number;
}

interface ServiceStatus {
  running: boolean;
  healthy: boolean;
  lastHealthCheck: Date;
  processId?: number;
  uptime?: number;
}

export class FastMCPOrchestrator extends EventEmitter {
  private config: FastMCPConfig;
  private process: ChildProcess | null = null;
  private status: ServiceStatus;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private restartAttempts = 0;
  private maxRestartAttempts = 5;

  constructor(config: Partial<FastMCPConfig> = {}) {
    super();
    
    this.config = {
      port: config.port || 8001,
      host: config.host || 'localhost',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      healthCheckInterval: config.healthCheckInterval || 30000,
    };

    this.status = {
      running: false,
      healthy: false,
      lastHealthCheck: new Date(),
    };
  }

  /**
   * Start the FastMCP service
   */
  async startService(): Promise<boolean> {
    try {
      console.log('FastMCP Orchestrator: Starting FastMCP service...');
      
      // Check if already running
      if (this.process && !this.process.killed) {
        console.log('FastMCP Orchestrator: Service already running');
        return true;
      }

      // Start the Python FastMCP service
      this.process = spawn('python3', ['-m', 'fastmcp_service.fastmcp_server'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHONPATH: process.cwd(),
        }
      });

      this.status.processId = this.process.pid;
      this.status.running = true;

      // Handle process events
      this.process.stdout?.on('data', (data) => {
        console.log(`FastMCP Service: ${data.toString().trim()}`);
      });

      this.process.stderr?.on('data', (data) => {
        console.error(`FastMCP Service Error: ${data.toString().trim()}`);
      });

      this.process.on('exit', (code, signal) => {
        console.log(`FastMCP Service exited with code ${code}, signal ${signal}`);
        this.status.running = false;
        this.status.healthy = false;
        this.emit('service_exit', { code, signal });
        
        // Attempt restart if not intentionally stopped
        if (code !== 0 && this.restartAttempts < this.maxRestartAttempts) {
          this.restartAttempts++;
          console.log(`FastMCP Orchestrator: Attempting restart ${this.restartAttempts}/${this.maxRestartAttempts}`);
          setTimeout(() => this.startService(), 5000);
        }
      });

      this.process.on('error', (error) => {
        console.error('FastMCP Service process error:', error);
        this.status.running = false;
        this.status.healthy = false;
        this.emit('service_error', error);
      });

      // Wait for service to be ready
      await this.waitForServiceReady();
      
      // Start health monitoring
      this.startHealthMonitoring();

      console.log('FastMCP Orchestrator: Service started successfully');
      return true;

    } catch (error) {
      console.error('FastMCP Orchestrator: Failed to start service:', error);
      return false;
    }
  }

  /**
   * Stop the FastMCP service
   */
  async stopService(): Promise<boolean> {
    try {
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = null;
      }

      if (this.process && !this.process.killed) {
        this.process.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (this.process && !this.process.killed) {
              this.process.kill('SIGKILL');
            }
            resolve(undefined);
          }, 5000);

          this.process!.on('exit', () => {
            clearTimeout(timeout);
            resolve(undefined);
          });
        });
      }

      this.status.running = false;
      this.status.healthy = false;
      this.process = null;

      console.log('FastMCP Orchestrator: Service stopped');
      return true;

    } catch (error) {
      console.error('FastMCP Orchestrator: Error stopping service:', error);
      return false;
    }
  }

  /**
   * Wait for service to be ready
   */
  private async waitForServiceReady(maxWaitTime = 30000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 1000;

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(`http://${this.config.host}:${this.config.port}/health`, {
          timeout: 5000
        });
        
        if (response.status === 200) {
          this.status.healthy = true;
          console.log('FastMCP Orchestrator: Service is ready');
          return;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('FastMCP service failed to become ready within timeout');
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const response = await axios.get(`http://${this.config.host}:${this.config.port}/health`, {
          timeout: 5000
        });
        
        this.status.healthy = response.status === 200;
        this.status.lastHealthCheck = new Date();
        
        if (response.data?.stats) {
          this.emit('health_check', response.data);
        }

      } catch (error) {
        this.status.healthy = false;
        this.status.lastHealthCheck = new Date();
        console.warn('FastMCP Orchestrator: Health check failed:', error.message);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Make request to FastMCP service with fallback
   */
  async makeRequest(endpoint: string, data: any, options: { timeout?: number } = {}): Promise<any> {
    const url = `http://${this.config.host}:${this.config.port}${endpoint}`;
    const timeout = options.timeout || this.config.timeout;

    try {
      const response = await axios.post(url, data, { timeout });
      return response.data;
    } catch (error) {
      console.error(`FastMCP request failed for ${endpoint}:`, error.message);
      
      // Return fallback response
      return this.getFallbackResponse(endpoint, error);
    }
  }

  /**
   * Get fallback response when service is unavailable
   */
  private getFallbackResponse(endpoint: string, error: any): any {
    console.log(`FastMCP Orchestrator: Using fallback for ${endpoint}`);
    
    if (endpoint.includes('/search')) {
      return {
        success: false,
        results: [],
        fallback: true,
        error: 'FastMCP service unavailable',
        message: 'Using fallback - no similarity search available'
      };
    }
    
    if (endpoint.includes('/agents/process')) {
      return {
        success: false,
        result: {
          agent: 'fallback',
          message: 'FastMCP service unavailable - using basic processing',
          confidence: 0
        },
        fallback: true
      };
    }

    return {
      success: false,
      error: 'FastMCP service unavailable',
      fallback: true
    };
  }

  /**
   * Get service status
   */
  getStatus(): ServiceStatus & { config: FastMCPConfig } {
    return {
      ...this.status,
      config: this.config,
      uptime: this.process?.pid ? Date.now() - this.status.lastHealthCheck.getTime() : 0
    };
  }

  /**
   * Search documents via FastMCP
   */
  async searchDocuments(query: string, options: any = {}): Promise<any> {
    return this.makeRequest('/documents/search', {
      query,
      top_k: options.top_k || 5,
      filter_metadata: options.filter_metadata
    });
  }

  /**
   * Process agent request via FastMCP
   */
  async processAgentRequest(agentType: string, query: string, context: any = {}): Promise<any> {
    return this.makeRequest('/agents/process', {
      agent_type: agentType,
      query,
      context,
      tenant_id: context.tenant_id || 1
    });
  }

  /**
   * Ingest documents via FastMCP
   */
  async ingestDocuments(documents: any[]): Promise<any> {
    return this.makeRequest('/documents/ingest', {
      documents,
      tenant_id: 1
    });
  }
}

// Global instance
export const fastMcpOrchestrator = new FastMCPOrchestrator();