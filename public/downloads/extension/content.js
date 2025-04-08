// SupportAI Chat Widget Extension - Content Script

// Flag to prevent multiple injections of the widget
let widgetInjected = false;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'injectWidgetNow') {
    injectChatWidget();
  }
});

// Function to inject chat widget script
function injectChatWidget() {
  // Only inject if not already injected
  if (widgetInjected) return;
  
  // Get configuration from storage
  chrome.storage.sync.get(['tenantId', 'apiKey', 'primaryColor', 'position'], (config) => {
    // Create widget configuration
    const widgetConfig = {
      tenantId: config.tenantId || '1',
      apiKey: config.apiKey || '',
      primaryColor: config.primaryColor || '#6366F1',
      position: config.position || 'right'
    };
    
    // Create script element with configuration
    const script = document.createElement('script');
    script.textContent = `
      window.supportAiConfig = {
        tenantId: "${widgetConfig.tenantId}",
        apiKey: "${widgetConfig.apiKey}",
        primaryColor: "${widgetConfig.primaryColor}",
        position: "${widgetConfig.position}",
        autoOpen: false,
        branding: true
      };
    `;
    document.head.appendChild(script);
    
    // Create and inject the widget script
    const widgetScript = document.createElement('script');
    widgetScript.src = "https://supportai.com/widget.js";
    document.head.appendChild(widgetScript);
    
    // Mark as injected
    widgetInjected = true;
    
    // Notify the popup that widget was injected
    chrome.runtime.sendMessage({ action: 'widgetInjected', success: true });
  });
}