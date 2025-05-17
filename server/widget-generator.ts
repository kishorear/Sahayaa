import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Request, Response } from 'express';

/**
 * Widget configuration options
 */
export interface WidgetConfig {
  tenantId: number;
  apiKey: string;
  primaryColor: string;
  position: string;
  greetingMessage: string;
  autoOpen: boolean;
  branding: boolean;
  reportData: boolean;
  adminId: number;
}

/**
 * Generates a custom chat widget package with the provided configuration
 * @param config - Widget configuration options
 * @param res - Express response object to pipe the zip file to
 */
export async function generateWidgetPackage(config: WidgetConfig, res: Response): Promise<void> {
  // Set response headers for zip download
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=support-chat-widget.zip');

  // Create zip archive
  const archive = archiver('zip', {
    zlib: { level: 9 } // Highest compression level
  });

  // Pipe archive data to the response
  archive.pipe(res);

  // Base directory for source files
  const baseDir = path.join(process.cwd(), 'public', 'downloads', 'widget');

  // Add documentation files as-is
  archive.file(path.join(baseDir, 'documentation.md'), { name: 'documentation.md' });
  archive.file(path.join(baseDir, 'api-documentation.md'), { name: 'api-documentation.md' });

  // Read the widget JS template
  const widgetJs = fs.readFileSync(path.join(baseDir, 'support-widget.js'), 'utf8');

  // Read the sample implementation template
  const sampleHtml = fs.readFileSync(path.join(baseDir, 'sample-implementation.html'), 'utf8');

  // Customize the widget JS with the provided configuration
  const customizedWidgetJs = widgetJs
    .replace('__TENANT_ID__', config.tenantId.toString())
    .replace('__PRIMARY_COLOR__', config.primaryColor)
    .replace('__POSITION__', config.position)
    .replace('__GREETING_MESSAGE__', config.greetingMessage)
    .replace('__AUTO_OPEN__', config.autoOpen.toString())
    .replace('__BRANDING__', config.branding.toString())
    .replace('__REPORT_DATA__', config.reportData.toString());

  // Customize the sample implementation with the provided configuration
  const customizedSampleHtml = sampleHtml
    .replace('__TENANT_ID__', config.tenantId.toString())
    .replace('__API_KEY__', config.apiKey)
    .replace('__PRIMARY_COLOR__', config.primaryColor)
    .replace('__POSITION__', config.position)
    .replace('__GREETING_MESSAGE__', config.greetingMessage)
    .replace('__AUTO_OPEN__', config.autoOpen.toString())
    .replace('__BRANDING__', config.branding.toString())
    .replace('__REPORT_DATA__', config.reportData.toString())
    .replace('__ADMIN_ID__', config.adminId.toString());

  // Create a README.md file with installation instructions
  const readmeContent = generateReadmeContent(config);

  // Read the universal script template
  const universalScript = fs.readFileSync(path.join(baseDir, 'universal-support-script.js'), 'utf8');
  
  // Customize the universal script with the provided configuration
  const customizedUniversalScript = universalScript
    .replace('__TENANT_ID__', config.tenantId.toString())
    .replace('__API_KEY__', config.apiKey)
    .replace('__PRIMARY_COLOR__', config.primaryColor)
    .replace('__POSITION__', config.position)
    .replace('__GREETING_MESSAGE__', config.greetingMessage)
    .replace('__AUTO_OPEN__', config.autoOpen.toString())
    .replace('__BRANDING__', config.branding.toString())
    .replace('__REPORT_DATA__', config.reportData.toString())
    .replace('__ADMIN_ID__', config.adminId.toString());
    
  // Read the universal sample HTML
  const universalSampleHtml = fs.readFileSync(path.join(baseDir, 'universal-sample.html'), 'utf8');
  
  // Read the auth script template (widget with authentication)
  const authScript = fs.readFileSync(path.join(baseDir, 'auth-support-script.js'), 'utf8');
  
  // Read the widget login module
  const loginScript = fs.readFileSync(path.join(baseDir, 'support-widget-login.js'), 'utf8');
  
  // Read the auth sample implementation
  const authSampleHtml = fs.readFileSync(path.join(baseDir, 'auth-sample-implementation.html'), 'utf8');
  
  // Read the auth integration guide
  const authGuide = fs.readFileSync(path.join(baseDir, 'auth-integration-guide.md'), 'utf8');
  
  // Customize the auth script with the provided configuration
  const apiEndpoint = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'your-domain.com'}/api`;
  const authEndpoint = `${apiEndpoint}/auth`;
  
  const customizedAuthScript = authScript
    .replace('__TENANT_ID__', config.tenantId.toString())
    .replace('__API_KEY__', config.apiKey)
    .replace('__PRIMARY_COLOR__', config.primaryColor)
    .replace('__POSITION__', config.position)
    .replace('__GREETING_MESSAGE__', config.greetingMessage)
    .replace('__AUTO_OPEN__', config.autoOpen.toString())
    .replace('__BRANDING__', config.branding.toString())
    .replace('__REPORT_DATA__', config.reportData.toString())
    .replace('__ADMIN_ID__', config.adminId.toString())
    .replace('__API_ENDPOINT__', apiEndpoint)
    .replace('__AUTH_ENDPOINT__', authEndpoint);
  
  // Customize the login script
  const customizedLoginScript = loginScript
    .replace('__TENANT_ID__', config.tenantId.toString())
    .replace('__API_KEY__', config.apiKey)
    .replace('__PRIMARY_COLOR__', config.primaryColor)
    .replace('__API_ENDPOINT__', apiEndpoint)
    .replace('__AUTH_ENDPOINT__', authEndpoint);
  
  // Customize the auth sample implementation
  const customizedAuthSample = authSampleHtml
    .replace('__TENANT_ID__', config.tenantId.toString())
    .replace('__API_KEY__', config.apiKey)
    .replace('__API_ENDPOINT__', apiEndpoint)
    .replace('__AUTH_ENDPOINT__', authEndpoint)
    .replace('__ADMIN_ID__', config.adminId.toString());
  
  // Customize the auth integration guide
  const customizedAuthGuide = authGuide
    .replace('__TENANT_ID__', config.tenantId.toString())
    .replace('__API_KEY__', config.apiKey)
    .replace('__PRIMARY_COLOR__', config.primaryColor)
    .replace('__API_ENDPOINT__', apiEndpoint)
    .replace('__AUTH_ENDPOINT__', authEndpoint);
  
  // Add the customized files to the archive
  archive.append(customizedWidgetJs, { name: 'supportai-widget.js' });
  archive.append(customizedUniversalScript, { name: 'supportai-universal.js' });
  archive.append(customizedAuthScript, { name: 'supportai-auth-widget.js' });
  archive.append(customizedLoginScript, { name: 'supportai-widget-login.js' });
  archive.append(customizedSampleHtml, { name: 'sample-implementation.html' });
  archive.append(universalSampleHtml, { name: 'universal-sample.html' });
  archive.append(customizedAuthSample, { name: 'auth-sample-implementation.html' });
  archive.append(customizedAuthGuide, { name: 'auth-integration-guide.md' });
  archive.append(readmeContent, { name: 'README.md' });

  // Create a Windows batch file for installation
  const batchFileContent = generateWindowsBatchFile(config);
  archive.append(batchFileContent, { name: 'install-widget.bat' });

  // Create a simple CSS file for styling the widget
  const cssContent = generateWidgetCSS(config.primaryColor);
  archive.append(cssContent, { name: 'supportai-widget.css' });

  // Create a minified version of the widget JS
  archive.append(customizedWidgetJs, { name: 'supportai-widget.min.js' });

  // Finalize the archive
  await archive.finalize();
}

/**
 * Generates a README.md file with installation instructions
 */
function generateReadmeContent(config: WidgetConfig): string {
  return `# Support AI Chat Widget

## Installation Instructions

### Option 1: Standard Widget Integration
Add the following script tag to your website's HTML, right before the closing \`</body>\` tag:

\`\`\`html
<!-- Support AI Chat Widget -->
<script>
  window.supportAiConfig = {
    tenantId: ${config.tenantId},
    apiKey: "${config.apiKey}",
    primaryColor: "${config.primaryColor}",
    position: "${config.position}",
    greetingMessage: "${config.greetingMessage}",
    autoOpen: ${config.autoOpen},
    branding: ${config.branding},
    reportData: ${config.reportData},
    adminId: ${config.adminId}
  };
</script>
<script src="supportai-widget.js" async></script>
\`\`\`

### Option 2: Universal Integration
For a seamless support experience that persists across your entire website:

\`\`\`html
<!-- Support AI Universal Integration -->
<script src="supportai-universal.js" async></script>
\`\`\`

The universal integration offers these powerful features:
- **Zero-configuration installation** - works instantly across your entire site
- **Non-intrusive design** - uses Shadow DOM for complete style isolation
- **Cross-page awareness** - maintains context as users navigate your site
- **Persistent chat state** - keeps conversations active during browsing
- **Lightweight implementation** - minimal impact on page performance
- **Responsive design** - works great on all devices and screen sizes

For a live demonstration of these features, check out the included universal-sample.html file.

### Option 3: Authenticated Widget Integration (Recommended)
For a secure experience with user authentication and personalized AI support:

\`\`\`html
<!-- Support AI Authenticated Widget -->
<script>
  window.supportAiConfig = {
    tenantId: ${config.tenantId},
    apiKey: "${config.apiKey}",
    primaryColor: "${config.primaryColor}",
    position: "${config.position}",
    apiEndpoint: "https://your-domain.com/api",
    authEndpoint: "https://your-domain.com/api/auth",
    requireAuth: true,
    greetingMessage: "Hello! Please log in to get assistance."
  };
</script>
<script src="supportai-auth-widget.js" async></script>
\`\`\`

The authenticated widget includes these advanced features:
- **User Authentication** - Secure login/registration system built-in
- **AI Provider Integration** - Connects to your tenant's configured AI provider
- **Personalized Support** - Tailored assistance based on user profiles
- **Cross-page Session Persistence** - Maintains login state during browsing
- **Secure API Communication** - Authenticated requests with JWT tokens

For a complete integration guide with authentication, see the included auth-integration-guide.md file.

### Option 4: Using NPM
Install the widget package using npm:

\`\`\`bash
npm install supportai-widget
\`\`\`

Then import and use it in your application:

\`\`\`javascript
import { SupportAIChat } from 'supportai-widget';

// Initialize the chat widget
SupportAIChat.init({
  tenantId: ${config.tenantId},
  apiKey: "${config.apiKey}",
  primaryColor: "${config.primaryColor}",
  position: "${config.position}",
  greetingMessage: "${config.greetingMessage}",
  autoOpen: ${config.autoOpen},
  branding: ${config.branding},
  reportData: ${config.reportData},
  adminId: ${config.adminId}
});
\`\`\`

## Configuration Options

| Option | Description |
|--------|-------------|
| tenantId | Your Support AI tenant ID |
| apiKey | Your API key for authentication |
| primaryColor | The primary color of the widget |
| position | Widget position (right, left) |
| greetingMessage | Initial message displayed in the chat |
| autoOpen | Whether to automatically open the chat widget |
| branding | Whether to show Support AI branding |
| reportData | Whether to send analytics data |
| apiEndpoint | URL of your Support AI API (for authenticated widget) |
| authEndpoint | URL of your authentication API (for authenticated widget) |
| requireAuth | Whether user login is required (for authenticated widget) |

## Integration Types Comparison

| Feature | Standard Widget | Universal Widget | Authenticated Widget |
|---------|----------------|------------------|---------------------|
| Basic chat functionality | ✓ | ✓ | ✓ |
| Custom styling | ✓ | ✓ | ✓ |
| Cross-page persistence | ✗ | ✓ | ✓ |
| User authentication | ✗ | ✗ | ✓ |
| AI provider connection | ✗ | ✗ | ✓ |
| Personalized support | ✗ | ✗ | ✓ |

## Need Help?
See the documentation.md file for more detailed documentation on basic integration.
For authenticated integration, see auth-integration-guide.md for a comprehensive guide.
If you need further assistance, contact Support AI support.
`;
}

/**
 * Generates a Windows batch file for installing the widget
 */
function generateWindowsBatchFile(config: WidgetConfig): string {
  return `@echo off
echo Support AI Chat Widget Installer
echo =================================
echo.
echo This script will help you install the Support AI Chat Widget in your application.
echo.
echo [1] Installing widget files...
timeout /t 2 > nul

if not exist "%APPDATA%\\SupportAI" mkdir "%APPDATA%\\SupportAI"
copy supportai-widget.js "%APPDATA%\\SupportAI\\" > nul
copy supportai-universal.js "%APPDATA%\\SupportAI\\" > nul
copy supportai-widget.css "%APPDATA%\\SupportAI\\" > nul
copy supportai-widget.min.js "%APPDATA%\\SupportAI\\" > nul

echo [2] Creating configuration...
timeout /t 1 > nul

(
echo window.supportAiConfig = {
echo   tenantId: ${config.tenantId},
echo   apiKey: "${config.apiKey}",
echo   primaryColor: "${config.primaryColor}",
echo   position: "${config.position}",
echo   greetingMessage: "${config.greetingMessage}",
echo   autoOpen: ${config.autoOpen},
echo   branding: ${config.branding},
echo   reportData: ${config.reportData},
echo   adminId: ${config.adminId}
echo };
) > "%APPDATA%\\SupportAI\\supportai-config.js"

echo [3] Installation complete!
echo.
echo The widget has been installed to: %APPDATA%\\SupportAI
echo.
echo To use the standard widget in your application, add these lines to your HTML:
echo ^<script src="%APPDATA%\\SupportAI\\supportai-config.js"^>^</script^>
echo ^<script src="%APPDATA%\\SupportAI\\supportai-widget.js"^>^</script^>
echo.
echo For the universal integration that persists across pages, use:
echo ^<script src="%APPDATA%\\SupportAI\\supportai-universal.js"^>^</script^>
echo.
echo Press any key to exit...
pause > nul
`;
}

/**
 * Generates CSS for the widget with the specified primary color
 */
function generateWidgetCSS(primaryColor: string): string {
  return `/* Support AI Chat Widget Styles */
.support-widget-container {
  position: fixed;
  z-index: 9999;
  bottom: 20px;
  right: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.support-widget-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: ${primaryColor};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.support-widget-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
}

.support-widget-icon {
  width: 32px;
  height: 32px;
}

.support-chat-window {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 350px;
  height: 500px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateY(20px);
  pointer-events: none;
}

.support-chat-window.open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.support-chat-header {
  padding: 15px;
  background-color: ${primaryColor};
  color: white;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.support-chat-close {
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.support-chat-close:hover {
  opacity: 1;
}

.support-chat-messages {
  flex-grow: 1;
  padding: 15px;
  overflow-y: auto;
}

.support-message {
  margin-bottom: 10px;
  max-width: 80%;
  padding: 10px 15px;
  border-radius: 18px;
  word-break: break-word;
}

.support-message-user {
  background-color: ${primaryColor};
  color: white;
  margin-left: auto;
  border-bottom-right-radius: 4px;
}

.support-message-assistant {
  background-color: #f0f0f0;
  color: #333;
  margin-right: auto;
  border-bottom-left-radius: 4px;
}

.support-chat-input {
  display: flex;
  padding: 10px;
  border-top: 1px solid #eee;
}

.support-chat-input input {
  flex-grow: 1;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 10px 15px;
  margin-right: 10px;
  outline: none;
}

.support-chat-input input:focus {
  border-color: ${primaryColor};
}

.support-send-button {
  background-color: ${primaryColor};
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.support-send-button:hover {
  transform: scale(1.05);
}

.support-branding {
  font-size: 11px;
  text-align: center;
  padding: 5px;
  opacity: 0.7;
}
`;
}