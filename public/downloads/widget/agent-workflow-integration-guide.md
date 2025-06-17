# Agent Workflow Integration Guide

## Overview

The Support AI Chat Widget now includes advanced agent workflow integration that provides comprehensive multi-agent processing for customer support requests. This guide explains how to leverage these enhanced capabilities in your implementation.

## Agent Workflow Architecture

### Multi-Agent Processing

The widget now connects to a sophisticated agent orchestration system that includes:

- **Chat Processor Agent**: Analyzes and preprocesses user messages
- **Instruction Lookup Agent**: Searches knowledge base for relevant instructions
- **Ticket Lookup Agent**: Finds similar historical tickets
- **Ticket Formatter Agent**: Structures responses and ticket creation
- **Support Team Orchestrator**: Coordinates all agents for optimal responses

### Enhanced Response Format

Responses now include comprehensive resolution steps, confidence scoring, and automatic ticket creation:

```javascript
{
  "success": true,
  "ticket_id": 1234,
  "ticket_title": "Network Connectivity Issue",
  "status": "open",
  "category": "technical",
  "urgency": "high",
  "resolution_steps": [
    "I understand you're experiencing network connectivity issues.",
    "Let's start by checking your network adapter settings.",
    "Go to Network Settings > Change Adapter Options",
    "Right-click your network adapter and select Properties"
  ],
  "resolution_steps_count": 4,
  "confidence_score": 0.89,
  "processing_time_ms": 1850,
  "created_at": "2025-06-17T23:30:01.250Z",
  "source": "widget"
}
```

## Configuration for Agent Workflow

### Basic Configuration

```html
<script>
  window.supportAiConfig = {
    tenantId: YOUR_TENANT_ID,
    apiKey: "YOUR_API_KEY",
    primaryColor: "#6366F1",
    position: "right",
    requireAuth: true,
    greetingMessage: "How can I help you today?",
    
    // Agent workflow specific settings
    enableAgentWorkflow: true,
    showConfidenceScore: false,  // Set to true to show confidence in console
    enableTicketCreation: true,
    showProcessingTime: false    // Set to true for performance monitoring
  };
</script>
```

### Advanced Analytics Configuration

Enable enhanced event tracking for agent workflow metrics:

```javascript
window.supportAiConfig = {
  // ... other config
  reportData: true,
  analyticsLevel: "detailed", // "basic" | "detailed" | "full"
  trackAgentMetrics: true,
  trackConfidenceScores: true,
  trackProcessingTimes: true
};
```

## Event Handling

### Agent Response Events

The widget now fires enhanced events for agent workflow responses:

```javascript
// Listen for agent response events
window.addEventListener('supportAiAgentResponse', function(event) {
  const response = event.detail;
  
  console.log('Agent Response:', {
    ticketId: response.ticket_id,
    confidence: response.confidence_score,
    category: response.category,
    urgency: response.urgency,
    processingTime: response.processing_time_ms
  });
  
  // Handle high-confidence responses
  if (response.confidence_score > 0.8) {
    console.log('High-confidence response received');
  }
  
  // Handle urgent tickets
  if (response.urgency === 'high') {
    console.log('High-urgency ticket created:', response.ticket_id);
  }
});
```

### Custom Event Callbacks

```javascript
window.supportAiConfig = {
  // ... other config
  onAgentResponse: function(response) {
    // Custom handling for agent responses
    if (response.ticket_id) {
      // Integrate with your ticketing system
      integrateWithMyTicketingSystem(response.ticket_id);
    }
  },
  
  onHighConfidenceResponse: function(response) {
    // Handle high-confidence responses
    if (response.confidence_score > 0.9) {
      displaySuccessIndicator();
    }
  },
  
  onTicketCreated: function(ticketData) {
    // Handle ticket creation
    notifyUserOfTicketCreation(ticketData.ticket_id);
  }
};
```

## Knowledge Base Integration

### Instruction Document Processing

The agent workflow automatically searches your uploaded instruction documents:

- Supports .txt, .pdf, .docx, .pptx, .xlsx files
- Uses vector similarity search for relevant content
- Incorporates found instructions into response generation

### Similar Ticket Lookup

The system automatically finds similar historical tickets:

- Searches ticket history for similar issues
- Uses AI-powered similarity matching
- Incorporates solutions from resolved tickets

## Performance Monitoring

### Processing Time Tracking

Monitor agent workflow performance:

```javascript
window.supportAiConfig = {
  showProcessingTime: true,
  onSlowResponse: function(processingTime) {
    if (processingTime > 3000) {
      console.warn('Slow agent response:', processingTime + 'ms');
    }
  }
};
```

### Confidence Score Monitoring

Track AI confidence for quality assurance:

```javascript
window.supportAiConfig = {
  showConfidenceScore: true,
  onLowConfidenceResponse: function(response) {
    if (response.confidence_score < 0.6) {
      console.warn('Low confidence response:', response.confidence_score);
      // Maybe escalate to human agent
    }
  }
};
```

## Error Handling and Fallbacks

### Agent Workflow Unavailable

The widget includes fallback mechanisms when agent services are unavailable:

```javascript
window.supportAiConfig = {
  enableFallbackMode: true,
  fallbackMessage: "Our advanced AI is temporarily unavailable. You can still chat with our basic support system.",
  onAgentWorkflowFailure: function(error) {
    console.warn('Agent workflow failed, using fallback:', error);
    // Implement custom fallback logic
  }
};
```

### Progressive Enhancement

The widget automatically detects agent workflow availability:

1. **Full Agent Workflow**: Complete multi-agent processing
2. **Basic AI Mode**: Simple AI responses without agent coordination
3. **Fallback Mode**: Basic chat functionality

## Best Practices

### 1. Authentication Integration

Always use authentication for agent workflow benefits:

```javascript
window.supportAiConfig = {
  requireAuth: true,  // Enables user context for agents
  authProvider: "your-auth-system"
};
```

### 2. Context Enhancement

Provide rich context for better agent processing:

```javascript
// Add custom context before initializing widget
window.supportAiConfig = {
  customContext: {
    userType: "premium",
    accountTier: "enterprise",
    currentPage: "checkout",
    previousActions: ["viewed-product", "added-to-cart"]
  }
};
```

### 3. Response Customization

Customize how agent responses are displayed:

```javascript
window.supportAiConfig = {
  formatResolutionSteps: function(steps) {
    return steps.map((step, index) => 
      `Step ${index + 1}: ${step}`
    );
  },
  
  showTicketInfo: true,  // Display ticket creation info
  showCategoryBadges: true,  // Show category/urgency badges
  enableStepByStep: true  // Show resolution steps incrementally
};
```

## Troubleshooting

### Common Issues

1. **No Agent Response**: Check API key and tenant ID configuration
2. **Low Confidence Scores**: Review instruction documents and knowledge base
3. **Slow Processing**: Monitor network connectivity and server response times
4. **Authentication Errors**: Verify user credentials and auth configuration

### Debug Mode

Enable debug mode for detailed logging:

```javascript
window.supportAiConfig = {
  debugMode: true,
  logLevel: "verbose"  // "basic" | "detailed" | "verbose"
};
```

## Migration from Basic Widget

### Updating Existing Integration

1. Replace `api/chatbot` endpoint references with `api/agents/process`
2. Update response handling for new format
3. Add agent workflow configuration options
4. Test authentication flow with new endpoints

### Backward Compatibility

The widget maintains backward compatibility with older configurations while providing enhanced features when agent workflow is available.

---

For additional support with agent workflow integration, refer to the main API documentation or contact Support AI technical support.