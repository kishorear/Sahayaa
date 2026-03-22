# Chat Widget Agent Integration Guide

## Overview

This guide provides complete instructions for integrating the Support AI Chat Widget with the agent-based backend system. The widget now supports full agent workflow processing with intelligent ticket creation and resolution.

## Available Endpoints

### 1. Agent Workflow Endpoint (Complete Processing)
**Endpoint**: `POST /api/agent/workflow`

This endpoint processes user messages through the complete agent workflow system, providing intelligent ticket classification, auto-resolution attempts, and context-aware responses.

**Request Format**:
```json
{
  "tenantId": 1,
  "adminId": 16,
  "apiKey": "your_widget_api_key",
  "user_message": "I'm having trouble with my login",
  "user_context": {
    "url": "https://yoursite.com/login",
    "title": "Login Page",
    "userAgent": "Mozilla/5.0...",
    "timestamp": "2025-06-05T22:30:00Z"
  },
  "sessionId": "unique_session_id"
}
```

**Response Format**:
```json
{
  "success": true,
  "ticket_id": 123,
  "ticket_title": "Login Authentication Issue",
  "status": "processed",
  "category": "technical",
  "urgency": "medium",
  "resolution_steps": [
    "Check your username and password",
    "Clear browser cache and cookies",
    "Try using an incognito window"
  ],
  "resolution_steps_count": 3,
  "confidence_score": 0.85,
  "processing_time_ms": 1250,
  "created_at": "2025-06-05T22:30:15Z",
  "source": "widget",
  "message": "I've analyzed your login issue and created a support ticket..."
}
```

### 2. Simple Message Processing Endpoint
**Endpoint**: `POST /api/widget/process_message`

This endpoint provides quick agent responses without full ticket creation workflow.

**Request Format**:
```json
{
  "tenantId": 1,
  "message": "How do I reset my password?",
  "context": {
    "url": "https://yoursite.com/account",
    "title": "Account Settings",
    "sessionId": "unique_session_id"
  },
  "apiKey": "your_widget_api_key"
}
```

**Response Format**:
```json
{
  "response": "To reset your password, go to the login page and click 'Forgot Password'...",
  "confidence": 0.92,
  "processing_time_ms": 850,
  "suggested_actions": [
    {
      "type": "view_docs",
      "label": "View Password Reset Guide",
      "message": "Can you show me the password reset documentation?"
    }
  ],
  "session_id": "unique_session_id"
}
```

### 3. Legacy Chat Endpoint (Existing)
**Endpoint**: `POST /api/widget/chat`

Standard chat endpoint for basic AI responses without agent processing.

## Configuration Steps

### Step 1: Set Widget Identifiers

Ensure your chat widget configuration includes the correct identifiers:

```javascript
window.supportAiConfig = {
  tenantId: 1,           // Your tenant ID
  adminId: 16,           // Admin user ID
  apiKey: "your_api_key", // Widget API key
  primaryColor: "#4F46E5",
  position: "right",
  greetingMessage: "Hello! How can I help you today?",
  autoOpen: false,
  branding: true,
  reportData: true
};
```

### Step 2: Configure API Endpoints

Update your widget JavaScript to use the agent endpoints:

```javascript
// For complete agent workflow processing
async function sendToAgentWorkflow(message, context) {
  const response = await fetch('/api/agent/workflow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenantId: window.supportAiConfig.tenantId,
      adminId: window.supportAiConfig.adminId,
      apiKey: window.supportAiConfig.apiKey,
      user_message: message,
      user_context: {
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ...context
      },
      sessionId: getOrCreateSessionId()
    })
  });
  
  return await response.json();
}

// For simple message processing
async function sendToSimpleProcessor(message, context) {
  const response = await fetch('/api/widget/process_message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenantId: window.supportAiConfig.tenantId,
      message: message,
      context: {
        url: window.location.href,
        title: document.title,
        sessionId: getOrCreateSessionId(),
        ...context
      },
      apiKey: window.supportAiConfig.apiKey
    })
  });
  
  return await response.json();
}
```

### Step 3: CORS Configuration

The backend is pre-configured with CORS settings that allow cross-origin requests:

- **Widget endpoints** (`/api/widget/*`, `/api/agent/*`): Allow requests from any origin
- **Standard headers**: Content-Type, Authorization, X-API-Key
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Preflight handling**: Automatic OPTIONS request handling

No additional CORS configuration is needed on your website.

### Step 4: API Key Management

1. Generate a widget API key in the admin panel:
   - Go to Settings → Chat Widget → API Keys
   - Click "Generate New Key"
   - Copy the generated key to your widget configuration

2. Validate API key access:
   - Each request is validated against your tenant's API keys
   - Inactive or invalid keys will return 401 Unauthorized
   - Monitor key usage in the analytics dashboard

### Step 5: Error Handling

Implement proper error handling for agent communication:

```javascript
async function handleAgentResponse(message, context) {
  try {
    const response = await sendToAgentWorkflow(message, context);
    
    if (response.success) {
      // Handle successful agent processing
      displayAgentResponse(response);
      
      // Show ticket creation confirmation if applicable
      if (response.ticket_id) {
        showTicketCreated(response.ticket_id, response.ticket_title);
      }
      
      // Display suggested actions
      if (response.resolution_steps?.length > 0) {
        showResolutionSteps(response.resolution_steps);
      }
    } else {
      // Handle agent processing errors
      console.error('Agent processing failed:', response.error);
      fallbackToSimpleChat(message, context);
    }
  } catch (error) {
    console.error('Agent communication error:', error);
    showErrorMessage('Unable to process your request. Please try again.');
  }
}

async function fallbackToSimpleChat(message, context) {
  try {
    const response = await sendToSimpleProcessor(message, context);
    displaySimpleResponse(response);
  } catch (error) {
    console.error('Fallback chat failed:', error);
    showErrorMessage('Chat service temporarily unavailable.');
  }
}
```

## Testing the Integration

### 1. Basic Connectivity Test

```bash
curl -X POST "https://your-backend-domain.com/api/agent/workflow" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": 1,
    "apiKey": "your_api_key",
    "user_message": "Test message",
    "sessionId": "test_session"
  }'
```

### 2. CORS Test

Test cross-origin requests from your website's domain:

```javascript
fetch('https://your-backend-domain.com/api/widget/process_message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tenantId: 1,
    message: 'CORS test',
    apiKey: 'your_api_key'
  })
})
.then(response => response.json())
.then(data => console.log('CORS test successful:', data))
.catch(error => console.error('CORS test failed:', error));
```

### 3. Agent Workflow Test

Send a complex support request to test the complete agent workflow:

```javascript
const testAgentWorkflow = async () => {
  const response = await sendToAgentWorkflow(
    "I can't access my account and I'm getting error code 500 when I try to login",
    { 
      url: 'https://yoursite.com/login',
      errorCode: '500'
    }
  );
  
  console.log('Agent workflow result:', response);
  
  // Should return ticket creation, classification, and resolution steps
};
```

## Analytics and Monitoring

The system automatically tracks:
- Widget interaction counts
- Agent processing times
- Ticket creation rates
- API key usage statistics
- Error rates and types

Access analytics in the admin dashboard under Settings → Chat Widget → Analytics.

## Security Considerations

1. **API Key Protection**: Never expose API keys in client-side code for production
2. **Domain Restrictions**: Configure allowed domains for widget API keys
3. **Rate Limiting**: Monitor for unusual usage patterns
4. **Error Logging**: Implement proper error logging without exposing sensitive data

## Support

For technical support with agent integration:
1. Check the API documentation in your admin panel
2. Review error logs in the backend console
3. Test individual endpoints using the provided curl commands
4. Monitor agent service health in the admin dashboard

## Advanced Configuration

### Custom Agent Behavior

You can customize agent responses by configuring:
- Confidence thresholds for ticket creation
- Auto-resolution attempt parameters
- Context enrichment settings
- Resolution step formatting

Access these settings in Settings → AI Settings → Agent Configuration.

### Multi-Tenant Setup

For multi-tenant deployments:
- Each tenant has isolated agent processing
- API keys are tenant-specific
- Analytics are segregated by tenant
- Configuration is tenant-scoped

### Integration with External Systems

The agent endpoints support integration with:
- CRM systems via webhook notifications
- Email systems for ticket notifications
- Knowledge bases for enhanced context
- Third-party analytics platforms