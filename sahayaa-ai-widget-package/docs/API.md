# 🔌 API Documentation

Complete API reference for the Sahayaa AI Chat Widget backend server with multi-agent workflow integration.

## 🔑 Authentication

All API endpoints require authentication using an API key passed in the `X-API-Key` header.

### API Key Format
```
sahayaa_wk_[tenant_id]_[key_id]_[signature]
```

### Example Request
```bash
curl -X POST https://your-server.com/api/widget/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sahayaa_wk_1_abc123_def456" \
  -d '{"message": "Hello, I need help with my account"}'
```

### Error Responses
```json
{
  "error": "Invalid API key format",
  "message": "API key must follow the pattern: sahayaa_wk_[tenant_id]_[key_id]"
}
```

## 🌐 Base URL

Replace `https://your-server.com` with your actual server URL:
- **Development**: `http://localhost:3000`
- **Production**: `https://your-widget-server.com`

## 📋 Rate Limiting

| Endpoint Category | Limit | Window |
|-------------------|--------|---------|
| General API | 100 requests | 15 minutes |
| Chat Messages | 10 requests | 1 minute |
| Authentication | 5 requests | 15 minutes |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: UTC timestamp when limit resets

## 🤖 Chat API

### Process Chat Message

Sends a message to the AI agent system for processing with multi-agent workflow.

**Endpoint**: `POST /api/widget/chat`

**Headers**:
```
Content-Type: application/json
X-API-Key: your_api_key
```

**Request Body**:
```json
{
  "message": "I'm having trouble logging into my account",
  "sessionId": "optional_session_identifier",
  "context": {
    "page": "login",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "metadata": {
      "userId": "user123",
      "location": "checkout_page"
    }
  }
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "response": "I understand you're having login issues. Let me help you troubleshoot this step by step.",
  "sessionId": "sess_1234567890abcdef",
  "processingSteps": [
    {
      "step": "ChatProcessor Agent",
      "details": "Analyzing user message for intent and category",
      "duration": 450,
      "status": "complete",
      "data": {
        "category": "authentication",
        "confidence": 0.94,
        "keywords_extracted": ["login", "trouble", "account"]
      }
    },
    {
      "step": "InstructionLookup Agent",
      "details": "Searching knowledge base for login troubleshooting guides",
      "duration": 680,
      "status": "found",
      "data": {
        "documents_found": 5,
        "relevance_score": 0.89,
        "top_matches": ["Login Troubleshooting", "Account Recovery", "Password Reset"]
      }
    },
    {
      "step": "TicketLookup Agent",
      "details": "Finding similar resolved login issues",
      "duration": 520,
      "status": "found",
      "data": {
        "similar_tickets": 12,
        "resolution_rate": 0.92,
        "avg_resolution_time": "8 minutes"
      }
    },
    {
      "step": "LLM Resolution Agent",
      "details": "Generating personalized solution steps",
      "duration": 890,
      "status": "complete",
      "data": {
        "model_used": "gpt-4",
        "solution_confidence": 0.91,
        "steps_generated": 4
      }
    }
  ],
  "metadata": {
    "responseType": "authentication",
    "confidence": 0.91,
    "processingTimeMs": 2540,
    "timestamp": "2024-01-15T10:30:02.540Z"
  }
}
```

**Response** (Error - 400):
```json
{
  "error": "Invalid input",
  "details": [
    {
      "field": "message",
      "message": "Message is required and must be between 1-1000 characters"
    }
  ]
}
```

**Response** (Error - 429):
```json
{
  "error": "Too many chat messages",
  "message": "Rate limit exceeded. Try again in 60 seconds."
}
```

### Processing Step Types

| Step | Purpose | Data Fields |
|------|---------|-------------|
| ChatProcessor Agent | Message analysis and categorization | `category`, `confidence`, `keywords_extracted` |
| InstructionLookup Agent | Knowledge base search | `documents_found`, `relevance_score`, `top_matches` |
| TicketLookup Agent | Historical ticket similarity search | `similar_tickets`, `resolution_rate`, `avg_resolution_time` |
| LLM Resolution Agent | AI response generation | `model_used`, `solution_confidence`, `steps_generated` |
| TicketFormatter Agent | Solution structuring | `format_type`, `sections_created`, `actionable_steps` |

## 🔐 Authentication API

### User Authentication

Authenticates a user and returns session information.

**Endpoint**: `POST /api/widget/auth`

**Headers**:
```
Content-Type: application/json
X-API-Key: your_api_key
```

**Request Body**:
```json
{
  "username": "user@example.com",
  "password": "user_password",
  "rememberMe": false
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "user": {
    "id": "user_123456",
    "username": "user@example.com",
    "name": "John Doe",
    "email": "user@example.com",
    "roles": ["user"],
    "preferences": {
      "theme": "light",
      "notifications": true
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

**Response** (Error - 401):
```json
{
  "error": "Authentication failed",
  "message": "Invalid username or password"
}
```

### Token Validation

Validates an existing JWT token.

**Endpoint**: `POST /api/widget/auth/validate`

**Headers**:
```
Content-Type: application/json
X-API-Key: your_api_key
Authorization: Bearer your_jwt_token
```

**Response** (Success - 200):
```json
{
  "valid": true,
  "user": {
    "id": "user_123456",
    "username": "user@example.com",
    "name": "John Doe"
  },
  "expiresAt": "2024-01-16T10:30:00.000Z"
}
```

## 🎫 Ticket Management API

### Create Support Ticket

Creates a new support ticket from chat conversation.

**Endpoint**: `POST /api/widget/ticket`

**Headers**:
```
Content-Type: application/json
X-API-Key: your_api_key
```

**Request Body**:
```json
{
  "title": "Login System: Unable to Access Account After Password Reset",
  "description": "User is experiencing difficulties logging in after completing password reset process. Error message: 'Invalid credentials' appears despite correct password.",
  "category": "technical",
  "priority": "high",
  "sessionId": "sess_1234567890abcdef",
  "userInfo": {
    "email": "user@example.com",
    "userId": "user_123456"
  },
  "chatHistory": [
    {
      "role": "user",
      "message": "I can't log in after resetting my password",
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    {
      "role": "ai",
      "message": "I'll help you troubleshoot this login issue...",
      "timestamp": "2024-01-15T10:30:02.000Z"
    }
  ]
}
```

**Response** (Success - 201):
```json
{
  "success": true,
  "ticket": {
    "id": "TKT-2024-123456",
    "title": "Login System: Unable to Access Account After Password Reset",
    "description": "User is experiencing difficulties logging in...",
    "category": "technical",
    "priority": "high",
    "status": "open",
    "tenantId": 1,
    "sessionId": "sess_1234567890abcdef",
    "createdAt": "2024-01-15T10:30:03.000Z",
    "estimatedResolution": "4-8 hours",
    "assignedAgent": null,
    "tags": ["login", "password-reset", "authentication"]
  },
  "message": "Ticket TKT-2024-123456 created successfully"
}
```

### Get Ticket Status

Retrieves the current status of a support ticket.

**Endpoint**: `GET /api/widget/ticket/{ticketId}`

**Headers**:
```
X-API-Key: your_api_key
```

**Response** (Success - 200):
```json
{
  "success": true,
  "ticket": {
    "id": "TKT-2024-123456",
    "title": "Login System: Unable to Access Account After Password Reset",
    "status": "in_progress",
    "priority": "high",
    "createdAt": "2024-01-15T10:30:03.000Z",
    "updatedAt": "2024-01-15T11:15:00.000Z",
    "estimatedResolution": "4-8 hours",
    "assignedAgent": {
      "name": "Sarah Johnson",
      "email": "sarah@company.com"
    },
    "updates": [
      {
        "timestamp": "2024-01-15T11:15:00.000Z",
        "message": "Investigating password reset system logs",
        "author": "sarah@company.com"
      }
    ]
  }
}
```

## 📊 Analytics API

### Track Event

Records user interaction events for analytics and monitoring.

**Endpoint**: `POST /api/widget/analytics`

**Headers**:
```
Content-Type: application/json
X-API-Key: your_api_key
```

**Request Body**:
```json
{
  "event": "message_sent",
  "sessionId": "sess_1234567890abcdef",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "messageLength": 45,
    "responseTime": 1200,
    "userAgent": "Mozilla/5.0...",
    "page": "support",
    "customData": {
      "feature": "agent_workflow",
      "confidence": 0.91
    }
  }
}
```

**Response** (Success - 200):
```json
{
  "success": true,
  "message": "Event tracked successfully",
  "eventId": "evt_987654321"
}
```

### Get Analytics Summary

Retrieves analytics summary for a specific time period.

**Endpoint**: `GET /api/widget/analytics/summary`

**Headers**:
```
X-API-Key: your_api_key
```

**Query Parameters**:
- `startDate` (ISO 8601): Start date for analytics period
- `endDate` (ISO 8601): End date for analytics period
- `granularity` (string): `hour`, `day`, `week`, `month`

**Example**:
```
GET /api/widget/analytics/summary?startDate=2024-01-01T00:00:00.000Z&endDate=2024-01-31T23:59:59.999Z&granularity=day
```

**Response** (Success - 200):
```json
{
  "success": true,
  "summary": {
    "totalEvents": 1523,
    "uniqueSessions": 487,
    "avgResponseTime": 1350,
    "eventBreakdown": {
      "widget_initialized": 487,
      "chat_opened": 342,
      "message_sent": 694,
      "agent_workflow_completed": 694
    },
    "agentWorkflowMetrics": {
      "avgProcessingTime": 2340,
      "avgConfidence": 0.89,
      "topCategories": [
        {"category": "technical", "count": 245},
        {"category": "billing", "count": 178},
        {"category": "general", "count": 271}
      ]
    },
    "timeSeries": [
      {
        "date": "2024-01-01",
        "events": 45,
        "sessions": 18,
        "avgResponseTime": 1200
      }
    ]
  }
}
```

## 🏥 Health & Status API

### Health Check

Checks the overall health of the widget server and its dependencies.

**Endpoint**: `GET /health`

**Response** (Success - 200):
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "sahayaa-widget-server",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": 45
    },
    "aiProviders": {
      "status": "healthy",
      "providers": {
        "openai": "available",
        "google": "available",
        "anthropic": "unavailable"
      }
    },
    "vectorStorage": {
      "status": "healthy",
      "documentsIndexed": 247
    }
  },
  "uptime": 86400
}
```

### Readiness Check

Checks if the server is ready to accept requests.

**Endpoint**: `GET /readiness`

**Response** (Success - 200):
```json
{
  "ready": true,
  "services": {
    "database": true,
    "aiProviders": true,
    "vectorStorage": true
  }
}
```

### Liveness Check

Minimal health check for container orchestration.

**Endpoint**: `GET /liveness`

**Response** (Success - 200):
```json
{
  "alive": true
}
```

## 🔧 Configuration API

### Get Widget Configuration

Retrieves public configuration for widget initialization.

**Endpoint**: `GET /api/widget/config`

**Headers**:
```
X-API-Key: your_api_key
```

**Response** (Success - 200):
```json
{
  "success": true,
  "config": {
    "features": {
      "agentWorkflow": true,
      "behindTheScenes": true,
      "confidenceScoring": true,
      "ticketCreation": true,
      "userAuthentication": false
    },
    "limits": {
      "maxMessageLength": 1000,
      "maxChatHistory": 50,
      "rateLimitPerMinute": 10
    },
    "ui": {
      "supportedLanguages": ["en", "es", "fr", "de"],
      "defaultTheme": "light",
      "customization": {
        "primaryColor": "#6366f1",
        "branding": true
      }
    }
  }
}
```

## 📝 File Upload API

### Upload File

Uploads a file for processing or attachment to tickets.

**Endpoint**: `POST /api/widget/upload`

**Headers**:
```
X-API-Key: your_api_key
Content-Type: multipart/form-data
```

**Request Body** (multipart/form-data):
```
file: [binary file data]
sessionId: sess_1234567890abcdef
description: Screenshot of the error message
```

**Response** (Success - 200):
```json
{
  "success": true,
  "file": {
    "id": "file_987654321",
    "filename": "error_screenshot.png",
    "size": 245760,
    "mimeType": "image/png",
    "uploadedAt": "2024-01-15T10:30:00.000Z",
    "url": "https://your-server.com/uploads/file_987654321.png"
  }
}
```

### File Constraints

| File Type | Max Size | Allowed Extensions |
|-----------|----------|-------------------|
| Images | 10MB | jpg, jpeg, png, gif, webp |
| Documents | 10MB | pdf, doc, docx, txt |
| Archives | 25MB | zip, tar, gz |

## 🚨 Error Handling

### Standard Error Response Format

```json
{
  "error": "Error type or code",
  "message": "Human-readable error description",
  "details": "Additional error details (optional)",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req_1234567890"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Invalid or missing API key |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Valid request but business logic error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 502 | Bad Gateway | Upstream service error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Common Error Scenarios

#### Invalid API Key
```json
{
  "error": "Invalid API key format",
  "message": "API key must follow the pattern: sahayaa_wk_[tenant_id]_[key_id]"
}
```

#### Rate Limit Exceeded
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "retryAfter": 60
}
```

#### Validation Error
```json
{
  "error": "Validation failed",
  "message": "Request contains invalid data",
  "details": [
    {
      "field": "message",
      "error": "Message cannot be empty"
    },
    {
      "field": "sessionId",
      "error": "Invalid session ID format"
    }
  ]
}
```

#### Service Unavailable
```json
{
  "error": "Service unavailable",
  "message": "AI provider temporarily unavailable. Using fallback responses.",
  "fallbackActive": true
}
```

## 🔍 Request/Response Examples

### Complete Chat Workflow Example

```bash
# 1. Initialize chat session
curl -X POST https://your-server.com/api/widget/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sahayaa_wk_1_demo123" \
  -d '{
    "message": "I need help with billing",
    "context": {
      "page": "billing_dashboard",
      "userAgent": "Mozilla/5.0..."
    }
  }'

# 2. Follow up message
curl -X POST https://your-server.com/api/widget/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sahayaa_wk_1_demo123" \
  -d '{
    "message": "My invoice seems incorrect",
    "sessionId": "sess_1234567890abcdef"
  }'

# 3. Create ticket from conversation
curl -X POST https://your-server.com/api/widget/ticket \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sahayaa_wk_1_demo123" \
  -d '{
    "title": "Billing: Incorrect Invoice Amount",
    "description": "Customer reports invoice discrepancy...",
    "category": "billing",
    "priority": "medium",
    "sessionId": "sess_1234567890abcdef"
  }'
```

### Analytics Tracking Example

```bash
# Track widget initialization
curl -X POST https://your-server.com/api/widget/analytics \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sahayaa_wk_1_demo123" \
  -d '{
    "event": "widget_initialized",
    "sessionId": "sess_1234567890abcdef",
    "data": {
      "page": "support",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  }'

# Track chat interaction
curl -X POST https://your-server.com/api/widget/analytics \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sahayaa_wk_1_demo123" \
  -d '{
    "event": "agent_workflow_completed",
    "sessionId": "sess_1234567890abcdef",
    "data": {
      "processingTime": 2340,
      "confidence": 0.91,
      "category": "billing",
      "agentsUsed": ["ChatProcessor", "InstructionLookup", "TicketLookup", "LLM"]
    }
  }'
```

## 🛡️ Security Considerations

### API Key Security
- Store API keys securely (environment variables, secret management)
- Use HTTPS for all API communications
- Implement API key rotation policies
- Monitor for unusual API usage patterns

### Request Validation
- All input is validated and sanitized
- File uploads are scanned for malware
- Rate limiting prevents abuse
- CORS policies restrict unauthorized origins

### Data Protection
- Sensitive data is encrypted at rest and in transit
- PII is handled according to data protection regulations
- Session tokens have configurable expiration
- Audit logs track all API access

## 🧪 Testing the API

### Using cURL

Test basic connectivity:
```bash
curl -X GET https://your-server.com/health
```

Test chat functionality:
```bash
curl -X POST https://your-server.com/api/widget/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{"message": "Hello, testing the API!"}'
```

### Using Postman

Import this collection to test all endpoints:

```json
{
  "info": {
    "name": "Sahayaa Widget API",
    "description": "Complete API collection for testing"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://your-server.com"
    },
    {
      "key": "apiKey",
      "value": "your_api_key_here"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Chat Message",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/widget/chat",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "X-API-Key",
            "value": "{{apiKey}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"message\": \"Hello, I need help with my account\"}"
        }
      }
    }
  ]
}
```

### Using JavaScript (Frontend)

```javascript
// Initialize API client
class SahayaaAPIClient {
  constructor(baseUrl, apiKey) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async sendMessage(message, sessionId = null) {
    const response = await fetch(`${this.baseUrl}/api/widget/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({
        message,
        sessionId,
        context: {
          page: window.location.pathname,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async trackEvent(event, data) {
    await fetch(`${this.baseUrl}/api/widget/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data
      })
    });
  }
}

// Usage example
const client = new SahayaaAPIClient('https://your-server.com', 'your_api_key');

// Send a message
client.sendMessage('Hello, I need help!')
  .then(response => {
    console.log('AI Response:', response.response);
    console.log('Processing Steps:', response.processingSteps);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

## 📚 API Versioning

### Current Version: v1

All endpoints are currently version 1. Future versions will be available at:
- `/api/v2/widget/chat`
- `/api/v3/widget/chat`

### Deprecation Policy

- Version support: Minimum 12 months after new version release
- Breaking changes: Only in major version updates
- Deprecation warnings: 6 months before removal
- Migration guides: Provided for all version updates

---

This API provides comprehensive functionality for integrating Sahayaa AI's multi-agent chat widget with transparent workflow processing, complete analytics, and enterprise-grade security.