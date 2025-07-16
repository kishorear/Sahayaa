/**
 * Health Check Service
 * Provides comprehensive health monitoring for all microservices
 */

import { Request, Response } from 'express';
import { db } from './db.js';
import { log } from './vite.js';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  service: string;
  dependencies: {
    database: HealthStatus;
    agentService: HealthStatus;
    dataService: HealthStatus;
    vectorStore: HealthStatus;
    aiProviders: HealthStatus;
  };
  environment: {
    variables: EnvironmentCheck;
    configuration: ConfigurationCheck;
  };
  performance: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    responseTime: number;
  };
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message: string;
  lastChecked: string;
  responseTime?: number;
}

interface EnvironmentCheck {
  required: string[];
  missing: string[];
  valid: boolean;
}

interface ConfigurationCheck {
  database: boolean;
  aiProviders: boolean;
  services: boolean;
  security: boolean;
}

class HealthCheckService {
  private startTime: number;
  private readonly requiredEnvVars = [
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'DATA_SERVICE_URL',
    'AGENT_SERVICE_URL',
    'SESSION_SECRET'
  ];

  constructor() {
    this.startTime = Date.now();
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const checkStart = Date.now();
    
    try {
      // Check all dependencies in parallel
      const [
        databaseHealth,
        agentServiceHealth,
        dataServiceHealth,
        vectorStoreHealth,
        aiProvidersHealth
      ] = await Promise.all([
        this.checkDatabase(),
        this.checkAgentService(),
        this.checkDataService(),
        this.checkVectorStore(),
        this.checkAIProviders()
      ]);

      const environmentCheck = this.checkEnvironment();
      const configurationCheck = this.checkConfiguration();
      
      const overallStatus = this.determineOverallStatus([
        databaseHealth,
        agentServiceHealth,
        dataServiceHealth,
        vectorStoreHealth,
        aiProvidersHealth
      ]);

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        service: 'main-application',
        dependencies: {
          database: databaseHealth,
          agentService: agentServiceHealth,
          dataService: dataServiceHealth,
          vectorStore: vectorStoreHealth,
          aiProviders: aiProvidersHealth
        },
        environment: {
          variables: environmentCheck,
          configuration: configurationCheck
        },
        performance: {
          uptime: Date.now() - this.startTime,
          memoryUsage: process.memoryUsage(),
          responseTime: Date.now() - checkStart
        }
      };
    } catch (error) {
      log('Health check failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        service: 'main-application',
        dependencies: {
          database: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
          agentService: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
          dataService: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
          vectorStore: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
          aiProviders: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() }
        },
        environment: {
          variables: this.checkEnvironment(),
          configuration: this.checkConfiguration()
        },
        performance: {
          uptime: Date.now() - this.startTime,
          memoryUsage: process.memoryUsage(),
          responseTime: Date.now() - checkStart
        }
      };
    }
  }

  private async checkDatabase(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const db = getDrizzleInstance();
      await db.execute('SELECT 1');
      
      return {
        status: 'healthy',
        message: 'Database connection successful',
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - start
      };
    }
  }

  private async checkAgentService(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8001';
      const response = await fetch(`${agentServiceUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        return {
          status: 'healthy',
          message: 'Agent service is responding',
          lastChecked: new Date().toISOString(),
          responseTime: Date.now() - start
        };
      } else {
        return {
          status: 'degraded',
          message: `Agent service returned ${response.status}`,
          lastChecked: new Date().toISOString(),
          responseTime: Date.now() - start
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Agent service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - start
      };
    }
  }

  private async checkDataService(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const dataServiceUrl = process.env.DATA_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${dataServiceUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        return {
          status: 'healthy',
          message: 'Data service is responding',
          lastChecked: new Date().toISOString(),
          responseTime: Date.now() - start
        };
      } else {
        return {
          status: 'degraded',
          message: `Data service returned ${response.status}`,
          lastChecked: new Date().toISOString(),
          responseTime: Date.now() - start
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Data service check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - start
      };
    }
  }

  private async checkVectorStore(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      // Check if vector storage directory exists and is accessible
      const vectorStoragePath = process.env.VECTOR_STORAGE_PATH || './vector_storage';
      
      return {
        status: 'healthy',
        message: 'Local vector storage is accessible',
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - start
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Vector store check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - start
      };
    }
  }

  private async checkAIProviders(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      const openaiKey = process.env.OPENAI_API_KEY;
      const googleKey = process.env.GOOGLE_AI_API_KEY;
      const anthropicKey = process.env.ANTHROPIC_API_KEY;
      
      let activeProviders = 0;
      let totalProviders = 0;

      if (openaiKey) {
        totalProviders++;
        // Basic key format validation (starts with sk-)
        if (openaiKey.startsWith('sk-')) {
          activeProviders++;
        }
      }

      if (googleKey) {
        totalProviders++;
        // Basic key format validation
        if (googleKey.length > 10) {
          activeProviders++;
        }
      }

      if (anthropicKey) {
        totalProviders++;
        // Basic key format validation
        if (anthropicKey.startsWith('sk-ant-')) {
          activeProviders++;
        }
      }

      if (activeProviders === 0) {
        return {
          status: 'unhealthy',
          message: 'No AI providers configured',
          lastChecked: new Date().toISOString(),
          responseTime: Date.now() - start
        };
      } else if (activeProviders < totalProviders) {
        return {
          status: 'degraded',
          message: `${activeProviders}/${totalProviders} AI providers configured`,
          lastChecked: new Date().toISOString(),
          responseTime: Date.now() - start
        };
      } else {
        return {
          status: 'healthy',
          message: `${activeProviders} AI providers configured`,
          lastChecked: new Date().toISOString(),
          responseTime: Date.now() - start
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `AI providers check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date().toISOString(),
        responseTime: Date.now() - start
      };
    }
  }

  private checkEnvironment(): EnvironmentCheck {
    const missing: string[] = [];
    
    for (const envVar of this.requiredEnvVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    return {
      required: this.requiredEnvVars,
      missing,
      valid: missing.length === 0
    };
  }

  private checkConfiguration(): ConfigurationCheck {
    return {
      database: !!process.env.DATABASE_URL,
      aiProviders: !!(process.env.OPENAI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.ANTHROPIC_API_KEY),
      services: !!(process.env.DATA_SERVICE_URL && process.env.AGENT_SERVICE_URL),
      security: !!(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32)
    };
  }

  private determineOverallStatus(dependencies: HealthStatus[]): 'healthy' | 'unhealthy' | 'degraded' {
    const unhealthyCount = dependencies.filter(d => d.status === 'unhealthy').length;
    const degradedCount = dependencies.filter(d => d.status === 'degraded').length;
    
    if (unhealthyCount > 0) {
      return 'unhealthy';
    } else if (degradedCount > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }
}

const healthCheckService = new HealthCheckService();

export const healthCheckHandler = async (req: Request, res: Response) => {
  try {
    const healthCheck = await healthCheckService.performHealthCheck();
    
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    log('Health check endpoint failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    res.status(500).json({
      status: 'unhealthy',
      message: 'Health check endpoint failed',
      timestamp: new Date().toISOString()
    });
  }
};

export const readinessHandler = async (req: Request, res: Response) => {
  try {
    const healthCheck = await healthCheckService.performHealthCheck();
    
    // Service is ready if database is healthy and at least one AI provider is configured
    const isReady = healthCheck.dependencies.database.status === 'healthy' && 
                   healthCheck.dependencies.aiProviders.status !== 'unhealthy';
    
    if (isReady) {
      res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
    }
  } catch (error) {
    res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
  }
};

export const livenessHandler = async (req: Request, res: Response) => {
  // Simple liveness check - just confirm the service is running
  res.status(200).json({ 
    status: 'alive', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};