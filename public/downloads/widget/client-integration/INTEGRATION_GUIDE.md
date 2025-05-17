# Support AI Chat Widget Integration Guide

This guide provides step-by-step instructions for integrating the Support AI chat widget into your website, including user authentication and AI configuration.

## Overview

The Support AI chat widget allows your users to:
- Log in with their user accounts
- Interact with your configured AI assistant
- Get personalized support directly on your website

## Integration Steps

### Step 1: Prepare Your Website

Before adding the widget to your site, ensure that:
- Your website uses HTTPS for secure communication
- You have access to edit your website's HTML or JavaScript
- You have your Support AI credentials (Tenant ID and API Key)

### Step 2: Download the Integration Package

The integration package includes:
- `auth-widget.js` - The main widget script
- `auth-widget.css` - Optional CSS styling
- `README.md` - Detailed documentation
- `INTEGRATION_GUIDE.md` - This step-by-step guide
- `sample-implementation.html` - Example implementation
- `api-examples.js` - API endpoint implementation examples

### Step 3: Add the Widget Files to Your Website

1. **Upload the widget files to your server**
   - Upload `auth-widget.js` and `auth-widget.css` to your web server
   - Place them in a directory accessible by your website (e.g., `/assets/js/` or `/scripts/`)

2. **Include the widget script in your HTML**
   - Add the following code to your website's HTML, just before the closing `</body>` tag:

```html
<!-- Support AI Chat Widget Configuration -->
<script>
  window.supportAiConfig = {
    tenantId: YOUR_TENANT_ID,
    apiKey: "YOUR_API_KEY",
    requireAuth: true
  };
</script>

<!-- Support AI Chat Widget Script -->
<script src="/path/to/auth-widget.js" async></script>
```

3. **Replace the placeholders**
   - Replace `YOUR_TENANT_ID` with your actual tenant ID (numeric value)
   - Replace `YOUR_API_KEY` with your actual API key (string)
   - Replace `/path/to/auth-widget.js` with the actual path to the widget file on your server

### Step 4: Customize the Widget (Optional)

You can customize the widget appearance and behavior by modifying the configuration:

```html
<script>
  window.supportAiConfig = {
    tenantId: YOUR_TENANT_ID,
    apiKey: "YOUR_API_KEY",
    requireAuth: true,                    // Require user authentication
    primaryColor: "6366F1",              // Primary color (hex, without #)
    position: "right",                    // Widget position: "right", "left", or "center"
    greetingMessage: "Hello! How can I help you today?", // Initial message
    autoOpen: false,                      // Auto-open the chat window on page load
    branding: true,                       // Show "Powered by Support AI" branding
    reportData: true                      // Send analytics data
  };
</script>
```

### Step 5: Testing the Widget

After adding the widget to your website:

1. Open your website in a browser
2. Look for the chat widget button in the bottom corner
3. Click the button to open the chat widget
4. Test the authentication by:
   - Creating a new user account
   - Logging in with existing credentials
5. Test the chat functionality by sending messages and receiving AI responses

### Step 6: Implement the Required API Endpoints

For full functionality, you need to implement several API endpoints on your server:

1. **Authentication Endpoints**
   - `/api/widget/auth/login` - Handle user login
   - `/api/widget/auth/register` - Handle user registration

2. **Chat Endpoints**
   - `/api/widget/chat` - Process messages and return AI responses

3. **Analytics Endpoint**
   - `/api/widget/analytics` - Collect usage analytics

Example implementations for these endpoints can be found in the `api-examples.js` file included in this package.

### Step 7: Connect to Your AI Provider

The widget automatically uses the AI provider configured in your Support AI admin dashboard. To configure your AI provider:

1. Log in to your Support AI admin dashboard
2. Navigate to "AI Configuration"
3. Select and configure your preferred AI provider
4. Save your changes

The widget will automatically use your selected AI provider without any additional code changes.

## Advanced Integration Options

### Single Page Applications (SPAs)

For SPAs built with frameworks like React, Angular, or Vue:

1. **Import the widget script programmatically**:
   ```javascript
   // Import the widget script
   const script = document.createElement('script');
   script.src = '/path/to/auth-widget.js';
   script.async = true;
   document.body.appendChild(script);
   
   // Set configuration
   window.supportAiConfig = {
     tenantId: YOUR_TENANT_ID,
     apiKey: "YOUR_API_KEY",
     requireAuth: true
   };
   ```

2. **Control the widget programmatically**:
   ```javascript
   // Open the chat window
   window.SupportAIChat.open();
   
   // Close the chat window
   window.SupportAIChat.close();
   
   // Log out the current user
   window.SupportAIChat.logout();
   ```

### Custom Authentication Integration

If you have an existing authentication system, you can integrate it with the widget:

1. **Pass authentication tokens**:
   ```javascript
   // After user logs in to your system
   const userToken = "your-auth-token";
   const userData = {
     id: 123,
     name: "User Name",
     email: "user@example.com"
   };
   
   // Update the widget authentication state
   window.SupportAIChat.setAuth(userData, userToken);
   ```

2. **Listen for authentication events**:
   ```javascript
   window.addEventListener('supportai:auth', function(event) {
     const authData = event.detail;
     console.log('Auth event:', authData.action, authData.user);
   });
   ```

## Troubleshooting

### Widget Not Appearing

- Check browser console for JavaScript errors
- Verify the script path is correct
- Ensure the tenant ID and API key are valid

### Authentication Issues

- Check your API endpoints are properly configured
- Verify your server is correctly processing authentication requests
- Look for CORS issues if your API is on a different domain

### Chat Not Working

- Check network requests for API call failures
- Verify your AI provider configuration in the Support AI admin dashboard
- Ensure your server is correctly processing chat messages

## Getting Additional Help

If you encounter issues not covered in this guide:

1. Check the detailed documentation in `README.md`
2. Refer to the example implementation in `sample-implementation.html`
3. Contact Support AI support at support@supportai.com

---

© 2025 Support AI. All rights reserved.