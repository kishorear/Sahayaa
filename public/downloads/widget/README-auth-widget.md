# Support AI Chat Widget Integration Guide

## Introduction

This package contains everything you need to integrate the Support AI Chat Widget into your website or application. The widget provides an intelligent chat interface powered by your Support AI tenant configuration with advanced agent workflow orchestration, allowing your users to get comprehensive support through multi-agent AI processing.

## What's Included

This integration package includes:

- **Agent Workflow Integration** - Multi-agent orchestration for comprehensive issue resolution
- **Authentication-enabled Chat Widget** - Requires users to log in before chatting
- **Intelligent Ticket Creation** - Automatic ticket generation with AI classification
- **Knowledge Base Integration** - Access to instruction documents and similar ticket lookup
- **Resolution Steps** - Step-by-step guidance powered by agent collaboration
- **Confidence Scoring** - AI response quality metrics and reliability indicators
- **API Key Integration** - Connects to your specific AI provider configuration
- **Customizable UI** - Matches your brand colors and positioning preferences
- **Advanced Analytics** - Enhanced event tracking with agent workflow metrics
- **Sample Implementation** - Complete examples to help you get started quickly
- **Technical Documentation** - Detailed API reference and configuration options

## Quick Start Guide

### Basic Integration (5 minutes)

Add the following code to your website, right before the closing `</body>` tag:

```html
<!-- Sahayaa AI Chat Widget Configuration -->
<script>
  window.supportAiConfig = {
    tenantId: YOUR_TENANT_ID,
    apiKey: "YOUR_API_KEY",
    primaryColor: "#6366F1",  // Change to match your brand
    position: "right",        // right, left, or center
    requireAuth: true,        // Set to false for anonymous chats
    greetingMessage: "How can I help you today?"
  };
</script>

<!-- Sahayaa AI Chat Widget Script -->
<script src="support-widget-auth.js" async></script>
```

Replace `YOUR_TENANT_ID` and `YOUR_API_KEY` with the values from your Sahayaa AI admin dashboard.

### Testing Your Integration

1. Once integrated, a chat button will appear in the bottom corner of your website
2. Click the button to open the chat window
3. Users will be prompted to log in before they can start chatting
4. After authentication, users can interact with your AI-powered support assistant

## Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `tenantId` | Number | Your Support AI tenant ID | *Required* |
| `apiKey` | String | Your API key for authentication | *Required* |
| `primaryColor` | String | The primary color for the widget (hex code) | "#6366F1" |
| `position` | String | Widget position on the page (right, left, center) | "right" |
| `greetingMessage` | String | Initial message displayed in the chat | "How can I help you today?" |
| `requireAuth` | Boolean | Whether users must log in before chatting | true |
| `autoOpen` | Boolean | Whether to automatically open the chat widget | false |
| `branding` | Boolean | Whether to show Support AI branding | true |
| `reportData` | Boolean | Whether to send analytics data | true |
| `serverUrl` | String | URL of the Support AI server | "https://api.support.ai" |

## Authentication Implementation

### How It Works

1. When a user opens the chat widget, they are prompted to log in
2. Login credentials are securely transmitted to your Support AI tenant
3. Upon successful authentication, the user can interact with the chatbot
4. Authentication state is maintained across page visits
5. Chat history is preserved for authenticated users

### Custom Authentication

To integrate with your existing authentication system:

```javascript
// Initialize with custom authentication handler
window.SupportAIChat.init({
  // Your other configuration options...
  customAuth: true,
  getAuthToken: async function() {
    // Return your authentication token from your system
    return await yourAuthSystem.getToken();
  }
});
```

## Advanced Usage

### Programmatic Control

You can control the chat widget programmatically using the following methods:

```javascript
// Initialize widget with custom configuration
const widget = window.SupportAIChat.init({
  tenantId: YOUR_TENANT_ID,
  apiKey: "YOUR_API_KEY"
});

// Open the chat window
widget.openChat();

// Close the chat window
widget.closeChat();

// Send a message programmatically
widget.sendMessage("Hello, I need help with my order");

// Log out the current user
widget.logout();
```

### Event Handling

Listen for widget events to integrate with your website's functionality:

```javascript
window.addEventListener('supportai:initialized', function(e) {
  console.log('Chat widget initialized', e.detail);
});

window.addEventListener('supportai:authenticated', function(e) {
  console.log('User authenticated', e.detail.user);
});

window.addEventListener('supportai:message', function(e) {
  console.log('New message', e.detail.message);
});
```

## Using with Popular Frameworks

### React

```jsx
import { useEffect } from 'react';

function App() {
  useEffect(() => {
    // Initialize widget when component mounts
    window.supportAiConfig = {
      tenantId: YOUR_TENANT_ID,
      apiKey: "YOUR_API_KEY"
    };
    
    const script = document.createElement('script');
    script.src = '/support-widget-auth.js';
    script.async = true;
    document.body.appendChild(script);
    
    // Clean up when component unmounts
    return () => {
      document.body.removeChild(script);
      const widgetContainer = document.querySelector('.support-widget-container');
      if (widgetContainer) {
        widgetContainer.remove();
      }
    };
  }, []);
  
  return (
    <div className="App">
      {/* Your app content */}
    </div>
  );
}
```

### Vue.js

```javascript
export default {
  name: 'App',
  mounted() {
    // Initialize widget when component mounts
    window.supportAiConfig = {
      tenantId: YOUR_TENANT_ID,
      apiKey: "YOUR_API_KEY"
    };
    
    const script = document.createElement('script');
    script.src = '/support-widget-auth.js';
    script.async = true;
    document.body.appendChild(script);
  },
  beforeDestroy() {
    // Clean up when component is destroyed
    const scriptElement = document.querySelector('script[src="/support-widget-auth.js"]');
    if (scriptElement) {
      document.body.removeChild(scriptElement);
    }
    
    const widgetContainer = document.querySelector('.support-widget-container');
    if (widgetContainer) {
      widgetContainer.remove();
    }
  }
}
```

### Angular

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<div>Your app content</div>'
})
export class AppComponent implements OnInit, OnDestroy {
  private scriptElement: HTMLScriptElement;
  
  ngOnInit() {
    // Initialize widget config
    (window as any).supportAiConfig = {
      tenantId: YOUR_TENANT_ID,
      apiKey: "YOUR_API_KEY"
    };
    
    // Add script to page
    this.scriptElement = document.createElement('script');
    this.scriptElement.src = '/support-widget-auth.js';
    this.scriptElement.async = true;
    document.body.appendChild(this.scriptElement);
  }
  
  ngOnDestroy() {
    // Clean up when component is destroyed
    if (this.scriptElement) {
      document.body.removeChild(this.scriptElement);
    }
    
    const widgetContainer = document.querySelector('.support-widget-container');
    if (widgetContainer) {
      widgetContainer.remove();
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Widget not appearing**: Make sure the script is properly loaded and check browser console for errors.

2. **Authentication errors**: Verify your tenant ID and API key are correct.

3. **Custom styling not applying**: Ensure your color values are in the correct format (e.g., "#RRGGBB").

4. **Multiple widget instances**: If you're seeing multiple widget instances, check for duplicate script inclusions.

### Debugging

Enable debug mode to get detailed logging in the browser console:

```javascript
window.supportAiConfig = {
  // Your other configuration options...
  debug: true
};
```

## Security Considerations

- The widget uses secure HTTPS connections for all communications
- User authentication credentials are never stored in cookies or local storage
- API keys should be kept confidential and not exposed in public repositories
- For production use, we recommend implementing proper CORS policies on your server

## Getting Help

If you encounter any issues or have questions about the integration:

1. Check the detailed API documentation in the `api-documentation.md` file
2. Refer to the sample implementations in the package
3. Contact your Support AI account manager for personalized assistance

## Changelog

**Version 1.0.0 (Current)**
- Initial release with authentication support
- API key integration for AI provider configuration
- Customizable UI and positioning
- Full documentation and examples

---

© 2025 Support AI - All rights reserved