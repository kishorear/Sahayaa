# Support AI Chat Widget Integration Package

This package provides everything you need to integrate the Support AI chat widget into your website, complete with user authentication and AI configuration functionality.

## Table of Contents

1. [Features](#features)
2. [Quick Start](#quick-start)
3. [Installation Options](#installation-options)
4. [Configuration Options](#configuration-options)
5. [Authentication Setup](#authentication-setup)
6. [AI Provider Configuration](#ai-provider-configuration)
7. [JavaScript API](#javascript-api)
8. [Technical Documentation](#technical-documentation)
9. [Troubleshooting](#troubleshooting)
10. [Security Considerations](#security-considerations)

## Features

- **User Authentication:** Built-in login and registration for your customers
- **AI Integration:** Automatically uses your Support AI provider settings
- **Persistent Chat:** Conversation history saved across page navigation
- **Customizable UI:** Adjustable colors, position, and messaging
- **Responsive Design:** Works on desktop and mobile devices
- **Cross-Domain Support:** Functions across your entire website
- **Secure Communication:** Encrypted data exchange with your Support AI instance
- **Analytics Integration:** Optional usage tracking and insights

## Quick Start

### 1. Include the widget script in your website

Add the following code to your website's HTML, right before the closing `</body>` tag:

```html
<!-- Support AI Chat Widget Configuration -->
<script>
  window.supportAiConfig = {
    tenantId: __TENANT_ID__,
    apiKey: "__API_KEY__",
    requireAuth: true
  };
</script>

<!-- Support AI Chat Widget Script -->
<script src="path/to/auth-widget.js" async></script>
```

Replace `path/to/auth-widget.js` with the actual path where you've placed the widget files from this package.

### 2. Test the widget

After adding the code, refresh your website and you should see the chat widget button in the bottom right (or left, depending on your configuration) corner of the page. Click it to open the chat interface.

## Installation Options

You have several options for installing the widget:

### Option 1: Direct File Inclusion

1. Copy the `auth-widget.js` and `auth-widget.css` files to your website's assets directory
2. Include the script as shown in the Quick Start section

### Option 2: CDN Hosting (Recommended)

If you have a CDN, upload the widget files and reference them via your CDN URL:

```html
<script src="https://your-cdn.com/path/to/auth-widget.js" async></script>
```

### Option 3: Self-Hosted Script

Host the files on your own server and reference them accordingly:

```html
<script src="https://your-server.com/assets/auth-widget.js" async></script>
```

## Configuration Options

You can customize the widget by setting these options in the `supportAiConfig` object:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tenantId` | Number | | **Required**: Your Support AI tenant ID |
| `apiKey` | String | | **Required**: Your API key for authentication |
| `requireAuth` | Boolean | `true` | Whether to require user authentication |
| `primaryColor` | String | `"6366F1"` | Widget color (hexadecimal, without #) |
| `position` | String | `"right"` | Widget position (`"right"`, `"left"`, or `"center"`) |
| `greetingMessage` | String | `"How can I help you today?"` | Initial message in chat |
| `autoOpen` | Boolean | `false` | Whether to automatically open the chat |
| `branding` | Boolean | `true` | Whether to show Support AI branding |
| `reportData` | Boolean | `true` | Whether to send analytics data |
| `serverUrl` | String | | Custom server URL (leave blank to use auto-detection) |

Example of a fully customized configuration:

```javascript
window.supportAiConfig = {
  tenantId: 12345,
  apiKey: "wgt_abcdef123456",
  requireAuth: true,
  primaryColor: "4f46e5",
  position: "left",
  greetingMessage: "Hello! Please log in to get support.",
  autoOpen: false,
  branding: true,
  reportData: true,
  serverUrl: "https://your-support-ai-instance.com"
};
```

## Authentication Setup

The widget provides built-in authentication with these capabilities:

- **User Login:** Email and password authentication
- **User Registration:** New users can create accounts
- **Persistent Sessions:** Login state is saved between visits
- **Secure Tokens:** Authentication uses secure JWT tokens

All user accounts created through the widget are automatically associated with your tenant in the Support AI system. You can manage these users through your Support AI admin dashboard.

### Authentication Workflow

1. When a user first interacts with the widget, they'll be prompted to log in or create an account
2. After authentication, the chat interface becomes available
3. User sessions persist across page refreshes and visits
4. You can programmatically log out users if needed

## AI Provider Configuration

The widget automatically uses the AI provider configured in your Support AI account. No additional setup is required to connect to your chosen AI service.

To customize your AI provider:

1. Log in to your Support AI admin dashboard
2. Navigate to the "AI Configuration" section
3. Select your preferred AI provider and update any settings
4. Save your changes

The widget will automatically use your updated AI configuration with no code changes required.

## JavaScript API

The widget provides a JavaScript API for programmatic control:

```javascript
// Initialize with custom configuration
window.SupportAIChat.init({
  tenantId: 12345,
  apiKey: "wgt_abcdef123456",
  requireAuth: true
});

// Open the chat window
window.SupportAIChat.open();

// Close the chat window
window.SupportAIChat.close();

// Log out the current user
window.SupportAIChat.logout();
```

## Technical Documentation

### File Structure

This package contains the following files:

- `auth-widget.js` - The main widget script with authentication support
- `auth-widget.css` - Optional CSS file for custom styling
- `sample-implementation.html` - Example implementation
- `README.md` - This documentation file

### Integration with Single Page Applications (SPAs)

The widget works seamlessly with Single Page Applications. It uses a combination of techniques to detect page transitions:

1. `MutationObserver` to detect DOM changes
2. `popstate` event listener for history navigation
3. URL tracking for client-side routing

### Browser Compatibility

The widget is compatible with all modern browsers:

- Chrome, Firefox, Safari: Latest 2 versions
- Edge: Latest version
- Internet Explorer: Not supported

## Troubleshooting

### The widget isn't appearing on my website

- Check that the script is properly included in your HTML
- Verify that the `tenantId` and `apiKey` values are correct
- Check your browser console for any JavaScript errors

### Users can't log in

- Verify your API key is valid and has the correct permissions
- Check that your Support AI instance is running correctly
- Try clearing your browser's localStorage and sessionStorage

### Chat messages aren't sending

- Check your network connection
- Verify the API endpoint is accessible from your domain
- Ensure the user is properly authenticated

## Security Considerations

To ensure the security of your Support AI integration:

- Host the widget files on a secure (HTTPS) server
- Never expose your API key in client-side code without proper safeguards
- Regularly rotate your API keys for enhanced security
- Set appropriate CORS headers on your server to control access
- Use Content Security Policy (CSP) headers to enhance security

## Support

If you need help with the widget integration, please contact our support team:

- Email: support@supportai.com
- Support Portal: https://support.supportai.com

---

© 2025 Support AI. All rights reserved.