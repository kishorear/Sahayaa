# Support AI Chat Widget Technical API Documentation

## API Integration Reference

This document provides detailed technical information for developers integrating the Support AI Chat Widget with authentication and API key functionality into websites and applications.

## Authentication Flow

### Overview

The Support AI Chat Widget implements a secure authentication flow that allows users to log in before engaging with the support chat. This ensures that only authorized users can access your support system and that conversations can be associated with specific user accounts.

### Authentication Sequence

1. **Initialization**: Widget loads with `requireAuth` setting (default: `true`)
2. **User Interface**: If authentication is required, the login form is displayed
3. **Credential Collection**: Widget collects user credentials (email/password)
4. **Authentication Request**: Credentials are securely transmitted to Support AI server
5. **Validation**: Server validates credentials against your tenant's user database
6. **Session Creation**: Upon successful authentication, a user session is created
7. **Widget State**: Chat interface becomes available to the authenticated user

### API Endpoints

#### Authentication Request

```
POST https://api.support.ai/api/widget-auth
```

**Headers:**
```
Content-Type: application/json
X-API-Key: YOUR_API_KEY
```

**Request Body:**
```json
{
  "username": "user123",
  "password": "userPassword123",
  "tenantId": 12345
}
```

**Success Response (200 OK):**
```json
{
  "id": "user-uuid-123",
  "name": "John Doe",
  "email": "user@example.com",
  "token": "jwt-auth-token-xyz"
}
```

**Error Response (401 Unauthorized):**
```json
{
  "error": "Authentication failed",
  "message": "Invalid email or password"
}
```

### Session Management

The widget stores authentication tokens in localStorage for persistence across page visits:

```javascript
// Store authentication
localStorage.setItem('supportAiUser', JSON.stringify({
  id: "user-uuid-123",
  name: "John Doe",
  email: "user@example.com",
  token: "jwt-auth-token-xyz"
}));

// Retrieve authentication
const userInfo = JSON.parse(localStorage.getItem('supportAiUser'));

// Clear authentication on logout
localStorage.removeItem('supportAiUser');
```

## API Key Integration

### Overview

The API key mechanism allows the widget to securely connect to your tenant's AI provider configuration. When a user interacts with the widget, it communicates with the Support AI backend using your API key to access the specific AI models and knowledge sources you've configured.

### API Key Usage

1. **Configuration**: API key is set during widget configuration
2. **Request Authorization**: Key is included in all API requests to the Support AI backend
3. **Access Control**: Backend validates the key to ensure it has access to the specified tenant
4. **AI Provider Selection**: Tenant-specific AI provider configuration is applied to the conversation

### Agent Workflow API

#### Process Support Request

```
POST https://api.support.ai/api/agents/process
```

**Headers:**
```
Content-Type: application/json
X-API-Key: YOUR_API_KEY
X-Tenant-ID: YOUR_TENANT_ID
```

**Request Body:**
```json
{
  "user_message": "I need help with my order",
  "tenant_id": 12345,
  "session_id": "session_abc123",
  "user_id": "user-uuid-123",
  "user_context": {
    "url": "https://example.com/checkout",
    "referrer": "https://example.com/products",
    "timestamp": "2025-06-17T23:30:00.000Z",
    "username": "user123",
    "name": "John Doe"
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "ticket_id": 1234,
  "ticket_title": "Order Status Inquiry",
  "status": "open",
  "category": "orders",
  "urgency": "medium",
  "resolution_steps": [
    "I'd be happy to help with your order inquiry.",
    "To assist you better, could you please provide your order number?",
    "You can find this in your order confirmation email or account dashboard."
  ],
  "resolution_steps_count": 3,
  "confidence_score": 0.85,
  "processing_time_ms": 1250,
  "created_at": "2025-06-17T23:30:01.250Z",
  "source": "widget"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid request format or missing required fields"
}
```

#### Analytics Event

```
POST https://api.support.ai/api/widget/analytics
```

**Headers:**
```
Content-Type: application/json
X-API-Key: YOUR_API_KEY
```

**Request Body:**
```json
{
  "tenantId": 12345,
  "apiKey": "YOUR_API_KEY",
  "sessionId": "session_abc123",
  "timestamp": "2025-05-19T15:30:45.123Z",
  "eventType": "message_sent",
  "metadata": {
    "url": "https://example.com/products",
    "referrer": "https://example.com",
    "userAgent": "Mozilla/5.0...",
    "content": "I need help with my order"
  },
  "user": {
    "id": "user-uuid-123",
    "email": "user@example.com"
  }
}
```

## Widget JavaScript API

### Initialization

```javascript
// Basic initialization
window.SupportAIChat.init({
  tenantId: 12345,
  apiKey: "YOUR_API_KEY"
});

// Advanced initialization with all options
window.SupportAIChat.init({
  tenantId: 12345,
  apiKey: "YOUR_API_KEY",
  primaryColor: "#6366F1",
  position: "right",
  greetingMessage: "How can I help you today?",
  requireAuth: true,
  autoOpen: false,
  branding: true,
  reportData: true,
  serverUrl: "https://api.support.ai",
  debug: false,
  customAuth: false,
  getAuthToken: null
});
```

### Methods

```javascript
// Get widget instance
const widget = window.SupportAIChat.init({
  tenantId: 12345,
  apiKey: "YOUR_API_KEY"
});

// Open chat window
widget.openChat();

// Close chat window
widget.closeChat();

// Send message programmatically
widget.sendMessage("Hello, I need help");

// Log out the current user
widget.logout();

// Add a custom message to the chat (without sending to server)
widget.addMessage("user", "This is a local message only");
widget.addMessage("assistant", "This is a response message");

// Get current authentication state
const isAuthenticated = widget.isAuthenticated;

// Get current user information
const userInfo = widget.userInfo;

// Handle special action
widget.handleSpecialAction({
  type: "display_order",
  data: {
    orderId: "ORD-12345",
    status: "shipped",
    estimatedDelivery: "2025-05-20"
  }
});

// Report custom event
widget.reportEvent("custom_event", {
  customProperty: "value"
});
```

## Widget Events

The widget dispatches custom events that you can listen for:

```javascript
// Widget initialization
window.addEventListener('supportai:initialized', function(e) {
  console.log('Chat widget initialized', e.detail);
});

// Authentication success
window.addEventListener('supportai:authenticated', function(e) {
  console.log('User authenticated', e.detail.user);
});

// Authentication failure
window.addEventListener('supportai:auth_error', function(e) {
  console.log('Authentication error', e.detail.error);
});

// Chat opened
window.addEventListener('supportai:opened', function(e) {
  console.log('Chat opened');
});

// Chat closed
window.addEventListener('supportai:closed', function(e) {
  console.log('Chat closed');
});

// Message sent
window.addEventListener('supportai:message_sent', function(e) {
  console.log('Message sent', e.detail.message);
});

// Message received
window.addEventListener('supportai:message_received', function(e) {
  console.log('Message received', e.detail.message);
});

// Logout
window.addEventListener('supportai:logout', function(e) {
  console.log('User logged out');
});
```

## Custom Authentication

For websites with existing authentication systems, you can bypass the built-in login form:

```javascript
// Initialize with custom authentication handler
window.SupportAIChat.init({
  tenantId: 12345,
  apiKey: "YOUR_API_KEY",
  customAuth: true,
  getAuthToken: async function() {
    // Get token from your existing auth system
    const token = await yourAuthSystem.getToken();
    
    // Return user info in expected format
    return {
      id: yourAuthSystem.getUserId(),
      name: yourAuthSystem.getUserName(),
      email: yourAuthSystem.getUserEmail(),
      token: token
    };
  }
});
```

## Styling Customization

### CSS Variables

The widget injects styles with CSS variables that you can override:

```css
:root {
  --supportai-primary-color: #6366F1;
  --supportai-text-color: #ffffff;
  --supportai-bg-color: #ffffff;
  --supportai-border-radius: 12px;
  --supportai-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

### Custom CSS

You can apply your own styles to override the default widget appearance:

```css
/* Example custom styling */
.support-widget-container {
  /* Custom container styles */
}

.support-widget-button {
  /* Custom button styles */
}

.support-chat-window {
  /* Custom chat window styles */
}

.support-message-assistant {
  /* Custom AI message styles */
}

.support-message-user {
  /* Custom user message styles */
}

.support-auth-container {
  /* Custom auth container styles */
}

.support-auth-button {
  /* Custom auth button styles */
}
```

## Security Considerations

### API Key Protection

Your API key grants access to your tenant's AI configuration. To protect it:

1. **Server-side Rendering**: For production environments, consider server-side rendering of the widget configuration to avoid exposing the API key in client-side code.

2. **Domain Restrictions**: In your Support AI dashboard, restrict API key usage to specific domains.

3. **Key Rotation**: Regularly rotate your API keys, especially if they might have been compromised.

### Authentication Security

1. **HTTPS Only**: The widget requires HTTPS for all authentication operations.

2. **Credential Handling**: User credentials are only sent over HTTPS and are never stored in plain text.

3. **Token Storage**: Authentication tokens are stored in localStorage, which is vulnerable to XSS attacks. For highest security, implement custom authentication with your own secure token storage.

## Common Code Patterns

### Loading the Widget Conditionally

```javascript
// Only load for logged-in users
if (userIsLoggedIn) {
  window.supportAiConfig = {
    tenantId: 12345,
    apiKey: "YOUR_API_KEY",
    requireAuth: false // Skip auth since user is already authenticated
  };
  
  const script = document.createElement('script');
  script.src = '/support-widget-auth.js';
  script.async = true;
  document.body.appendChild(script);
}
```

### Passing User Context

```javascript
// Initialize with existing user information
window.supportAiConfig = {
  tenantId: 12345,
  apiKey: "YOUR_API_KEY",
  requireAuth: false,
  userContext: {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    accountType: currentUser.accountType,
    subscriptionLevel: currentUser.subscriptionLevel
  }
};
```

### Multi-tenant Implementation

```javascript
// Determine tenant based on subdomain or other factors
function getCurrentTenantId() {
  const subdomain = window.location.hostname.split('.')[0];
  const tenantMap = {
    'customer1': 101,
    'customer2': 102,
    'customer3': 103
  };
  return tenantMap[subdomain] || 101; // Default tenant
}

// Initialize widget with dynamic tenant
window.supportAiConfig = {
  tenantId: getCurrentTenantId(),
  apiKey: "YOUR_API_KEY"
};
```

## Error Handling

The widget implements robust error handling to maintain a good user experience:

1. **Connection Errors**: If the widget cannot connect to the Support AI server, it will display a friendly error message and retry automatically.

2. **Authentication Errors**: Failed login attempts display appropriate error messages without exposing sensitive information.

3. **Message Errors**: If a message fails to send, the user is notified and given the option to retry.

4. **Graceful Degradation**: If critical components fail, the widget will attempt to continue operating with reduced functionality rather than crashing completely.

## Performance Optimization

The widget is designed to be lightweight and performant:

1. **Lazy Loading**: The script loads asynchronously and initializes only when needed.

2. **Minimal Dependencies**: No external dependencies are required.

3. **Efficient DOM Operations**: DOM manipulations are batched for better performance.

4. **Memory Management**: Event listeners are properly cleaned up to prevent memory leaks.

## Browser Compatibility

The widget supports the following browsers:

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 16+
- Opera 50+
- iOS Safari 12+
- Android Chrome 60+

For older browsers, we recommend implementing a feature detection system to provide an alternative support experience.

---

© 2025 Support AI - All rights reserved