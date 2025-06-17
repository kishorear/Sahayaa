/**
 * Support AI Chat Widget
 * A lightweight client-side chat widget for intelligent customer support
 * 
 * This file will be customized with your specific configuration settings
 * when downloaded from the Support AI admin dashboard.
 * 
 * Support AI: Empowering Support with Intelligent Assistance
 */

(function() {
  // Default configuration settings that will be replaced with user values
  const defaultConfig = {
    tenantId: "__TENANT_ID__",
    apiKey: "__API_KEY__",
    primaryColor: "__PRIMARY_COLOR__",
    position: "__POSITION__",
    greetingMessage: "__GREETING_MESSAGE__",
    autoOpen: __AUTO_OPEN__,
    branding: __BRANDING__,
    reportData: __REPORT_DATA__,
    serverUrl: "https://api.support.ai"
  };

  // Merge the default configuration with any user-provided configuration
  const config = {
    ...defaultConfig,
    ...(window.supportAiConfig || {})
  };

  // Create a class to encapsulate the widget functionality
  class SupportAIWidget {
    constructor() {
      // Store the DOM elements
      this.container = null;
      this.button = null;
      this.chatWindow = null;
      this.messagesContainer = null;
      this.inputField = null;
      
      // Track whether the chat window is open
      this.isOpen = false;
      
      // Track conversation data
      this.conversationId = null;
      this.sessionId = this.generateSessionId();
      
      // Initialize the widget
      this.init();
    }
    
    /**
     * Initialize the widget by creating DOM elements and adding event listeners
     */
    init() {
      // Create the widget container
      this.createWidgetContainer();
      
      // Create the chat button
      this.createChatButton();
      
      // Create the chat window
      this.createChatWindow();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Report initialization event
      if (config.reportData) {
        this.reportEvent('widget_initialized');
      }
      
      // Automatically open the chat if configured
      if (config.autoOpen) {
        setTimeout(() => this.openChat(), 1000);
      }
    }
    
    /**
     * Create the main container for the widget
     */
    createWidgetContainer() {
      this.container = document.createElement('div');
      this.container.className = 'support-widget-container';
      
      // Apply positioning based on configuration
      if (config.position === 'left') {
        this.container.style.left = '20px';
        this.container.style.right = 'auto';
      } else if (config.position === 'center') {
        this.container.style.left = '50%';
        this.container.style.right = 'auto';
        this.container.style.transform = 'translateX(-50%)';
      }
      
      document.body.appendChild(this.container);
    }
    
    /**
     * Create the chat button that toggles the chat window
     */
    createChatButton() {
      this.button = document.createElement('div');
      this.button.className = 'support-widget-button';
      this.button.style.backgroundColor = config.primaryColor;
      
      // Add support icon (exclamation mark in circle with 6px stroke)
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 26 26');
      icon.setAttribute('width', '26');
      icon.setAttribute('height', '26');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '6');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      icon.className = 'support-widget-icon';
      
      // Circle with thin stroke rather than filled
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '13');
      circle.setAttribute('cy', '13');
      circle.setAttribute('r', '10');
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '6');
      circle.setAttribute('fill', 'none');
      
      // Top line of exclamation mark
      const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path1.setAttribute('d', 'M13 9.5V13');
      path1.setAttribute('stroke', 'white');
      path1.setAttribute('stroke-width', '6');
      
      // Bottom dot of exclamation mark
      const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path2.setAttribute('d', 'M13 16.5H13.01');
      path2.setAttribute('stroke', 'white');
      path2.setAttribute('stroke-width', '6');
      
      icon.appendChild(circle);
      icon.appendChild(path1);
      icon.appendChild(path2);
      this.button.appendChild(icon);
      
      this.container.appendChild(this.button);
    }
    
    /**
     * Create the chat window with header, messages container, and input field
     */
    createChatWindow() {
      this.chatWindow = document.createElement('div');
      this.chatWindow.className = 'support-chat-window';
      
      // Create chat header
      const header = document.createElement('div');
      header.className = 'support-chat-header';
      header.style.backgroundColor = config.primaryColor;
      
      const title = document.createElement('div');
      title.textContent = 'Support AI Chat';
      
      const closeButton = document.createElement('div');
      closeButton.className = 'support-chat-close';
      closeButton.innerHTML = '&times;';
      closeButton.onclick = (e) => {
        e.stopPropagation();
        this.closeChat();
      };
      
      header.appendChild(title);
      header.appendChild(closeButton);
      
      // Create messages container
      this.messagesContainer = document.createElement('div');
      this.messagesContainer.className = 'support-chat-messages';
      
      // Create input area
      const inputArea = document.createElement('div');
      inputArea.className = 'support-chat-input';
      
      this.inputField = document.createElement('input');
      this.inputField.type = 'text';
      this.inputField.placeholder = 'Ask Support AI...';
      
      const sendButton = document.createElement('button');
      sendButton.className = 'support-send-button';
      sendButton.innerHTML = '&#10148;';
      sendButton.style.backgroundColor = config.primaryColor;
      sendButton.onclick = () => this.sendMessage();
      
      inputArea.appendChild(this.inputField);
      inputArea.appendChild(sendButton);
      
      // Add branding if enabled
      let branding = null;
      if (config.branding) {
        branding = document.createElement('div');
        branding.className = 'support-branding';
        branding.textContent = 'Powered by Support AI';
      }
      
      // Assemble chat window
      this.chatWindow.appendChild(header);
      this.chatWindow.appendChild(this.messagesContainer);
      this.chatWindow.appendChild(inputArea);
      
      if (branding) {
        this.chatWindow.appendChild(branding);
      }
      
      this.container.appendChild(this.chatWindow);
      
      // Add initial greeting message
      this.addMessage('assistant', config.greetingMessage);
    }
    
    /**
     * Set up event listeners for the widget
     */
    setupEventListeners() {
      // Toggle chat window when the button is clicked
      this.button.addEventListener('click', () => {
        if (this.isOpen) {
          this.closeChat();
        } else {
          this.openChat();
        }
      });
      
      // Send message when Enter key is pressed in the input field
      this.inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
      
      // Add styles to the document
      this.addStyles();
    }
    
    /**
     * Add the widget styles to the document
     */
    addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        /* Widget styles would be injected here in a production version */
        /* For this version, refer to the separate CSS file */
      `;
      document.head.appendChild(style);
    }
    
    /**
     * Open the chat window
     */
    openChat() {
      this.chatWindow.classList.add('open');
      this.isOpen = true;
      this.inputField.focus();
      
      if (config.reportData) {
        this.reportEvent('widget_opened');
      }
    }
    
    /**
     * Close the chat window
     */
    closeChat() {
      this.chatWindow.classList.remove('open');
      this.isOpen = false;
      
      if (config.reportData) {
        this.reportEvent('widget_closed');
      }
    }
    
    /**
     * Send a message to the support AI
     */
    sendMessage() {
      const message = this.inputField.value.trim();
      
      if (!message) {
        return;
      }
      
      // Add user message to the chat window
      this.addMessage('user', message);
      
      // Clear the input field
      this.inputField.value = '';
      
      // Report the message event
      if (config.reportData) {
        this.reportEvent('message_sent', { content: message });
      }
      
      // In a production environment, this would send the message to the server
      // and process the response. For this example, we'll simulate a response.
      this.simulateResponse(message);
    }
    
    /**
     * Add a message to the chat window
     * @param {string} role - The role of the message sender (user or assistant)
     * @param {string} content - The message content
     */
    addMessage(role, content) {
      const message = document.createElement('div');
      message.className = `support-message support-message-${role}`;
      message.textContent = content;
      
      this.messagesContainer.appendChild(message);
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
    
    /**
     * Send message to agent workflow or fallback to simulation
     * @param {string} userMessage - The message from the user
     */
    simulateResponse(userMessage) {
      // Try agent workflow first if available
      if (config.apiKey && config.apiKey !== "__API_KEY__") {
        this.sendToAgentWorkflow(userMessage);
      } else {
        this.fallbackSimulation(userMessage);
      }
    }
    
    /**
     * Send message to agent workflow service
     * @param {string} message - The message to send
     */
    sendToAgentWorkflow(message) {
      // Add typing indicator
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'support-message support-message-assistant support-typing-indicator';
      typingIndicator.innerHTML = '<span>.</span><span>.</span><span>.</span>';
      this.messagesContainer.appendChild(typingIndicator);
      
      // Prepare request data for agent workflow
      const requestData = {
        user_message: message,
        tenant_id: parseInt(config.tenantId),
        session_id: this.sessionId,
        user_context: {
          url: window.location.href,
          referrer: document.referrer,
          timestamp: new Date().toISOString()
        }
      };
      
      // Make API request to agent workflow endpoint
      fetch(`${config.serverUrl}/api/agents/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
          'X-Tenant-ID': config.tenantId.toString()
        },
        body: JSON.stringify(requestData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Agent workflow unavailable');
        }
        return response.json();
      })
      .then(data => {
        // Remove typing indicator
        const indicators = this.messagesContainer.querySelectorAll('.support-typing-indicator');
        indicators.forEach(indicator => this.messagesContainer.removeChild(indicator));
        
        // Handle agent workflow response
        if (data.success) {
          // Display resolution steps
          if (data.resolution_steps && data.resolution_steps.length > 0) {
            data.resolution_steps.forEach(step => {
              this.addMessage('assistant', step);
            });
          }
          
          // Show ticket information if created
          if (data.ticket_id) {
            this.addMessage('assistant', `I've created ticket #${data.ticket_id} for you. Category: ${data.category}, Urgency: ${data.urgency}`);
          }
          
          // Report enhanced analytics
          if (config.reportData) {
            this.reportEvent('agent_response_received', { 
              ticket_id: data.ticket_id,
              confidence_score: data.confidence_score,
              category: data.category,
              urgency: data.urgency
            });
          }
        } else {
          this.addMessage('assistant', data.error || 'I encountered an issue processing your request.');
        }
      })
      .catch(error => {
        console.warn('Agent workflow failed, using fallback:', error);
        // Remove typing indicator
        const indicators = this.messagesContainer.querySelectorAll('.support-typing-indicator');
        indicators.forEach(indicator => this.messagesContainer.removeChild(indicator));
        
        // Fallback to simulation
        this.fallbackSimulation(message);
      });
    }
    
    /**
     * Fallback simulation when agent workflow is unavailable
     * @param {string} userMessage - The message from the user
     */
    fallbackSimulation(userMessage) {
      // Simulate typing indicator
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'support-message support-message-assistant';
      typingIndicator.textContent = '...';
      this.messagesContainer.appendChild(typingIndicator);
      
      // Simulate response delay
      setTimeout(() => {
        // Remove typing indicator
        this.messagesContainer.removeChild(typingIndicator);
        
        // Add AI response
        const lowerMessage = userMessage.toLowerCase();
        let response = 'I\'ll help you with that. Could you provide more details?';
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
          response = 'Hello! How can I assist you today?';
        } else if (lowerMessage.includes('help')) {
          response = 'I\'m here to help! What do you need assistance with?';
        } else if (lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
          response = 'You\'re welcome! Is there anything else I can help you with?';
        } else if (lowerMessage.includes('bye')) {
          response = 'Goodbye! Feel free to come back if you have more questions.';
        } else if (lowerMessage.includes('feature') || lowerMessage.includes('bug')) {
          response = 'Thank you for bringing this to our attention. Let me create a ticket for you.';
          
          // Simulate ticket creation
          setTimeout(() => {
            this.addMessage('assistant', 'Ticket #' + Math.floor(1000 + Math.random() * 9000) + ' has been created. Our team will investigate this issue.');
          }, 1500);
        }
        
        this.addMessage('assistant', response);
        
        // Report response event
        if (config.reportData) {
          this.reportEvent('message_received', { content: response });
        }
      }, 1500);
    }
    
    /**
     * Report an event to the server for analytics
     * @param {string} eventType - The type of event
     * @param {Object} metadata - Additional metadata for the event
     */
    reportEvent(eventType, metadata = {}) {
      // In a production environment, this would send the event to the server
      // For this example, we'll just log it to the console
      console.log('Support AI Event:', eventType, {
        tenantId: config.tenantId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        eventType,
        metadata: {
          url: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          ...metadata
        }
      });
      
      // In production, this would be an actual API call:
      /*
      fetch(`${config.serverUrl}/widget/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: config.tenantId,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
          eventType,
          metadata: {
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            ...metadata
          }
        })
      }).catch(error => console.error('Error reporting event:', error));
      */
    }
    
    /**
     * Generate a unique session ID
     * @returns {string} A unique session ID
     */
    generateSessionId() {
      return 'session_' + Math.random().toString(36).substr(2, 9);
    }
  }
  
  // Initialize the widget when the page is loaded
  if (document.readyState === 'complete') {
    new SupportAIWidget();
  } else {
    window.addEventListener('load', () => {
      new SupportAIWidget();
    });
  }
  
  // Export the widget for use in other scripts
  window.SupportAIChat = {
    init: function(customConfig) {
      window.supportAiConfig = {
        ...config,
        ...customConfig
      };
      new SupportAIWidget();
    }
  };
})();