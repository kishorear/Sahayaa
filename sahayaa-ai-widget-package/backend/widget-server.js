/**
 * Sahayaa AI Widget Server
 * Node.js Express server for handling widget API endpoints
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'https://localhost:3000'];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false
});

// Different rate limits for different endpoints
const generalLimit = createRateLimit(15 * 60 * 1000, 100, 'Too many requests'); // 100 per 15 minutes
const chatLimit = createRateLimit(60 * 1000, 10, 'Too many chat messages'); // 10 per minute
const authLimit = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts'); // 5 per 15 minutes

// Middleware to validate API key
const validateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // Validate API key format and signature
  if (!isValidApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key format' });
  }

  // Extract tenant info from API key
  const keyInfo = parseApiKey(apiKey);
  if (!keyInfo) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.tenantId = keyInfo.tenantId;
  req.apiKeyInfo = keyInfo;
  next();
};

// API key validation functions
function isValidApiKey(apiKey) {
  return /^sahayaa_wk_[a-zA-Z0-9_]+$/.test(apiKey);
}

function parseApiKey(apiKey) {
  try {
    const parts = apiKey.split('_');
    if (parts.length < 4 || parts[0] !== 'sahayaa' || parts[1] !== 'wk') {
      return null;
    }
    
    const tenantId = parseInt(parts[2], 10);
    if (isNaN(tenantId)) {
      return null;
    }
    
    return {
      tenantId,
      keyId: parts[3],
      signature: parts[4] || ''
    };
  } catch (error) {
    return null;
  }
}

// Demo responses for different message types
const demoResponses = {
  greeting: [
    "Hello! I'm your Sahayaa AI assistant. Our multi-agent system is ready to help you with any questions or issues. What can I assist you with today?",
    "Hi there! Welcome to Sahayaa AI support. I'm powered by several specialized agents working together to provide you the best possible assistance."
  ],
  technical: [
    "I understand you're experiencing a technical issue. Let me engage our specialized technical support agents to analyze your problem and provide a comprehensive solution.",
    "Our technical team agents are analyzing your issue. Based on similar cases, I can guide you through the most effective troubleshooting steps."
  ],
  billing: [
    "I can help you with billing-related questions. Our billing optimization agents are reviewing your account to provide accurate information and potential cost-saving recommendations.",
    "Let me connect you with our billing analysis agents who can review your account details and usage patterns to address your concerns."
  ],
  ticket: [
    "I'll create a support ticket for you right away. Our ticket processing agents will classify this issue and route it to the appropriate team for the fastest resolution.",
    "Your support request is being processed by our intelligent ticket management system. I'll ensure it gets the right priority and routing for quick resolution."
  ],
  general: [
    "I'm here to help! Our AI agent network can assist with a wide range of questions. Let me analyze your request and provide the most relevant assistance.",
    "Thanks for reaching out! Our multi-agent system is processing your inquiry to provide you with the most accurate and helpful response."
  ]
};

// Function to determine response type
function getResponseType(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return 'greeting';
  } else if (lowerMessage.includes('api') || lowerMessage.includes('technical') || lowerMessage.includes('error') || lowerMessage.includes('bug')) {
    return 'technical';
  } else if (lowerMessage.includes('billing') || lowerMessage.includes('payment') || lowerMessage.includes('price')) {
    return 'billing';
  } else if (lowerMessage.includes('ticket') || lowerMessage.includes('support') || lowerMessage.includes('help')) {
    return 'ticket';
  } else {
    return 'general';
  }
}

// Function to generate realistic processing steps
function generateProcessingSteps(message, responseType) {
  const baseSteps = [
    {
      step: "ChatProcessor Agent",
      details: `Analyzing user message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
      duration: 450 + Math.random() * 200,
      status: 'complete',
      data: {
        category: responseType,
        confidence: 0.90 + Math.random() * 0.08,
        keywords_extracted: message.toLowerCase().split(' ').filter(w => w.length > 3).slice(0, 3)
      }
    }
  ];

  switch (responseType) {
    case 'technical':
      return [
        ...baseSteps,
        {
          step: "InstructionLookup Agent",
          details: "Searching knowledge base for technical documentation",
          duration: 650 + Math.random() * 300,
          status: 'found',
          data: {
            documents_found: 5 + Math.floor(Math.random() * 10),
            relevance_score: 0.85 + Math.random() * 0.1,
            top_matches: ["API Guide", "Error Resolution", "Integration Docs"]
          }
        },
        {
          step: "TicketLookup Agent",
          details: "Finding similar resolved technical tickets",
          duration: 500 + Math.random() * 250,
          status: 'found',
          data: {
            similar_tickets: 8 + Math.floor(Math.random() * 15),
            resolution_rate: 0.85 + Math.random() * 0.1,
            avg_resolution_time: "15 minutes"
          }
        },
        {
          step: "LLM Resolution Agent",
          details: "Generating comprehensive technical solution",
          duration: 800 + Math.random() * 400,
          status: 'complete',
          data: {
            model_used: "gpt-4",
            solution_confidence: 0.88 + Math.random() * 0.08,
            steps_generated: 3 + Math.floor(Math.random() * 5)
          }
        }
      ];
    
    case 'billing':
      return [
        ...baseSteps,
        {
          step: "AccountContext Agent",
          details: "Retrieving customer account data",
          duration: 350 + Math.random() * 150,
          status: 'found',
          data: {
            account_status: "Active",
            usage_percentage: 0.60 + Math.random() * 0.3,
            optimization_available: Math.random() > 0.5
          }
        },
        {
          step: "BillingOptimizer Agent",
          details: "Analyzing usage patterns",
          duration: 600 + Math.random() * 200,
          status: 'complete',
          data: {
            potential_savings: `$${(10 + Math.random() * 30).toFixed(0)}/month`,
            confidence: 0.80 + Math.random() * 0.15
          }
        }
      ];
      
    default:
      return [
        ...baseSteps,
        {
          step: "ContextAnalysis Agent",
          details: "Understanding user intent",
          duration: 550 + Math.random() * 200,
          status: 'complete',
          data: {
            intent_confidence: 0.80 + Math.random() * 0.15,
            context_sources: 2 + Math.floor(Math.random() * 5)
          }
        }
      ];
  }
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'sahayaa-widget-server',
    version: '1.0.0'
  });
});

// Chat endpoint
app.post('/api/widget/chat', 
  chatLimit,
  validateApiKey,
  [
    body('message').isString().isLength({ min: 1, max: 1000 }).trim(),
    body('sessionId').optional().isString().isLength({ max: 100 }),
    body('context').optional().isObject()
  ],
  async (req, res) => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Invalid input', 
          details: errors.array() 
        });
      }

      const { message, sessionId, context } = req.body;
      const processingStartTime = Date.now();

      console.log(`Chat request from tenant ${req.tenantId}: "${message.substring(0, 50)}..."`);

      // Simulate processing time
      await sleep(800 + Math.random() * 1200);

      // Determine response type and generate processing steps
      const responseType = getResponseType(message);
      const processingSteps = generateProcessingSteps(message, responseType);

      // Generate response
      const responses = demoResponses[responseType];
      const response = responses[Math.floor(Math.random() * responses.length)];

      const totalProcessingTime = Date.now() - processingStartTime;

      res.json({
        success: true,
        response,
        sessionId: sessionId || generateSessionId(),
        processingSteps,
        metadata: {
          responseType,
          confidence: 0.85 + Math.random() * 0.1,
          processingTimeMs: totalProcessingTime,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Chat endpoint error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to process chat message'
      });
    }
  }
);

// Authentication endpoint
app.post('/api/widget/auth',
  authLimit,
  validateApiKey,
  [
    body('username').isString().isLength({ min: 1, max: 100 }).trim(),
    body('password').isString().isLength({ min: 1, max: 100 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Invalid credentials format', 
          details: errors.array() 
        });
      }

      const { username, password } = req.body;

      console.log(`Auth request for user: ${username}, tenant: ${req.tenantId}`);

      // Simulate authentication delay
      await sleep(500 + Math.random() * 500);

      // Demo authentication - accept any username/password for demo purposes
      // In production, this would validate against your user database
      if (username.length > 0 && password.length > 0) {
        const token = jwt.sign(
          { 
            userId: generateUserId(),
            username,
            tenantId: req.tenantId 
          },
          process.env.JWT_SECRET || 'demo-secret',
          { expiresIn: '24h' }
        );

        res.json({
          success: true,
          user: {
            id: generateUserId(),
            username,
            name: username.charAt(0).toUpperCase() + username.slice(1),
            email: `${username}@example.com`
          },
          token
        });
      } else {
        res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid username or password'
        });
      }

    } catch (error) {
      console.error('Auth endpoint error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Authentication service unavailable'
      });
    }
  }
);

// Ticket creation endpoint
app.post('/api/widget/ticket',
  generalLimit,
  validateApiKey,
  [
    body('title').isString().isLength({ min: 1, max: 200 }).trim(),
    body('description').isString().isLength({ min: 1, max: 5000 }).trim(),
    body('category').optional().isString().isIn(['technical', 'billing', 'general']),
    body('priority').optional().isString().isIn(['low', 'medium', 'high', 'urgent']),
    body('sessionId').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Invalid ticket data', 
          details: errors.array() 
        });
      }

      const { title, description, category, priority, sessionId } = req.body;

      console.log(`Ticket creation request from tenant ${req.tenantId}: "${title}"`);

      // Simulate ticket processing
      await sleep(300 + Math.random() * 700);

      const ticketId = generateTicketId();
      const ticket = {
        id: ticketId,
        title,
        description,
        category: category || 'general',
        priority: priority || 'medium',
        status: 'open',
        tenantId: req.tenantId,
        sessionId,
        createdAt: new Date().toISOString(),
        estimatedResolution: getEstimatedResolution(priority || 'medium')
      };

      res.json({
        success: true,
        ticket,
        message: `Ticket ${ticketId} created successfully`
      });

    } catch (error) {
      console.error('Ticket creation error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to create ticket'
      });
    }
  }
);

// Analytics endpoint
app.post('/api/widget/analytics',
  generalLimit,
  validateApiKey,
  [
    body('event').isString().isLength({ min: 1, max: 100 }),
    body('data').optional().isObject(),
    body('sessionId').optional().isString(),
    body('timestamp').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Invalid analytics data', 
          details: errors.array() 
        });
      }

      const { event, data, sessionId, timestamp } = req.body;

      // Log analytics event (in production, this would be stored in a database)
      console.log(`Analytics event from tenant ${req.tenantId}: ${event}`, {
        sessionId,
        timestamp: timestamp || new Date().toISOString(),
        data
      });

      res.json({
        success: true,
        message: 'Event tracked successfully'
      });

    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to track event'
      });
    }
  }
);

// Utility functions
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateSessionId() {
  return 'sess_' + crypto.randomBytes(16).toString('hex');
}

function generateUserId() {
  return 'user_' + Math.floor(Math.random() * 999999).toString().padStart(6, '0');
}

function generateTicketId() {
  return 'TKT-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 999999).toString().padStart(6, '0');
}

function getEstimatedResolution(priority) {
  const estimates = {
    low: '3-5 business days',
    medium: '1-2 business days',
    high: '4-8 hours',
    urgent: '1-2 hours'
  };
  return estimates[priority] || estimates.medium;
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ 
      error: 'Invalid JSON format' 
    });
  }

  res.status(500).json({ 
    error: 'Internal server error',
    message: 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: `${req.method} ${req.path} is not available`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Sahayaa AI Widget Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;