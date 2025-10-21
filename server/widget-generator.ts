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

  // Add documentation files including agent workflow guide
  archive.file(path.join(baseDir, 'documentation.md'), { name: 'documentation.md' });
  archive.file(path.join(baseDir, 'api-documentation.md'), { name: 'api-documentation.md' });
  archive.file(path.join(baseDir, 'agent-workflow-integration-guide.md'), { name: 'agent-workflow-guide.md' });

  // Read the widget JS template
  const widgetJs = fs.readFileSync(path.join(baseDir, 'support-widget.js'), 'utf8');

  // Read the sample implementation template
  const sampleHtml = fs.readFileSync(path.join(baseDir, 'sample-implementation.html'), 'utf8');

  // Customize the widget JS with the provided configuration
  const customizedWidgetJs = widgetJs
    .replace('__TENANT_ID__', config.tenantId.toString())
    .replace('__API_KEY__', config.apiKey)
    .replace('__PRIMARY_COLOR__', config.primaryColor)
    .replace('__POSITION__', config.position)
    .replace('__GREETING_MESSAGE__', config.greetingMessage)
    .replace('__AUTO_OPEN__', config.autoOpen.toString())
    .replace('__BRANDING__', config.branding.toString())
    .replace('__REPORT_DATA__', config.reportData.toString())
    .replace('https://api.support.ai', process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'https://your-support-ai-domain.com');

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
  
  // Add the customized files to the archive
  archive.append(customizedWidgetJs, { name: 'supportai-widget.js' });
  archive.append(customizedUniversalScript, { name: 'supportai-universal.js' });
  archive.append(customizedSampleHtml, { name: 'sample-implementation.html' });
  archive.append(universalSampleHtml, { name: 'universal-sample.html' });
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
  return `# Sahayaa AI Chat Widget

Enterprise-grade AI-powered support widget with multi-agent orchestration, vector search, and real-time communication.

## 🚀 Quick Start

### Option 1: Standard Widget Integration
Add the following script tag to your website's HTML, right before the closing \`</body>\` tag:

\`\`\`html
<!-- Sahayaa AI Chat Widget -->
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
    adminId: ${config.adminId},
    enableAttachments: true,
    enableAIAgents: true
  };
</script>
<script src="supportai-widget.js" async></script>
\`\`\`

### Option 2: Universal Integration
For a seamless support experience that persists across your entire website:

\`\`\`html
<!-- Sahayaa AI Universal Integration -->
<script src="supportai-universal.js" async></script>
\`\`\`

The universal integration offers these powerful features:
- **Zero-configuration installation** - works instantly across your entire site
- **Non-intrusive design** - uses Shadow DOM for complete style isolation
- **Cross-page awareness** - maintains context as users navigate your site
- **Persistent chat state** - keeps conversations active during browsing
- **AI-powered responses** - multi-agent system with vector search
- **Lightweight implementation** - minimal impact on page performance
- **Responsive design** - works great on all devices and screen sizes

For a live demonstration of these features, check out the included universal-sample.html file.

### Option 3: Using NPM
Install the widget package using npm:

\`\`\`bash
npm install sahayaa-ai-widget
\`\`\`

Then import and use it in your application:

\`\`\`javascript
import { SahayaaAIChat } from 'sahayaa-ai-widget';

// Initialize the chat widget
SahayaaAIChat.init({
  tenantId: ${config.tenantId},
  apiKey: "${config.apiKey}",
  primaryColor: "${config.primaryColor}",
  position: "${config.position}",
  greetingMessage: "${config.greetingMessage}",
  autoOpen: ${config.autoOpen},
  branding: ${config.branding},
  reportData: ${config.reportData},
  adminId: ${config.adminId},
  enableAttachments: true,
  enableAIAgents: true
});
\`\`\`

### Option 4: For Windows Applications
For Windows applications, use the included \`install-widget.bat\` script. Double-click the batch file and follow the on-screen instructions.

## ✨ Key Features

### Multi-Agent AI System
- **Chat Processor**: Analyzes incoming messages and extracts intent
- **Instruction Lookup**: Searches knowledge base using vector similarity
- **Ticket Lookup**: Finds similar historical tickets for context-aware solutions
- **Ticket Formatter**: Structures responses with relevant information

### Vector-Based Search
- Powered by ChromaDB for intelligent similarity matching
- Finds relevant solutions from knowledge base and historical tickets
- Provides confidence scores and source attribution

### File Attachments
- Support for images (JPG, PNG, GIF, WebP)
- Documents (PDF, DOCX, TXT, XLSX, PPTX)
- Maximum file size: 10MB (configurable)
- Secure tenant-specific storage

### Real-Time Communication
- WebSocket-based instant messaging
- Typing indicators
- Agent status updates
- Multi-tenant isolation

### Enterprise Security
- Role-based access controls (RBAC)
- End-to-end encryption
- JWT authentication
- Rate limiting and DDoS protection

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| tenantId | number | Required | Your Sahayaa AI tenant ID |
| apiKey | string | Required | Your API key for authentication |
| primaryColor | string | #6366F1 | The primary color of the widget |
| position | string | right | Widget position (right, left) |
| greetingMessage | string | Custom | Initial message displayed in the chat |
| autoOpen | boolean | false | Automatically open the chat widget |
| branding | boolean | true | Show Sahayaa AI branding |
| reportData | boolean | true | Send analytics data |
| adminId | number | null | Your admin ID for tracking |
| enableAttachments | boolean | true | Allow file uploads in chat |
| enableAIAgents | boolean | true | Enable multi-agent AI processing |
| maxFileSize | number | 10485760 | Max file size in bytes (10MB) |
| allowedFileTypes | array | ['image/*', 'application/pdf', '.txt', '.docx'] | Allowed file types |

## 📚 What's Included

This package contains:

- **supportai-widget.js** - Main widget JavaScript file
- **supportai-widget.min.js** - Minified version for production
- **supportai-universal.js** - Universal integration script
- **supportai-widget.css** - Widget styling
- **sample-implementation.html** - Basic implementation example
- **universal-sample.html** - Universal integration example
- **documentation.md** - Complete widget documentation
- **api-documentation.md** - Detailed API reference
- **agent-workflow-guide.md** - AI agent integration guide
- **install-widget.bat** - Windows installation script
- **README.md** - This file

## 🔧 Advanced Usage

### JavaScript API

\`\`\`javascript
// Open/close the chat window
window.SahayaaAI.open();
window.SahayaaAI.close();
window.SahayaaAI.toggle();

// Send a message programmatically
window.SahayaaAI.sendMessage("I need help with my order");

// Upload an attachment
window.SahayaaAI.uploadFile(fileObject);

// Get current session
const session = window.SahayaaAI.getSession();

// Update configuration
window.SahayaaAI.updateConfig({
  primaryColor: "#FF0000"
});
\`\`\`

### Event Listeners

\`\`\`javascript
// Listen for widget events
document.addEventListener('sahayaa:opened', () => {
  console.log('Chat opened');
});

document.addEventListener('sahayaa:messageSent', (e) => {
  console.log('Message:', e.detail.message);
});

document.addEventListener('sahayaa:agentProcessing', (e) => {
  console.log('Agent:', e.detail.agent, 'Status:', e.detail.status);
});
\`\`\`

### Customization

\`\`\`css
/* Custom CSS variables */
:root {
  --sahayaa-primary-color: #6366F1;
  --sahayaa-text-color: #1F2937;
  --sahayaa-background: #FFFFFF;
  --sahayaa-border-radius: 12px;
}
\`\`\`

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Opera 76+
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)

## 🛡️ Security & Privacy

- All communications encrypted with TLS 1.3
- GDPR and CCPA compliant
- Tenant-level data isolation
- Role-based access controls
- Optional end-to-end encryption

## 📊 Analytics

The widget automatically tracks:
- Conversation metrics
- Response times
- User satisfaction scores
- AI agent performance
- File attachment usage

Access analytics through your admin dashboard.

## 🐛 Troubleshooting

### Widget not appearing?
- Verify tenantId and apiKey are correct
- Check browser console for errors
- Ensure script is loaded properly

### Messages not sending?
- Check API key permissions
- Verify network connectivity
- Review CORS configuration

### Attachments failing?
- Confirm file size is within limits
- Check file type is allowed
- Verify storage quota

For debug mode:
\`\`\`javascript
window.supportAiConfig = {
  // ...other config
  debug: true,
  logLevel: 'verbose'
};
\`\`\`

## 📖 Documentation

For detailed documentation, see the included files:
- **documentation.md** - Complete feature documentation
- **api-documentation.md** - REST API and WebSocket reference
- **agent-workflow-guide.md** - AI agent system details

## 🆘 Getting Help

- **Documentation**: Refer to included documentation files
- **Admin Dashboard**: Access help articles and submit tickets
- **Email Support**: support@sahayaa-ai.com
- **API Reference**: See api-documentation.md

## 📝 Next Steps

1. Test the widget on your website
2. Customize styling to match your brand
3. Configure AI agent workflows
4. Set up analytics and monitoring
5. Train your team on the admin interface

## 🔄 Updates

To update to the latest version:
1. Download the new widget package
2. Replace existing widget files
3. Clear browser cache
4. Test thoroughly before deployment

---

© 2025 Sahayaa AI. All rights reserved.

For the latest updates and features, visit your admin dashboard.
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