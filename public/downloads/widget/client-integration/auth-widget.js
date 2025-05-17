/**
 * Support AI Authenticatable Chat Widget
 * Enhanced version for client website integration
 * 
 * This widget provides:
 * 1. User authentication for chat sessions
 * 2. Dynamic AI provider configuration based on client settings
 * 3. Secure communication with Support AI servers
 * 4. Persistent chat across page navigations
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
    serverUrl: window.location.protocol + '//' + window.location.host,
    requireAuth: true,
    adminId: "__ADMIN_ID__"
  };

  // Merge the default configuration with any user-provided configuration
  const config = {
    ...defaultConfig,
    ...(window.supportAiConfig || {})
  };

  // Use Shadow DOM for style isolation
  let container, shadowRoot, styleElement;
  
  // Widget DOM elements
  let widgetButton, chatWindow, messagesContainer, inputField;
  
  // Authentication state
  const auth = {
    isAuthenticated: false,
    user: null,
    token: null
  };
  
  // Widget state
  const state = {
    initialized: false,
    chatOpen: false,
    messages: [],
    sessionId: generateSessionId(),
    hostPage: {
      url: window.location.href,
      title: document.title
    }
  };
  
  // Restore state from localStorage if available
  function restoreState() {
    try {
      const savedState = sessionStorage.getItem('supportAiWidgetState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        state.chatOpen = parsedState.chatOpen || false;
        state.messages = parsedState.messages || [];
        state.sessionId = parsedState.sessionId || generateSessionId();
      }
      
      // Also restore auth state if available
      const savedAuth = localStorage.getItem('supportAiWidgetAuth');
      if (savedAuth) {
        const parsedAuth = JSON.parse(savedAuth);
        auth.isAuthenticated = parsedAuth.isAuthenticated || false;
        auth.user = parsedAuth.user || null;
        auth.token = parsedAuth.token || null;
      }
    } catch (error) {
      console.debug('Error restoring widget state:', error);
    }
  }
  
  // Save current state to storage
  function saveState() {
    try {
      // Save widget state to sessionStorage (persists only for current browsing session)
      sessionStorage.setItem('supportAiWidgetState', JSON.stringify({
        chatOpen: state.chatOpen,
        messages: state.messages,
        sessionId: state.sessionId
      }));
      
      // Save auth state to localStorage (persists across sessions)
      localStorage.setItem('supportAiWidgetAuth', JSON.stringify({
        isAuthenticated: auth.isAuthenticated,
        user: auth.user,
        token: auth.token
      }));
    } catch (error) {
      console.debug('Error saving widget state:', error);
    }
  }
  
  /**
   * Initialize the widget
   */
  function initialize() {
    if (state.initialized) return;
    
    // Restore state first
    restoreState();
    
    // Create the widget elements
    createContainer();
    injectStyles();
    createWidgetElements();
    createAuthInterface();
    setupEventListeners();
    
    state.initialized = true;
    
    // Open the chat if it was previously open
    if (state.chatOpen) {
      openChat();
    } else if (config.autoOpen) {
      setTimeout(openChat, 1000);
    }
    
    // Report initialization
    reportEvent('widget_initialized');
  }
  
  /**
   * Create the Shadow DOM container
   */
  function createContainer() {
    container = document.createElement('div');
    container.id = 'support-ai-widget-container';
    document.body.appendChild(container);
    
    shadowRoot = container.attachShadow({ mode: 'open' });
  }
  
  /**
   * Inject styles into the Shadow DOM
   */
  function injectStyles() {
    styleElement = document.createElement('style');
    styleElement.textContent = generateStyles();
    shadowRoot.appendChild(styleElement);
  }
  
  /**
   * Generate CSS styles for the widget
   */
  function generateStyles() {
    return `
      :host {
        --primary-color: #${config.primaryColor};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      }
      
      .widget-button {
        position: fixed;
        bottom: 20px;
        ${config.position === 'left' ? 'left: 20px;' : 'right: 20px;'}
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: var(--primary-color);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
        z-index: 999999;
      }
      
      .widget-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
      }
      
      .chat-window {
        position: fixed;
        bottom: 80px;
        ${config.position === 'left' ? 'left: 20px;' : 'right: 20px;'}
        width: 350px;
        height: 500px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateY(20px);
        pointer-events: none;
        z-index: 999998;
      }
      
      .chat-window.open {
        opacity: 1;
        transform: translateY(0);
        pointer-events: all;
      }
      
      .chat-header {
        background-color: var(--primary-color);
        color: white;
        padding: 15px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .chat-header .close-button {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      
      .messages-container {
        flex-grow: 1;
        padding: 15px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      
      .message {
        margin-bottom: 10px;
        max-width: 80%;
        padding: 10px 15px;
        border-radius: 18px;
        word-break: break-word;
      }
      
      .message.user {
        background-color: var(--primary-color);
        color: white;
        margin-left: auto;
        border-bottom-right-radius: 4px;
      }
      
      .message.assistant {
        background-color: #f0f0f0;
        color: #333;
        margin-right: auto;
        border-bottom-left-radius: 4px;
      }
      
      .message.system {
        background-color: #f8f8f8;
        color: #666;
        margin: 5px auto;
        font-size: 12px;
        text-align: center;
        border-radius: 10px;
      }
      
      .chat-input {
        display: flex;
        padding: 10px;
        border-top: 1px solid #eee;
      }
      
      .chat-input input {
        flex-grow: 1;
        border: 1px solid #ddd;
        border-radius: 20px;
        padding: 10px 15px;
        margin-right: 10px;
        outline: none;
      }
      
      .chat-input input:focus {
        border-color: var(--primary-color);
      }
      
      .send-button {
        background-color: var(--primary-color);
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
      
      .send-button:hover {
        transform: scale(1.05);
      }
      
      .branding {
        font-size: 11px;
        text-align: center;
        padding: 5px;
        opacity: 0.7;
      }
      
      /* Auth Form Styles */
      .auth-container {
        padding: 20px;
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      .auth-form {
        display: flex;
        flex-direction: column;
      }
      
      .auth-form h3 {
        margin-top: 0;
        margin-bottom: 20px;
        text-align: center;
        color: var(--primary-color);
      }
      
      .form-group {
        margin-bottom: 15px;
      }
      
      .form-group label {
        display: block;
        margin-bottom: 5px;
        font-size: 14px;
        color: #555;
      }
      
      .form-group input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
        outline: none;
        font-size: 14px;
      }
      
      .form-group input:focus {
        border-color: var(--primary-color);
      }
      
      .auth-button {
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 5px;
        padding: 12px;
        cursor: pointer;
        font-weight: bold;
        margin-top: 10px;
        transition: all 0.2s;
      }
      
      .auth-button:hover {
        opacity: 0.9;
      }
      
      .auth-footer {
        margin-top: auto;
        text-align: center;
        font-size: 12px;
        color: #777;
      }
      
      .auth-toggle {
        color: var(--primary-color);
        cursor: pointer;
        font-weight: bold;
        text-decoration: underline;
      }
      
      .error-message {
        color: #e53935;
        font-size: 13px;
        margin-top: 5px;
        margin-bottom: 10px;
      }
      
      @media (max-width: 480px) {
        .chat-window {
          width: 85%;
          height: 70vh;
        }
      }
    `;
  }
  
  /**
   * Create the widget button and chat window
   */
  function createWidgetElements() {
    // Create the chat button
    widgetButton = document.createElement('div');
    widgetButton.className = 'widget-button';
    
    // SVG Chat icon
    widgetButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    
    shadowRoot.appendChild(widgetButton);
    
    // Create the chat window
    chatWindow = document.createElement('div');
    chatWindow.className = 'chat-window';
    
    // Chat header
    const chatHeader = document.createElement('div');
    chatHeader.className = 'chat-header';
    chatHeader.innerHTML = `
      <div>Support Chat</div>
      <button class="close-button">&times;</button>
    `;
    
    // Messages container
    messagesContainer = document.createElement('div');
    messagesContainer.className = 'messages-container';
    
    // Chat input area
    const chatInput = document.createElement('div');
    chatInput.className = 'chat-input';
    
    inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.placeholder = 'Type your message...';
    
    const sendButton = document.createElement('button');
    sendButton.className = 'send-button';
    sendButton.innerHTML = '&#10148;';
    
    chatInput.appendChild(inputField);
    chatInput.appendChild(sendButton);
    
    // Branding if enabled
    let branding = null;
    if (config.branding) {
      branding = document.createElement('div');
      branding.className = 'branding';
      branding.textContent = 'Powered by Support AI';
    }
    
    // Assemble chat window
    chatWindow.appendChild(chatHeader);
    chatWindow.appendChild(messagesContainer);
    chatWindow.appendChild(chatInput);
    
    if (branding) {
      chatWindow.appendChild(branding);
    }
    
    shadowRoot.appendChild(chatWindow);
  }
  
  /**
   * Create the authentication interface
   */
  function createAuthInterface() {
    const authContainer = document.createElement('div');
    authContainer.className = 'auth-container';
    authContainer.id = 'auth-container';
    
    authContainer.innerHTML = `
      <form class="auth-form" id="login-form">
        <h3>Log In to Support Chat</h3>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required placeholder="Enter your email">
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required placeholder="Enter your password">
        </div>
        <div class="error-message" id="login-error" style="display:none;"></div>
        <button type="submit" class="auth-button">Log In</button>
        <div class="auth-footer">
          <p>Don't have an account? <span class="auth-toggle" id="register-toggle">Sign Up</span></p>
        </div>
      </form>
      
      <form class="auth-form" id="register-form" style="display:none;">
        <h3>Create an Account</h3>
        <div class="form-group">
          <label for="register-name">Name</label>
          <input type="text" id="register-name" name="name" required placeholder="Enter your name">
        </div>
        <div class="form-group">
          <label for="register-email">Email</label>
          <input type="email" id="register-email" name="email" required placeholder="Enter your email">
        </div>
        <div class="form-group">
          <label for="register-password">Password</label>
          <input type="password" id="register-password" name="password" required placeholder="Create a password">
        </div>
        <div class="error-message" id="register-error" style="display:none;"></div>
        <button type="submit" class="auth-button">Sign Up</button>
        <div class="auth-footer">
          <p>Already have an account? <span class="auth-toggle" id="login-toggle">Log In</span></p>
        </div>
      </form>
    `;
    
    // Replace the messages container with auth container when not authenticated
    if (!auth.isAuthenticated && config.requireAuth) {
      messagesContainer.innerHTML = '';
      messagesContainer.appendChild(authContainer);
    }
  }
  
  /**
   * Set up event listeners for the widget
   */
  function setupEventListeners() {
    // Toggle chat on button click
    widgetButton.addEventListener('click', toggleChat);
    
    // Close chat when close button is clicked
    const closeButton = chatWindow.querySelector('.close-button');
    closeButton.addEventListener('click', closeChat);
    
    // Send message on button click
    const sendButton = chatWindow.querySelector('.send-button');
    sendButton.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
    
    // Set up auth form event listeners if auth required
    if (config.requireAuth) {
      setupAuthEventListeners();
    }
    
    // Track page changes for SPAs
    trackPageChanges();
  }
  
  /**
   * Set up event listeners for authentication forms
   */
  function setupAuthEventListeners() {
    // Login form submission
    const loginForm = shadowRoot.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = shadowRoot.getElementById('email').value;
        const password = shadowRoot.getElementById('password').value;
        login(email, password);
      });
    }
    
    // Register form submission
    const registerForm = shadowRoot.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = shadowRoot.getElementById('register-name').value;
        const email = shadowRoot.getElementById('register-email').value;
        const password = shadowRoot.getElementById('register-password').value;
        register(name, email, password);
      });
    }
    
    // Toggle between login and register forms
    const registerToggle = shadowRoot.getElementById('register-toggle');
    const loginToggle = shadowRoot.getElementById('login-toggle');
    
    if (registerToggle) {
      registerToggle.addEventListener('click', () => {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'flex';
      });
    }
    
    if (loginToggle) {
      loginToggle.addEventListener('click', () => {
        if (registerForm) registerForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'flex';
      });
    }
  }
  
  /**
   * Track page changes in single-page applications
   */
  function trackPageChanges() {
    // Method 1: Watch for URL changes (for SPAs)
    let lastUrl = window.location.href;
    
    // Use MutationObserver to detect URL changes
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        updatePageContext();
      }
    });
    
    observer.observe(document, { subtree: true, childList: true });
    
    // Method 2: Handle popstate events (browser back/forward)
    window.addEventListener('popstate', updatePageContext);
    
    // Method 3: Handle beforeunload to save state before navigating away
    window.addEventListener('beforeunload', () => {
      saveState();
    });
  }
  
  /**
   * Update the page context when navigation occurs
   */
  function updatePageContext() {
    state.hostPage = {
      url: window.location.href,
      title: document.title
    };
    saveState();
  }
  
  /**
   * Login handler
   */
  async function login(email, password) {
    const errorEl = shadowRoot.getElementById('login-error');
    
    try {
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
      
      const response = await fetch(`${config.serverUrl}/api/widget/auth/login`, {
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
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }
      
      // Set authentication state
      auth.isAuthenticated = true;
      auth.user = data.user;
      auth.token = data.token;
      
      // Save auth state
      saveState();
      
      // Show the chat interface
      showChatInterface();
      
      // Report login event
      reportEvent('user_login', { userId: data.user.id });
      
    } catch (error) {
      if (errorEl) {
        errorEl.textContent = error.message || 'Login failed. Please try again.';
        errorEl.style.display = 'block';
      }
      console.error('Login error:', error);
    }
  }
  
  /**
   * Registration handler
   */
  async function register(name, email, password) {
    const errorEl = shadowRoot.getElementById('register-error');
    
    try {
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
      
      const response = await fetch(`${config.serverUrl}/api/widget/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify({
          name,
          email,
          password,
          tenantId: config.tenantId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      
      // Set authentication state
      auth.isAuthenticated = true;
      auth.user = data.user;
      auth.token = data.token;
      
      // Save auth state
      saveState();
      
      // Show the chat interface
      showChatInterface();
      
      // Report registration event
      reportEvent('user_register', { userId: data.user.id });
      
    } catch (error) {
      if (errorEl) {
        errorEl.textContent = error.message || 'Registration failed. Please try again.';
        errorEl.style.display = 'block';
      }
      console.error('Registration error:', error);
    }
  }
  
  /**
   * Show the chat interface after authentication
   */
  function showChatInterface() {
    // Clear messages container
    messagesContainer.innerHTML = '';
    
    // Add greeting message
    addMessage('assistant', config.greetingMessage || 'Hello! How can I help you today?');
    
    // Add a user info message
    if (auth.user && auth.user.name) {
      addMessage('system', `Logged in as ${auth.user.name}`);
    }
    
    // Restore chat history if any
    restoreChatHistory();
  }
  
  /**
   * Restore chat history from saved state
   */
  function restoreChatHistory() {
    if (state.messages && state.messages.length > 0) {
      state.messages.forEach(msg => {
        // Skip showing the message if it's already being displayed
        const existingMessages = messagesContainer.querySelectorAll('.message');
        let isDuplicate = false;
        
        for (let i = 0; i < existingMessages.length; i++) {
          if (existingMessages[i].textContent === msg.text) {
            isDuplicate = true;
            break;
          }
        }
        
        if (!isDuplicate) {
          const messageElement = document.createElement('div');
          messageElement.className = `message ${msg.sender}`;
          messageElement.textContent = msg.text;
          messagesContainer.appendChild(messageElement);
        }
      });
      
      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }
  
  /**
   * Toggle chat window open/closed
   */
  function toggleChat() {
    if (state.chatOpen) {
      closeChat();
    } else {
      openChat();
    }
  }
  
  /**
   * Open the chat window
   */
  function openChat() {
    chatWindow.classList.add('open');
    state.chatOpen = true;
    saveState();
    
    // Focus on input field if authenticated
    if (auth.isAuthenticated || !config.requireAuth) {
      inputField.focus();
    }
    
    // Report chat open event
    reportEvent('chat_opened');
  }
  
  /**
   * Close the chat window
   */
  function closeChat() {
    chatWindow.classList.remove('open');
    state.chatOpen = false;
    saveState();
    
    // Report chat close event
    reportEvent('chat_closed');
  }
  
  /**
   * Send a message to the support chat
   */
  function sendMessage() {
    // Don't allow sending messages if authentication is required but user is not authenticated
    if (config.requireAuth && !auth.isAuthenticated) {
      showAuthWarning();
      return;
    }
    
    const message = inputField.value.trim();
    
    if (!message) {
      return;
    }
    
    // Add user message to the chat
    addMessage('user', message);
    
    // Clear input field
    inputField.value = '';
    
    // Send to backend
    sendToServer(message);
  }
  
  /**
   * Show authentication warning
   */
  function showAuthWarning() {
    const warningEl = document.createElement('div');
    warningEl.className = 'message system';
    warningEl.textContent = 'Please log in to send messages.';
    messagesContainer.appendChild(warningEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  /**
   * Add a message to the chat
   */
  function addMessage(sender, text) {
    const message = document.createElement('div');
    message.className = `message ${sender}`;
    message.textContent = text;
    
    messagesContainer.appendChild(message);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Save message to state
    state.messages.push({ sender, text, timestamp: new Date().toISOString() });
    
    // Limit stored messages to prevent excessive storage usage
    if (state.messages.length > 50) {
      state.messages = state.messages.slice(-50);
    }
    
    saveState();
  }
  
  /**
   * Send message to Support AI server
   */
  async function sendToServer(message) {
    try {
      // Show typing indicator
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'message assistant';
      typingIndicator.id = 'typing-indicator';
      typingIndicator.textContent = '...';
      messagesContainer.appendChild(typingIndicator);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      
      // Prepare request data
      const requestData = {
        tenantId: config.tenantId,
        message: message,
        sessionId: state.sessionId,
        context: {
          url: state.hostPage.url,
          title: state.hostPage.title
        }
      };
      
      // Add user info if authenticated
      if (auth.isAuthenticated && auth.user) {
        requestData.userId = auth.user.id;
      }
      
      // Send the message to the server
      const response = await fetch(`${config.serverUrl}/api/widget/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `ApiKey ${config.apiKey}`,
          ...(auth.token ? { 'X-Auth-Token': auth.token } : {})
        },
        body: JSON.stringify(requestData)
      });
      
      // Remove typing indicator
      const indicator = messagesContainer.querySelector('#typing-indicator');
      if (indicator) {
        messagesContainer.removeChild(indicator);
      }
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      // Add the response to the chat
      addMessage('assistant', data.message || 'I apologize, but I couldn\'t process your request at this time.');
      
      // Report message exchange
      reportEvent('message_exchange', { 
        messageLength: message.length,
        responseLength: data.message ? data.message.length : 0
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove typing indicator if it exists
      const indicator = messagesContainer.querySelector('#typing-indicator');
      if (indicator) {
        messagesContainer.removeChild(indicator);
      }
      
      // Show error message
      addMessage('system', 'Sorry, there was an error processing your message. Please try again later.');
    }
  }
  
  /**
   * Report events to Support AI for analytics
   */
  function reportEvent(eventType, eventData = {}) {
    if (!config.reportData) {
      return;
    }
    
    const analyticsData = {
      tenantId: config.tenantId,
      eventType,
      sessionId: state.sessionId,
      timestamp: new Date().toISOString(),
      userId: auth.isAuthenticated && auth.user ? auth.user.id : null,
      data: {
        url: state.hostPage.url,
        title: state.hostPage.title,
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth,
        ...eventData
      }
    };
    
    // Use navigator.sendBeacon if available for more reliable analytics, especially during page unload
    if (navigator.sendBeacon) {
      try {
        navigator.sendBeacon(
          `${config.serverUrl}/api/widget/analytics`,
          JSON.stringify(analyticsData)
        );
        return;
      } catch (e) {
        // Fallback to fetch if sendBeacon fails
        console.debug('Beacon failed, using fetch:', e);
      }
    }
    
    // Fallback to fetch with keepalive
    fetch(`${config.serverUrl}/api/widget/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      },
      body: JSON.stringify(analyticsData),
      keepalive: true
    }).catch(error => {
      // Silently fail analytics
      console.debug('Analytics error:', error);
    });
  }
  
  /**
   * Generate a unique session ID
   */
  function generateSessionId() {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Initialize the widget
  if (document.readyState === 'complete') {
    initialize();
  } else {
    window.addEventListener('load', initialize);
  }
  
  // Expose a global API for programmatic control
  window.SupportAIChat = {
    init: function(customConfig) {
      Object.assign(config, customConfig);
      initialize();
    },
    open: openChat,
    close: closeChat,
    logout: function() {
      auth.isAuthenticated = false;
      auth.user = null;
      auth.token = null;
      saveState();
      
      // Recreate auth interface
      createAuthInterface();
    }
  };
})();