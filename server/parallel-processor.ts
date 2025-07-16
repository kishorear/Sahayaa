/**
 * Parallel Processing Service
 * Handles parallel execution of operations to reduce latency
 */

import { log } from './vite.js';

interface ProcessingTask<T> {
  id: string;
  operation: () => Promise<T>;
  timeout?: number;
  retries?: number;
  priority?: 'high' | 'medium' | 'low';
}

interface ProcessingResult<T> {
  id: string;
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
}

interface ProcessingStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  concurrentTasks: number;
}

class ParallelProcessor {
  private runningTasks: Map<string, Promise<any>> = new Map();
  private stats: ProcessingStats = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageExecutionTime: 0,
    concurrentTasks: 0
  };
  private maxConcurrency: number;
  private taskQueue: ProcessingTask<any>[] = [];
  private executionTimes: number[] = [];

  constructor(maxConcurrency: number = 10) {
    this.maxConcurrency = maxConcurrency;
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeParallel<T>(
    tasks: ProcessingTask<T>[],
    options: {
      maxConcurrency?: number;
      timeoutMs?: number;
      failFast?: boolean;
    } = {}
  ): Promise<ProcessingResult<T>[]> {
    const {
      maxConcurrency = this.maxConcurrency,
      timeoutMs = 30000,
      failFast = false
    } = options;

    log('Starting parallel execution of ' + tasks.length + ' tasks');

    const results: ProcessingResult<T>[] = [];
    const executing: Promise<void>[] = [];

    // Sort tasks by priority
    const sortedTasks = this.sortTasksByPriority(tasks);

    for (const task of sortedTasks) {
      // Wait if we've reached max concurrency
      if (executing.length >= maxConcurrency) {
        await Promise.race(executing);
      }

      const promise = this.executeTask(task, timeoutMs)
        .then(result => {
          results.push(result);
          if (failFast && !result.success) {
            throw new Error(`Task ${task.id} failed: ${result.error?.message}`);
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

    // Wait for all tasks to complete
    await Promise.allSettled(executing);

    log('Parallel execution completed: ' + results.filter(r => r.success).length + '/' + results.length + ' successful');

    return results;
  }

  /**
   * Execute a single task with timeout and retry logic
   */
  private async executeTask<T>(
    task: ProcessingTask<T>,
    timeoutMs: number
  ): Promise<ProcessingResult<T>> {
    const startTime = Date.now();
    const maxRetries = task.retries || 0;
    let lastError: Error | undefined;

    this.stats.totalTasks++;
    this.stats.concurrentTasks++;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.withTimeout(task.operation(), timeoutMs);
        
        const duration = Date.now() - startTime;
        this.updateStats(duration, true);
        
        return {
          id: task.id,
          success: true,
          data: result,
          duration
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
          log(`Task ${task.id} failed, retrying (${attempt + 1}/${maxRetries + 1}) in ${delay}ms`);
        }
      }
    }

    const duration = Date.now() - startTime;
    this.updateStats(duration, false);
    
    return {
      id: task.id,
      success: false,
      error: lastError,
      duration
    };
  }

  /**
   * Add timeout to a promise
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
      })
    ]);
  }

  /**
   * Sort tasks by priority
   */
  private sortTasksByPriority<T>(tasks: ProcessingTask<T>[]): ProcessingTask<T>[] {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    
    return tasks.sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      return aPriority - bPriority;
    });
  }

  /**
   * Update processing statistics
   */
  private updateStats(duration: number, success: boolean): void {
    this.stats.concurrentTasks--;
    this.executionTimes.push(duration);
    
    if (success) {
      this.stats.completedTasks++;
    } else {
      this.stats.failedTasks++;
    }
    
    // Keep only last 100 execution times for average calculation
    if (this.executionTimes.length > 100) {
      this.executionTimes.shift();
    }
    
    this.stats.averageExecutionTime = 
      this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length;
  }

  /**
   * Get processing statistics
   */
  getStats(): ProcessingStats {
    return { ...this.stats };
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    this.stats = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      concurrentTasks: 0
    };
    this.executionTimes = [];
  }
}

// Specialized processors for different use cases
export const generalProcessor = new ParallelProcessor(8);
export const aiProcessor = new ParallelProcessor(4); // Lower concurrency for AI calls
export const databaseProcessor = new ParallelProcessor(12);
export const vectorProcessor = new ParallelProcessor(6);

// Utility functions for common parallel processing patterns
export const parallelUtils = {
  /**
   * Process AI operations in parallel (classification, resolution, etc.)
   */
  processAiOperations: async <T>(
    operations: Array<{ id: string; operation: () => Promise<T> }>,
    options?: { timeoutMs?: number }
  ) => {
    const tasks: ProcessingTask<T>[] = operations.map(op => ({
      id: op.id,
      operation: op.operation,
      timeout: options?.timeoutMs || 30000,
      retries: 2,
      priority: 'high'
    }));

    return aiProcessor.executeParallel(tasks, {
      maxConcurrency: 4,
      timeoutMs: options?.timeoutMs || 30000,
      failFast: false
    });
  },

  /**
   * Process database operations in parallel
   */
  processDatabaseOperations: async <T>(
    operations: Array<{ id: string; operation: () => Promise<T> }>,
    options?: { timeoutMs?: number }
  ) => {
    const tasks: ProcessingTask<T>[] = operations.map(op => ({
      id: op.id,
      operation: op.operation,
      timeout: options?.timeoutMs || 10000,
      retries: 3,
      priority: 'medium'
    }));

    return databaseProcessor.executeParallel(tasks, {
      maxConcurrency: 12,
      timeoutMs: options?.timeoutMs || 10000,
      failFast: false
    });
  },

  /**
   * Process vector operations in parallel (embedding, search, etc.)
   */
  processVectorOperations: async <T>(
    operations: Array<{ id: string; operation: () => Promise<T> }>,
    options?: { timeoutMs?: number }
  ) => {
    const tasks: ProcessingTask<T>[] = operations.map(op => ({
      id: op.id,
      operation: op.operation,
      timeout: options?.timeoutMs || 20000,
      retries: 2,
      priority: 'medium'
    }));

    return vectorProcessor.executeParallel(tasks, {
      maxConcurrency: 6,
      timeoutMs: options?.timeoutMs || 20000,
      failFast: false
    });
  },

  /**
   * Get combined statistics from all processors
   */
  getAllStats: () => ({
    general: generalProcessor.getStats(),
    ai: aiProcessor.getStats(),
    database: databaseProcessor.getStats(),
    vector: vectorProcessor.getStats()
  })
};

log('Parallel processing service initialized');