# Sahayaa AI Chat Widget Documentation

## Overview

The Sahayaa AI Chat Widget is an enterprise-grade, AI-powered support interface that integrates seamlessly with your website. Built on a microservices architecture, it provides intelligent ticket processing, automated responses powered by multiple AI providers, and transparent multi-agent workflow orchestration.

### Key Features

- **Multi-Agent AI System**: Intelligent ticket routing with specialized agents for chat processing, instruction lookup, ticket similarity search, and response formatting
- **Vector-Based Search**: ChromaDB-powered similarity search to find relevant solutions from historical tickets and knowledge base
- **Multiple AI Providers**: Support for OpenAI, Google AI, Anthropic, and AWS Bedrock
- **Attachment Support**: Upload files and documents directly in chat conversations
- **Real-Time Communication**: WebSocket-based instant messaging with typing indicators
- **Multi-Tenant Isolation**: Enterprise-level security with role-based access controls
- **Comprehensive Logging**: Complete conversation history with administrative oversight
- **Email Integration**: Support for SendGrid, SMTP/IMAP, and custom email providers
- **Production Monitoring**: Built-in health checks and real-time monitoring dashboard

## Quick Start

### HTML Integration

Add the following script tags to your website, right before the closing `</body>` tag:

```html
<!-- Sahayaa AI Chat Widget -->
<script>
  window.supportAiConfig = {
    tenantId: YOUR_TENANT_ID,
    apiKey: "YOUR_API_KEY",
    primaryColor: "#6366F1",
    position: "right",
    greetingMessage: "How can I help you today?",
    autoOpen: false,
    branding: true,
    reportData: true,
    adminId: YOUR_ADMIN_ID,
    enableAttachments: true,
    enableAIAgents: true
  };
</script>
<script src="https://www.sahayaa.ai/widget.js" async></script>
```

### NPM Package

Install the package using npm or yarn:

```bash
# Using npm
npm install sahayaa-ai-widget

# Using yarn
yarn add sahayaa-ai-widget
```

Then import and initialize the widget in your application:

```javascript
import { initSahayaaAI } from 'sahayaa-ai-widget';

// Initialize the widget
initSahayaaAI({
  tenantId: YOUR_TENANT_ID,
  apiKey: "YOUR_API_KEY",
  primaryColor: "#6366F1",
  position: "right",
  greetingMessage: "How can I help you today?",
  autoOpen: false,
  branding: true,
  reportData: true,
  adminId: YOUR_ADMIN_ID,
  enableAttachments: true,
  enableAIAgents: true
});
```

### React Component

For React applications, you can use the provided component:

```jsx
import { SahayaaAIChat } from 'sahayaa-ai-widget';

function App() {
  return (
    <div className="your-app">
      {/* Your application content */}
      
      <SahayaaAIChat
        tenantId="YOUR_TENANT_ID"
        apiKey="YOUR_API_KEY"
        primaryColor="#6366F1"
        position="right"
        greetingMessage="How can I help you today?"
        autoOpen={false}
        branding={true}
        reportData={true}
        adminId={YOUR_ADMIN_ID}
        enableAttachments={true}
        enableAIAgents={true}
      />
    </div>
  );
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tenantId` | number | N/A | **Required**. Your Sahayaa AI tenant ID. |
| `apiKey` | string | N/A | **Required**. Your Sahayaa AI API key. |
| `primaryColor` | string | "#6366F1" | The primary color for the widget, used for the chat button and user messages. |
| `position` | string | "right" | The position of the chat widget on the screen. Options: "left", "right". |
| `greetingMessage` | string | "How can I help you today?" | The initial message displayed when the chat window opens. |
| `autoOpen` | boolean | false | Whether to automatically open the chat window when the page loads. |
| `branding` | boolean | true | Whether to show "Powered by Sahayaa AI" in the widget. |
| `reportData` | boolean | true | Whether to send analytics data back to Sahayaa AI. |
| `adminId` | number | null | Your admin ID for tracking and analytics. |
| `enableAttachments` | boolean | true | Allow users to upload files and attachments in chat. |
| `enableAIAgents` | boolean | true | Enable multi-agent AI processing for intelligent responses. |
| `maxFileSize` | number | 10485760 | Maximum file size for attachments in bytes (default 10MB). |
| `allowedFileTypes` | array | ['image/*', 'application/pdf', '.txt', '.docx'] | Allowed MIME types and file extensions. |

## JavaScript API

The widget exposes a JavaScript API through the `window.SahayaaAI` object:

```javascript
// Open the chat window
window.SahayaaAI.open();

// Close the chat window
window.SahayaaAI.close();

// Toggle the chat window
window.SahayaaAI.toggle();

// Send a message programmatically
window.SahayaaAI.sendMessage("I need help with my order");

// Upload an attachment
window.SahayaaAI.uploadFile(fileObject);

// Update configuration at runtime
window.SahayaaAI.updateConfig({
  primaryColor: "#FF0000",
  greetingMessage: "New greeting message"
});

// Get current session info
const session = window.SahayaaAI.getSession();

// Clear conversation history
window.SahayaaAI.clearHistory();
```

## AI Agent System

Sahayaa AI uses a sophisticated multi-agent system to process customer inquiries:

### Agent Workflow

1. **Chat Processor Agent**: Analyzes incoming messages and extracts intent
2. **Instruction Lookup Agent**: Searches knowledge base for relevant documentation using vector similarity
3. **Ticket Lookup Agent**: Finds similar historical tickets to provide context-aware solutions
4. **Ticket Formatter Agent**: Structures the final response with relevant information and next steps

### Transparent Processing

When `showBehindTheScenes` is enabled, users can see:
- Which agents are processing their request
- Vector similarity scores for retrieved documents
- Confidence levels for AI-generated responses
- Sources of information used in the answer

```javascript
window.supportAiConfig = {
  // ... other config
  showBehindTheScenes: true,
  enableAIAgents: true
};
```

## File Attachments

### Supported File Types

The widget supports various file types out of the box:
- Images: JPG, PNG, GIF, WebP
- Documents: PDF, DOCX, TXT, XLSX, PPTX
- Archives: ZIP (for multiple files)

### Upload Limits

- Maximum file size: 10MB (configurable)
- Maximum files per message: 5
- Total conversation storage: Based on your plan

### Handling Attachments

```javascript
// Listen for attachment upload events
document.addEventListener('sahayaa:attachmentUploaded', function(e) {
  console.log('File uploaded:', e.detail);
  // {
  //   fileId: "abc123",
  //   fileName: "screenshot.png",
  //   fileSize: 245678,
  //   mimeType: "image/png"
  // }
});

// Handle upload errors
document.addEventListener('sahayaa:attachmentError', function(e) {
  console.error('Upload failed:', e.detail.error);
});
```

## Customization

### Styling

The widget uses Shadow DOM for style isolation but provides CSS custom properties for theming:

```css
:root {
  --sahayaa-primary-color: #6366F1;
  --sahayaa-text-color: #1F2937;
  --sahayaa-background: #FFFFFF;
  --sahayaa-border-radius: 12px;
  --sahayaa-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  --sahayaa-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

For advanced customization, you can override specific components:

```css
/* Custom styles for the widget container */
#sahayaa-widget-container {
  bottom: 24px;
  right: 24px;
}

/* Custom styles for the chat button */
#sahayaa-chat-button {
  width: 64px;
  height: 64px;
  box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
}

/* Custom styles for the chat window */
#sahayaa-chat-window {
  width: 400px;
  height: 600px;
  border-radius: 16px;
}

/* Custom styles for user messages */
.sahayaa-message.sahayaa-user {
  background-color: var(--sahayaa-primary-color);
  color: white;
}

/* Custom styles for assistant messages */
.sahayaa-message.sahayaa-assistant {
  background-color: #F3F4F6;
  color: #1F2937;
}
```

## Advanced Usage

### Event Handling

Comprehensive event system for deep integration:

```javascript
// Widget lifecycle events
document.addEventListener('sahayaa:initialized', function() {
  console.log('Widget initialized and ready');
});

document.addEventListener('sahayaa:opened', function() {
  console.log('Chat window opened');
});

document.addEventListener('sahayaa:closed', function() {
  console.log('Chat window closed');
});

// Message events
document.addEventListener('sahayaa:messageSent', function(e) {
  console.log('User sent:', e.detail.message);
});

document.addEventListener('sahayaa:messageReceived', function(e) {
  console.log('AI responded:', e.detail.message);
});

document.addEventListener('sahayaa:typingStarted', function() {
  console.log('AI is typing...');
});

document.addEventListener('sahayaa:typingEnded', function() {
  console.log('AI finished typing');
});

// AI Agent workflow events
document.addEventListener('sahayaa:agentProcessing', function(e) {
  console.log('Agent processing:', e.detail);
  // {
  //   agent: "instruction_lookup",
  //   status: "processing",
  //   confidence: 0.87
  // }
});

document.addEventListener('sahayaa:similarTicketsFound', function(e) {
  console.log('Found similar tickets:', e.detail.tickets);
});

// Error events
document.addEventListener('sahayaa:error', function(e) {
  console.error('Widget error:', e.detail.error);
});

// Analytics events
document.addEventListener('sahayaa:analyticsEvent', function(e) {
  console.log('Analytics:', e.detail);
});
```

### Programmatic Control

Advanced widget control for custom integrations:

```javascript
// Pre-fill user information
window.SahayaaAI.setUserInfo({
  name: "John Doe",
  email: "john@example.com",
  userId: "user_12345"
});

// Send contextual information
window.SahayaaAI.sendContext({
  page: window.location.pathname,
  product: "Premium Plan",
  orderId: "ORD-2025-001"
});

// Trigger specific workflows
window.SahayaaAI.triggerWorkflow('password_reset');

// Get conversation transcript
const transcript = window.SahayaaAI.getTranscript();

// Export conversation
window.SahayaaAI.exportConversation('pdf'); // or 'json', 'txt'
```

### Multi-Language Support

```javascript
window.supportAiConfig = {
  // ... other config
  language: 'en', // ISO 639-1 code
  translations: {
    en: {
      greetingMessage: "How can I help you today?",
      inputPlaceholder: "Type your message...",
      sendButton: "Send",
      attachButton: "Attach file"
    },
    es: {
      greetingMessage: "¿Cómo puedo ayudarte hoy?",
      inputPlaceholder: "Escribe tu mensaje...",
      sendButton: "Enviar",
      attachButton: "Adjuntar archivo"
    }
  }
};
```

## Security & Privacy

### Data Protection

- All communications are encrypted using TLS 1.3
- Messages are stored with tenant-level isolation
- Role-based access controls (RBAC) for admin access
- GDPR and CCPA compliant data handling
- Optional end-to-end encryption for sensitive data

### API Key Security

```javascript
// IMPORTANT: Never expose API keys in client-side code in production
// Use environment variables and server-side configuration

// Development (testing only)
window.supportAiConfig = {
  apiKey: "sahayaa_wk_test_123456789"
};

// Production (recommended)
// Fetch API key from your backend
fetch('/api/widget-config')
  .then(res => res.json())
  .then(config => {
    window.supportAiConfig = config;
    // Widget will auto-initialize
  });
```

## Integration Examples

### WordPress Integration

```php
<?php
// Add to your theme's footer.php
function add_sahayaa_widget() {
  $tenant_id = get_option('sahayaa_tenant_id');
  $api_key = get_option('sahayaa_api_key');
  
  ?>
  <script>
    window.supportAiConfig = {
      tenantId: <?php echo $tenant_id; ?>,
      apiKey: "<?php echo $api_key; ?>",
      primaryColor: "#6366F1",
      position: "right",
      enableAttachments: true,
      enableAIAgents: true
    };
  </script>
  <script src="<?php echo get_template_directory_uri(); ?>/js/sahayaa-widget.js" async></script>
  <?php
}
add_action('wp_footer', 'add_sahayaa_widget');
?>
```

### Shopify Integration

```liquid
<!-- Add to theme.liquid before </body> -->
<script>
  window.supportAiConfig = {
    tenantId: {{ shop.metafields.sahayaa.tenant_id }},
    apiKey: "{{ shop.metafields.sahayaa.api_key }}",
    primaryColor: "{{ settings.sahayaa_color }}",
    enableAttachments: true,
    enableAIAgents: true
  };
  
  {% if customer %}
  window.SahayaaAI.setUserInfo({
    name: "{{ customer.name }}",
    email: "{{ customer.email }}",
    userId: "{{ customer.id }}"
  });
  {% endif %}
</script>
<script src="{{ 'sahayaa-widget.js' | asset_url }}" async></script>
```

### Single Page Application (SPA)

```javascript
// Vue.js example
import { onMounted, onUnmounted } from 'vue';

export default {
  setup() {
    onMounted(() => {
      // Initialize widget when component mounts
      window.SahayaaAI.init({
        tenantId: 123,
        apiKey: "your_api_key",
        enableAttachments: true,
        enableAIAgents: true
      });
    });
    
    onUnmounted(() => {
      // Clean up when component unmounts
      window.SahayaaAI.destroy();
    });
  }
};
```

## Troubleshooting

### Common Issues

1. **Widget not appearing**
   - Ensure your `tenantId` and `apiKey` are correct
   - Check browser console for JavaScript errors
   - Verify the script is loaded (check Network tab)
   - Confirm no Content Security Policy (CSP) blocking

2. **Messages not sending**
   - Check API key permissions in admin dashboard
   - Verify network connectivity
   - Check browser console for CORS errors
   - Ensure tenant is active and not rate-limited

3. **Attachments failing to upload**
   - Verify file size is within limits
   - Check file type is allowed
   - Ensure proper CORS configuration
   - Check storage quota hasn't been exceeded

4. **AI agents not responding**
   - Verify AI providers are configured in backend
   - Check API keys for OpenAI/Google AI/Anthropic
   - Review agent orchestration service logs
   - Ensure vector database is properly initialized

### Browser Compatibility

The Sahayaa AI Chat Widget supports all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Opera 76+

Mobile browsers:
- iOS Safari 14+
- Chrome Mobile 90+
- Samsung Internet 14+

**Not supported**: Internet Explorer

### Debug Mode

Enable debug mode for detailed logging:

```javascript
window.supportAiConfig = {
  // ... other config
  debug: true,
  logLevel: 'verbose' // 'error', 'warn', 'info', 'debug', 'verbose'
};

// Monitor widget state
window.SahayaaAI.debug.getState();

// View event log
window.SahayaaAI.debug.getEventLog();

// Test connection
window.SahayaaAI.debug.testConnection();
```

## Performance Optimization

### Lazy Loading

```javascript
// Load widget only when user scrolls or after delay
setTimeout(() => {
  const script = document.createElement('script');
  script.src = 'https://your-domain.com/widget.js';
  script.async = true;
  document.body.appendChild(script);
}, 3000); // Load after 3 seconds
```

### Resource Hints

```html
<!-- Preconnect to API server -->
<link rel="preconnect" href="https://api.sahayaa-ai.com">
<link rel="dns-prefetch" href="https://api.sahayaa-ai.com">

<!-- Preload widget script -->
<link rel="preload" href="/widget.js" as="script">
```

## Analytics & Reporting

The widget automatically tracks:
- Conversation starts and completion rates
- Message volume and response times
- User satisfaction scores
- Common topics and questions
- Agent performance metrics
- File attachment usage

Access analytics through your admin dashboard or via the API.

## Getting Help

If you need assistance with the Sahayaa AI Chat Widget:

- **Documentation**: https://docs.sahayaa-ai.com
- **API Reference**: https://docs.sahayaa-ai.com/api
- **Support Email**: support@sahayaa-ai.com
- **Admin Dashboard**: Log in to view help articles and submit tickets
- **Community Forum**: https://community.sahayaa-ai.com

---

© 2025 Sahayaa AI. All rights reserved.
