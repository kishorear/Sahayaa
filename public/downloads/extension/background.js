// SupportAI Chat Widget Extension - Background Script

// When extension is installed, show onboarding page
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({
      url: 'onboarding.html'
    });
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getConfiguration') {
    // Retrieve configuration from storage and send back
    chrome.storage.sync.get(['tenantId', 'apiKey', 'primaryColor', 'position'], (result) => {
      sendResponse({
        tenantId: result.tenantId || '1',
        apiKey: result.apiKey || '',
        primaryColor: result.primaryColor || '#6366F1',
        position: result.position || 'right'
      });
    });
    
    // Return true to indicate we will send response asynchronously
    return true;
  }
  
  if (message.action === 'saveConfiguration') {
    // Save configuration to storage
    chrome.storage.sync.set({
      tenantId: message.config.tenantId,
      apiKey: message.config.apiKey,
      primaryColor: message.config.primaryColor,
      position: message.config.position
    }, () => {
      sendResponse({ success: true });
    });
    
    // Return true to indicate we will send response asynchronously
    return true;
  }
  
  if (message.action === 'injectWidget') {
    // Inject the widget into the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'injectWidgetNow' });
      }
    });
  }
});