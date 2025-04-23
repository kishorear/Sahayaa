# SAHAYAA.AI Chat Widget Documentation

## Overview

The SAHAYAA.AI Chat Widget is a customizable, lightweight chat interface that integrates directly with your SAHAYAA.AI account. It provides your website visitors with instant AI-powered support and connects them with human agents when needed.

## Quick Start

### HTML Integration

Add the following script tags to your website, right before the closing `</body>` tag:

```html
<!-- SAHAYAA.AI Chat Widget -->
<script>
  window.sahayaaAiConfig = {
    tenantId: YOUR_TENANT_ID,
    apiKey: "YOUR_API_KEY",
    primaryColor: "#6366F1",
    position: "right",
    greetingMessage: "How can I help you today?",
    autoOpen: false,
    branding: true,
    reportData: true,
    adminId: YOUR_ADMIN_ID
  };
</script>
<script src="https://sahayaa.ai/widget.js" async></script>
```

### NPM Package

Install the package using npm or yarn:

```bash
# Using npm
npm install sahayaa-widget

# Using yarn
yarn add sahayaa-widget
```

Then import and initialize the widget in your application:

```javascript
import { initSahayaaAI } from 'sahayaa-widget';

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
  adminId: YOUR_ADMIN_ID
});
```

### React Component

For React applications, you can use the provided component:

```jsx
import { SahayaaAIChat } from 'sahayaa-widget';

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
      />
    </div>
  );
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tenantId` | number | N/A | **Required**. Your SAHAYAA.AI tenant ID. |
| `apiKey` | string | N/A | **Required**. Your SAHAYAA.AI API key. |
| `primaryColor` | string | "#6366F1" | The primary color for the widget, used for the chat button and user messages. |
| `position` | string | "right" | The position of the chat widget on the screen. Options: "left", "right". |
| `greetingMessage` | string | "How can I help you today?" | The initial message displayed when the chat window opens. |
| `autoOpen` | boolean | false | Whether to automatically open the chat window when the page loads. |
| `branding` | boolean | true | Whether to show "Powered by SAHAYAA.AI" in the widget. |
| `reportData` | boolean | true | Whether to send analytics data back to SAHAYAA.AI. |
| `adminId` | number | null | Your admin ID for tracking and analytics. |

## JavaScript API

The widget exposes a JavaScript API through the `window.SahayaaAI` object:

```javascript
// Open the chat window
window.SahayaaAI.open();

// Close the chat window
window.SahayaaAI.close();

// Toggle the chat window
window.SahayaaAI.toggle();

// Update configuration at runtime
window.SahayaaAI.updateConfig({
  primaryColor: "#FF0000",
  greetingMessage: "New greeting message"
});
```

## Customization

### Styling

The widget automatically inherits some styles from your website but maintains its own styles for consistency. You can customize the appearance using the configuration options.

For advanced customization, you can use CSS to target the widget elements:

```css
#sahayaa-widget-container {
  /* Custom styles for the widget container */
}

#sahayaa-chat-button {
  /* Custom styles for the chat button */
}

#sahayaa-chat-window {
  /* Custom styles for the chat window */
}

.sahayaa-message.sahayaa-user {
  /* Custom styles for user messages */
}

.sahayaa-message.sahayaa-assistant {
  /* Custom styles for assistant messages */
}
```

## Advanced Usage

### Event Handling

You can listen for events from the widget using the following:

```javascript
document.addEventListener('sahayaa:opened', function() {
  console.log('Chat window was opened');
});

document.addEventListener('sahayaa:closed', function() {
  console.log('Chat window was closed');
});

document.addEventListener('sahayaa:messageSent', function(e) {
  console.log('Message sent:', e.detail.message);
});

document.addEventListener('sahayaa:messageReceived', function(e) {
  console.log('Message received:', e.detail.message);
});
```

### Programmatic Control

You can programmatically control the widget from anywhere in your application:

```javascript
// Open the chat and send a message
window.SahayaaAI.open();
setTimeout(() => {
  const inputElement = document.getElementById('sahayaa-input');
  inputElement.value = "Hello, I need help with my order";
  document.getElementById('sahayaa-send').click();
}, 500);
```

## Troubleshooting

### Common Issues

1. **Widget not appearing**: Ensure your `tenantId` and `apiKey` are correct and the script is properly added to your website.

2. **Message not sending**: Check your browser console for any errors. Ensure your API key has proper permissions.

3. **Styling conflicts**: If your website's CSS interferes with the widget, you may need to add more specific CSS selectors.

### Browser Compatibility

The SAHAYAA.AI Chat Widget is compatible with all modern browsers:
- Chrome, Firefox, Safari: Latest 2 versions
- Edge: Latest version
- Internet Explorer: Not supported

## Getting Help

If you need assistance with the SAHAYAA.AI Chat Widget, please contact our support team at support@sahayaa.ai or through your SAHAYAA.AI admin dashboard.

---

© 2025 SAHAYAA.AI. All rights reserved.