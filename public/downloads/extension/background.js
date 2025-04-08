// Background script for SupportAI Widget Extension

// Listen for installation
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // Open onboarding page after installation
    chrome.tabs.create({
      url: 'onboarding.html'
    });
  }
});

// Check on tab updates if widget should be activated
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const url = new URL(tab.url);
      const domain = url.hostname;
      
      // Check if this domain is in our active domains list
      chrome.storage.sync.get({activeDomains: {}}, function(data) {
        if (data.activeDomains[domain]) {
          // Notify the content script to activate the widget
          chrome.tabs.sendMessage(tabId, {
            action: 'checkActivation',
            domain: domain
          });
        }
      });
    } catch (e) {
      // Invalid URL, do nothing
    }
  }
});