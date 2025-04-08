// Content script for SupportAI Widget extension
let widgetInitialized = false;
let widgetContainer = null;
let widgetScript = null;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'activateWidget') {
    initializeWidget(message.config);
  } else if (message.action === 'deactivateWidget') {
    removeWidget();
  }
  return true;
});

// Check if we should activate the widget on this domain
chrome.storage.sync.get({activeDomains: {}}, function(data) {
  const domain = window.location.hostname;
  if (data.activeDomains[domain]) {
    // Get widget configuration
    chrome.storage.sync.get({
      tenantId: '',
      apiKey: '',
      primaryColor: '#6366F1',
      position: 'right',
      autoOpen: false,
      branding: true
    }, function(config) {
      // Only initialize if we have the required configuration
      if (config.tenantId && config.apiKey) {
        initializeWidget(config);
      }
    });
  }
});

// Initialize the SupportAI widget
function initializeWidget(config) {
  if (widgetInitialized) {
    removeWidget(); // Remove existing widget first
  }
  
  // Create global configuration object
  const configScript = document.createElement('script');
  configScript.textContent = `
    window.supportAiConfig = {
      tenantId: "${config.tenantId}",
      apiKey: "${config.apiKey}",
      primaryColor: "${config.primaryColor}",
      position: "${config.position}",
      autoOpen: ${config.autoOpen},
      branding: ${config.branding},
      reportData: true
    };
  `;
  document.head.appendChild(configScript);
  
  // Create container for the widget
  widgetContainer = document.createElement('div');
  widgetContainer.id = 'supportai-widget-container';
  document.body.appendChild(widgetContainer);
  
  // Inject the widget script
  widgetScript = document.createElement('script');
  widgetScript.src = 'https://supportai.com/widget.js';
  document.body.appendChild(widgetScript);
  
  widgetInitialized = true;
}

// Remove the widget from the page
function removeWidget() {
  if (widgetContainer) {
    document.body.removeChild(widgetContainer);
    widgetContainer = null;
  }
  
  if (widgetScript) {
    document.body.removeChild(widgetScript);
    widgetScript = null;
  }
  
  // Add cleanup code to remove any other elements added by the widget
  const widgetElements = document.querySelectorAll('[data-supportai-widget]');
  widgetElements.forEach(element => {
    element.parentNode.removeChild(element);
  });
  
  // Reset the flag
  widgetInitialized = false;
}