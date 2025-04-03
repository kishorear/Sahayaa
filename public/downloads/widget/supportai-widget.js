/**
 * SupportAI Chat Widget
 * Version: 1.0.0
 * 
 * This JavaScript file creates and manages the SupportAI chat widget for your website.
 * It provides real-time customer support powered by AI.
 */

(function() {
  // Default configuration
  const defaultConfig = {
    tenantId: null,
    apiKey: null,
    primaryColor: "#6366F1",
    position: "right",
    greetingMessage: "How can I help you today?",
    autoOpen: false,
    branding: true,
    reportData: true,
    adminId: null
  };

  // Merge user configuration with defaults
  const config = {...defaultConfig, ...window.supportAiConfig};

  // Required configuration validation
  if (!config.tenantId || !config.apiKey) {
    console.error("SupportAI Widget: Missing required configuration (tenantId and apiKey)");
    return;
  }

  // Create widget container
  function createWidgetContainer() {
    const container = document.createElement('div');
    container.id = 'supportai-widget-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style[config.position] = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
  }

  // Create chat button
  function createChatButton(container) {
    const button = document.createElement('div');
    button.id = 'supportai-chat-button';
    button.style.width = '60px';
    button.style.height = '60px';
    button.style.borderRadius = '50%';
    button.style.backgroundColor = config.primaryColor;
    button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.cursor = 'pointer';
    button.style.transition = 'all 0.2s ease';
    button.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    button.addEventListener('click', toggleChatWindow);
    button.addEventListener('mouseover', () => {
      button.style.transform = 'scale(1.1)';
    });
    button.addEventListener('mouseout', () => {
      button.style.transform = 'scale(1)';
    });
    container.appendChild(button);
    return button;
  }

  // Create chat window
  function createChatWindow(container) {
    const chatWindow = document.createElement('div');
    chatWindow.id = 'supportai-chat-window';
    chatWindow.style.position = 'absolute';
    chatWindow.style.bottom = '70px';
    chatWindow.style[config.position] = '0';
    chatWindow.style.width = '350px';
    chatWindow.style.height = '500px';
    chatWindow.style.backgroundColor = 'white';
    chatWindow.style.borderRadius = '10px';
    chatWindow.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    chatWindow.style.display = 'none';
    chatWindow.style.flexDirection = 'column';
    chatWindow.style.overflow = 'hidden';
    
    // Chat header
    const chatHeader = document.createElement('div');
    chatHeader.style.padding = '15px';
    chatHeader.style.backgroundColor = config.primaryColor;
    chatHeader.style.color = 'white';
    chatHeader.style.fontWeight = 'bold';
    chatHeader.style.display = 'flex';
    chatHeader.style.justifyContent = 'space-between';
    chatHeader.style.alignItems = 'center';
    chatHeader.innerHTML = `
      <div>Support Chat</div>
      <div id="supportai-close-button" style="cursor: pointer;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </div>
    `;
    chatWindow.appendChild(chatHeader);

    // Chat messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'supportai-messages';
    messagesContainer.style.flex = '1';
    messagesContainer.style.padding = '15px';
    messagesContainer.style.overflowY = 'auto';
    messagesContainer.style.display = 'flex';
    messagesContainer.style.flexDirection = 'column';
    messagesContainer.style.gap = '10px';
    
    // Welcome message
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'supportai-message supportai-assistant';
    welcomeMessage.style.backgroundColor = '#f0f0f0';
    welcomeMessage.style.borderRadius = '10px';
    welcomeMessage.style.padding = '10px 15px';
    welcomeMessage.style.maxWidth = '80%';
    welcomeMessage.style.alignSelf = 'flex-start';
    welcomeMessage.textContent = config.greetingMessage;
    messagesContainer.appendChild(welcomeMessage);
    
    chatWindow.appendChild(messagesContainer);

    // Input area
    const inputArea = document.createElement('div');
    inputArea.style.borderTop = '1px solid #eaeaea';
    inputArea.style.padding = '15px';
    inputArea.style.display = 'flex';
    inputArea.style.gap = '10px';
    
    const textInput = document.createElement('input');
    textInput.id = 'supportai-input';
    textInput.type = 'text';
    textInput.placeholder = 'Type your message...';
    textInput.style.flex = '1';
    textInput.style.padding = '10px';
    textInput.style.borderRadius = '5px';
    textInput.style.border = '1px solid #ddd';
    textInput.style.outline = 'none';
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
    
    const sendButton = document.createElement('button');
    sendButton.id = 'supportai-send';
    sendButton.style.backgroundColor = config.primaryColor;
    sendButton.style.color = 'white';
    sendButton.style.border = 'none';
    sendButton.style.borderRadius = '5px';
    sendButton.style.padding = '10px 15px';
    sendButton.style.cursor = 'pointer';
    sendButton.textContent = 'Send';
    sendButton.addEventListener('click', sendMessage);
    
    inputArea.appendChild(textInput);
    inputArea.appendChild(sendButton);
    chatWindow.appendChild(inputArea);

    // Branding (if enabled)
    if (config.branding) {
      const branding = document.createElement('div');
      branding.style.padding = '5px 10px';
      branding.style.textAlign = 'center';
      branding.style.fontSize = '11px';
      branding.style.color = '#999';
      branding.style.backgroundColor = '#f9f9f9';
      branding.innerHTML = 'Powered by <a href="https://supportai.com" target="_blank" style="color: #666; text-decoration: none; font-weight: bold;">SupportAI</a>';
      chatWindow.appendChild(branding);
    }

    // Set up close button functionality
    chatWindow.querySelector('#supportai-close-button').addEventListener('click', () => {
      chatWindow.style.display = 'none';
    });

    container.appendChild(chatWindow);
    return chatWindow;
  }

  // Toggle chat window visibility
  function toggleChatWindow() {
    const chatWindow = document.getElementById('supportai-chat-window');
    if (chatWindow.style.display === 'none') {
      chatWindow.style.display = 'flex';
      document.getElementById('supportai-input').focus();
    } else {
      chatWindow.style.display = 'none';
    }
  }

  // Send message function
  function sendMessage() {
    const textInput = document.getElementById('supportai-input');
    const messagesContainer = document.getElementById('supportai-messages');
    
    const message = textInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    const userMessage = document.createElement('div');
    userMessage.className = 'supportai-message supportai-user';
    userMessage.style.backgroundColor = config.primaryColor;
    userMessage.style.color = 'white';
    userMessage.style.borderRadius = '10px';
    userMessage.style.padding = '10px 15px';
    userMessage.style.maxWidth = '80%';
    userMessage.style.alignSelf = 'flex-end';
    userMessage.textContent = message;
    messagesContainer.appendChild(userMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Clear input
    textInput.value = '';
    
    // Add typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'supportai-message supportai-assistant supportai-typing';
    typingIndicator.style.backgroundColor = '#f0f0f0';
    typingIndicator.style.borderRadius = '10px';
    typingIndicator.style.padding = '10px 15px';
    typingIndicator.style.maxWidth = '80%';
    typingIndicator.style.alignSelf = 'flex-start';
    typingIndicator.innerHTML = '<div class="typing-dots"><span>.</span><span>.</span><span>.</span></div>';
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Simulate response (in a real implementation, this would call your API)
    setTimeout(() => {
      // Remove typing indicator
      messagesContainer.removeChild(typingIndicator);
      
      // Add response message
      const responseMessage = document.createElement('div');
      responseMessage.className = 'supportai-message supportai-assistant';
      responseMessage.style.backgroundColor = '#f0f0f0';
      responseMessage.style.borderRadius = '10px';
      responseMessage.style.padding = '10px 15px';
      responseMessage.style.maxWidth = '80%';
      responseMessage.style.alignSelf = 'flex-start';
      
      // This is a simulation - in production, call your backend API
      if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
        responseMessage.textContent = "Hello! How can I assist you today?";
      } else if (message.toLowerCase().includes('help')) {
        responseMessage.textContent = "I'm here to help! What do you need assistance with?";
      } else if (message.toLowerCase().includes('thanks') || message.toLowerCase().includes('thank you')) {
        responseMessage.textContent = "You're welcome! Is there anything else I can help with?";
      } else {
        responseMessage.textContent = "I'll help you with that. In a real implementation, this would connect to your SupportAI backend.";
      }
      
      messagesContainer.appendChild(responseMessage);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Report interaction data if enabled
      if (config.reportData) {
        reportInteraction(message, responseMessage.textContent);
      }
    }, 1500);
  }

  // Report interaction to backend (analytics)
  function reportInteraction(userMessage, aiResponse) {
    // In a real implementation, this would send data to your analytics endpoint
    console.log('SupportAI Widget: Reporting interaction data');
    
    // Example analytics data
    const analyticsData = {
      tenantId: config.tenantId,
      adminId: config.adminId,
      timestamp: new Date().toISOString(),
      userMessage: userMessage,
      aiResponse: aiResponse
    };
    
    // This is just a placeholder for the real implementation
    console.log('Analytics data:', analyticsData);
  }

  // Initialize the widget
  function initWidget() {
    // Create the widget elements
    const container = createWidgetContainer();
    createChatButton(container);
    createChatWindow(container);
    
    // Auto-open if configured
    if (config.autoOpen) {
      setTimeout(() => {
        document.getElementById('supportai-chat-window').style.display = 'flex';
      }, 2000);
    }
    
    // Add custom styles
    const customStyles = document.createElement('style');
    customStyles.textContent = `
      #supportai-messages::-webkit-scrollbar {
        width: 6px;
      }
      #supportai-messages::-webkit-scrollbar-track {
        background: #f1f1f1;
      }
      #supportai-messages::-webkit-scrollbar-thumb {
        background: #ddd;
        border-radius: 3px;
      }
      #supportai-messages::-webkit-scrollbar-thumb:hover {
        background: #ccc;
      }
      .typing-dots span {
        animation: typingDot 1.4s infinite;
        display: inline-block;
        opacity: 0.7;
      }
      .typing-dots span:nth-child(2) {
        animation-delay: 0.2s;
      }
      .typing-dots span:nth-child(3) {
        animation-delay: 0.4s;
      }
      @keyframes typingDot {
        0%, 60%, 100% { transform: translateY(0); }
        30% { transform: translateY(-5px); }
      }
    `;
    document.head.appendChild(customStyles);
  }

  // Initialize when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  // Expose the API globally
  window.SupportAI = {
    open: function() {
      const chatWindow = document.getElementById('supportai-chat-window');
      if (chatWindow) chatWindow.style.display = 'flex';
    },
    close: function() {
      const chatWindow = document.getElementById('supportai-chat-window');
      if (chatWindow) chatWindow.style.display = 'none';
    },
    toggle: function() {
      toggleChatWindow();
    },
    updateConfig: function(newConfig) {
      Object.assign(config, newConfig);
      // In a real implementation, you would update the UI based on the new config
    }
  };
})();