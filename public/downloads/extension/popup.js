document.addEventListener('DOMContentLoaded', function() {
  // Load saved settings
  chrome.storage.sync.get({
    tenantId: '',
    apiKey: '',
    primaryColor: '#6366F1',
    position: 'right',
    autoOpen: false,
    branding: true,
    activeTabId: null,
    activeDomains: {}
  }, function(items) {
    document.getElementById('tenant-id').value = items.tenantId;
    document.getElementById('api-key').value = items.apiKey;
    document.getElementById('primary-color').value = items.primaryColor;
    document.getElementById('position').value = items.position;
    document.getElementById('auto-open').checked = items.autoOpen;
    document.getElementById('branding').checked = items.branding;
    
    // Check if widget is active on current tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      const url = new URL(currentTab.url);
      const domain = url.hostname;
      
      if (items.activeDomains[domain]) {
        setActiveStatus(true);
      } else {
        setActiveStatus(false);
      }
    });
  });
  
  // Save settings
  function saveSettings() {
    const tenantId = document.getElementById('tenant-id').value;
    const apiKey = document.getElementById('api-key').value;
    const primaryColor = document.getElementById('primary-color').value;
    const position = document.getElementById('position').value;
    const autoOpen = document.getElementById('auto-open').checked;
    const branding = document.getElementById('branding').checked;
    
    chrome.storage.sync.set({
      tenantId: tenantId,
      apiKey: apiKey,
      primaryColor: primaryColor,
      position: position,
      autoOpen: autoOpen,
      branding: branding
    });
  }
  
  // Set active/inactive status in the UI
  function setActiveStatus(isActive) {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (isActive) {
      indicator.classList.remove('inactive');
      indicator.classList.add('active');
      statusText.textContent = 'Widget is active on this site';
    } else {
      indicator.classList.remove('active');
      indicator.classList.add('inactive');
      statusText.textContent = 'Widget is inactive on this site';
    }
  }
  
  // Activate widget on current site
  document.getElementById('activate').addEventListener('click', function() {
    saveSettings();
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      const url = new URL(currentTab.url);
      const domain = url.hostname;
      
      // Save domain as active
      chrome.storage.sync.get({activeDomains: {}}, function(data) {
        data.activeDomains[domain] = true;
        chrome.storage.sync.set({activeDomains: data.activeDomains}, function() {
          // Inject widget
          const config = {
            tenantId: document.getElementById('tenant-id').value,
            apiKey: document.getElementById('api-key').value,
            primaryColor: document.getElementById('primary-color').value,
            position: document.getElementById('position').value,
            autoOpen: document.getElementById('auto-open').checked,
            branding: document.getElementById('branding').checked
          };
          
          chrome.tabs.sendMessage(currentTab.id, {
            action: 'activateWidget',
            config: config
          });
          
          setActiveStatus(true);
        });
      });
    });
  });
  
  // Deactivate widget on current site
  document.getElementById('deactivate').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentTab = tabs[0];
      const url = new URL(currentTab.url);
      const domain = url.hostname;
      
      // Remove domain from active list
      chrome.storage.sync.get({activeDomains: {}}, function(data) {
        delete data.activeDomains[domain];
        chrome.storage.sync.set({activeDomains: data.activeDomains}, function() {
          // Remove widget
          chrome.tabs.sendMessage(currentTab.id, {
            action: 'deactivateWidget'
          });
          
          setActiveStatus(false);
        });
      });
    });
  });
});