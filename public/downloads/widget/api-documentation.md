# Support AI Chat Widget API Documentation

## Overview

The Support AI Chat Widget API allows you to integrate the Support AI chat functionality directly into your website or application. This document provides technical details on endpoints, methods, and integration options.

## Authentication

All API requests require authentication using your Support AI API key. You can find or generate this key in your Support AI admin dashboard under Settings > API Keys.

Include your API key in all requests using the `X-API-Key` header:

```
X-API-Key: your_api_key_here
```

## Base URL

All API endpoints use the following base URL:

```
https://api.support.ai/v1
```

## Endpoints

### Widget Configuration

#### Get Widget Configuration

```
GET /widget/config/{tenantId}
```

Retrieves the current widget configuration for the specified tenant.

**Parameters:**
- `tenantId` (path): Your tenant ID

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
  "createdAt": "2025-01-15T12:34:56Z",
  "updatedAt": "2025-03-22T10:11:12Z"
}
```

#### Update Widget Configuration

```
PUT /widget/config/{tenantId}
```

Updates the widget configuration for the specified tenant.

**Parameters:**
- `tenantId` (path): Your tenant ID

**Request Body:**
```json
{
  "primaryColor": "#FF5500",
  "position": "left",
  "greetingMessage": "Welcome! Need assistance?",
  "autoOpen": true,
  "branding": false,
  "reportData": true
}
```

**Response:**
```json
{
  "id": 123,
  "tenantId": 456,
  "primaryColor": "#FF5500",
  "position": "left",
  "greetingMessage": "Welcome! Need assistance?",
  "autoOpen": true,
  "branding": false,
  "reportData": true,
  "createdAt": "2025-01-15T12:34:56Z",
  "updatedAt": "2025-04-03T15:16:17Z"
}
```

### Messages

#### Send Message

```
POST /widget/messages
```

Sends a message from the chat widget to the Support AI system.

**Request Body:**
```json
{
  "tenantId": 456,
  "sessionId": "user_session_789",
  "message": "How do I reset my password?",
  "metadata": {
    "url": "https://example.com/account",
    "browser": "Chrome",
    "os": "Windows"
  }
}
```

**Response:**
```json
{
  "id": "msg_12345",
  "tenantId": 456,
  "sessionId": "user_session_789",
  "message": "How do I reset my password?",
  "response": "To reset your password, please click on the 'Forgot Password' link on the login page. You'll receive an email with instructions to create a new password.",
  "aiGenerated": true,
  "createdAt": "2025-04-03T15:20:23Z"
}
```

#### Get Conversation History

```
GET /widget/conversations/{sessionId}
```

Retrieves the conversation history for a specific session.

**Parameters:**
- `sessionId` (path): The unique session identifier
- `tenantId` (query): Your tenant ID

**Response:**
```json
{
  "sessionId": "user_session_789",
  "tenantId": 456,
  "startedAt": "2025-04-03T15:10:11Z",
  "lastMessageAt": "2025-04-03T15:20:23Z",
  "messages": [
    {
      "id": "msg_12344",
      "role": "system",
      "content": "How can I help you today?",
      "timestamp": "2025-04-03T15:10:11Z"
    },
    {
      "id": "msg_12345",
      "role": "user",
      "content": "How do I reset my password?",
      "timestamp": "2025-04-03T15:20:20Z"
    },
    {
      "id": "msg_12346",
      "role": "assistant",
      "content": "To reset your password, please click on the 'Forgot Password' link on the login page. You'll receive an email with instructions to create a new password.",
      "timestamp": "2025-04-03T15:20:23Z"
    }
  ]
}
```

### Analytics

#### Report Widget Event

```
POST /widget/analytics/events
```

Reports a widget event for analytics purposes.

**Request Body:**
```json
{
  "tenantId": 456,
  "sessionId": "user_session_789",
  "eventType": "widget_opened",
  "timestamp": "2025-04-03T15:10:05Z",
  "metadata": {
    "url": "https://example.com/account",
    "referrer": "https://example.com",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "screenSize": "1920x1080"
  }
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "evt_78901"
}
```

#### Get Widget Analytics

```
GET /widget/analytics
```

Retrieves analytics data for your chat widget.

**Parameters:**
- `tenantId` (query): Your tenant ID
- `startDate` (query): Start date (ISO 8601 format)
- `endDate` (query): End date (ISO 8601 format)
- `groupBy` (query, optional): Group results by (day, week, month)

**Response:**
```json
{
  "tenantId": 456,
  "startDate": "2025-03-01T00:00:00Z",
  "endDate": "2025-04-03T23:59:59Z",
  "total": {
    "conversations": 1250,
    "messages": 5680,
    "uniqueUsers": 987
  },
  "byDay": [
    {
      "date": "2025-04-03",
      "conversations": 42,
      "messages": 186,
      "uniqueUsers": 38
    },
    {
      "date": "2025-04-02",
      "conversations": 39,
      "messages": 175,
      "uniqueUsers": 35
    }
    // Additional days...
  ]
}
```

## WebSocket API

For real-time communication, the Support AI Chat Widget offers a WebSocket API.

### Connection

Connect to the WebSocket server:

```
wss://ws.support.ai/v1/chat?apiKey=your_api_key&tenantId=456
```

### Message Format

All messages exchanged over the WebSocket connection use the following JSON format:

```json
{
  "type": "message|status|notification",
  "payload": {
    // Message-specific data
  },
  "timestamp": "2025-04-03T15:30:45Z"
}
```

### Events

#### User Message

**Client to Server**
```json
{
  "type": "message",
  "payload": {
    "sessionId": "user_session_789",
    "content": "When will my order arrive?",
    "metadata": {
      "url": "https://example.com/orders"
    }
  },
  "timestamp": "2025-04-03T15:30:45Z"
}
```

#### Assistant Response

**Server to Client**
```json
{
  "type": "message",
  "payload": {
    "sessionId": "user_session_789",
    "content": "Your order #12345 is scheduled to arrive tomorrow between 2-4 PM. Would you like to receive SMS notifications about your delivery?",
    "messageId": "msg_23456",
    "source": "ai"
  },
  "timestamp": "2025-04-03T15:30:47Z"
}
```

#### Typing Indicator

**Server to Client**
```json
{
  "type": "status",
  "payload": {
    "sessionId": "user_session_789",
    "action": "typing",
    "isTyping": true
  },
  "timestamp": "2025-04-03T15:30:46Z"
}
```

#### Human Agent Intervention

**Server to Client**
```json
{
  "type": "notification",
  "payload": {
    "sessionId": "user_session_789",
    "notificationType": "agent_joined",
    "message": "Sarah from support has joined the conversation.",
    "agentId": 789,
    "agentName": "Sarah"
  },
  "timestamp": "2025-04-03T15:32:10Z"
}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid request format or parameters
- `401 Unauthorized`: Missing or invalid API key
- `403 Forbidden`: Valid API key but insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

Error responses include a JSON object with more details:

```json
{
  "error": {
    "code": "invalid_parameter",
    "message": "The 'tenantId' parameter is required",
    "documentation_url": "https://docs.support.ai/api/errors#invalid_parameter"
  }
}
```

## Rate Limits

API requests are subject to rate limiting:

- 100 requests per minute per API key for REST API endpoints
- 10 connections per minute per API key for WebSocket connections

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response with a `Retry-After` header indicating the number of seconds to wait before retrying.

## SDKs and Client Libraries

Support AI offers client libraries for easy integration:

- JavaScript: [npm package](https://www.npmjs.com/package/support-ai-widget)
- React: [React component](https://www.npmjs.com/package/support-ai-widget-react)
- PHP: [Composer package](https://packagist.org/packages/support-ai/widget-sdk)
- Ruby: [Ruby gem](https://rubygems.org/gems/support-ai-widget)
- Python: [PyPI package](https://pypi.org/project/support-ai-widget/)

## Testing

For testing purposes, use your sandbox tenant and API key, available in the Support AI admin dashboard under Settings > API Keys > Sandbox.

Sandbox environment base URL:
```
https://sandbox-api.support.ai/v1
```

## Additional Resources

- [Full API Reference](https://docs.support.ai/api)
- [Widget Configuration Guide](https://docs.support.ai/widget/configuration)
- [Authentication and Security](https://docs.support.ai/api/security)
- [Sample Applications](https://github.com/support-ai/widget-demos)
- [API Changelog](https://docs.support.ai/api/changelog)

---

For any questions or support, please contact our API team at api-support@support.ai.

*Last updated: April 3, 2025*