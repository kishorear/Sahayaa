/**
 * Monitoring Routes
 * Provides endpoints for system monitoring and performance metrics
 */

import { Router } from 'express';
import { generalCache, embeddingCache, ticketCache, aiResponseCache, cacheUtils } from '../cache-service.js';
import { parallelUtils } from '../parallel-processor.js';
import { securityService } from '../security-service.js';
import { resilienceService } from '../resilience-service.js';
import { circuitBreakerManager } from '../circuit-breaker.js';
import { environmentValidator } from '../environment-validator.js';

const router = Router();

/**
 * Get comprehensive system monitoring data
 */
router.get('/system-status', async (req, res) => {
  try {
    const [
      cacheStats,
      processingStats,
      securityStats,
      resilienceStats,
      circuitBreakerStats,
      environmentSummary
    ] = await Promise.all([
      Promise.resolve(cacheUtils.getStats()),
      Promise.resolve(parallelUtils.getAllStats()),
      Promise.resolve(securityService.getSecurityStats()),
      Promise.resolve(resilienceService.getStats()),
      Promise.resolve(circuitBreakerManager.getHealthSummary()),
      Promise.resolve(environmentValidator.getEnvironmentSummary())
    ]);

    const systemStatus = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      environment: environmentSummary,
      caching: {
        enabled: true,
        stats: cacheStats,
        hitRates: {
          general: cacheStats.general.hitRate,
          embedding: cacheStats.embedding.hitRate,
          ticket: cacheStats.ticket.hitRate,
          aiResponse: cacheStats.aiResponse.hitRate
        }
      },
      processing: {
        parallelExecution: true,
        stats: processingStats,
        avgExecutionTimes: {
          general: processingStats.general.averageExecutionTime,
          ai: processingStats.ai.averageExecutionTime,
          database: processingStats.database.averageExecutionTime,
          vector: processingStats.vector.averageExecutionTime
        }
      },
      security: {
        enabled: true,
        stats: securityStats,
        recentViolations: securityStats.recentViolations
      },
      resilience: {
        enabled: true,
        stats: resilienceStats,
        healthSummary: resilienceService.getHealthSummary()
      },
      circuitBreakers: {
        enabled: true,
        stats: circuitBreakerStats
      }
    };

    res.json(systemStatus);
  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({
      error: 'Failed to get system status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get cache statistics
 */
router.get('/cache-stats', (req, res) => {
  try {
    const stats = cacheUtils.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get parallel processing statistics
 */
router.get('/processing-stats', (req, res) => {
  try {
    const stats = parallelUtils.getAllStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get processing statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get security statistics
 */
router.get('/security-stats', (req, res) => {
  try {
    const stats = securityService.getSecurityStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get security statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get resilience statistics
 */
router.get('/resilience-stats', (req, res) => {
  try {
    const stats = resilienceService.getStats();
    const healthSummary = resilienceService.getHealthSummary();
    res.json({
      stats,
      healthSummary
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get resilience statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get circuit breaker statistics
 */
router.get('/circuit-breaker-stats', (req, res) => {
  try {
    const stats = circuitBreakerManager.getAllStats();
    const healthSummary = circuitBreakerManager.getHealthSummary();
    res.json({
      stats,
      healthSummary
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get circuit breaker statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear cache (admin only)
 */
router.post('/clear-cache', (req, res) => {
  try {
    const { cacheType } = req.body;
    
    if (cacheType === 'all') {
      generalCache.clear();
      embeddingCache.clear();
      ticketCache.clear();
      aiResponseCache.clear();
      res.json({ message: 'All caches cleared successfully' });
    } else if (cacheType === 'general') {
      generalCache.clear();
      res.json({ message: 'General cache cleared successfully' });
    } else if (cacheType === 'embedding') {
      embeddingCache.clear();
      res.json({ message: 'Embedding cache cleared successfully' });
    } else if (cacheType === 'ticket') {
      ticketCache.clear();
      res.json({ message: 'Ticket cache cleared successfully' });
    } else if (cacheType === 'ai') {
      aiResponseCache.clear();
      res.json({ message: 'AI response cache cleared successfully' });
    } else {
      res.status(400).json({ error: 'Invalid cache type' });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to clear cache',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Reset circuit breakers (admin only)
 */
router.post('/reset-circuit-breakers', (req, res) => {
  try {
    const { action } = req.body;
    
    if (action === 'reset') {
      circuitBreakerManager.resetAll();
      res.json({ message: 'All circuit breakers reset successfully' });
    } else if (action === 'close') {
      circuitBreakerManager.forceAllClosed();
      res.json({ message: 'All circuit breakers forced to CLOSED state' });
    } else if (action === 'open') {
      circuitBreakerManager.forceAllOpen();
      res.json({ message: 'All circuit breakers forced to OPEN state' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reset circuit breakers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get environment configuration
 */
router.get('/environment', (req, res) => {
  try {
    const summary = environmentValidator.getEnvironmentSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get environment configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get performance metrics
 */
router.get('/performance', (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      cacheHitRates: {
        general: generalCache.getStats().hitRate,
        embedding: embeddingCache.getStats().hitRate,
        ticket: ticketCache.getStats().hitRate,
        aiResponse: aiResponseCache.getStats().hitRate
      },
      processingTimes: {
        general: parallelUtils.getAllStats().general.averageExecutionTime,
        ai: parallelUtils.getAllStats().ai.averageExecutionTime,
        database: parallelUtils.getAllStats().database.averageExecutionTime,
        vector: parallelUtils.getAllStats().vector.averageExecutionTime
      },
      resilienceMetrics: resilienceService.getHealthSummary()
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;