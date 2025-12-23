# Sahayaa AI Chat Widget API Documentation

## Overview

The Sahayaa AI Chat Widget API provides comprehensive endpoints for integrating AI-powered customer support into your applications. Built on a microservices architecture with PostgreSQL, the API supports multi-tenant isolation, AI agent orchestration, vector-based similarity search, and real-time communication.

## Authentication

All API requests require authentication using your Sahayaa AI API key. You can find or generate this key in your Sahayaa AI admin dashboard under Settings > API Keys.

### API Key Format

```
sahayaa_wk_{tenant_id}_{key_id}_{signature}
```

### Authentication Methods

#### Header Authentication (Recommended)

```http
X-API-Key: your_api_key_here
```

#### Query Parameter Authentication

```http
GET /api/widget/config?apiKey=your_api_key_here
```

## Base URL

All API endpoints use the following base URL:

```
https://www.sahayaa.ai/api
```

For development/testing:
```
http://localhost:5000/api
```

## Core Endpoints

### Health Check

#### Get System Health

```http
GET /health
```

Returns the health status of all services.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-21T10:30:45Z",
  "services": {
    "database": "healthy",
    "agentOrchestrator": "healthy",
    "dataService": "healthy",
    "vectorStorage": "healthy"
  },
  "version": "1.0.0"
}
```

### Widget Configuration

#### Get Widget Configuration

```http
GET /widget/config/{tenantId}
```

Retrieves the current widget configuration for the specified tenant.

**Headers:**
- `X-API-Key`: Your API key

**Response:**
```json
{
  "id": 123,
  "tenantId": 456,
  "primaryColor": "#6366F1",
  "position": "right",
  "greetingMessage": "How can I help you today?",
  "autoOpen": false,
  "branding": true,
  "reportData": true,
  "enableAttachments": true,
  "enableAIAgents": true,
  "maxFileSize": 10485760,
  "allowedFileTypes": ["image/*", "application/pdf", ".txt", ".docx"],
  "createdAt": "2025-01-15T12:34:56Z",
  "updatedAt": "2025-10-21T10:11:12Z"
}
```

#### Update Widget Configuration

```http
PUT /widget/config/{tenantId}
PATCH /widget/config/{tenantId}
```

Updates the widget configuration for the specified tenant.

**Headers:**
- `X-API-Key`: Your API key
- `Content-Type`: application/json

**Request Body:**
```json
{
  "primaryColor": "#FF5500",
  "position": "left",
  "greetingMessage": "Welcome! Need assistance?",
  "autoOpen": true,
  "branding": false,
  "reportData": true,
  "enableAttachments": true,
  "enableAIAgents": true,
  "maxFileSize": 20971520
}
```

**Response:**
```json
{
  "success": true,
  "config": {
    "id": 123,
    "tenantId": 456,
    "primaryColor": "#FF5500",
    "position": "left",
    "greetingMessage": "Welcome! Need assistance?",
    "autoOpen": true,
    "branding": false,
    "reportData": true,
    "enableAttachments": true,
    "enableAIAgents": true,
    "updatedAt": "2025-10-21T15:16:17Z"
  }
}
```

### Messages & Conversations

#### Send Message

```http
POST /widget/messages
```

Sends a message from the chat widget to the Sahayaa AI system. Messages are processed through the AI agent orchestrator for intelligent responses.

**Headers:**
- `X-API-Key`: Your API key
- `Content-Type`: application/json

**Request Body:**
```json
{
  "tenantId": 456,
  "sessionId": "user_session_789",
  "message": "How do I reset my password?",
  "userId": "user_12345",
  "metadata": {
    "url": "https://example.com/account",
    "browser": "Chrome 120",
    "os": "Windows 11",
    "screenSize": "1920x1080",
    "timestamp": "2025-10-21T15:20:20Z"
  }
}
```

**Response:**
```json
{
  "id": "msg_12345",
  "ticketId": "TKT-2025-001",
  "tenantId": 456,
  "sessionId": "user_session_789",
  "message": "How do I reset my password?",
  "response": {
    "content": "To reset your password, click the 'Forgot Password' link on the login page. You'll receive an email with a secure link to create a new password. The link expires in 24 hours for security.",
    "aiGenerated": true,
    "confidence": 0.92,
    "sources": [
      {
        "type": "instruction",
        "title": "Password Reset Guide",
        "similarity": 0.89
      },
      {
        "type": "ticket",
        "id": "TKT-2025-000123",
        "similarity": 0.85
      }
    ],
    "agentWorkflow": [
      {
        "agent": "chat_processor",
        "status": "completed",
        "duration": 120
      },
      {
        "agent": "instruction_lookup",
        "status": "completed",
        "duration": 350,
        "resultsFound": 3
      },
      {
        "agent": "ticket_lookup",
        "status": "completed",
        "duration": 280,
        "resultsFound": 5
      },
      {
        "agent": "ticket_formatter",
        "status": "completed",
        "duration": 200
      }
    ]
  },
  "createdAt": "2025-10-21T15:20:23Z"
}
```

#### Get Conversation History

```http
GET /widget/conversations/{sessionId}
```

Retrieves the complete conversation history for a specific session.

**Headers:**
- `X-API-Key`: Your API key

**Query Parameters:**
- `tenantId` (required): Your tenant ID
- `limit` (optional): Maximum number of messages to return (default: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "sessionId": "user_session_789",
  "tenantId": 456,
  "startedAt": "2025-10-21T15:10:11Z",
  "lastMessageAt": "2025-10-21T15:20:23Z",
  "messageCount": 6,
  "messages": [
    {
      "id": "msg_12344",
      "role": "assistant",
      "content": "How can I help you today?",
      "timestamp": "2025-10-21T15:10:11Z",
      "metadata": {}
    },
    {
      "id": "msg_12345",
      "role": "user",
      "content": "How do I reset my password?",
      "timestamp": "2025-10-21T15:20:20Z",
      "attachments": []
    },
    {
      "id": "msg_12346",
      "role": "assistant",
      "content": "To reset your password, click the 'Forgot Password' link...",
      "timestamp": "2025-10-21T15:20:23Z",
      "aiGenerated": true,
      "confidence": 0.92,
      "sources": [...]
    }
  ]
}
```

#### Export Conversation

```http
GET /widget/conversations/{sessionId}/export
```

Exports conversation transcript in various formats.

**Query Parameters:**
- `format`: Export format (json, txt, pdf, csv)
- `tenantId`: Your tenant ID

**Response:**
Returns file download with appropriate content type.

### Tickets

#### Create Ticket

```http
POST /api/tickets
```

Creates a new support ticket from a widget conversation.

**Request Body:**
```json
{
  "tenantId": 456,
  "title": "Password reset issue",
  "description": "User unable to reset password using email link",
  "priority": "medium",
  "category": "account",
  "sessionId": "user_session_789",
  "userId": "user_12345",
  "metadata": {
    "source": "widget",
    "url": "https://example.com/account"
  }
}
```

**Response:**
```json
{
  "id": "TKT-2025-001",
  "tenantId": 456,
  "title": "Password reset issue",
  "status": "open",
  "priority": "medium",
  "category": "account",
  "assignedTo": null,
  "createdAt": "2025-10-21T15:25:00Z",
  "aiClassification": {
    "category": "account",
    "priority": "medium",
    "sentiment": "neutral",
    "urgency": 0.65,
    "confidence": 0.88
  }
}
```

#### Get Similar Tickets

```http
GET /api/tickets/similar
```

Finds similar tickets using vector-based similarity search.

**Query Parameters:**
- `query`: Search query text
- `tenantId`: Your tenant ID
- `limit`: Maximum number of results (default: 5)
- `threshold`: Similarity threshold 0-1 (default: 0.7)

**Response:**
```json
{
  "query": "password reset issue",
  "results": [
    {
      "ticketId": "TKT-2025-000123",
      "title": "Cannot reset password",
      "similarity": 0.89,
      "status": "resolved",
      "resolution": "User needed to check spam folder for reset email",
      "createdAt": "2025-09-15T10:00:00Z"
    },
    {
      "ticketId": "TKT-2025-000087",
      "title": "Password reset email not received",
      "similarity": 0.85,
      "status": "resolved",
      "resolution": "Updated email delivery settings",
      "createdAt": "2025-08-22T14:30:00Z"
    }
  ]
}
```

### Attachments

#### Upload Attachment

```http
POST /api/attachments/upload
```

Uploads a file attachment for use in widget conversations.

**Headers:**
- `X-API-Key`: Your API key
- `Content-Type`: multipart/form-data

**Form Data:**
- `file`: The file to upload
- `tenantId`: Your tenant ID
- `sessionId`: Session ID for the conversation
- `metadata`: Optional JSON metadata

**Response:**
```json
{
  "success": true,
  "attachment": {
    "id": "att_abc123",
    "fileName": "screenshot.png",
    "fileSize": 245678,
    "mimeType": "image/png",
    "url": "/api/attachments/att_abc123",
    "thumbnailUrl": "/api/attachments/att_abc123/thumbnail",
    "uploadedAt": "2025-10-21T15:30:00Z"
  }
}
```

#### Download Attachment

```http
GET /api/attachments/{attachmentId}
```

Downloads a specific attachment.

**Headers:**
- `X-API-Key`: Your API key

**Response:**
Returns the file with appropriate content type and headers for download.

### AI Agent Orchestration

#### Process with AI Agents

```http
POST /api/agents/process
```

Manually trigger AI agent processing for a message or ticket.

**Request Body:**
```json
{
  "tenantId": 456,
  "ticketId": "TKT-2025-001",
  "message": "I need help with billing",
  "agents": ["chat_processor", "instruction_lookup", "ticket_lookup", "ticket_formatter"],
  "showWorkflow": true
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "content": "I can help you with billing questions...",
    "confidence": 0.91,
    "workflow": [
      {
        "agent": "chat_processor",
        "status": "completed",
        "output": {
          "intent": "billing_inquiry",
          "entities": ["billing"],
          "sentiment": "neutral"
        },
        "duration": 150
      },
      {
        "agent": "instruction_lookup",
        "status": "completed",
        "output": {
          "documents": [
            {
              "id": "doc_123",
              "title": "Billing FAQ",
              "similarity": 0.92
            }
          ]
        },
        "duration": 320
      }
    ]
  }
}
```

### Vector Search

#### Search Instructions

```http
POST /api/vector/search/instructions
```

Searches instruction documents using vector similarity.

**Request Body:**
```json
{
  "tenantId": 456,
  "query": "how to cancel subscription",
  "limit": 5,
  "threshold": 0.7
}
```

**Response:**
```json
{
  "query": "how to cancel subscription",
  "results": [
    {
      "id": "inst_456",
      "title": "Subscription Cancellation Guide",
      "content": "To cancel your subscription, navigate to...",
      "similarity": 0.94,
      "metadata": {
        "category": "billing",
        "lastUpdated": "2025-09-01T00:00:00Z"
      }
    }
  ]
}
```

#### Search Chat Logs

```http
POST /api/vector/search/chats
```

Searches historical chat logs for similar conversations.

**Request Body:**
```json
{
  "tenantId": 456,
  "query": "refund request",
  "limit": 10,
  "threshold": 0.75,
  "filters": {
    "status": "resolved",
    "dateRange": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-10-21T23:59:59Z"
    }
  }
}
```

### Analytics

#### Report Widget Event

```http
POST /api/analytics/events
```

Reports a widget event for analytics and tracking.

**Request Body:**
```json
{
  "tenantId": 456,
  "sessionId": "user_session_789",
  "eventType": "widget_opened",
  "timestamp": "2025-10-21T15:10:05Z",
  "metadata": {
    "url": "https://example.com/account",
    "referrer": "https://example.com",
    "userAgent": "Mozilla/5.0...",
    "screenSize": "1920x1080",
    "deviceType": "desktop"
  }
}
```

**Event Types:**
- `widget_loaded`
- `widget_opened`
- `widget_closed`
- `message_sent`
- `message_received`
- `attachment_uploaded`
- `ticket_created`
- `conversation_started`
- `conversation_ended`

**Response:**
```json
{
  "success": true,
  "eventId": "evt_78901"
}
```

#### Get Widget Analytics

```http
GET /api/analytics/widget
```

Retrieves comprehensive analytics data for your chat widget.

**Query Parameters:**
- `tenantId`: Your tenant ID
- `startDate`: Start date (ISO 8601 format)
- `endDate`: End date (ISO 8601 format)
- `groupBy`: Group results by (hour, day, week, month)
- `metrics`: Comma-separated list of metrics to include

**Response:**
```json
{
  "tenantId": 456,
  "period": {
    "start": "2025-10-01T00:00:00Z",
    "end": "2025-10-21T23:59:59Z"
  },
  "summary": {
    "totalConversations": 1250,
    "totalMessages": 5680,
    "uniqueUsers": 987,
    "averageResponseTime": 2.3,
    "averageResolutionTime": 15.7,
    "satisfactionScore": 4.6,
    "aiResponseRate": 0.78,
    "humanHandoffRate": 0.22
  },
  "trends": {
    "conversationsGrowth": 0.12,
    "messageVolumeGrowth": 0.08,
    "satisfactionChange": 0.03
  },
  "byDay": [
    {
      "date": "2025-10-21",
      "conversations": 42,
      "messages": 186,
      "uniqueUsers": 38,
      "avgResponseTime": 2.1,
      "satisfactionScore": 4.7
    }
  ],
  "topCategories": [
    {
      "category": "account",
      "count": 340,
      "percentage": 27.2
    },
    {
      "category": "billing",
      "count": 287,
      "percentage": 23.0
    }
  ],
  "agentPerformance": {
    "chat_processor": {
      "totalProcessed": 5680,
      "averageDuration": 145,
      "successRate": 0.99
    },
    "instruction_lookup": {
      "totalProcessed": 4234,
      "averageDuration": 320,
      "averageResults": 3.2,
      "successRate": 0.87
    }
  }
}
```

## WebSocket API

For real-time communication, the Sahayaa AI Chat Widget offers a WebSocket API.

### Connection

Connect to the WebSocket server:

```
wss://your-domain.com/ws/chat?apiKey=your_api_key&tenantId=456&sessionId=user_session_789
```

### Connection Events

```javascript
const ws = new WebSocket('wss://your-domain.com/ws/chat?...');

ws.onopen = () => {
  console.log('Connected to Sahayaa AI');
};

ws.onclose = () => {
  console.log('Disconnected from Sahayaa AI');
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### Message Format

All messages use JSON format:

```json
{
  "type": "message|status|notification|agent_update",
  "payload": {},
  "timestamp": "2025-10-21T15:30:45Z"
}
```

### Client to Server Messages

#### Send User Message

```json
{
  "type": "message",
  "payload": {
    "sessionId": "user_session_789",
    "content": "When will my order arrive?",
    "metadata": {
      "url": "https://example.com/orders"
    }
  }
}
```

#### Send Typing Indicator

```json
{
  "type": "status",
  "payload": {
    "action": "typing",
    "isTyping": true
  }
}
```

### Server to Client Messages

#### Assistant Response

```json
{
  "type": "message",
  "payload": {
    "sessionId": "user_session_789",
    "content": "Your order #12345 is scheduled to arrive tomorrow between 2-4 PM.",
    "messageId": "msg_23456",
    "source": "ai",
    "confidence": 0.89,
    "sources": [
      {
        "type": "instruction",
        "title": "Order Tracking Guide",
        "similarity": 0.91
      }
    ]
  },
  "timestamp": "2025-10-21T15:30:47Z"
}
```

#### Agent Processing Update

```json
{
  "type": "agent_update",
  "payload": {
    "sessionId": "user_session_789",
    "agent": "instruction_lookup",
    "status": "processing",
    "progress": 0.6,
    "message": "Searching knowledge base..."
  },
  "timestamp": "2025-10-21T15:30:46Z"
}
```

#### Typing Indicator

```json
{
  "type": "status",
  "payload": {
    "sessionId": "user_session_789",
    "action": "typing",
    "isTyping": true
  },
  "timestamp": "2025-10-21T15:30:46Z"
}
```

#### Human Agent Joined

```json
{
  "type": "notification",
  "payload": {
    "sessionId": "user_session_789",
    "notificationType": "agent_joined",
    "message": "Sarah from support has joined the conversation.",
    "agentId": 789,
    "agentName": "Sarah",
    "agentAvatar": "/avatars/sarah.jpg"
  },
  "timestamp": "2025-10-21T15:32:10Z"
}
```

## Error Handling

The API uses standard HTTP status codes:

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request format or parameters |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Valid API key but insufficient permissions |
| 404 | Not Found | Resource not found |
| 413 | Payload Too Large | File upload exceeds size limit |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

```json
{
  "error": {
    "code": "invalid_parameter",
    "message": "The 'tenantId' parameter is required",
    "field": "tenantId",
    "documentation_url": "https://docs.sahayaa-ai.com/api/errors#invalid_parameter",
    "requestId": "req_abc123"
  }
}
```

### Common Error Codes

- `invalid_api_key`: API key is missing or invalid
- `insufficient_permissions`: API key lacks required permissions
- `invalid_parameter`: Request parameter is invalid
- `resource_not_found`: Requested resource doesn't exist
- `rate_limit_exceeded`: Too many requests in time window
- `file_too_large`: Uploaded file exceeds size limit
- `unsupported_file_type`: File type not allowed
- `tenant_inactive`: Tenant account is inactive or suspended
- `service_unavailable`: Microservice temporarily unavailable

## Rate Limits

API requests are subject to rate limiting based on your plan:

| Plan | REST API | WebSocket | File Uploads |
|------|----------|-----------|--------------|
| Free | 100/min | 5 concurrent | 10/hour |
| Basic | 500/min | 25 concurrent | 50/hour |
| Pro | 2000/min | 100 concurrent | 200/hour |
| Enterprise | Custom | Custom | Custom |

### Rate Limit Headers

```http
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1698765432
Retry-After: 45
```

## Webhooks

Configure webhooks to receive real-time notifications about events.

### Setup

Configure webhook URLs in your admin dashboard under Settings > Webhooks.

### Webhook Events

- `conversation.started`
- `conversation.ended`
- `message.received`
- `ticket.created`
- `ticket.updated`
- `ticket.resolved`
- `agent.handoff`
- `file.uploaded`

### Webhook Payload

```json
{
  "event": "ticket.created",
  "timestamp": "2025-10-21T15:40:00Z",
  "data": {
    "ticketId": "TKT-2025-001",
    "tenantId": 456,
    "title": "Password reset issue",
    "priority": "medium",
    "category": "account"
  },
  "signature": "sha256=abc123..."
}
```

### Webhook Signature Verification

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

## SDKs and Client Libraries

Sahayaa AI offers official SDKs:

- **JavaScript/TypeScript**: `npm install sahayaa-ai-sdk`
- **Python**: `pip install sahayaa-ai`
- **PHP**: `composer require sahayaa-ai/sdk`
- **Ruby**: `gem install sahayaa-ai`
- **Go**: `go get github.com/sahayaa-ai/go-sdk`

### JavaScript SDK Example

```javascript
import SahayaaAI from 'sahayaa-ai-sdk';

const client = new SahayaaAI({
  apiKey: 'your_api_key',
  tenantId: 456
});

// Send a message
const response = await client.messages.send({
  sessionId: 'user_session_789',
  message: 'Hello, I need help',
  userId: 'user_12345'
});

// Search for similar tickets
const similar = await client.tickets.findSimilar({
  query: 'password reset',
  limit: 5
});

// Upload attachment
const attachment = await client.attachments.upload({
  file: fileObject,
  sessionId: 'user_session_789'
});
```

## Testing

### Sandbox Environment

Use your sandbox credentials for testing:

```
Base URL: https://sandbox.sahayaa-ai.com/api
API Key: sahayaa_wk_test_*
```

### Test Data

The sandbox includes test data:
- 100+ pre-loaded instructions
- 500+ historical tickets
- Sample conversations
- Test user accounts

## Best Practices

### Performance

1. **Use WebSockets** for real-time conversations
2. **Implement caching** for configuration and frequently accessed data
3. **Batch requests** when possible
4. **Use pagination** for large result sets
5. **Compress uploads** before sending large files

### Security

1. **Never expose API keys** in client-side code
2. **Use HTTPS** for all requests
3. **Validate webhook signatures** before processing
4. **Implement rate limiting** on your end
5. **Rotate API keys** regularly

### Reliability

1. **Implement retry logic** with exponential backoff
2. **Handle webhook failures** gracefully
3. **Monitor error rates** and set up alerts
4. **Cache responses** when appropriate
5. **Use health check endpoints** to verify service status

## Additional Resources

- [Full API Reference](https://docs.sahayaa-ai.com/api)
- [Widget Configuration Guide](https://docs.sahayaa-ai.com/widget/configuration)
- [AI Agent System Documentation](https://docs.sahayaa-ai.com/agents)
- [Vector Search Guide](https://docs.sahayaa-ai.com/vector-search)
- [Authentication and Security](https://docs.sahayaa-ai.com/api/security)
- [Sample Applications](https://github.com/sahayaa-ai/widget-demos)
- [API Changelog](https://docs.sahayaa-ai.com/api/changelog)
- [Postman Collection](https://www.postman.com/sahayaa-ai/workspace/sahayaa-api)

---

For questions or support, please contact our API team at api-support@sahayaa-ai.com.

*Last updated: October 21, 2025*
