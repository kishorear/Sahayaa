/**
 * Support AI Universal Integration Script
 * 
 * This script provides a simple way to integrate the support chat widget
 * across website content.
 * 
 * How it works:
 * 1. Creates an isolated widget container using Shadow DOM
 * 2. Adds a floating chat button that opens the support window
 * 3. Handles communication with the support backend
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
    adminId: "__ADMIN_ID__"
  };

  // Store references to created elements
  let widgetContainer = null;
  let shadowRoot = null;
  let chatWindow = null;
  let widgetButton = null;
  let styleElement = null;
  
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

  const savedState = loadState();
  
  // Drag state variables
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  
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
    
    // Restore chat state (messages) from localStorage
    restoreChatHistory();
    
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
    if (state.position) {
      Object.keys(state.position).forEach(prop => {
        widgetButton.style[prop] = state.position[prop];
      });
    } else {
      // Default position if none saved
      widgetButton.style.bottom = '20px';
      widgetButton.style.right = '20px';
    }
  }
  
  /**
   * Restore chat history from saved messages in state
   */
  function restoreChatHistory() {
    if (state.messages && state.messages.length > 0) {
      const messagesContainer = chatWindow.querySelector('.messages-container');
      
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
      
      .suggested-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        margin-top: 5px;
      }
      
      .action-button {
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 15px;
        padding: 5px 10px;
        font-size: 12px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .action-button:hover {
        background-color: #e5e5e5;
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
      <div class="messages-container"></div>
      <div class="input-area">
        <input type="text" placeholder="Type your message...">
        <button>Send</button>
      </div>
      ${config.branding ? '<div class="branding">Powered by <a href="https://example.com" target="_blank">Support AI</a></div>' : ''}
    `;
    shadowRoot.appendChild(chatWindow);
    
    // Add greeting message
    const messagesContainer = chatWindow.querySelector('.messages-container');
    const greeting = document.createElement('div');
    greeting.classList.add('message', 'assistant');
    greeting.textContent = config.greetingMessage || 'Hello! How can I help you today?';
    messagesContainer.appendChild(greeting);
  }

  /**
   * Set up event listeners for widget functionality
   */
  function setupEventListeners() {
    // Skip drag functionality to simplify the widget implementation
    // This will make the widget stay in its fixed position and only handle chat functions
    
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
    
    // Send to backend
    sendToSupportBackend({
      tenantId: config.tenantId,
      message: text,
      sessionId: state.sessionId,
      url: state.hostPage.url
    }).then(response => {
      // Add assistant message to chat
      addMessageToChat('assistant', response.message);
      
      // Add suggested actions if any
      if (response.actions && response.actions.length > 0) {
        displaySuggestedActions(response.actions);
      }
    }).catch(error => {
      console.error('Error sending message:', error);
      useFallbackResponse();
    });
  }

  /**
   * Add a message to the chat window
   */
  function addMessageToChat(sender, text) {
    const messagesContainer = chatWindow.querySelector('.messages-container');
    
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);
    messageElement.textContent = text;
    
    messagesContainer.appendChild(messageElement);
    
    // Save message to state
    state.messages.push({ sender, text, timestamp: new Date().toISOString() });
    
    // Save state to localStorage
    saveState();
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    reportWidgetEvent('message_' + sender, { length: text.length });
    state.metrics.interactionsCount++;
  }

  /**
   * Send message to Support AI backend
   */
  async function sendToSupportBackend(data) {
    const apiUrl = 'https://' + window.location.host + '/api/widget/chat';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'ApiKey ' + config.apiKey
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('API request failed');
    }
    
    return await response.json();
  }

  /**
   * Uses a fallback response when the API is unavailable
   */
  function useFallbackResponse() {
    addMessageToChat('assistant', "I apologize, but I am having trouble connecting to our support system right now. Please try again in a moment or contact support directly.");
  }

  /**
   * Display suggested actions from the API response
   */
  function displaySuggestedActions(actions) {
    const messagesContainer = chatWindow.querySelector('.messages-container');
    
    const actionsContainer = document.createElement('div');
    actionsContainer.classList.add('suggested-actions');
    
    actions.forEach(action => {
      const button = document.createElement('button');
      button.classList.add('action-button');
      button.textContent = action.label;
      
      button.addEventListener('click', () => {
        if (action.type === 'message') {
          const inputField = chatWindow.querySelector('.input-area input');
          inputField.value = action.message;
          sendMessage();
        }
      });
      
      actionsContainer.appendChild(button);
    });
    
    messagesContainer.appendChild(actionsContainer);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Handle window resize
   */
  function handleResize() {
    if (window.innerWidth <= 480) {
      chatWindow.style.width = 'calc(100% - 40px)';
      chatWindow.style.height = 'calc(100% - 160px)';
    } else {
      chatWindow.style.width = '360px';
      chatWindow.style.height = '500px';
    }
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
  
  function applyWidgetPosition() {
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
    
    // Update state
    if (positionSide === 'left') {
      state.position = {
        bottom: '20px',
        left: '20px'
      };
    } else {
      state.position = {
        bottom: '20px',
        right: '20px'
      };
    }
    
    // Save to localStorage
    saveState();
    
    // Report the position change
    reportWidgetEvent('widget_moved', { 
      position: {
        left: rect.left,
        top: rect.top
      }
    });
  }

  /**
   * Report widget events to the backend for analytics
   */
  function reportWidgetEvent(eventType, eventData = {}) {
    if (!config.reportData) return;
    
    const analyticsData = {
      tenantId: config.tenantId,
      adminId: config.adminId,
      apiKey: config.apiKey,
      sessionId: state.sessionId,
      eventType: eventType,
      url: state.hostPage.url,
      timestamp: new Date().toISOString(),
      data: {
        ...eventData,
        userAgent: navigator.userAgent,
        screenWidth: window.innerWidth
      }
    };
    
    fetch('https://' + window.location.host + '/api/widget/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(analyticsData),
      // Use keepalive to ensure the request completes even if the page unloads
      keepalive: true
    }).catch(err => {
      // Silently fail for analytics
      console.debug('Analytics error:', err);
    });
  }

  /**
   * Generate a unique session ID
   * @returns {string} A unique session ID
   */
  function generateSessionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Initialize the widget when the page is fully loaded
  if (document.readyState === 'complete') {
    initialize();
  } else {
    window.addEventListener('load', initialize);
  }
})();