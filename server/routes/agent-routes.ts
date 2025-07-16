/**
 * Enhanced Agent Routes with MCP Integration and RBAC Security
 * Handles all agent-related API endpoints with comprehensive security
 */

import { Request, Response, Router } from 'express';
import multer from 'multer';
import { agentIntegration } from '../agent-integration';

// Simple authentication middleware
const requireAuth = (req: any, res: Response, next: any) => {
  if (req.user && req.user.id) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow specific file types for agent uploads
    const allowedTypes = [
      'text/plain',
      'application/json',
      'text/markdown',
      'application/pdf',
      'text/yaml',
      'text/x-python'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed for agent uploads`));
    }
  }
});

/**
 * Enhanced instruction lookup with MCP integration
 */
router.post('/instruction-lookup', requireAuth, async (req: any, res: Response) => {
  try {
    const { query, tenant_id = 1, top_k = 5 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    // Extract user context from authentication
    const userContext = {
      user_id: req.user?.id?.toString() || 'unknown',
      role: req.user?.role || 'user',
      tenant_id: req.user?.tenant_id || tenant_id
    };

    // Process instruction lookup using enhanced agent
    const result = await agentIntegration.processInstructionLookup(
      query,
      tenant_id,
      userContext,
      top_k
    );

    res.json(result);
  } catch (error) {
    console.error('Instruction lookup error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Instruction lookup failed'
    });
  }
});

/**
 * Enhanced ticket lookup with MCP integration
 */
router.post('/ticket-lookup', requireAuth, async (req: any, res: Response) => {
  try {
    const { query, tenant_id = 1, top_k = 10 } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    // Extract user context from authentication
    const userContext = {
      user_id: req.user?.id?.toString() || 'unknown',
      role: req.user?.role || 'user',
      tenant_id: req.user?.tenant_id || tenant_id
    };

    // Process ticket lookup using enhanced agent
    const result = await agentIntegration.processTicketLookup(
      query,
      tenant_id,
      userContext,
      top_k
    );

    res.json(result);
  } catch (error) {
    console.error('Ticket lookup error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Ticket lookup failed'
    });
  }
});

/**
 * Secure agent file upload with RBAC validation
 */
router.post('/upload', requireAuth, upload.single('file'), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const { upload_type = 'documents' } = req.body;

    // Extract user context from authentication
    const userContext = {
      user_id: req.user?.id?.toString() || 'unknown',
      role: req.user?.role || 'user',
      tenant_id: req.user?.tenant_id || 1
    };

    // Validate user has upload permissions
    const allowedRoles = ['creator', 'administrator', 'support_engineer'];
    if (!allowedRoles.includes(userContext.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions for agent file uploads'
      });
    }

    // Process secure upload using agent integration
    const result = await agentIntegration.secureAgentUpload(
      req.file.originalname,
      req.file.buffer,
      upload_type,
      userContext
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Agent upload error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

/**
 * Agent health check endpoint
 */
router.get('/health', requireAuth, async (req: any, res: Response) => {
  try {
    // Check if user has admin permissions for health checks
    const userRole = req.user?.role || 'user';
    const adminRoles = ['creator', 'administrator'];
    
    if (!adminRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions for agent health checks'
      });
    }

    const healthStatus = await agentIntegration.getAgentHealthStatus();
    
    res.json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Agent health check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

/**
 * Initialize agent services endpoint
 */
router.post('/initialize', requireAuth, async (req: any, res: Response) => {
  try {
    // Check if user has admin permissions for initialization
    const userRole = req.user?.role || 'user';
    if (userRole !== 'creator') {
      return res.status(403).json({
        success: false,
        error: 'Only creators can initialize agent services'
      });
    }

    const initialized = await agentIntegration.initializeAgentServices();
    
    res.json({
      success: initialized,
      message: initialized ? 'Agent services initialized successfully' : 'Agent initialization failed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Agent initialization error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Initialization failed'
    });
  }
});

/**
 * Enhanced chat processing with multi-agent workflow
 */
router.post('/process-chat', requireAuth, async (req: any, res: Response) => {
  try {
    const { message, context = {}, tenant_id = 1 } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message parameter is required'
      });
    }

    // Extract user context from authentication
    const userContext = {
      user_id: req.user?.id?.toString() || 'unknown',
      role: req.user?.role || 'user',
      tenant_id: req.user?.tenant_id || tenant_id
    };

    // Process through both instruction and ticket lookup for comprehensive response
    const [instructionResults, ticketResults] = await Promise.all([
      agentIntegration.processInstructionLookup(message, tenant_id, userContext, 3),
      agentIntegration.processTicketLookup(message, tenant_id, userContext, 5)
    ]);

    // Combine results for enhanced response
    const combinedResponse = {
      success: true,
      data: {
        instructions: instructionResults.data || [],
        similar_tickets: ticketResults.data || [],
        confidence: Math.max(
          instructionResults.confidence || 0,
          ticketResults.confidence || 0
        ),
        processing_time: (instructionResults.processing_time || 0) + (ticketResults.processing_time || 0)
      },
      timestamp: new Date().toISOString()
    };

    res.json(combinedResponse);
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Chat processing failed'
    });
  }
});

/**
 * Agent performance metrics endpoint
 */
router.get('/metrics', requireAuth, async (req: any, res: Response) => {
  try {
    // Check if user has admin permissions for metrics
    const userRole = req.user?.role || 'user';
    const adminRoles = ['creator', 'administrator'];
    
    if (!adminRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions for agent metrics'
      });
    }

    // Get health status which includes performance metrics
    const healthStatus = await agentIntegration.getAgentHealthStatus();
    
    // Extract metrics from health status
    const metrics = {
      services: healthStatus.services || {},
      overall_status: healthStatus.overall_status || 'unknown',
      uptime_seconds: healthStatus.uptime_seconds || 0,
      request_count: healthStatus.request_count || 0,
      error_count: healthStatus.error_count || 0,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Agent metrics error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Metrics retrieval failed'
    });
  }
});

/**
 * Agent configuration endpoint
 */
router.get('/config', requireAuth, async (req: any, res: Response) => {
  try {
    // Check if user has admin permissions for configuration
    const userRole = req.user?.role || 'user';
    const adminRoles = ['creator', 'administrator'];
    
    if (!adminRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions for agent configuration'
      });
    }

    // Return agent configuration (without sensitive data)
    const config = {
      agent_service_url: process.env.AGENT_SERVICE_URL || 'http://localhost:8001',
      fallback_mode: process.env.AGENT_FALLBACK === 'true',
      max_retries: 3,
      timeout_ms: 30000,
      supported_upload_types: ['documents', 'images', 'data'],
      max_file_size_mb: 50,
      mcp_enabled: true,
      vector_search_enabled: true,
      rbac_enabled: true
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Agent config error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Configuration retrieval failed'
    });
  }
});

export default router;