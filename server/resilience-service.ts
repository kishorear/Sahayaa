/**
 * Resilience Service
 * Provides comprehensive error handling, timeout management, and fallback mechanisms
 */

import { log } from './vite.js';
import { circuitBreakerManager } from './circuit-breaker.js';

interface TimeoutConfig {
  operation: string;
  timeout: number;
  retries: number;
  backoffFactor: number;
}

interface FallbackConfig {
  operation: string;
  fallback: () => Promise<any>;
  condition: (error: any) => boolean;
}

interface ResilienceStats {
  timeouts: number;
  retries: number;
  fallbacks: number;
  successes: number;
  failures: number;
  averageRetryDelay: number;
}

class ResilienceService {
  private timeoutConfigs: Map<string, TimeoutConfig> = new Map();
  private fallbackConfigs: Map<string, FallbackConfig> = new Map();
  private stats: ResilienceStats = {
    timeouts: 0,
    retries: 0,
    fallbacks: 0,
    successes: 0,
    failures: 0,
    averageRetryDelay: 0
  };
  private retryDelays: number[] = [];

  constructor() {
    // Default timeout configurations
    this.setTimeoutConfig('database', {
      operation: 'database',
      timeout: 10000, // 10 seconds
      retries: 3,
      backoffFactor: 1.5
    });

    this.setTimeoutConfig('ai-provider', {
      operation: 'ai-provider',
      timeout: 30000, // 30 seconds
      retries: 2,
      backoffFactor: 2
    });

    this.setTimeoutConfig('agent-service', {
      operation: 'agent-service',
      timeout: 45000, // 45 seconds
      retries: 2,
      backoffFactor: 1.5
    });

    this.setTimeoutConfig('data-service', {
      operation: 'data-service',
      timeout: 15000, // 15 seconds
      retries: 3,
      backoffFactor: 1.5
    });

    this.setTimeoutConfig('vector-store', {
      operation: 'vector-store',
      timeout: 20000, // 20 seconds
      retries: 2,
      backoffFactor: 2
    });
  }

  /**
   * Execute operation with comprehensive resilience features
   */
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: {
      useCircuitBreaker?: boolean;
      useFallback?: boolean;
      customTimeout?: number;
      customRetries?: number;
    } = {}
  ): Promise<T> {
    const config = this.timeoutConfigs.get(operationName);
    const timeout = options.customTimeout || config?.timeout || 30000;
    const retries = options.customRetries || config?.retries || 2;
    const backoffFactor = config?.backoffFactor || 1.5;

    const executeWithTimeout = async (): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.stats.timeouts++;
          reject(new Error(`Operation ${operationName} timed out after ${timeout}ms`));
        }, timeout);

        operation()
          .then(resolve)
          .catch(reject)
          .finally(() => clearTimeout(timeoutId));
      });
    };

    const executeWithRetry = async (): Promise<T> => {
      let lastError: any;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await executeWithTimeout();
          this.stats.successes++;
          return result;
        } catch (error) {
          lastError = error;
          
          if (attempt < retries) {
            const delay = Math.pow(backoffFactor, attempt) * 1000;
            this.retryDelays.push(delay);
            this.stats.retries++;
            
            // Keep only last 100 delays for average calculation
            if (this.retryDelays.length > 100) {
              this.retryDelays.shift();
            }
            
            this.stats.averageRetryDelay = 
              this.retryDelays.reduce((sum, d) => sum + d, 0) / this.retryDelays.length;
            
            log(`Operation ${operationName} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      this.stats.failures++;
      throw lastError;
    };

    try {
      // Use circuit breaker if enabled
      if (options.useCircuitBreaker) {
        const circuitBreaker = circuitBreakerManager.getCircuitBreaker(operationName);
        if (circuitBreaker) {
          return await circuitBreaker.execute(executeWithRetry);
        }
      }
      
      return await executeWithRetry();
    } catch (error) {
      // Try fallback if enabled
      if (options.useFallback) {
        const fallbackConfig = this.fallbackConfigs.get(operationName);
        if (fallbackConfig && fallbackConfig.condition(error)) {
          try {
            const result = await fallbackConfig.fallback();
            this.stats.fallbacks++;
            log(`Fallback executed successfully for ${operationName}`);
            return result;
          } catch (fallbackError) {
            log(`Fallback failed for ${operationName}: ${fallbackError.message}`);
            throw fallbackError;
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * Set timeout configuration for an operation
   */
  setTimeoutConfig(operationName: string, config: TimeoutConfig): void {
    this.timeoutConfigs.set(operationName, config);
  }

  /**
   * Set fallback configuration for an operation
   */
  setFallbackConfig(operationName: string, config: FallbackConfig): void {
    this.fallbackConfigs.set(operationName, config);
  }

  /**
   * Batch execute operations with resilience
   */
  async executeBatch<T>(
    operations: Array<{
      id: string;
      operation: () => Promise<T>;
      operationName: string;
      options?: {
        useCircuitBreaker?: boolean;
        useFallback?: boolean;
        customTimeout?: number;
        customRetries?: number;
      };
    }>,
    batchOptions: {
      maxConcurrency?: number;
      failFast?: boolean;
    } = {}
  ): Promise<Array<{ id: string; success: boolean; data?: T; error?: string }>> {
    const { maxConcurrency = 5, failFast = false } = batchOptions;
    const results: Array<{ id: string; success: boolean; data?: T; error?: string }> = [];
    const executing: Promise<void>[] = [];

    for (const op of operations) {
      // Wait if we've reached max concurrency
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
      }

      const promise = this.executeWithResilience(
        op.operation,
        op.operationName,
        op.options || {}
      )
        .then(data => {
          results.push({ id: op.id, success: true, data });
        })
        .catch(error => {
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.push({ id: op.id, success: false, error: errorMessage });
          
          if (failFast) {
            throw error;
          }
        })
        .finally(() => {
          const index = executing.indexOf(promise);
          if (index > -1) {
            executing.splice(index, 1);
          }
        });

      executing.push(promise);
    }

    // Wait for all operations to complete
    await Promise.allSettled(executing);

    return results;
  }

  /**
   * Get resilience statistics
   */
  getStats(): ResilienceStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      timeouts: 0,
      retries: 0,
      fallbacks: 0,
      successes: 0,
      failures: 0,
      averageRetryDelay: 0
    };
    this.retryDelays = [];
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    successRate: number;
    timeoutRate: number;
    fallbackRate: number;
    averageRetryDelay: number;
    circuitBreakerHealth: any;
  } {
    const totalOperations = this.stats.successes + this.stats.failures;
    const successRate = totalOperations > 0 ? (this.stats.successes / totalOperations) * 100 : 0;
    const timeoutRate = totalOperations > 0 ? (this.stats.timeouts / totalOperations) * 100 : 0;
    const fallbackRate = totalOperations > 0 ? (this.stats.fallbacks / totalOperations) * 100 : 0;

    return {
      successRate,
      timeoutRate,
      fallbackRate,
      averageRetryDelay: this.stats.averageRetryDelay,
      circuitBreakerHealth: circuitBreakerManager.getHealthSummary()
    };
  }
}

export const resilienceService = new ResilienceService();

// Set up fallback configurations
resilienceService.setFallbackConfig('database', {
  operation: 'database',
  fallback: async () => {
    throw new Error('Database temporarily unavailable - please try again later');
  },
  condition: (error) => error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT'
});

resilienceService.setFallbackConfig('ai-provider', {
  operation: 'ai-provider',
  fallback: async () => ({
    category: 'general',
    urgency: 'medium',
    confidence: 0.3,
    reasoning: 'AI provider temporarily unavailable - basic classification applied'
  }),
  condition: (error) => error.message.includes('rate_limit') || error.message.includes('timeout')
});

resilienceService.setFallbackConfig('agent-service', {
  operation: 'agent-service',
  fallback: async () => ({
    success: true,
    ticket_id: null,
    ticket_title: 'Support Request',
    status: 'open',
    category: 'general',
    urgency: 'medium',
    resolution_steps: ['Your request has been received and will be processed when service is restored'],
    resolution_steps_count: 1,
    confidence_score: 0.3,
    processing_time_ms: 100,
    created_at: new Date().toISOString(),
    source: 'fallback'
  }),
  condition: (error) => error.code === 'ECONNREFUSED' || error.message.includes('timeout')
});

resilienceService.setFallbackConfig('vector-store', {
  operation: 'vector-store',
  fallback: async () => ({
    results: [],
    message: 'Vector search temporarily unavailable'
  }),
  condition: (error) => error.message.includes('timeout') || error.message.includes('unavailable')
});

log('Resilience service initialized');