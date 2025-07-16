/**
 * Circuit Breaker Implementation
 * Prevents cascading failures by monitoring service health
 */

import { log } from './vite.js';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

interface CircuitBreakerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rejectedRequests: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  state: CircuitState;
  stateChangeHistory: Array<{ state: CircuitState; timestamp: Date }>;
}

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private stats: CircuitBreakerStats;
  private stateChangeTimeout: NodeJS.Timeout | null = null;
  private requestHistory: Array<{ timestamp: Date; success: boolean }> = [];

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      state: CircuitState.CLOSED,
      stateChangeHistory: []
    };

    // Clean up old request history periodically
    setInterval(() => {
      this.cleanupRequestHistory();
    }, this.config.monitoringPeriod);
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.stats.state === CircuitState.OPEN) {
      this.stats.rejectedRequests++;
      throw new Error(`Circuit breaker is OPEN for ${this.config.name}`);
    }

    try {
      const result = await this.executeWithTimeout(operation);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.timeout}ms`));
      }, this.config.timeout);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeoutId));
    });
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    this.stats.totalRequests++;
    this.stats.successfulRequests++;
    this.stats.lastSuccessTime = new Date();
    
    this.recordRequest(true);

    if (this.stats.state === CircuitState.HALF_OPEN) {
      const recentSuccesses = this.countRecentSuccesses();
      if (recentSuccesses >= this.config.successThreshold) {
        this.changeState(CircuitState.CLOSED);
      }
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.stats.totalRequests++;
    this.stats.failedRequests++;
    this.stats.lastFailureTime = new Date();
    
    this.recordRequest(false);

    if (this.stats.state === CircuitState.CLOSED) {
      const recentFailures = this.countRecentFailures();
      if (recentFailures >= this.config.failureThreshold) {
        this.changeState(CircuitState.OPEN);
        this.scheduleReset();
      }
    } else if (this.stats.state === CircuitState.HALF_OPEN) {
      this.changeState(CircuitState.OPEN);
      this.scheduleReset();
    }
  }

  /**
   * Record request in history
   */
  private recordRequest(success: boolean): void {
    this.requestHistory.push({
      timestamp: new Date(),
      success
    });
  }

  /**
   * Count recent failures within monitoring period
   */
  private countRecentFailures(): number {
    const cutoff = new Date(Date.now() - this.config.monitoringPeriod);
    return this.requestHistory.filter(req => 
      req.timestamp >= cutoff && !req.success
    ).length;
  }

  /**
   * Count recent successes within monitoring period
   */
  private countRecentSuccesses(): number {
    const cutoff = new Date(Date.now() - this.config.monitoringPeriod);
    return this.requestHistory.filter(req => 
      req.timestamp >= cutoff && req.success
    ).length;
  }

  /**
   * Change circuit breaker state
   */
  private changeState(newState: CircuitState): void {
    const oldState = this.stats.state;
    this.stats.state = newState;
    this.stats.stateChangeHistory.push({
      state: newState,
      timestamp: new Date()
    });

    // Keep only last 20 state changes
    if (this.stats.stateChangeHistory.length > 20) {
      this.stats.stateChangeHistory.shift();
    }

    log(`Circuit breaker state changed: ${this.config.name} ${oldState} -> ${newState}`);
  }

  /**
   * Schedule circuit breaker reset
   */
  private scheduleReset(): void {
    if (this.stateChangeTimeout) {
      clearTimeout(this.stateChangeTimeout);
    }

    this.stateChangeTimeout = setTimeout(() => {
      this.changeState(CircuitState.HALF_OPEN);
    }, this.config.resetTimeout);
  }

  /**
   * Clean up old request history
   */
  private cleanupRequestHistory(): void {
    const cutoff = new Date(Date.now() - this.config.monitoringPeriod * 2);
    this.requestHistory = this.requestHistory.filter(req => req.timestamp >= cutoff);
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return { ...this.stats };
  }

  /**
   * Get health information
   */
  getHealth(): {
    name: string;
    state: CircuitState;
    successRate: number;
    recentFailures: number;
    recentSuccesses: number;
    lastFailureTime: Date | null;
    lastSuccessTime: Date | null;
  } {
    const totalRequests = this.stats.totalRequests;
    const successRate = totalRequests > 0 ? (this.stats.successfulRequests / totalRequests) * 100 : 0;
    const recentFailures = this.countRecentFailures();
    const recentSuccesses = this.countRecentSuccesses();

    return {
      name: this.config.name,
      state: this.stats.state,
      successRate,
      recentFailures,
      recentSuccesses,
      lastFailureTime: this.stats.lastFailureTime,
      lastSuccessTime: this.stats.lastSuccessTime
    };
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(): void {
    this.changeState(CircuitState.OPEN);
    this.scheduleReset();
  }

  /**
   * Force circuit breaker to closed state
   */
  forceClosed(): void {
    if (this.stateChangeTimeout) {
      clearTimeout(this.stateChangeTimeout);
    }
    this.changeState(CircuitState.CLOSED);
  }

  /**
   * Reset circuit breaker statistics
   */
  resetStats(): void {
    this.stats.totalRequests = 0;
    this.stats.successfulRequests = 0;
    this.stats.failedRequests = 0;
    this.stats.rejectedRequests = 0;
    this.stats.lastFailureTime = null;
    this.stats.lastSuccessTime = null;
    this.requestHistory = [];
  }
}

class CircuitBreakerManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfigs: Map<string, CircuitBreakerConfig> = new Map();

  constructor() {
    // Set up default configurations for common services
    this.defaultConfigs.set('database', {
      name: 'database',
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 10000,
      resetTimeout: 60000,
      monitoringPeriod: 60000
    });

    this.defaultConfigs.set('ai-provider', {
      name: 'ai-provider',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 30000,
      resetTimeout: 30000,
      monitoringPeriod: 120000
    });

    this.defaultConfigs.set('agent-service', {
      name: 'agent-service',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 45000,
      resetTimeout: 45000,
      monitoringPeriod: 120000
    });

    this.defaultConfigs.set('data-service', {
      name: 'data-service',
      failureThreshold: 4,
      successThreshold: 3,
      timeout: 15000,
      resetTimeout: 30000,
      monitoringPeriod: 90000
    });

    this.defaultConfigs.set('vector-store', {
      name: 'vector-store',
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 20000,
      resetTimeout: 60000,
      monitoringPeriod: 120000
    });
  }

  /**
   * Get or create circuit breaker for service
   */
  getCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const config = this.defaultConfigs.get(serviceName);
      if (!config) {
        throw new Error(`No circuit breaker configuration found for ${serviceName}`);
      }
      this.circuitBreakers.set(serviceName, new CircuitBreaker(config));
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  /**
   * Create custom circuit breaker
   */
  createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
    const circuitBreaker = new CircuitBreaker(config);
    this.circuitBreakers.set(config.name, circuitBreaker);
    return circuitBreaker;
  }

  /**
   * Get all circuit breakers
   */
  getAllCircuitBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Get health summary of all circuit breakers
   */
  getHealthSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    for (const [name, circuitBreaker] of this.circuitBreakers) {
      summary[name] = circuitBreaker.getHealth();
    }
    
    return summary;
  }

  /**
   * Get statistics for all circuit breakers
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    for (const [name, circuitBreaker] of this.circuitBreakers) {
      stats[name] = circuitBreaker.getStats();
    }
    
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.resetStats();
      circuitBreaker.forceClosed();
    }
    
    log('All circuit breakers reset');
  }

  /**
   * Force all circuit breakers to open state
   */
  forceAllOpen(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.forceOpen();
    }
    
    log('All circuit breakers forced to OPEN state');
  }

  /**
   * Force all circuit breakers to closed state
   */
  forceAllClosed(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.forceClosed();
    }
    
    log('All circuit breakers forced to CLOSED state');
  }
}

export const circuitBreakerManager = new CircuitBreakerManager();

log('Circuit breaker system initialized');