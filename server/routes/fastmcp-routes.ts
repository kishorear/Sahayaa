/**
 * FastMCP API Routes
 * Provides endpoints for FastMCP service integration.
 */

import { Router, Request, Response } from 'express';
import { fastMcpOrchestrator } from '../fastmcp_orchestrator';

const router = Router();

// Health check for FastMCP service
router.get('/fastmcp/health', async (req: Request, res: Response) => {
  try {
    const status = fastMcpOrchestrator.getStatus();
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Search documents via FastMCP
router.post('/fastmcp/search', async (req: Request, res: Response) => {
  try {
    const { query, top_k = 5, filter_metadata } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const result = await fastMcpOrchestrator.searchDocuments(query, {
      top_k,
      filter_metadata
    });

    res.json({
      success: true,
      query,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Process agent request via FastMCP
router.post('/fastmcp/agents/:agentType', async (req: Request, res: Response) => {
  try {
    const { agentType } = req.params;
    const { query, context = {} } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Add user context from session
    const enhancedContext = {
      ...context,
      tenant_id: req.user?.tenantId || 1,
      user_id: req.user?.id
    };

    const result = await fastMcpOrchestrator.processAgentRequest(
      agentType,
      query,
      enhancedContext
    );

    res.json({
      success: true,
      agent_type: agentType,
      query,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Ingest documents via FastMCP
router.post('/fastmcp/documents/ingest', async (req: Request, res: Response) => {
  try {
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        success: false,
        error: 'Documents array is required'
      });
    }

    const result = await fastMcpOrchestrator.ingestDocuments(documents);

    res.json({
      success: true,
      documents_count: documents.length,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get FastMCP metrics
router.get('/fastmcp/metrics', async (req: Request, res: Response) => {
  try {
    const metricsResponse = await fastMcpOrchestrator.makeRequest('/metrics', {});
    
    res.json({
      success: true,
      metrics: metricsResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Get storage statistics
router.get('/fastmcp/stats', async (req: Request, res: Response) => {
  try {
    const statsResponse = await fastMcpOrchestrator.makeRequest('/stats', {});
    
    res.json({
      success: true,
      stats: statsResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      fallback: true,
      timestamp: new Date().toISOString()
    });
  }
});

// Test endpoint for FastMCP functionality
router.post('/fastmcp/test', async (req: Request, res: Response) => {
  try {
    const { test_type = 'search', query = 'test query' } = req.body;
    
    let result;
    
    switch (test_type) {
      case 'search':
        result = await fastMcpOrchestrator.searchDocuments(query);
        break;
      case 'instruction_lookup':
        result = await fastMcpOrchestrator.processAgentRequest('instruction_lookup', query);
        break;
      case 'ticket_lookup':
        result = await fastMcpOrchestrator.processAgentRequest('ticket_lookup', query);
        break;
      case 'chat_processor':
        result = await fastMcpOrchestrator.processAgentRequest('chat_processor', query);
        break;
      default:
        throw new Error(`Unknown test type: ${test_type}`);
    }

    res.json({
      success: true,
      test_type,
      query,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;