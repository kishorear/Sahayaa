# Support AI Chat Widget Integration Guide

This guide explains how to integrate the Support AI Chat Widget into your website with user authentication and AI provider configuration.

## Quick Start Integration

Add this script to your website before the closing `</body>` tag:

```html
<script>
  // Widget configuration - replace with your own values
  window.supportAiConfig = {
    tenantId: "__TENANT_ID__",
    apiKey: "__API_KEY__",
    primaryColor: "__PRIMARY_COLOR__",
    position: "right", // or "left"
    apiEndpoint: "https://your-support-ai-instance.com/api",
    authEndpoint: "https://your-support-ai-instance.com/api/auth",
    requireAuth: true,
    greetingMessage: "Hello! Please log in to get assistance.",
    autoOpen: false
  };
</script>
<script src="auth-support-script.js" async></script>
```

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `tenantId` | Your Support AI tenant ID | Required |
| `apiKey` | Your API key for authentication | Required |
| `primaryColor` | Widget color (hex without #) | "6366F1" |
| `position` | Widget position ("left" or "right") | "right" |
| `apiEndpoint` | URL of the Support AI API | Required |
| `authEndpoint` | URL of the authentication API | Required |
| `requireAuth` | Whether user login is required | true |
| `greetingMessage` | Initial message shown in the chat | "Hello! How can I help you today?" |
| `autoOpen` | Whether to auto-open the chat when loaded | false |
| `branding` | Whether to show Support AI branding | true |
| `reportData` | Whether to send analytics data | true |

## Authentication Flow

The widget supports user authentication with these flows:

1. **Login**: Users can log in with their email and password
2. **Registration**: New users can create an account
3. **Token Management**: Authentication tokens are securely stored in sessionStorage
4. **AI Connection**: After authentication, the widget connects to your configured AI provider

### Authentication Endpoints

Your authentication service needs to implement these endpoints:

- `POST /login` - Authenticate an existing user
- `POST /register` - Register a new user

#### Login Request

```json
{
  "email": "user@example.com",
  "password": "user_password"
}
```

#### Login Response

```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com"
  },
  "token": "jwt_auth_token"
}
```

#### Registration Request

```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "user_password"
}
```

#### Registration Response

```json
{
  "success": true,
  "user": {
    "id": "new_user_id",
    "name": "New User",
    "email": "newuser@example.com"
  },
  "token": "jwt_auth_token"
}
```

## AI Provider Integration

After authentication, the widget will call your API to get the AI provider configuration:

### AI Configuration Endpoint

- `GET /ai-config` - Get AI provider configuration for the authenticated user

Headers:
- `Authorization: Bearer <token>`
- `X-Tenant-ID: <tenant_id>`
- `X-API-Key: <api_key>`

Response:
```json
{
  "success": true,
  "config": {
    "provider": "openai",
    "model": "gpt-4o",
    "apiKey": "configured_api_key",
    "options": {
      "temperature": 0.7,
      "maxTokens": 1000
    }
  }
}
```

### Chat Message Endpoint

The widget sends messages to this endpoint:

- `POST /chat` - Send a message to the AI provider

Headers:
- `Authorization: Bearer <token>`
- `X-Tenant-ID: <tenant_id>`
- `X-API-Key: <api_key>`

Request:
```json
{
  "message": "User's message text",
  "sessionId": "chat_session_id",
  "history": [
    {"role": "user", "content": "Previous user message"},
    {"role": "assistant", "content": "Previous assistant response"}
  ],
  "pageContext": {
    "url": "https://example.com/product",
    "title": "Product Page",
    "domain": "example.com"
  }
}
```

Response:
```json
{
  "success": true,
  "response": "AI provider's response text"
}
```

## Advanced Usage

### Programmatic Control

You can programmatically control the widget using the global `SupportAI` object:

```javascript
// Open the chat window
SupportAI.openChat();

// Close the chat window
SupportAI.closeChat();

// Toggle the chat window
SupportAI.toggleChat();

// Check if the user is authenticated
const isLoggedIn = SupportAI.isAuthenticated();

// Log out the current user
SupportAI.logout();
```

### Styling Customization

The widget uses Shadow DOM for style isolation, ensuring it won't conflict with your website's styles. You can customize the appearance by adjusting the `primaryColor` option in the configuration.

## Security Considerations

1. **API Key Protection**: Your API key is embedded in the script. Implement server-side validation to ensure it's only used from authorized domains.

2. **Authentication Tokens**: Authentication tokens are stored in sessionStorage, which means they're limited to the current browser session.

3. **CORS Configuration**: Ensure your API server allows requests from your website's domain.

4. **Rate Limiting**: Implement rate limiting on your authentication endpoints to prevent abuse.

## Troubleshooting

### Widget Not Appearing

- Check that the scripts are properly included in your HTML
- Verify that your `tenantId` and `apiKey` are correct
- Check your browser console for any JavaScript errors

### Authentication Issues

- Verify that your `authEndpoint` is correct and accessible
- Ensure your authentication server returns responses in the exact format expected
- Check that your authentication server allows CORS requests from your domain

### AI Integration Issues

- Verify that your `apiEndpoint` is correct and accessible
- Ensure the authenticated user has proper access to the AI configuration
- Check that the AI provider configuration is properly formatted

## Example Implementation

See the included `auth-sample-implementation.html` file for a complete example of how to implement the widget with authentication.

## Support

For additional help, contact Support AI at support@supportai.com or visit our documentation at https://docs.supportai.com.