/**
 * Support AI Universal Integration Script with Authentication
 * 
 * Enhanced version of the widget that includes:
 * 1. User authentication (login/registration)
 * 2. Connection to client's AI configuration
 * 3. Cross-page persistence for chat sessions
 * 4. Secure token handling for API requests
 */

(function() {
  // Configuration object - will be replaced with user settings during download
  const config = {
    tenantId: "__TENANT_ID__",
    apiKey: "__API_KEY__",
    primaryColor: "__PRIMARY_COLOR__",
    position: "__POSITION__",
    greetingMessage: "__GREETING_MESSAGE__",
    autoOpen: __AUTO_OPEN__,
    branding: __BRANDING__,
    reportData: __REPORT_DATA__,
    adminId: "__ADMIN_ID__",
    requireAuth: true,
    apiEndpoint: "__API_ENDPOINT__",
    authEndpoint: "__AUTH_ENDPOINT__"
  };

  // Store references to created elements
  let widgetContainer = null;
  let shadowRoot = null;
  let chatWindow = null;
  let widgetButton = null;
  let styleElement = null;
  let loginContainer = null;
  let messagesContainer = null;
  
  // Authentication state
  const authState = {
    isAuthenticated: false,
    user: null,
    token: null,
    aiConfig: null
  };
  
  // State management with sessionStorage persistence
  const loadState = () => {
    try {
      const savedState = sessionStorage.getItem('supportAiWidgetState');
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (err) {
      console.debug('Error loading widget state:', err);
    }
    return null;
  };

  // Load authentication from sessionStorage
  const loadAuth = () => {
    try {
      const savedAuth = sessionStorage.getItem('supportAiAuth');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        authState.isAuthenticated = true;
        authState.user = parsed.user;
        authState.token = parsed.token;
        authState.aiConfig = parsed.aiConfig;
        return true;
      }
    } catch (err) {
      console.debug('Error loading auth state:', err);
    }
    return false;
  };

  // Save authentication to sessionStorage
  const saveAuth = () => {
    try {
      sessionStorage.setItem('supportAiAuth', JSON.stringify({
        user: authState.user,
        token: authState.token,
        aiConfig: authState.aiConfig
      }));
    } catch (err) {
      console.debug('Error saving auth state:', err);
    }
  };

  const savedState = loadState();
  
  const state = {
    initialized: false,
    chatOpen: savedState?.chatOpen || false,
    hostPage: {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname
    },
    sessionId: savedState?.sessionId || generateSessionId(),
    messages: savedState?.messages || [],
    position: savedState?.position || { bottom: '20px', right: '20px' },
    metrics: {
      interactionsCount: savedState?.metrics?.interactionsCount || 0
    }
  };
  
  // Function to persist state to sessionStorage
  const saveState = () => {
    try {
      sessionStorage.setItem('supportAiWidgetState', JSON.stringify({
        chatOpen: state.chatOpen,
        sessionId: state.sessionId,
        messages: state.messages,
        position: state.position,
        metrics: state.metrics
      }));
    } catch (err) {
      console.debug('Error saving widget state:', err);
    }
  };

  /**
   * Generate a unique session ID
   */
  function generateSessionId() {
    return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, function(c) {
      const r = Math.random() * 16 | 0;
      return r.toString(16);
    });
  }

  /**
   * Initialize the universal widget
   */
  function initialize() {
    if (state.initialized) return;
    
    createShadowContainer();
    injectStyles();
    createWidgetElements();
    setupEventListeners();
    
    state.initialized = true;
    
    // Apply saved position if it exists
    applyWidgetPosition();
    
    // Check if user is already authenticated
    const isAuthenticated = loadAuth();
    
    if (isAuthenticated) {
      // Hide login container and show messages
      if (loginContainer) {
        loginContainer.style.display = 'none';
      }
      
      // Restore chat history from localStorage
      restoreChatHistory();
      
      // Connect to AI provider
      connectToAIProvider();
    } else if (config.requireAuth) {
      // Initialize authentication UI
      initAuthUI();
    } else {
      // Auth not required, go straight to chat
      restoreChatHistory();
    }
    
    // Open chat window if it was open in previous session
    if (state.chatOpen) {
      openChat();
    } else if (config.autoOpen) {
      setTimeout(openChat, 1000);
    }
    
    // Update the state with current page info
    state.hostPage = {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname
    };
    saveState();
    
    reportWidgetEvent('widget_initialized');
  }
  
  /**
   * Apply the widget position from saved state
   */
  function applyWidgetPosition() {
    if (widgetButton) {
      // Use the position from config or the default
      const positionSide = config.position === 'left' ? 'left' : 'right';
      
      if (positionSide === 'left') {
        widgetButton.style.left = '20px';
        widgetButton.style.right = 'auto';
      } else {
        widgetButton.style.right = '20px';
        widgetButton.style.left = 'auto';
      }
      
      widgetButton.style.bottom = '20px';
      widgetButton.style.top = 'auto';
    }
  }
  
  /**
   * Restore chat history from saved messages in state
   */
  function restoreChatHistory() {
    if (state.messages && state.messages.length > 0 && messagesContainer) {
      // Clear any default greeting message
      messagesContainer.innerHTML = '';
      
      // Add all saved messages to the chat
      state.messages.forEach(message => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', message.sender);
        messageElement.textContent = message.text;
        messagesContainer.appendChild(messageElement);
      });
      
      // Scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Initialize the authentication UI
   */
  function initAuthUI() {
    if (!loginContainer || !chatWindow) return;
    
    loginContainer.style.display = 'block';
    messagesContainer.style.display = 'none';
    
    // Create login form
    const loginForm = document.createElement('div');
    loginForm.className = 'login-form';
    loginForm.innerHTML = `
      <h3>Login to Support Chat</h3>
      <div class="login-input-group">
        <label for="login-email">Email</label>
        <input type="email" id="login-email" placeholder="Enter your email">
      </div>
      <div class="login-input-group">
        <label for="login-password">Password</label>
        <input type="password" id="login-password" placeholder="Enter your password">
      </div>
      <div class="login-error" style="display: none;"></div>
      <button class="login-button">Login</button>
      <div class="login-footer">
        <a href="#" class="register-link">Register for an account</a>
      </div>
    `;
    
    // Create registration form
    const registerForm = document.createElement('div');
    registerForm.className = 'register-form';
    registerForm.style.display = 'none';
    registerForm.innerHTML = `
      <h3>Create an Account</h3>
      <div class="login-input-group">
        <label for="register-name">Name</label>
        <input type="text" id="register-name" placeholder="Enter your name">
      </div>
      <div class="login-input-group">
        <label for="register-email">Email</label>
        <input type="email" id="register-email" placeholder="Enter your email">
      </div>
      <div class="login-input-group">
        <label for="register-password">Password</label>
        <input type="password" id="register-password" placeholder="Create a password">
      </div>
      <div class="register-error" style="display: none;"></div>
      <button class="register-button">Register</button>
      <div class="login-footer">
        <a href="#" class="login-link">Already have an account? Login</a>
      </div>
    `;
    
    // Add forms to login container
    loginContainer.appendChild(loginForm);
    loginContainer.appendChild(registerForm);
    
    // Setup form event listeners
    const registerLink = loginForm.querySelector('.register-link');
    registerLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
    });
    
    const loginLink = registerForm.querySelector('.login-link');
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
    });
    
    // Handle login submission
    const loginButton = loginForm.querySelector('.login-button');
    const loginEmail = loginForm.querySelector('#login-email');
    const loginPassword = loginForm.querySelector('#login-password');
    const loginError = loginForm.querySelector('.login-error');
    
    loginButton.addEventListener('click', async () => {
      if (!loginEmail.value || !loginPassword.value) {
        loginError.textContent = 'Please enter both email and password';
        loginError.style.display = 'block';
        return;
      }
      
      // Show loading state
      loginButton.disabled = true;
      loginButton.textContent = 'Signing in...';
      loginError.style.display = 'none';
      
      try {
        const result = await authenticateUser(loginEmail.value, loginPassword.value);
        
        if (result.success) {
          // Store auth data
          authState.isAuthenticated = true;
          authState.user = result.user;
          authState.token = result.token;
          saveAuth();
          
          // Hide login and show chat
          loginContainer.style.display = 'none';
          messagesContainer.style.display = 'block';
          
          // Connect to AI provider
          connectToAIProvider();
          
          // Add welcome message
          addMessageToChat('assistant', `Welcome back, ${result.user.name || 'User'}! How can I help you today?`);
        } else {
          // Show error
          loginError.textContent = result.message || 'Invalid email or password';
          loginError.style.display = 'block';
        }
      } catch (error) {
        loginError.textContent = 'An error occurred. Please try again.';
        loginError.style.display = 'block';
        console.error('Login error:', error);
      } finally {
        // Reset button
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
      }
    });
    
    // Handle registration submission
    const registerButton = registerForm.querySelector('.register-button');
    const registerName = registerForm.querySelector('#register-name');
    const registerEmail = registerForm.querySelector('#register-email');
    const registerPassword = registerForm.querySelector('#register-password');
    const registerError = registerForm.querySelector('.register-error');
    
    registerButton.addEventListener('click', async () => {
      if (!registerName.value || !registerEmail.value || !registerPassword.value) {
        registerError.textContent = 'Please fill all fields';
        registerError.style.display = 'block';
        return;
      }
      
      // Show loading state
      registerButton.disabled = true;
      registerButton.textContent = 'Creating account...';
      registerError.style.display = 'none';
      
      try {
        const result = await registerUser(
          registerName.value,
          registerEmail.value,
          registerPassword.value
        );
        
        if (result.success) {
          // Store auth data
          authState.isAuthenticated = true;
          authState.user = result.user;
          authState.token = result.token;
          saveAuth();
          
          // Hide login and show chat
          loginContainer.style.display = 'none';
          messagesContainer.style.display = 'block';
          
          // Connect to AI provider
          connectToAIProvider();
          
          // Add welcome message
          addMessageToChat('assistant', `Welcome, ${result.user.name || 'User'}! Your account has been created. How can I help you today?`);
        } else {
          // Show error
          registerError.textContent = result.message || 'Registration failed. Please try again.';
          registerError.style.display = 'block';
        }
      } catch (error) {
        registerError.textContent = 'An error occurred. Please try again.';
        registerError.style.display = 'block';
        console.error('Registration error:', error);
      } finally {
        // Reset button
        registerButton.disabled = false;
        registerButton.textContent = 'Register';
      }
    });
  }
  
  /**
   * Connect to the configured AI provider
   */
  async function connectToAIProvider() {
    if (!authState.isAuthenticated || !authState.token) {
      console.warn('Cannot connect to AI provider: User not authenticated');
      return;
    }
    
    try {
      const response = await fetch(`${config.apiEndpoint}/ai-config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authState.token}`,
          'X-Tenant-ID': config.tenantId.toString(),
          'X-API-Key': config.apiKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get AI configuration: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        authState.aiConfig = data.config;
        saveAuth();
        console.log('Successfully connected to AI provider');
      } else {
        console.warn('Failed to get AI configuration:', data.message);
      }
    } catch (error) {
      console.error('Error connecting to AI provider:', error);
    }
  }
  
  /**
   * Authenticate user against the auth endpoint
   */
  async function authenticateUser(email, password) {
    try {
      const response = await fetch(`${config.authEndpoint}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': config.tenantId.toString()
        },
        body: JSON.stringify({
          email,
          password
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        message: 'Authentication failed. Please try again.'
      };
    }
  }
  
  /**
   * Register a new user
   */
  async function registerUser(name, email, password) {
    try {
      const response = await fetch(`${config.authEndpoint}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': config.tenantId.toString()
        },
        body: JSON.stringify({
          name,
          email,
          password
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: 'Registration failed. Please try again.'
      };
    }
  }

  /**
   * Create a shadow DOM container for the widget
   */
  function createShadowContainer() {
    widgetContainer = document.createElement('div');
    widgetContainer.id = 'support-widget-container';
    document.body.appendChild(widgetContainer);
    
    // Use Shadow DOM for isolation
    shadowRoot = widgetContainer.attachShadow({ mode: 'open' });
  }

  /**
   * Inject isolated styles for the widget
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
    const primaryColor = '#' + config.primaryColor;
    const positionSide = config.position === 'left' ? 'left' : 'right';
    
    return `
      :host {
        --primary-color: ${primaryColor};
        --widget-position: ${positionSide};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        font-size: 16px;
        line-height: 1.5;
        color: #333;
      }
      
      .widget-button {
        position: fixed;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: var(--primary-color);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
        cursor: pointer; /* Change cursor to indicate clickable */
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: box-shadow 0.3s ease, transform 0.2s ease;
        user-select: none; /* Prevent text selection */
      }
      
      .widget-button:hover {
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        transform: scale(1.05);
      }
      
      .widget-button .icon {
        width: 34px;
        height: 34px;
        fill: none;
        stroke: white;
        stroke-width: 6px;
      }
      
      .chat-window {
        position: fixed;
        bottom: 90px;
        ${positionSide}: 20px;
        width: 360px;
        height: 500px;
        background-color: white;
        border-radius: 10px;
        box-shadow: 0 5px 40px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 2147483646;
        transition: opacity 0.3s ease, transform 0.3s ease;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
      }
      
      .chat-window.open {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: all;
      }
      
      .chat-header {
        background-color: var(--primary-color);
        color: white;
        padding: 15px 20px;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .chat-header .close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      
      .messages-container {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .message {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 18px;
        margin-bottom: 5px;
        word-break: break-word;
      }
      
      .message.user {
        align-self: flex-end;
        background-color: var(--primary-color);
        color: white;
        border-bottom-right-radius: 5px;
      }
      
      .message.assistant {
        align-self: flex-start;
        background-color: #f0f0f0;
        color: #333;
        border-bottom-left-radius: 5px;
      }
      
      .input-area {
        padding: 15px;
        border-top: 1px solid #eee;
        display: flex;
        gap: 10px;
      }
      
      .input-area input {
        flex: 1;
        padding: 10px 15px;
        border: 1px solid #ddd;
        border-radius: 20px;
        outline: none;
        font-size: 14px;
      }
      
      .input-area input:focus {
        border-color: var(--primary-color);
      }
      
      .input-area button {
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 20px;
        padding: 8px 15px;
        cursor: pointer;
        font-weight: 600;
      }
      
      .branding {
        font-size: 11px;
        text-align: center;
        padding: 5px;
        color: #999;
        background-color: #f9f9f9;
      }
      
      .branding a {
        color: var(--primary-color);
        text-decoration: none;
      }
      
      /* Login container styles */
      .login-container {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
      }
      
      .login-form, .register-form {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      
      .login-form h3, .register-form h3 {
        margin: 0 0 15px 0;
        text-align: center;
        color: var(--primary-color);
      }
      
      .login-input-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }
      
      .login-input-group label {
        font-size: 14px;
        font-weight: 500;
      }
      
      .login-input-group input {
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .login-button, .register-button {
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 4px;
        padding: 10px;
        cursor: pointer;
        font-weight: 600;
        margin-top: 10px;
      }
      
      .login-error, .register-error {
        color: #e74c3c;
        font-size: 14px;
        text-align: center;
      }
      
      .login-footer {
        text-align: center;
        margin-top: 10px;
        font-size: 14px;
      }
      
      .login-footer a {
        color: var(--primary-color);
        text-decoration: none;
      }
      
      @media (max-width: 480px) {
        .chat-window {
          width: calc(100% - 40px);
          height: calc(100% - 160px);
          bottom: 80px;
        }
      }
    `;
  }

  /**
   * Create the chat widget elements
   */
  function createWidgetElements() {
    // Create widget button with logo
    widgetButton = document.createElement('div');
    widgetButton.classList.add('widget-button');
    widgetButton.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="none" />
        <path d="M12 6v8M8 10h8" stroke-linecap="round" />
      </svg>
    `;
    shadowRoot.appendChild(widgetButton);
    
    // Create chat window
    chatWindow = document.createElement('div');
    chatWindow.classList.add('chat-window');
    chatWindow.innerHTML = `
      <div class="chat-header">
        <div>Support Chat</div>
        <button class="close-btn">&times;</button>
      </div>
      <div class="login-container" style="display: none;"></div>
      <div class="messages-container"></div>
      <div class="input-area">
        <input type="text" placeholder="Type your message...">
        <button>Send</button>
      </div>
      ${config.branding ? '<div class="branding">Powered by <a href="https://example.com" target="_blank">Support AI</a></div>' : ''}
    `;
    shadowRoot.appendChild(chatWindow);
    
    // Store references to important containers
    loginContainer = chatWindow.querySelector('.login-container');
    messagesContainer = chatWindow.querySelector('.messages-container');
    
    // Add greeting message
    const greeting = document.createElement('div');
    greeting.classList.add('message', 'assistant');
    greeting.textContent = config.greetingMessage || 'Hello! How can I help you today?';
    messagesContainer.appendChild(greeting);
  }

  /**
   * Set up event listeners for widget functionality
   */
  function setupEventListeners() {
    // Add click handler for opening/closing the chat
    widgetButton.addEventListener('click', (e) => {
      toggleChat();
    });
    
    // Close button
    const closeBtn = chatWindow.querySelector('.close-btn');
    closeBtn.addEventListener('click', closeChat);
    
    // Send message on button click
    const sendButton = chatWindow.querySelector('.input-area button');
    sendButton.addEventListener('click', sendMessage);
    
    // Send message on Enter key
    const inputField = chatWindow.querySelector('.input-area input');
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
    
    // Track page navigation events for SPA (Single Page Applications)
    trackPageChanges();
  }
  
  /**
   * Chat widget position handling
   * We're using a fixed position for the chat widget to improve reliability
   * The draggable functionality has been removed to simplify the experience
   * and ensure consistent behavior across page navigations
   */
  function handleResize() {
    // Keep widget in the original position
    applyWidgetPosition();
    
    // Adjust chat window size if needed
    const windowWidth = window.innerWidth;
    if (windowWidth < 480) {
      chatWindow.style.width = (windowWidth - 40) + 'px';
      chatWindow.style.height = (window.innerHeight - 160) + 'px';
    } else {
      chatWindow.style.width = '360px';
      chatWindow.style.height = '500px';
    }
  }
  
  /**
   * Track page navigation changes to update widget state
   * Works across different navigation types (SPA, regular page loads)
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
    // Update the state with current page info
    state.hostPage = {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname
    };
    
    // Save state to ensure persistence
    saveState();
    
    // Report navigation to analytics
    reportWidgetEvent('page_navigation', { 
      url: state.hostPage.url,
      title: state.hostPage.title
    });
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
    reportWidgetEvent('chat_opened');
  }

  /**
   * Close the chat window
   */
  function closeChat() {
    chatWindow.classList.remove('open');
    state.chatOpen = false;
    saveState();
    reportWidgetEvent('chat_closed');
  }

  /**
   * Send a message to the support chat
   */
  function sendMessage() {
    const inputField = chatWindow.querySelector('.input-area input');
    const text = inputField.value.trim();
    
    if (!text) return;
    
    // Add user message to chat
    addMessageToChat('user', text);
    
    // Clear input field
    inputField.value = '';
    
    // Update page context in case it changed
    state.hostPage = {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname
    };
    
    // Persist state before sending to backend
    saveState();
    
    // If authenticated, send message to AI
    if (authState.isAuthenticated && authState.token) {
      sendMessageToAI(text);
    } else if (config.requireAuth) {
      // If auth is required but not authenticated
      addMessageToChat('assistant', 'Please log in to continue the conversation.');
      
      // Show login container
      if (loginContainer) {
        loginContainer.style.display = 'block';
        messagesContainer.style.display = 'none';
      }
    } else {
      // If auth is not required
      mockAIResponse(text);
    }
  }
  
  /**
   * Add a message to the chat UI
   */
  function addMessageToChat(sender, text) {
    // Add to UI
    const messagesContainer = chatWindow.querySelector('.messages-container');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add to state
    state.messages.push({
      sender: sender,
      text: text,
      timestamp: new Date().toISOString()
    });
    
    // Save state
    saveState();
    
    // Track metrics
    state.metrics.interactionsCount++;
    saveState();
  }
  
  /**
   * Send message to AI provider API
   */
  async function sendMessageToAI(text) {
    // Show loading indicator
    const loadingMessage = document.createElement('div');
    loadingMessage.classList.add('message', 'assistant');
    loadingMessage.textContent = 'Typing...';
    loadingMessage.id = 'loading-message';
    messagesContainer.appendChild(loadingMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    try {
      const response = await fetch(`${config.apiEndpoint}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
          'X-Tenant-ID': config.tenantId.toString(),
          'X-API-Key': config.apiKey
        },
        body: JSON.stringify({
          message: text,
          sessionId: state.sessionId,
          history: state.messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
          pageContext: state.hostPage
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Remove loading indicator
      const loadingElement = messagesContainer.querySelector('#loading-message');
      if (loadingElement) {
        loadingElement.remove();
      }
      
      // Add AI response to chat
      if (data.success) {
        addMessageToChat('assistant', data.response);
      } else {
        addMessageToChat('assistant', "I'm sorry, I couldn't process your request at this time. Please try again later.");
        console.error('AI response error:', data.message);
      }
    } catch (error) {
      console.error('Error sending message to AI:', error);
      
      // Remove loading indicator
      const loadingElement = messagesContainer.querySelector('#loading-message');
      if (loadingElement) {
        loadingElement.remove();
      }
      
      // Add error message
      addMessageToChat('assistant', "I'm sorry, there was an error connecting to the support service. Please try again later.");
    }
  }
  
  /**
   * Simple mock AI response (for testing without authentication)
   */
  function mockAIResponse(text) {
    // Show loading indicator
    const loadingMessage = document.createElement('div');
    loadingMessage.classList.add('message', 'assistant');
    loadingMessage.textContent = 'Typing...';
    loadingMessage.id = 'loading-message';
    messagesContainer.appendChild(loadingMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Simulate delay
    setTimeout(() => {
      // Remove loading indicator
      const loadingElement = messagesContainer.querySelector('#loading-message');
      if (loadingElement) {
        loadingElement.remove();
      }
      
      // Simple response logic
      let response = "I'm here to help! However, I'm currently in demo mode. To get full assistance, please log in.";
      
      if (text.toLowerCase().includes('hello') || text.toLowerCase().includes('hi')) {
        response = "Hello! I'm the support assistant. How can I help you today?";
      } else if (text.toLowerCase().includes('help')) {
        response = "I'd be happy to help. Could you please provide more details about what you need assistance with?";
      } else if (text.toLowerCase().includes('login') || text.toLowerCase().includes('account')) {
        response = "For account-related assistance, you can log in using the chat login option.";
      }
      
      // Add response to chat
      addMessageToChat('assistant', response);
    }, 1000);
  }
  
  /**
   * Report widget events to analytics
   */
  function reportWidgetEvent(event, data = {}) {
    if (!config.reportData) return;
    
    try {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        sessionId: state.sessionId,
        tenantId: config.tenantId,
        page: state.hostPage,
        user: authState.isAuthenticated ? { id: authState.user.id } : null,
        ...data
      };
      
      navigator.sendBeacon(`${config.apiEndpoint}/widget-analytics`, JSON.stringify(payload));
    } catch (error) {
      console.debug('Error reporting widget event:', error);
    }
  }

  // Initialize the widget when the DOM is fully loaded
  if (document.readyState === 'complete') {
    initialize();
  } else {
    window.addEventListener('load', initialize);
  }
  
  // Expose public API
  window.SupportAI = {
    openChat,
    closeChat,
    toggleChat,
    isAuthenticated: () => authState.isAuthenticated,
    logout: () => {
      authState.isAuthenticated = false;
      authState.user = null;
      authState.token = null;
      authState.aiConfig = null;
      sessionStorage.removeItem('supportAiAuth');
      
      // Show login container
      if (loginContainer) {
        loginContainer.style.display = 'block';
        messagesContainer.style.display = 'none';
      }
      
      // Initialize auth UI
      if (config.requireAuth) {
        initAuthUI();
      }
      
      return true;
    }
  };
})();