# SupportAI Chat Widget Documentation

## Overview

The SupportAI Chat Widget is a customizable, lightweight chat interface that integrates directly with your SupportAI account. It provides your website visitors with instant AI-powered support and connects them with human agents when needed.

## Quick Start

### HTML Integration

Add the following script tags to your website, right before the closing `</body>` tag:

```html
<!-- SupportAI Chat Widget -->
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
    adminId: YOUR_ADMIN_ID
  };
</script>
<script src="https://supportai.com/widget.js" async></script>
```

### NPM Package

Install the package using npm or yarn:

```bash
# Using npm
npm install supportai-widget

# Using yarn
yarn add supportai-widget
```

Then import and initialize the widget in your application:

```javascript
import { initSupportAI } from 'supportai-widget';

// Initialize the widget
initSupportAI({
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
import { SupportAIChat } from 'supportai-widget';

function App() {
  return (
    <div className="your-app">
      {/* Your application content */}
      
      <SupportAIChat
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
| `tenantId` | number | N/A | **Required**. Your SupportAI tenant ID. |
| `apiKey` | string | N/A | **Required**. Your SupportAI API key. |
| `primaryColor` | string | "#6366F1" | The primary color for the widget, used for the chat button and user messages. |
| `position` | string | "right" | The position of the chat widget on the screen. Options: "left", "right". |
| `greetingMessage` | string | "How can I help you today?" | The initial message displayed when the chat window opens. |
| `autoOpen` | boolean | false | Whether to automatically open the chat window when the page loads. |
| `branding` | boolean | true | Whether to show "Powered by SupportAI" in the widget. |
| `reportData` | boolean | true | Whether to send analytics data back to SupportAI. |
| `adminId` | number | null | Your admin ID for tracking and analytics. |

## JavaScript API

The widget exposes a JavaScript API through the `window.SupportAI` object:

```javascript
// Open the chat window
window.SupportAI.open();

// Close the chat window
window.SupportAI.close();

// Toggle the chat window
window.SupportAI.toggle();

// Update configuration at runtime
window.SupportAI.updateConfig({
  primaryColor: "#FF0000",
  greetingMessage: "New greeting message"
});
```

## Customization

### Styling

The widget automatically inherits some styles from your website but maintains its own styles for consistency. You can customize the appearance using the configuration options.

For advanced customization, you can use CSS to target the widget elements:

```css
#supportai-widget-container {
  /* Custom styles for the widget container */
}

#supportai-chat-button {
  /* Custom styles for the chat button */
}

#supportai-chat-window {
  /* Custom styles for the chat window */
}

.supportai-message.supportai-user {
  /* Custom styles for user messages */
}

.supportai-message.supportai-assistant {
  /* Custom styles for assistant messages */
}
```

## Advanced Usage

### Event Handling

You can listen for events from the widget using the following:

```javascript
document.addEventListener('supportai:opened', function() {
  console.log('Chat window was opened');
});

document.addEventListener('supportai:closed', function() {
  console.log('Chat window was closed');
});

document.addEventListener('supportai:messageSent', function(e) {
  console.log('Message sent:', e.detail.message);
});

document.addEventListener('supportai:messageReceived', function(e) {
  console.log('Message received:', e.detail.message);
});
```

### Programmatic Control

You can programmatically control the widget from anywhere in your application:

```javascript
// Open the chat and send a message
window.SupportAI.open();
setTimeout(() => {
  const inputElement = document.getElementById('supportai-input');
  inputElement.value = "Hello, I need help with my order";
  document.getElementById('supportai-send').click();
}, 500);
```

## Troubleshooting

### Common Issues

1. **Widget not appearing**: Ensure your `tenantId` and `apiKey` are correct and the script is properly added to your website.

2. **Message not sending**: Check your browser console for any errors. Ensure your API key has proper permissions.

3. **Styling conflicts**: If your website's CSS interferes with the widget, you may need to add more specific CSS selectors.

### Browser Compatibility

The SupportAI Chat Widget is compatible with all modern browsers:
- Chrome, Firefox, Safari: Latest 2 versions
- Edge: Latest version
- Internet Explorer: Not supported

## Getting Help

If you need assistance with the SupportAI Chat Widget, please contact our support team at support@supportai.com or through your SupportAI admin dashboard.

---

© 2025 SupportAI. All rights reserved.