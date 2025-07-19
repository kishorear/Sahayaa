# 🤖 Sahayaa AI Chat Widget Package

Complete installable chat widget package with multi-agent AI capabilities and transparent workflow visualization.

## ✨ Features

### 🔍 **Transparent AI Multi-Agent Processing**
- **Behind-the-Scenes Visualization**: See exactly how our AI agents process your requests
- **Multi-Agent Orchestration**: ChatProcessor → InstructionLookup → TicketLookup → LLM → TicketFormatter workflow
- **Confidence Scoring**: Every response includes confidence metrics and processing insights
- **Processing Transparency**: Detailed breakdown of agent decisions and data sources

### ⚡ **Production-Ready Widget**
- **Easy Integration**: Drop-in JavaScript widget for any website
- **Customizable Design**: Match your brand colors and positioning
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Accessibility**: Full keyboard navigation and screen reader support

### 🛡️ **Enterprise Security**
- **API Key Authentication**: Secure tenant-based access control
- **Rate Limiting**: Built-in protection against abuse
- **CORS Protection**: Configurable cross-origin security
- **Input Validation**: Comprehensive request sanitization

### 📊 **Analytics & Monitoring**
- **Event Tracking**: Monitor user interactions and engagement
- **Performance Metrics**: Track response times and system health
- **Custom Events**: Integrate with your analytics platform
- **Real-time Logging**: Comprehensive debugging and monitoring

## 📦 Package Contents

```
sahayaa-ai-widget-package/
├── frontend/                    # Client-side widget files
│   ├── sahayaa-chat-widget.js  # Main widget JavaScript
│   └── widget-styles.css       # Complete CSS styling
├── backend/                     # Server component
│   ├── widget-server.js        # Express.js API server
│   ├── package.json           # Node.js dependencies
│   └── .env.example           # Configuration template
├── samples/                     # Implementation examples
│   ├── sample-basic-integration.html     # Simple setup
│   └── sample-advanced-integration.html  # Advanced features
├── docs/                        # Documentation
│   ├── INSTALLATION.md         # Setup instructions
│   ├── CONFIGURATION.md        # Config options
│   ├── API.md                  # API documentation
│   └── CUSTOMIZATION.md        # Styling guide
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. **Frontend Integration** (Basic)

Add these files to your website:

```html
<!-- Add before closing </body> tag -->
<script>
  window.sahayaaConfig = {
    apiKey: "your_api_key_here",
    serverUrl: "https://your-widget-server.com",
    primaryColor: "#6366F1",
    enableAgentWorkflow: true,
    showBehindTheScenes: true
  };
</script>
<script src="sahayaa-chat-widget.js" async></script>
<link rel="stylesheet" href="widget-styles.css">
```

### 2. **Backend Setup** (Node.js Server)

```bash
# Navigate to backend directory
cd sahayaa-ai-widget-package/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start server
npm start
```

### 3. **Test Integration**

Open `samples/sample-basic-integration.html` in your browser to see the widget in action.

## ⚙️ Configuration Options

### Frontend Widget Configuration

```javascript
window.sahayaaConfig = {
  // Authentication
  apiKey: "your_api_key_here",
  serverUrl: "https://your-server.com",
  
  // Appearance
  primaryColor: "#6366F1",
  position: "right", // "left", "right", "center"
  greetingMessage: "How can I help you today?",
  
  // Behavior
  autoOpen: false,
  requireAuth: false,
  enableBranding: true,
  trackEvents: true,
  
  // Agent Workflow Features
  enableAgentWorkflow: true,
  showBehindTheScenes: true,
  showConfidenceScores: false,
  showProcessingTimes: false,
  maxProcessingTime: 5000,
  confidenceThreshold: 0.8
};
```

### Backend Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost/db

# Security
JWT_SECRET=your_jwt_secret_32_chars_minimum
API_KEY_SECRET=your_api_key_encryption_secret
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# AI Providers (Optional)
OPENAI_API_KEY=your_openai_key
GOOGLE_AI_API_KEY=your_google_ai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Agent Workflow
ENABLE_AGENT_WORKFLOW=true
CONFIDENCE_THRESHOLD=0.7
AGENT_PROCESSING_TIMEOUT=10000
```

## 🎯 Agent Workflow Features

### Multi-Agent Processing Pipeline

1. **ChatProcessor Agent**: Analyzes and categorizes user messages
2. **InstructionLookup Agent**: Searches knowledge base for relevant solutions
3. **TicketLookup Agent**: Finds similar historical tickets with successful resolutions
4. **LLM Resolution Agent**: Generates comprehensive responses using AI
5. **TicketFormatter Agent**: Structures solutions into actionable steps

### Behind-the-Scenes Visualization

```javascript
// Example processing steps shown to users
{
  step: "ChatProcessor Agent",
  details: "Analyzing user message for intent and category",
  duration: 450,
  status: 'complete',
  data: {
    category: 'technical',
    confidence: 0.94,
    keywords_extracted: ['api', 'error', 'integration']
  }
}
```

## 🔧 API Endpoints

### Chat Processing
```
POST /api/widget/chat
Content-Type: application/json
X-API-Key: your_api_key

{
  "message": "I'm having trouble with the API integration",
  "sessionId": "optional_session_id",
  "context": {
    "page": "documentation",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### Authentication
```
POST /api/widget/auth
Content-Type: application/json
X-API-Key: your_api_key

{
  "username": "user@example.com",
  "password": "user_password"
}
```

### Ticket Creation
```
POST /api/widget/ticket
Content-Type: application/json
X-API-Key: your_api_key

{
  "title": "API Integration Issue",
  "description": "Detailed description of the problem",
  "category": "technical",
  "priority": "high"
}
```

### Analytics Tracking
```
POST /api/widget/analytics
Content-Type: application/json
X-API-Key: your_api_key

{
  "event": "message_sent",
  "sessionId": "session_123",
  "data": {
    "messageLength": 45,
    "responseTime": 1200
  }
}
```

## 🎨 Customization

### Brand Colors
```css
:root {
  --sahayaa-primary: #6366f1;
  --sahayaa-secondary: #8b5cf6;
  --sahayaa-background: #ffffff;
  --sahayaa-text: #334155;
}
```

### Custom Styling
```css
.sahayaa-chat-button {
  background: linear-gradient(135deg, var(--sahayaa-primary), var(--sahayaa-secondary));
  /* Your custom styles */
}

.sahayaa-message-bubble.ai {
  background: var(--sahayaa-background);
  border: 1px solid #e2e8f0;
  /* Your custom styles */
}
```

### JavaScript API
```javascript
// Open/close widget programmatically
window.SahayaaAI.openChat();
window.SahayaaAI.closeChat();

// Track custom events
window.SahayaaAI.trackEvent('custom_action', {
  action: 'button_click',
  location: 'pricing_page'
});

// Listen for widget events
window.addEventListener('sahayaaWidgetEvent', function(event) {
  console.log('Widget event:', event.detail);
});
```

## 📱 Mobile Support

The widget is fully responsive and includes:
- Touch-optimized interactions
- Mobile-specific sizing and positioning
- Swipe gestures for closing
- Viewport-aware positioning
- iOS Safari compatibility

## 🔒 Security Features

### API Key Management
- Tenant-specific API keys with built-in validation
- Signature-based authentication
- Rate limiting per tenant and endpoint
- CORS protection with configurable origins

### Data Protection
- Input sanitization and validation
- XSS protection with CSP headers
- Secure session management
- Encrypted sensitive data storage

### Monitoring
- Real-time security violation tracking
- Failed authentication logging
- Rate limit breach detection
- Suspicious activity alerts

## 📊 Analytics Integration

### Built-in Events
- `widget_initialized`: Widget loaded on page
- `chat_opened`: User opened chat interface
- `chat_closed`: User closed chat interface
- `message_sent`: User sent a message
- `response_received`: AI response generated
- `agent_workflow_completed`: Multi-agent processing finished

### Custom Event Tracking
```javascript
// Track custom business events
window.SahayaaAI.trackEvent('product_inquiry', {
  product: 'enterprise_plan',
  source: 'pricing_page',
  value: 299
});
```

### Integration with Analytics Platforms
```javascript
// Google Analytics
window.addEventListener('sahayaaWidgetEvent', function(event) {
  gtag('event', event.detail.event, {
    event_category: 'sahayaa_widget',
    event_label: event.detail.sessionId,
    value: event.detail.data
  });
});

// Mixpanel
window.addEventListener('sahayaaWidgetEvent', function(event) {
  mixpanel.track(event.detail.event, event.detail.data);
});
```

## 🚀 Deployment

### Frontend Deployment
1. Upload `sahayaa-chat-widget.js` and `widget-styles.css` to your CDN
2. Update your website template with the configuration script
3. Test the integration using browser developer tools

### Backend Deployment

#### Docker Deployment
```bash
# Build Docker image
docker build -t sahayaa-widget-server .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=your_secret \
  sahayaa-widget-server
```

#### Heroku Deployment
```bash
# Create Heroku app
heroku create your-widget-server

# Set environment variables
heroku config:set JWT_SECRET=your_secret
heroku config:set DATABASE_URL=postgresql://...

# Deploy
git push heroku main
```

#### Traditional Server
```bash
# Install Node.js and npm
# Clone/upload your code
npm install --production
npm start
```

## 🧪 Testing

### Frontend Testing
```bash
# Serve sample files locally
python -m http.server 8000
# Open http://localhost:8000/samples/

# Or use any local server
npx serve samples/
```

### Backend Testing
```bash
cd backend/
npm test

# Manual API testing
curl -X POST http://localhost:3000/api/widget/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: demo_api_key" \
  -d '{"message": "Hello, I need help"}'
```

### Integration Testing
Use the `sample-advanced-integration.html` file to test all features with real-time event logging and configuration changes.

## 🆘 Support

### Documentation
- [Installation Guide](docs/INSTALLATION.md)
- [Configuration Reference](docs/CONFIGURATION.md)
- [API Documentation](docs/API.md)
- [Customization Guide](docs/CUSTOMIZATION.md)

### Common Issues
1. **Widget not loading**: Check JavaScript console for errors, verify file paths
2. **API errors**: Verify API key format and server connectivity
3. **Styling issues**: Check CSS file inclusion and cache clearing
4. **Mobile problems**: Test viewport meta tag and responsive breakpoints

### Getting Help
- Check browser console for error messages
- Review server logs for API issues
- Test with sample files to isolate problems
- Verify environment variables and configuration

## 📄 License

MIT License - feel free to modify and distribute according to your needs.

## 🔄 Updates

### Version 1.0.0
- Initial release with multi-agent workflow
- Complete frontend and backend components
- Comprehensive documentation and samples
- Production-ready security and monitoring features

---

**Ready to enhance your customer support with AI-powered multi-agent assistance?** 

Start with the basic integration and gradually enable advanced features like behind-the-scenes processing visualization and custom agent workflows.