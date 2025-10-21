# Sahayaa AI Agent Workflow Integration Guide

## Overview

The Sahayaa AI Chat Widget features an advanced multi-agent orchestration system powered by MCP (Model Context Protocol) that provides intelligent, context-aware customer support. This guide explains how to leverage these capabilities in your implementation.

## Agent Workflow Architecture

### Microservices-Based Design

Sahayaa AI operates on a distributed microservices architecture:

1. **Main Application** (Node.js/Express): Frontend, authentication, session management
2. **Agent Orchestrator Service** (Python/FastAPI): AI workflow coordination and multi-agent processing
3. **Data Service**: PostgreSQL database operations and JSON API responses
4. **Vector Storage Service**: ChromaDB with Google AI embeddings for RAG and similarity search

### Multi-Agent Processing Pipeline

The system employs specialized AI agents that work together:

#### 1. Chat Processor Agent
- **Purpose**: Analyzes and preprocesses user messages
- **Functions**:
  - Intent extraction
  - Entity recognition
  - Sentiment analysis
  - Language detection
  - Topic classification

#### 2. Instruction Lookup Agent
- **Purpose**: Searches knowledge base for relevant instructions
- **Functions**:
  - Vector similarity search using ChromaDB
  - Embedding generation with Google AI
  - Multi-tenant document filtering
  - Confidence scoring
  - Source attribution

#### 3. Ticket Lookup Agent
- **Purpose**: Finds similar historical tickets
- **Functions**:
  - Vector-based ticket similarity search
  - Historical resolution analysis
  - Success pattern identification
  - Context-aware matching

#### 4. Ticket Formatter Agent
- **Purpose**: Structures responses and manages ticket creation
- **Functions**:
  - Response formatting
  - Resolution step generation
  - Ticket metadata creation
  - Priority and category assignment

#### 5. Support Team Orchestrator
- **Purpose**: Coordinates all agents for optimal responses
- **Functions**:
  - Agent workflow coordination
  - Decision routing
  - Quality assurance
  - Performance monitoring

### MCP Integration

The agent workflow uses Model Context Protocol for:
- Standardized tool definitions
- Consistent agent communication
- Resource discovery and access
- Enhanced context management
- Multi-provider AI support (OpenAI, Google AI, Anthropic, AWS Bedrock)

## Enhanced Response Format

Agent responses include comprehensive data:

```json
{
  "success": true,
  "ticket_id": "TKT-2025-001",
  "ticket_title": "Network Connectivity Issue",
  "status": "open",
  "category": "technical",
  "priority": "high",
  "urgency": "high",
  "sentiment": "frustrated",
  "resolution_steps": [
    "I understand you're experiencing network connectivity issues.",
    "Let's troubleshoot this step by step.",
    "First, check your network adapter settings:",
    "1. Go to Network Settings > Change Adapter Options",
    "2. Right-click your network adapter and select Properties",
    "3. Ensure TCP/IPv4 is enabled",
    "If the issue persists, restart your network adapter."
  ],
  "resolution_steps_count": 7,
  "confidence_score": 0.92,
  "ai_provider": "openai",
  "model": "gpt-4",
  "sources": [
    {
      "type": "instruction",
      "id": "inst_456",
      "title": "Network Troubleshooting Guide",
      "similarity": 0.89,
      "excerpt": "To resolve network connectivity issues..."
    },
    {
      "type": "ticket",
      "id": "TKT-2025-000123",
      "title": "Similar network issue",
      "similarity": 0.85,
      "resolution": "Restarting adapter resolved the issue"
    }
  ],
  "agent_workflow": [
    {
      "agent": "chat_processor",
      "status": "completed",
      "duration_ms": 145,
      "output": {
        "intent": "troubleshoot_network",
        "sentiment": "frustrated",
        "urgency": 0.82
      }
    },
    {
      "agent": "instruction_lookup",
      "status": "completed",
      "duration_ms": 320,
      "results_found": 3,
      "top_similarity": 0.89
    },
    {
      "agent": "ticket_lookup",
      "status": "completed",
      "duration_ms": 280,
      "results_found": 5,
      "top_similarity": 0.85
    },
    {
      "agent": "ticket_formatter",
      "status": "completed",
      "duration_ms": 200
    }
  ],
  "processing_time_ms": 945,
  "created_at": "2025-10-21T15:30:01.250Z",
  "source": "widget",
  "tenant_id": 456,
  "user_id": "user_12345"
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
    greetingMessage: "How can I help you today?",
    
    // Agent workflow settings
    enableAIAgents: true,
    enableAttachments: true,
    showBehindTheScenes: false,  // Show agent processing steps
    showConfidenceScore: false,  // Display confidence in UI
    enableTicketCreation: true,
    showProcessingTime: false,    // Performance monitoring
    
    // AI provider preferences (optional)
    aiProvider: "openai",  // "openai", "google", "anthropic", "bedrock"
    enableMultiProvider: true  // Fallback to other providers if primary fails
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
  trackProcessingTimes: true,
  trackVectorSimilarity: true,
  trackAIProviderUsage: true
};
```

### Vector Search Configuration

Customize vector search behavior:

```javascript
window.supportAiConfig = {
  vectorSearch: {
    enabled: true,
    similarityThreshold: 0.7,  // 0.0 - 1.0
    maxResults: 5,
    searchInstructions: true,
    searchTickets: true,
    searchChats: true
  }
};
```

## Event Handling

### Agent Response Events

Listen for comprehensive agent workflow events:

```javascript
// Agent response received
window.addEventListener('sahayaa:agentResponse', function(event) {
  const response = event.detail;
  
  console.log('Agent Response:', {
    ticketId: response.ticket_id,
    confidence: response.confidence_score,
    category: response.category,
    priority: response.priority,
    processingTime: response.processing_time_ms,
    aiProvider: response.ai_provider
  });
  
  // Handle high-confidence responses
  if (response.confidence_score > 0.85) {
    console.log('High-confidence response received');
  }
  
  // Handle urgent tickets
  if (response.priority === 'high') {
    console.log('High-priority ticket created:', response.ticket_id);
    // Notify relevant team members
  }
});

// Individual agent processing updates
window.addEventListener('sahayaa:agentProcessing', function(event) {
  const { agent, status, progress } = event.detail;
  console.log(`Agent ${agent} is ${status}`, progress);
});

// Vector search results
window.addEventListener('sahayaa:vectorSearchComplete', function(event) {
  const { results, query, topSimilarity } = event.detail;
  console.log(`Found ${results.length} similar documents`);
  console.log(`Top similarity: ${topSimilarity}`);
});

// AI provider events
window.addEventListener('sahayaa:aiProviderSwitch', function(event) {
  const { from, to, reason } = event.detail;
  console.log(`Switched AI provider from ${from} to ${to}: ${reason}`);
});
```

### Custom Event Callbacks

```javascript
window.supportAiConfig = {
  // ... other config
  
  onAgentResponse: function(response) {
    // Custom handling for agent responses
    if (response.ticket_id) {
      integrateWithTicketingSystem(response.ticket_id);
    }
    
    // Track in analytics
    trackAgentPerformance({
      confidence: response.confidence_score,
      processingTime: response.processing_time_ms,
      category: response.category
    });
  },
  
  onHighConfidenceResponse: function(response) {
    // Handle high-confidence responses
    if (response.confidence_score > 0.9) {
      displaySuccessIndicator();
      considerAutoResolving(response);
    }
  },
  
  onLowConfidenceResponse: function(response) {
    // Escalate to human agent
    if (response.confidence_score < 0.6) {
      escalateToHumanAgent(response);
    }
  },
  
  onTicketCreated: function(ticketData) {
    // Handle ticket creation
    notifyUserOfTicketCreation(ticketData.ticket_id);
    updateDashboard(ticketData);
  },
  
  onVectorSearchResults: function(results) {
    // Custom handling for similarity search results
    displaySimilarDocuments(results);
  },
  
  onAttachmentUploaded: function(attachment) {
    // Handle file upload completion
    console.log('Attachment uploaded:', attachment.fileName);
  }
};
```

## Knowledge Base Integration

### Instruction Document Processing

The agent workflow automatically searches your uploaded instruction documents:

#### Supported File Formats
- **Text**: .txt
- **Documents**: .pdf, .docx
- **Presentations**: .pptx
- **Spreadsheets**: .xlsx

#### Vector Embedding Process
1. Document uploaded through admin interface
2. Content extracted and preprocessed
3. Text chunks created (optimal size for embedding)
4. Vector embeddings generated using Google AI
5. Stored in ChromaDB with tenant isolation
6. Indexed for fast similarity search

#### Search Process
When a user message is received:
1. Message converted to embedding vector
2. ChromaDB performs similarity search
3. Top N most relevant documents retrieved
4. Similarity scores calculated
5. Documents passed to AI for response generation

### Similar Ticket Lookup

The system automatically finds similar historical tickets:

```javascript
// Vector search for similar tickets
const similarTickets = await findSimilarTickets({
  query: userMessage,
  tenantId: config.tenantId,
  limit: 5,
  threshold: 0.7,
  filters: {
    status: ['resolved', 'closed'],
    dateRange: {
      start: '2024-01-01',
      end: new Date()
    }
  }
});
```

Benefits:
- Learn from historical resolutions
- Identify recurring issues
- Provide proven solutions
- Improve response accuracy

## File Attachments

### Upload Support

Users can attach files directly in widget conversations:

```javascript
window.supportAiConfig = {
  enableAttachments: true,
  maxFileSize: 10485760,  // 10MB in bytes
  allowedFileTypes: [
    'image/*',
    'application/pdf',
    '.txt',
    '.docx',
    '.xlsx',
    '.pptx'
  ],
  
  onAttachmentUploaded: function(attachment) {
    console.log('File uploaded:', {
      id: attachment.id,
      name: attachment.fileName,
      size: attachment.fileSize,
      type: attachment.mimeType,
      url: attachment.url
    });
  },
  
  onAttachmentError: function(error) {
    console.error('Upload failed:', error.message);
    displayErrorToUser(error.message);
  }
};
```

### Security Features

- Tenant-specific storage isolation
- Virus scanning (if configured)
- MIME type validation
- File size limits
- Secure download URLs with expiration
- Access control based on user permissions

## Performance Monitoring

### Processing Time Tracking

Monitor agent workflow performance:

```javascript
window.supportAiConfig = {
  showProcessingTime: true,
  performanceThresholds: {
    fast: 1000,      // < 1s
    acceptable: 3000, // < 3s
    slow: 5000       // < 5s
  },
  
  onPerformanceMetrics: function(metrics) {
    console.log('Agent Performance:', {
      totalTime: metrics.processing_time_ms,
      chatProcessor: metrics.agent_workflow[0].duration_ms,
      instructionLookup: metrics.agent_workflow[1].duration_ms,
      ticketLookup: metrics.agent_workflow[2].duration_ms,
      ticketFormatter: metrics.agent_workflow[3].duration_ms
    });
  },
  
  onSlowResponse: function(processingTime) {
    if (processingTime > 5000) {
      console.warn('Slow agent response:', processingTime + 'ms');
      // Consider caching or optimization
    }
  }
};
```

### Confidence Score Monitoring

Track AI confidence for quality assurance:

```javascript
window.supportAiConfig = {
  showConfidenceScore: true,
  confidenceThresholds: {
    high: 0.85,
    medium: 0.65,
    low: 0.45
  },
  
  onConfidenceMetrics: function(response) {
    const { confidence_score, category } = response;
    
    // Track by category
    trackConfidenceByCategory(category, confidence_score);
    
    // Quality assurance
    if (confidence_score < 0.65) {
      flagForHumanReview(response);
    }
  }
};
```

### Vector Search Quality

Monitor similarity search effectiveness:

```javascript
window.addEventListener('sahayaa:vectorSearchComplete', function(event) {
  const { results, query, topSimilarity, avgSimilarity } = event.detail;
  
  console.log('Vector Search Quality:', {
    resultsFound: results.length,
    topSimilarity: topSimilarity,
    avgSimilarity: avgSimilarity,
    query: query
  });
  
  // Identify knowledge gaps
  if (topSimilarity < 0.6) {
    console.warn('Low similarity - may need more documentation on:', query);
    suggestDocumentCreation(query);
  }
});
```

## Error Handling and Fallbacks

### Agent Workflow Unavailable

Graceful degradation when agent services are unavailable:

```javascript
window.supportAiConfig = {
  enableFallbackMode: true,
  fallbackMessage: "Our AI agents are temporarily unavailable. You can still create a support ticket.",
  
  onAgentWorkflowFailure: function(error) {
    console.warn('Agent workflow failed:', error);
    
    // Switch to basic mode
    enableBasicChatMode();
    
    // Notify support team
    notifySupport({
      error: error.message,
      timestamp: new Date(),
      tenantId: config.tenantId
    });
  }
};
```

### Progressive Enhancement

The widget automatically detects and adapts to available services:

1. **Full Agent Workflow** (All services available)
   - Multi-agent processing
   - Vector search
   - Intelligent ticket creation
   - High-confidence responses

2. **Basic AI Mode** (Agent orchestrator down)
   - Simple AI responses
   - No vector search
   - Manual ticket creation
   - Limited intelligence

3. **Fallback Mode** (All AI services down)
   - Basic chat functionality
   - Direct ticket creation
   - Human agent routing
   - No AI processing

### Retry Logic

Implement intelligent retry for transient failures:

```javascript
window.supportAiConfig = {
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,  // Start at 1 second
    exponentialBackoff: true,
    retryableErrors: ['TIMEOUT', 'SERVICE_UNAVAILABLE', 'RATE_LIMIT']
  },
  
  onRetryAttempt: function(attempt, maxAttempts, error) {
    console.log(`Retry attempt ${attempt}/${maxAttempts} for:`, error);
    displayRetryIndicator(attempt, maxAttempts);
  }
};
```

## Best Practices

### 1. Optimize Knowledge Base

**Upload Comprehensive Instructions:**
- Create detailed guides for common issues
- Use clear, structured formatting
- Include step-by-step instructions
- Add keywords and synonyms
- Update regularly based on new issues

**Organize by Category:**
```javascript
// When uploading instructions, use consistent categories
{
  category: "account_management",
  subcategory: "password_reset",
  tags: ["login", "security", "authentication"],
  keywords: ["password", "reset", "forgot", "login"]
}
```

### 2. Monitor and Improve

**Track Key Metrics:**
```javascript
// Set up comprehensive monitoring
window.supportAiConfig = {
  analytics: {
    trackConfidenceScores: true,
    trackProcessingTimes: true,
    trackVectorSimilarity: true,
    trackUserSatisfaction: true,
    trackResolutionRates: true
  },
  
  onDailyMetrics: function(metrics) {
    // Review and act on metrics
    reviewDailyPerformance(metrics);
    
    if (metrics.avgConfidence < 0.7) {
      scheduleKnowledgeBaseReview();
    }
  }
};
```

### 3. Provide Rich Context

**User Context:**
```javascript
// Enhance agent processing with user context
window.SahayaaAI.setUserContext({
  userId: "user_12345",
  name: "John Doe",
  email: "john@example.com",
  tier: "premium",
  accountAge: "2 years",
  previousTickets: 3,
  industry: "healthcare",
  companySize: "enterprise"
});
```

**Page Context:**
```javascript
// Add contextual information
window.SahayaaAI.setPageContext({
  url: window.location.href,
  page: "checkout",
  product: "Premium Plan",
  cartValue: 99.99,
  previousPages: ["pricing", "features", "comparison"],
  timeOnPage: 245  // seconds
});
```

### 4. Test AI Responses

**A/B Testing:**
```javascript
// Test different AI configurations
window.supportAiConfig = {
  experimentMode: true,
  experiments: {
    aiProvider: {
      control: "openai",
      variant: "anthropic",
      splitRatio: 0.5
    },
    similarityThreshold: {
      control: 0.7,
      variant: 0.8,
      splitRatio: 0.5
    }
  },
  
  onExperimentResult: function(result) {
    trackExperiment(result);
  }
};
```

### 5. Handle Multi-Language

**Language Detection:**
```javascript
window.supportAiConfig = {
  autoDetectLanguage: true,
  supportedLanguages: ['en', 'es', 'fr', 'de', 'ja'],
  defaultLanguage: 'en',
  
  onLanguageDetected: function(language) {
    console.log('Detected language:', language);
    adjustUIForLanguage(language);
  }
};
```

## Security Considerations

### API Key Protection

**Never expose API keys in client-side code:**

```javascript
// ❌ BAD - Exposed API key
window.supportAiConfig = {
  apiKey: "sahayaa_wk_1_abc123def456"  // Visible to anyone!
};

// ✅ GOOD - Fetch from your backend
fetch('/api/widget-config')
  .then(res => res.json())
  .then(config => {
    window.supportAiConfig = config;
  });
```

### Data Privacy

**Configure data retention:**
```javascript
window.supportAiConfig = {
  dataRetention: {
    conversationHistory: 90,  // days
    attachments: 30,
    personalData: 365,
    analyticsData: 730
  },
  
  privacyMode: "strict",  // "strict" | "moderate" | "minimal"
  anonymizeData: true,
  gdprCompliant: true
};
```

### Tenant Isolation

All agent processing respects tenant boundaries:
- Database queries filtered by tenant_id
- Vector search scoped to tenant documents
- File storage isolated per tenant
- No cross-tenant data leakage

## Troubleshooting

### Common Issues

**1. Low Confidence Scores**
- **Cause**: Insufficient or poorly organized knowledge base
- **Solution**: Upload more comprehensive instructions, organize by category

**2. Slow Processing Times**
- **Cause**: Large vector database, slow AI provider, network latency
- **Solution**: Optimize document chunking, use faster AI provider, implement caching

**3. No Vector Search Results**
- **Cause**: No matching documents, threshold too high, embedding service down
- **Solution**: Lower similarity threshold, check service health, expand knowledge base

**4. Authentication Errors**
- **Cause**: Invalid API key, expired session, CORS issues
- **Solution**: Verify API key, check session timeout, configure CORS properly

### Debug Mode

Enable comprehensive debug logging:

```javascript
window.supportAiConfig = {
  debug: true,
  logLevel: "verbose",  // "error" | "warn" | "info" | "debug" | "verbose"
  logAgentWorkflow: true,
  logVectorSearch: true,
  logAPIRequests: true,
  
  onDebugLog: function(log) {
    console.log('[Sahayaa Debug]', log);
  }
};

// Access debug information
window.SahayaaAI.debug.getAgentMetrics();
window.SahayaaAI.debug.getVectorSearchHistory();
window.SahayaaAI.debug.getAPICallLog();
window.SahayaaAI.debug.testConnection();
```

## Migration Guide

### From Basic Widget to Agent Workflow

**Step 1: Update Configuration**
```javascript
// Old configuration
window.supportAiConfig = {
  tenantId: 123,
  apiKey: "your_key"
};

// New configuration with agent workflow
window.supportAiConfig = {
  tenantId: 123,
  apiKey: "your_key",
  enableAIAgents: true,
  enableAttachments: true,
  showBehindTheScenes: false
};
```

**Step 2: Update Event Listeners**
```javascript
// Old events
document.addEventListener('support:messageReceived', handler);

// New events (backward compatible)
document.addEventListener('sahayaa:messageReceived', handler);
document.addEventListener('sahayaa:agentResponse', agentHandler);
document.addEventListener('sahayaa:agentProcessing', processingHandler);
```

**Step 3: Test Thoroughly**
1. Test basic chat functionality
2. Verify agent responses include confidence scores
3. Check vector search results
4. Test file attachments
5. Verify ticket creation
6. Monitor performance metrics

## Advanced Integration Examples

### React Component

```jsx
import { useEffect, useState } from 'react';

function SahayaaWidget() {
  const [agentMetrics, setAgentMetrics] = useState(null);
  
  useEffect(() => {
    // Initialize widget
    window.supportAiConfig = {
      tenantId: 123,
      apiKey: process.env.REACT_APP_SAHAYAA_API_KEY,
      enableAIAgents: true,
      enableAttachments: true,
      
      onAgentResponse: (response) => {
        setAgentMetrics({
          confidence: response.confidence_score,
          processingTime: response.processing_time_ms,
          category: response.category
        });
      }
    };
    
    // Load widget script
    const script = document.createElement('script');
    script.src = '/widget.js';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);
  
  return (
    <div>
      {agentMetrics && (
        <div className="agent-metrics">
          <p>Confidence: {(agentMetrics.confidence * 100).toFixed(1)}%</p>
          <p>Response Time: {agentMetrics.processingTime}ms</p>
          <p>Category: {agentMetrics.category}</p>
        </div>
      )}
    </div>
  );
}
```

### Vue.js Integration

```vue
<template>
  <div id="app">
    <div v-if="agentMetrics" class="metrics">
      <p>Confidence: {{ (agentMetrics.confidence * 100).toFixed(1) }}%</p>
      <p>Processing Time: {{ agentMetrics.processingTime }}ms</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      agentMetrics: null
    };
  },
  
  mounted() {
    window.supportAiConfig = {
      tenantId: 123,
      apiKey: process.env.VUE_APP_SAHAYAA_API_KEY,
      enableAIAgents: true,
      
      onAgentResponse: (response) => {
        this.agentMetrics = {
          confidence: response.confidence_score,
          processingTime: response.processing_time_ms
        };
      }
    };
    
    const script = document.createElement('script');
    script.src = '/widget.js';
    script.async = true;
    document.body.appendChild(script);
  }
};
</script>
```

## Resources

- [Main Widget Documentation](./documentation.md)
- [API Reference](./api-documentation.md)
- [Admin Dashboard](https://your-domain.com/admin)
- [Support Email](mailto:support@sahayaa-ai.com)

---

© 2025 Sahayaa AI. All rights reserved.

*Last updated: October 21, 2025*
