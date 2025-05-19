import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Response } from 'express';

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
  requireAuth: boolean;
}

/**
 * Generates a custom chat widget package with the provided configuration
 * including authentication functionality
 * @param config - Widget configuration options
 * @param res - Express response object to pipe the zip file to
 */
export async function generateAuthWidgetPackage(config: WidgetConfig, res: Response): Promise<void> {
  // Set response headers for zip download
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename=support-chat-auth-widget.zip');

  // Create zip archive
  const archive = archiver('zip', {
    zlib: { level: 9 } // Highest compression level
  });

  // Pipe archive data to the response
  archive.pipe(res);

  // Base directory for source files
  const baseDir = path.join(process.cwd(), 'public', 'downloads', 'widget');

  // Add documentation files for authentication widget
  archive.file(path.join(baseDir, 'README-auth-widget.md'), { name: 'README.md' });
  archive.file(path.join(baseDir, 'api-documentation-auth.md'), { name: 'api-documentation.md' });

  // Read the enhanced widget JS template
  const widgetJs = fs.readFileSync(path.join(baseDir, 'support-widget-auth.js'), 'utf8');

  // Read the auth sample implementation template
  const sampleHtml = fs.readFileSync(path.join(baseDir, 'auth-sample-implementation.html'), 'utf8');

  // Customize the widget JS with the provided configuration
  const customizedWidgetJs = widgetJs
    .replace('__TENANT_ID__', config.tenantId.toString())
    .replace('__API_KEY__', config.apiKey)
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

  // Create comprehensive integration guide
  const integrationGuideContent = generateIntegrationGuide(config);

  // Create a simple CSS file for styling the widget
  const cssContent = generateWidgetCSS(config.primaryColor);

  // Add the customized files to the archive
  archive.append(customizedWidgetJs, { name: 'support-widget-auth.js' });
  archive.append(customizedSampleHtml, { name: 'sample-implementation.html' });
  archive.append(integrationGuideContent, { name: 'integration-guide.md' });
  archive.append(cssContent, { name: 'support-widget-auth.css' });

  // Create a minified version of the widget JS (in a real implementation this would be properly minified)
  archive.append(customizedWidgetJs, { name: 'support-widget-auth.min.js' });

  // Finalize the archive
  await archive.finalize();
}

/**
 * Generates an integration guide with step-by-step instructions
 */
function generateIntegrationGuide(config: WidgetConfig): string {
  return `# Support AI Chat Widget Integration Guide

## Quick Start Integration

Add the following code to your website, right before the closing \`</body>\` tag:

\`\`\`html
<!-- Support AI Chat Widget Configuration -->
<script>
  window.supportAiConfig = {
    tenantId: ${config.tenantId},
    apiKey: "${config.apiKey}",
    primaryColor: "${config.primaryColor}",
    position: "${config.position}",
    greetingMessage: "${config.greetingMessage}",
    requireAuth: true,
    autoOpen: ${config.autoOpen},
    branding: ${config.branding},
    reportData: ${config.reportData}
  };
</script>

<!-- Support AI Chat Widget Script -->
<script src="support-widget-auth.js" async></script>
\`\`\`

## Step-by-Step Integration Instructions

1. **Add Files to Your Web Server**

   Upload the following files to your web server:
   - \`support-widget-auth.js\` (or \`support-widget-auth.min.js\` for production)
   - \`support-widget-auth.css\` (optional - for styling)

2. **Include Widget Script in Your HTML**

   Add the widget script to your HTML pages, right before the closing \`</body>\` tag.

3. **Configure Authentication Settings**

   The widget will automatically prompt users to log in before chatting. You can adjust this behavior:
   
   - Set \`requireAuth: false\` to allow anonymous chatting
   - Set \`customAuth: true\` and provide a \`getAuthToken\` function to use your existing authentication system

4. **Test the Widget**

   Open your website and click the chat button. Verify that:
   - Authentication flow works correctly
   - Messages are sent and received properly
   - Widget styling matches your website's design

5. **Advanced Configuration**

   See the README.md and api-documentation.md files for detailed information on:
   - Custom styling options
   - Advanced authentication integration
   - Programmatic control of the widget
   - Event handling and callbacks

## Troubleshooting

If you encounter issues with the widget:

1. Check browser console for error messages
2. Verify your API key and tenant ID are correct
3. Ensure the widget script is loaded correctly
4. Check that your server allows access to the Support AI API endpoints

For assistance, contact Support AI support.

---

© 2025 Support AI - All rights reserved
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

/* Authentication UI Styles */
.support-auth-container {
  padding: 15px;
  border-top: 1px solid #eee;
}

.support-auth-form {
  display: flex;
  flex-direction: column;
}

.support-auth-label {
  margin-bottom: 5px;
  font-size: 14px;
  color: #4a5568;
}

.support-auth-input {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 14px;
}

.support-auth-input:focus {
  border-color: ${primaryColor};
  outline: none;
}

.support-auth-button {
  background-color: ${primaryColor};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.support-auth-button:hover {
  background-color: ${primaryColor}e0;
}

.support-auth-error {
  margin-top: 10px;
  color: #e53e3e;
  font-size: 14px;
  text-align: center;
}

/* Typing indicator */
.support-typing-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.support-typing-indicator span {
  height: 8px;
  width: 8px;
  margin: 0 2px;
  background-color: #9ca3af;
  border-radius: 50%;
  display: inline-block;
  opacity: 0.7;
}

.support-typing-indicator span:nth-child(1) {
  animation: pulse 1s infinite;
}

.support-typing-indicator span:nth-child(2) {
  animation: pulse 1s infinite 0.2s;
}

.support-typing-indicator span:nth-child(3) {
  animation: pulse 1s infinite 0.4s;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.7;
  }
}`;
}