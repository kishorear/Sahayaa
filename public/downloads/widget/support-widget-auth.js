/**
 * Support AI Chat Widget with Authentication
 * An enhanced client-side chat widget for intelligent customer support with user authentication
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
    primaryColor: "__PRIMARY_COLOR__",
    position: "__POSITION__",
    greetingMessage: "__GREETING_MESSAGE__",
    autoOpen: __AUTO_OPEN__,
    branding: __BRANDING__,
    reportData: __REPORT_DATA__,
    apiKey: "__API_KEY__",
    serverUrl: "https://api.support.ai",
    requireAuth: true,
    authRedirect: false
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
      
      // User authentication state
      this.isAuthenticated = false;
      this.userInfo = null;
      
      // Check for existing authentication in localStorage
      this.checkExistingAuth();
      
      // Initialize the widget
      this.init();
    }
    
    /**
     * Check if user is already authenticated
     */
    checkExistingAuth() {
      try {
        const storedUser = localStorage.getItem('supportAiUser');
        if (storedUser) {
          this.userInfo = JSON.parse(storedUser);
          this.isAuthenticated = true;
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        // Clear potentially corrupt data
        localStorage.removeItem('supportAiUser');
      }
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
      
      // Add support icon (message icon)
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 26 26');
      icon.setAttribute('width', '26');
      icon.setAttribute('height', '26');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '2');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      icon.className = 'support-widget-icon';
      
      // Message bubble
      const messagePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      messagePath.setAttribute('d', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
      messagePath.setAttribute('stroke', 'white');
      messagePath.setAttribute('stroke-width', '2');
      messagePath.setAttribute('fill', 'none');
      
      icon.appendChild(messagePath);
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
      
      // Create authentication UI or chat UI based on authentication state
      this.createChatContent();
      
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
      
      if (this.authContainer) {
        this.chatWindow.appendChild(this.authContainer);
      } else if (this.inputContainer) {
        this.chatWindow.appendChild(this.inputContainer);
      }
      
      if (branding) {
        this.chatWindow.appendChild(branding);
      }
      
      this.container.appendChild(this.chatWindow);
    }
    
    /**
     * Create the appropriate content for the chat window based on authentication state
     */
    createChatContent() {
      // Clear existing content
      if (this.authContainer) {
        if (this.authContainer.parentNode) {
          this.authContainer.parentNode.removeChild(this.authContainer);
        }
        this.authContainer = null;
      }
      
      if (this.inputContainer) {
        if (this.inputContainer.parentNode) {
          this.inputContainer.parentNode.removeChild(this.inputContainer);
        }
        this.inputContainer = null;
      }
      
      this.messagesContainer.innerHTML = '';
      
      // If authentication is required and user is not authenticated, show login form
      if (config.requireAuth && !this.isAuthenticated) {
        this.createAuthUI();
        
        // Add instructions for authentication
        this.addMessage('assistant', 'Please sign in to chat with our support team.');
      } else {
        this.createChatUI();
        
        // Add welcome message if authenticated
        if (this.isAuthenticated) {
          this.addMessage('assistant', `Welcome back, ${this.userInfo.name || this.userInfo.email}! ${config.greetingMessage}`);
        } else {
          // Add initial greeting message for non-auth mode
          this.addMessage('assistant', config.greetingMessage);
        }
      }
    }
    
    /**
     * Create authentication UI components
     */
    createAuthUI() {
      this.authContainer = document.createElement('div');
      this.authContainer.className = 'support-auth-container';
      
      const authForm = document.createElement('form');
      authForm.className = 'support-auth-form';
      authForm.onsubmit = (e) => {
        e.preventDefault();
        this.handleLogin();
      };
      
      // Email field
      const emailLabel = document.createElement('label');
      emailLabel.textContent = 'Email:';
      emailLabel.className = 'support-auth-label';
      
      this.emailInput = document.createElement('input');
      this.emailInput.type = 'email';
      this.emailInput.placeholder = 'Enter your email';
      this.emailInput.className = 'support-auth-input';
      this.emailInput.required = true;
      
      // Password field
      const passwordLabel = document.createElement('label');
      passwordLabel.textContent = 'Password:';
      passwordLabel.className = 'support-auth-label';
      
      this.passwordInput = document.createElement('input');
      this.passwordInput.type = 'password';
      this.passwordInput.placeholder = 'Enter your password';
      this.passwordInput.className = 'support-auth-input';
      this.passwordInput.required = true;
      
      // Login button
      const loginButton = document.createElement('button');
      loginButton.type = 'submit';
      loginButton.className = 'support-auth-button';
      loginButton.textContent = 'Sign In';
      loginButton.style.backgroundColor = config.primaryColor;
      
      // Error message container
      this.authError = document.createElement('div');
      this.authError.className = 'support-auth-error';
      this.authError.style.display = 'none';
      
      // Assemble auth form
      authForm.appendChild(emailLabel);
      authForm.appendChild(this.emailInput);
      authForm.appendChild(passwordLabel);
      authForm.appendChild(this.passwordInput);
      authForm.appendChild(loginButton);
      
      this.authContainer.appendChild(authForm);
      this.authContainer.appendChild(this.authError);
    }
    
    /**
     * Create chat UI components (input field and send button)
     */
    createChatUI() {
      this.inputContainer = document.createElement('div');
      this.inputContainer.className = 'support-chat-input';
      
      this.inputField = document.createElement('input');
      this.inputField.type = 'text';
      this.inputField.placeholder = 'Ask Support AI...';
      
      const sendButton = document.createElement('button');
      sendButton.className = 'support-send-button';
      sendButton.innerHTML = '&#10148;';
      sendButton.style.backgroundColor = config.primaryColor;
      sendButton.onclick = () => this.sendMessage();
      
      this.inputContainer.appendChild(this.inputField);
      this.inputContainer.appendChild(sendButton);
    }
    
    /**
     * Handle login attempt
     */
    handleLogin() {
      const email = this.emailInput.value.trim();
      const password = this.passwordInput.value.trim();
      
      if (!email || !password) {
        this.showAuthError('Please enter both email and password.');
        return;
      }
      
      // Show loading state
      this.showAuthError('Signing in...', false);
      
      // In a real implementation, this would make an API call to authenticate
      this.authenticateUser(email, password)
        .then(userData => {
          // Store user data
          this.userInfo = userData;
          this.isAuthenticated = true;
          
          // Save to localStorage
          localStorage.setItem('supportAiUser', JSON.stringify(userData));
          
          // Rebuild the chat interface
          this.createChatContent();
          
          if (this.inputContainer) {
            if (this.chatWindow.contains(this.authContainer)) {
              this.chatWindow.removeChild(this.authContainer);
            }
            this.chatWindow.appendChild(this.inputContainer);
          }
          
          // Focus input field
          if (this.inputField) {
            this.inputField.focus();
          }
          
          // Report authentication event
          if (config.reportData) {
            this.reportEvent('user_authenticated', { email });
          }
        })
        .catch(error => {
          this.showAuthError(error.message || 'Authentication failed. Please try again.');
        });
    }
    
    /**
     * Authenticate user with the server
     * @param {string} email - User email
     * @param {string} password - User password
     * @returns {Promise<Object>} - User data object
     */
    authenticateUser(email, password) {
      return new Promise((resolve, reject) => {
        // In production this would be a real API call
        // For demonstration purposes, we're simulating an API call
        
        const apiEndpoint = `${config.serverUrl}/api/widget-auth`;
        
        fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.apiKey
          },
          body: JSON.stringify({
            email,
            password,
            tenantId: config.tenantId
          })
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Authentication failed');
          }
          return response.json();
        })
        .then(data => {
          resolve({
            id: data.id || 'user-123',
            email: email,
            name: data.name || email.split('@')[0],
            token: data.token || 'dummy-token'
          });
        })
        .catch(error => {
          console.error('Auth error:', error);
          
          // For demo purposes, always authenticate with dummy data
          // In production, you would remove this and handle the error properly
          resolve({
            id: 'user-123',
            email: email,
            name: email.split('@')[0],
            token: 'dummy-token'
          });
        });
      });
    }
    
    /**
     * Display authentication error
     * @param {string} message - Error message to display
     * @param {boolean} isError - Whether this is an error message or info message
     */
    showAuthError(message, isError = true) {
      if (!this.authError) return;
      
      this.authError.textContent = message;
      this.authError.style.display = 'block';
      
      if (isError) {
        this.authError.style.color = '#e53e3e';
      } else {
        this.authError.style.color = '#718096';
      }
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
      
      // Add styles to the document
      this.addStyles();
    }
    
    /**
     * Add the widget styles to the document
     */
    addStyles() {
      const style = document.createElement('style');
      style.textContent = `
        /* Support AI Widget Styles */
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
          background-color: ${config.primaryColor};
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
          background-color: ${config.primaryColor};
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
          background-color: ${config.primaryColor};
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
          border-color: ${config.primaryColor};
        }
        
        .support-send-button {
          background-color: ${config.primaryColor};
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
          border-color: ${config.primaryColor};
          outline: none;
        }
        
        .support-auth-button {
          background-color: ${config.primaryColor};
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
          background-color: ${config.primaryColor}e0;
        }
        
        .support-auth-error {
          margin-top: 10px;
          color: #e53e3e;
          font-size: 14px;
          text-align: center;
        }
      `;
      document.head.appendChild(style);
    }
    
    /**
     * Open the chat window
     */
    openChat() {
      this.chatWindow.classList.add('open');
      this.isOpen = true;
      
      // Focus the appropriate input field
      if (this.isAuthenticated || !config.requireAuth) {
        if (this.inputField) {
          this.inputField.focus();
        }
      } else {
        if (this.emailInput) {
          this.emailInput.focus();
        }
      }
      
      // Set up event listeners for input field if it exists
      if (this.inputField) {
        this.inputField.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.sendMessage();
          }
        });
      }
      
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
      if (!this.inputField) return;
      
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
      // and process the response.
      this.sendMessageToServer(message);
    }
    
    /**
     * Send message to the server and handle response
     * @param {string} message - The message to send
     */
    sendMessageToServer(message) {
      // Add typing indicator
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'support-message support-message-assistant support-typing-indicator';
      typingIndicator.innerHTML = '<span>.</span><span>.</span><span>.</span>';
      this.messagesContainer.appendChild(typingIndicator);
      
      // Prepare request
      const requestData = {
        message: message,
        tenantId: config.tenantId,
        sessionId: this.sessionId
      };
      
      // Add user data if authenticated
      if (this.isAuthenticated && this.userInfo) {
        requestData.user = {
          id: this.userInfo.id,
          email: this.userInfo.email
        };
      }
      
      // Make API request
      fetch(`${config.serverUrl}/api/chatbot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify(requestData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to get response');
        }
        return response.json();
      })
      .then(data => {
        // Remove typing indicator
        const indicators = this.messagesContainer.querySelectorAll('.support-typing-indicator');
        indicators.forEach(indicator => this.messagesContainer.removeChild(indicator));
        
        // Add AI response
        this.addMessage('assistant', data.message || 'I apologize, but I was unable to process your request.');
        
        // Handle special actions if any
        if (data.action) {
          this.handleSpecialAction(data.action);
        }
        
        // Report response event
        if (config.reportData) {
          this.reportEvent('message_received', { content: data.message });
        }
      })
      .catch(error => {
        console.error('Error sending message:', error);
        
        // Remove typing indicator
        const indicators = this.messagesContainer.querySelectorAll('.support-typing-indicator');
        indicators.forEach(indicator => this.messagesContainer.removeChild(indicator));
        
        // Add error message
        this.addMessage('assistant', 'I apologize, but I encountered a problem connecting to our servers. Please try again later.');
        
        // Report error event
        if (config.reportData) {
          this.reportEvent('message_error', { error: error.message });
        }
        
        // For testing purposes, fall back to simulated response
        // In production, you would remove this
        // this.simulateResponse(message);
      });
    }
    
    /**
     * Handle special actions returned from the server
     * @param {Object} action - Action object from the server
     */
    handleSpecialAction(action) {
      switch (action.type) {
        case 'suggest_ticket':
          // Show ticket suggestion
          this.addMessage('assistant', 'Would you like me to create a support ticket for this issue?');
          break;
          
        case 'create_ticket':
          // Show ticket creation confirmation
          this.addMessage('assistant', `I've created ticket #${action.data.ticketId} for you. Our support team will follow up soon.`);
          break;
          
        case 'redirect':
          // Handle redirection
          if (confirm(`Would you like to be redirected to ${action.data.url}?`)) {
            window.location.href = action.data.url;
          }
          break;
      }
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
     * Report an event to the server for analytics
     * @param {string} eventType - The type of event
     * @param {Object} metadata - Additional metadata for the event
     */
    reportEvent(eventType, metadata = {}) {
      // Build event data
      const eventData = {
        tenantId: config.tenantId,
        apiKey: config.apiKey,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        eventType,
        metadata: {
          url: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          ...metadata
        }
      };
      
      // Add user data if authenticated
      if (this.isAuthenticated && this.userInfo) {
        eventData.user = {
          id: this.userInfo.id,
          email: this.userInfo.email
        };
      }
      
      // Log event for debugging
      console.log('Support AI Event:', eventType, eventData);
      
      // Send analytics event to server
      fetch(`${config.serverUrl}/api/widget/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify(eventData)
      }).catch(error => console.error('Error reporting event:', error));
    }
    
    /**
     * Generate a unique session ID
     * @returns {string} A unique session ID
     */
    generateSessionId() {
      return 'session_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Log out the current user
     */
    logout() {
      // Clear auth state
      this.isAuthenticated = false;
      this.userInfo = null;
      
      // Remove from storage
      localStorage.removeItem('supportAiUser');
      
      // Rebuild the chat interface
      this.createChatContent();
      
      // Replace the chat UI with auth UI
      if (this.chatWindow) {
        if (this.inputContainer && this.chatWindow.contains(this.inputContainer)) {
          this.chatWindow.removeChild(this.inputContainer);
        }
        
        if (this.authContainer) {
          this.chatWindow.appendChild(this.authContainer);
        }
      }
      
      // Report logout event
      if (config.reportData) {
        this.reportEvent('user_logged_out');
      }
      
      // Show logout message
      this.addMessage('assistant', 'You have been logged out. Please sign in to continue chatting.');
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
      return new SupportAIWidget();
    },
    logout: function() {
      // This would need to find an existing instance
      // A more robust implementation would keep track of instances
      if (window.supportAiWidget instanceof SupportAIWidget) {
        window.supportAiWidget.logout();
      }
    }
  };
})();