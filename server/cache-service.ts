/**
 * Cache Service for Performance Optimization
 * Implements in-memory caching with TTL and intelligent invalidation
 */

import { log } from './vite.js';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    hitRate: 0
  };
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired items every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 5 * 60 * 1000);
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size--;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return item.data;
  }

  /**
   * Set item in cache with TTL
   */
  set<T>(key: string, data: T, ttl: number = 300000, tags: string[] = []): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      tags
    });
    
    this.stats.sets++;
    this.stats.size = this.cache.size;
    
    log('Cache set: ' + key);
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
      log('Cache delete: ' + key);
    }
    return deleted;
  }

  /**
   * Clear all cache items
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    log('Cache cleared');
  }

  /**
   * Invalidate cache items by tag
   */
  invalidateByTag(tag: string): number {
    let deletedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.tags.includes(tag)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    this.stats.size = this.cache.size;
    log('Cache invalidated by tag: ' + tag + ' (' + deletedCount + ' items)');
    
    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get or set pattern for common use cases
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T> | T, 
    ttl: number = 300000, 
    tags: string[] = []
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl, tags);
    return data;
  }

  /**
   * Cleanup expired items
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    this.stats.size = this.cache.size;
    
    if (cleanedCount > 0) {
      log('Cache cleanup completed: ' + cleanedCount + ' items removed');
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const totalRequests = this.stats.hits + this.stats.misses;
    this.stats.hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
  }

  /**
   * Destroy cache service
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Specialized cache instances
export const generalCache = new CacheService();
export const embeddingCache = new CacheService();
export const ticketCache = new CacheService();
export const aiResponseCache = new CacheService();

// Cache key generators
export const CacheKeys = {
  ticket: (id: number) => `ticket:${id}`,
  ticketsByTenant: (tenantId: number, filters?: string) => 
    `tickets:tenant:${tenantId}${filters ? `:${filters}` : ''}`,
  userByUsername: (username: string) => `user:username:${username}`,
  userById: (id: number) => `user:id:${id}`,
  aiProviders: (tenantId: number) => `ai-providers:tenant:${tenantId}`,
  embedding: (text: string) => `embedding:${Buffer.from(text).toString('base64').substring(0, 50)}`,
  similarTickets: (query: string, tenantId: number) => 
    `similar-tickets:${tenantId}:${Buffer.from(query).toString('base64').substring(0, 30)}`,
  instructions: (query: string, tenantId: number) => 
    `instructions:${tenantId}:${Buffer.from(query).toString('base64').substring(0, 30)}`,
  aiClassification: (title: string, description: string) => 
    `ai-classification:${Buffer.from(title + description).toString('base64').substring(0, 50)}`,
  aiResolution: (title: string, description: string, context: string) => 
    `ai-resolution:${Buffer.from(title + description + context).toString('base64').substring(0, 50)}`
};

// Cache TTL constants (in milliseconds)
export const CacheTTL = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 30 * 60 * 1000,    // 30 minutes
  LONG: 2 * 60 * 60 * 1000,  // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000  // 24 hours
};

// Cache tags for invalidation
export const CacheTags = {
  TICKETS: 'tickets',
  USERS: 'users',
  AI_PROVIDERS: 'ai-providers',
  EMBEDDINGS: 'embeddings',
  AI_RESPONSES: 'ai-responses',
  INSTRUCTIONS: 'instructions'
};

// Utility functions for common caching patterns
export const cacheUtils = {
  /**
   * Cache ticket data with automatic tag assignment
   */
  cacheTicket: (ticket: any) => {
    ticketCache.set(
      CacheKeys.ticket(ticket.id),
      ticket,
      CacheTTL.MEDIUM,
      [CacheTags.TICKETS, `tenant:${ticket.tenantId}`]
    );
  },

  /**
   * Cache user data with automatic tag assignment
   */
  cacheUser: (user: any) => {
    generalCache.set(
      CacheKeys.userById(user.id),
      user,
      CacheTTL.LONG,
      [CacheTags.USERS, `tenant:${user.tenantId}`]
    );
    
    generalCache.set(
      CacheKeys.userByUsername(user.username),
      user,
      CacheTTL.LONG,
      [CacheTags.USERS, `tenant:${user.tenantId}`]
    );
  },

  /**
   * Cache AI provider data
   */
  cacheAiProviders: (tenantId: number, providers: any[]) => {
    generalCache.set(
      CacheKeys.aiProviders(tenantId),
      providers,
      CacheTTL.LONG,
      [CacheTags.AI_PROVIDERS, `tenant:${tenantId}`]
    );
  },

  /**
   * Cache embedding data
   */
  cacheEmbedding: (text: string, embedding: number[]) => {
    embeddingCache.set(
      CacheKeys.embedding(text),
      embedding,
      CacheTTL.VERY_LONG,
      [CacheTags.EMBEDDINGS]
    );
  },

  /**
   * Cache AI response
   */
  cacheAiResponse: (key: string, response: any, ttl: number = CacheTTL.MEDIUM) => {
    aiResponseCache.set(
      key,
      response,
      ttl,
      [CacheTags.AI_RESPONSES]
    );
  },

  /**
   * Invalidate cache for a specific tenant
   */
  invalidateTenant: (tenantId: number) => {
    const tag = `tenant:${tenantId}`;
    generalCache.invalidateByTag(tag);
    ticketCache.invalidateByTag(tag);
    embeddingCache.invalidateByTag(tag);
    aiResponseCache.invalidateByTag(tag);
  },

  /**
   * Get cache statistics summary
   */
  getStats: () => ({
    general: generalCache.getStats(),
    embedding: embeddingCache.getStats(),
    ticket: ticketCache.getStats(),
    aiResponse: aiResponseCache.getStats()
  })
};

log('Cache service initialized');