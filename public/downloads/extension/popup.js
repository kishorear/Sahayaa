// SupportAI Chat Widget Extension - Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const configForm = document.getElementById('configForm');
  const injectButton = document.getElementById('injectButton');
  const statusDiv = document.getElementById('status');
  
  // Load saved configuration
  loadConfiguration();
  
  // Handle form submission (save configuration)
  configForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveConfiguration();
  });
  
  // Handle inject button click
  injectButton.addEventListener('click', () => {
    injectWidget();
  });
  
  // Load configuration from storage
  function loadConfiguration() {
    chrome.runtime.sendMessage({ action: 'getConfiguration' }, (response) => {
      document.getElementById('tenantId').value = response.tenantId || '';
      document.getElementById('apiKey').value = response.apiKey || '';
      document.getElementById('primaryColor').value = response.primaryColor || '#6366F1';
      document.getElementById('position').value = response.position || 'right';
    });
  }
  
  // Save configuration to storage
  function saveConfiguration() {
    const config = {
      tenantId: document.getElementById('tenantId').value,
      apiKey: document.getElementById('apiKey').value,
      primaryColor: document.getElementById('primaryColor').value,
      position: document.getElementById('position').value
    };
    
    chrome.runtime.sendMessage({ 
      action: 'saveConfiguration', 
      config: config 
    }, (response) => {
      if (response.success) {
        showStatus('Configuration saved successfully', 'success');
      } else {
        showStatus('Failed to save configuration', 'error');
      }
    });
  }
  
  // Inject widget into current page
  function injectWidget() {
    chrome.runtime.sendMessage({ action: 'injectWidget' });
    showStatus('Widget injected into page', 'success');
  }
  
  // Show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // Hide status after 3 seconds
    setTimeout(() => {
      statusDiv.className = 'status hidden';
    }, 3000);
  }
});