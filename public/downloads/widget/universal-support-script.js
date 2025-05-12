/**
 * Support AI Universal Integration Script
 * 
 * This script provides Grammarly-like functionality by automatically integrating
 * the support chat widget across all website content without requiring manual embedding.
 * 
 * How it works:
 * 1. Detects and monitors text inputs across the page
 * 2. Creates an isolated widget container using Shadow DOM
 * 3. Provides context-aware support based on user interaction
 * 4. Gracefully handles conflicts with existing page scripts
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
    adminId: __ADMIN_ID__,
    
    // Auto-integration specific settings
    autoIntegrate: true,
    textFieldMonitoring: true,
    suggestionsThreshold: 3,
    sensitivityLevel: "medium",
    allowedDomains: ["*"] // Wildcard allows all domains, or specify ['example.com', 'subdomain.site.org']
  };

  // Store references to created elements
  let widgetContainer = null;
  let shadowRoot = null;
  let chatWindow = null;
  let widgetButton = null;
  let styleElement = null;
  
  // State management
  const state = {
    initialized: false,
    chatOpen: false,
    monitoredFields: new WeakMap(),
    pendingSuggestions: [],
    contextData: {},
    hostPage: {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname
    }
  };
  
  /**
   * Initialize the universal widget
   */
  function initialize() {
    if (state.initialized) return;
    
    // Check if we're allowed to run on this domain
    if (!isDomainAllowed()) {
      console.log('Support AI: Integration disabled for this domain');
      return;
    }

    // Create a detached widget container with shadow DOM for style isolation
    createShadowContainer();
    
    // Inject required styles
    injectStyles();
    
    // Create the widget button and chat window
    createWidgetElements();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start monitoring text fields if enabled
    if (config.textFieldMonitoring) {
      startTextFieldMonitoring();
    }
    
    // Mark as initialized
    state.initialized = true;
    
    // Auto-open chat if configured
    if (config.autoOpen) {
      setTimeout(openChat, 1000);
    }
    
    // Report initialization if enabled
    if (config.reportData) {
      reportWidgetEvent('initialized', {
        url: state.hostPage.url,
        title: state.hostPage.title
      });
    }
  }
  
  /**
   * Check if current domain is allowed for integration
   */
  function isDomainAllowed() {
    // Always allow when wildcard is present
    if (config.allowedDomains.includes('*')) return true;
    
    const currentDomain = window.location.hostname;
    
    // Check if current domain or any parent domain is in the allowed list
    return config.allowedDomains.some(domain => {
      // Exact match
      if (currentDomain === domain) return true;
      
      // Check if it's a subdomain
      if (currentDomain.endsWith('.' + domain)) return true;
      
      return false;
    });
  }

  /**
   * Create a shadow DOM container for the widget
   */
  function createShadowContainer() {
    // Create the main container
    widgetContainer = document.createElement('div');
    widgetContainer.setAttribute('id', 'support-ai-universal-container');
    widgetContainer.style.position = 'fixed';
    widgetContainer.style.zIndex = '2147483647'; // Max z-index value
    
    // Attach container to the body
    document.body.appendChild(widgetContainer);
    
    // Create shadow root for style isolation
    shadowRoot = widgetContainer.attachShadow({ mode: 'closed' }); 
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
    return `
      :host {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
        color: #333;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .support-widget-container {
        position: fixed;
        z-index: 9999;
        ${config.position === 'left' ? 'left: 20px;' : 'right: 20px;'}
        bottom: 20px;
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
        ${config.position === 'left' ? 'left: 0;' : 'right: 0;'}
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
      
      .support-text-suggestion {
        position: absolute;
        background-color: white;
        border: 1px solid ${config.primaryColor};
        border-radius: 4px;
        padding: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        font-size: 12px;
        max-width: 220px;
        z-index: 10000;
        cursor: pointer;
      }
      
      .support-text-suggestion:before {
        content: '';
        position: absolute;
        bottom: -5px;
        left: 10px;
        width: 10px;
        height: 10px;
        background-color: white;
        border-right: 1px solid ${config.primaryColor};
        border-bottom: 1px solid ${config.primaryColor};
        transform: rotate(45deg);
      }
      
      .support-inline-button {
        position: absolute;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: ${config.primaryColor};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        z-index: 10000;
      }
      
      .support-suggested-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin: 10px 0 15px 0;
        width: 100%;
      }
      
      .support-action-button {
        background-color: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 16px;
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 150px;
      }
      
      .support-action-button:hover {
        background-color: ${config.primaryColor};
        color: white;
        border-color: ${config.primaryColor};
      }
    `;
  }
  
  /**
   * Create the chat widget elements
   */
  function createWidgetElements() {
    // Main container div for widget
    const container = document.createElement('div');
    container.className = 'support-widget-container';
    
    // Widget button
    widgetButton = document.createElement('div');
    widgetButton.className = 'support-widget-button';
    widgetButton.innerHTML = '<svg class="support-widget-icon" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="13" cy="13" r="10" stroke="white" stroke-width="6" stroke-linejoin="round" fill="none"/><path d="M13 9.5V13" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 16.5H13.01" stroke="white" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    
    // Chat window
    chatWindow = document.createElement('div');
    chatWindow.className = 'support-chat-window';
    
    // Chat header
    const chatHeader = document.createElement('div');
    chatHeader.className = 'support-chat-header';
    chatHeader.innerHTML = `
      <div>Support AI</div>
      <div class="support-chat-close">✕</div>
    `;
    
    // Chat messages container
    const chatMessages = document.createElement('div');
    chatMessages.className = 'support-chat-messages';
    
    // Add greeting message if configured
    if (config.greetingMessage) {
      const greetingMessage = document.createElement('div');
      greetingMessage.className = 'support-message support-message-assistant';
      greetingMessage.textContent = config.greetingMessage;
      chatMessages.appendChild(greetingMessage);
    }
    
    // Chat input area
    const chatInput = document.createElement('div');
    chatInput.className = 'support-chat-input';
    chatInput.innerHTML = `
      <input type="text" placeholder="Type your message...">
      <button class="support-send-button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 2L11 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    `;
    
    // Branding element if enabled
    if (config.branding) {
      const branding = document.createElement('div');
      branding.className = 'support-branding';
      branding.textContent = 'Powered by Support AI';
      chatWindow.appendChild(branding);
    }
    
    // Assemble the chat window
    chatWindow.appendChild(chatHeader);
    chatWindow.appendChild(chatMessages);
    chatWindow.appendChild(chatInput);
    
    // Add everything to the container
    container.appendChild(widgetButton);
    container.appendChild(chatWindow);
    
    // Add the container to shadow root
    shadowRoot.appendChild(container);
  }
  
  /**
   * Set up event listeners for widget functionality
   */
  function setupEventListeners() {
    // Widget toggle button
    const widgetButton = shadowRoot.querySelector('.support-widget-button');
    widgetButton.addEventListener('click', toggleChat);
    
    // Close button
    const closeButton = shadowRoot.querySelector('.support-chat-close');
    closeButton.addEventListener('click', closeChat);
    
    // Send button
    const sendButton = shadowRoot.querySelector('.support-send-button');
    sendButton.addEventListener('click', sendMessage);
    
    // Input field - send on Enter key
    const inputField = shadowRoot.querySelector('.support-chat-input input');
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
    
    // Global event listeners for page context
    document.addEventListener('click', captureClickContext);
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Detect context from selected text
    document.addEventListener('mouseup', detectSelectedText);
    
    // Handle window resize
    window.addEventListener('resize', handleResize);
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
    if (!state.chatOpen) {
      shadowRoot.querySelector('.support-chat-window').classList.add('open');
      shadowRoot.querySelector('.support-chat-input input').focus();
      state.chatOpen = true;
      
      // Report event if enabled
      if (config.reportData) {
        reportWidgetEvent('chat_opened');
      }
    }
  }
  
  /**
   * Close the chat window
   */
  function closeChat() {
    if (state.chatOpen) {
      shadowRoot.querySelector('.support-chat-window').classList.remove('open');
      state.chatOpen = false;
      
      // Report event if enabled
      if (config.reportData) {
        reportWidgetEvent('chat_closed');
      }
    }
  }
  
  /**
   * Send a message to the support chat
   */
  function sendMessage() {
    const inputField = shadowRoot.querySelector('.support-chat-input input');
    const messageText = inputField.value.trim();
    
    if (!messageText) return;
    
    // Add user message to chat
    addMessageToChat('user', messageText);
    
    // Clear input field
    inputField.value = '';
    
    // Context-enriched message
    const enrichedMessage = {
      message: messageText,
      context: {
        url: state.hostPage.url,
        title: state.hostPage.title,
        ...state.contextData
      }
    };
    
    // Report message if enabled
    if (config.reportData) {
      reportWidgetEvent('message_sent', { message: messageText });
    }
    
    // Send to support AI backend
    sendToSupportBackend(enrichedMessage);
  }
  
  /**
   * Add a message to the chat window
   */
  function addMessageToChat(sender, text) {
    const messagesContainer = shadowRoot.querySelector('.support-chat-messages');
    const messageElement = document.createElement('div');
    messageElement.className = `support-message support-message-${sender}`;
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  /**
   * Send message to Support AI backend
   */
  async function sendToSupportBackend(data) {
    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'support-message support-message-assistant';
    typingIndicator.textContent = '...';
    shadowRoot.querySelector('.support-chat-messages').appendChild(typingIndicator);
    
    try {
      // In production mode, use the actual API endpoint
      const apiUrl = window.location.origin + '/api/widget/chat';
      
      // Make the API call
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey || ''}`
        },
        body: JSON.stringify({
          tenantId: config.tenantId,
          message: data.message,
          context: data.context,
          sessionId: state.sessionId,
          url: window.location.href
        })
      });
      
      // Process the response
      if (response.ok) {
        const result = await response.json();
        addMessageToChat('assistant', result.message || result.response || result.content);
        
        // If there are any suggested actions, handle them
        if (result.actions && Array.isArray(result.actions) && result.actions.length > 0) {
          displaySuggestedActions(result.actions);
        }
      } else {
        console.error('Support API error:', response.status, response.statusText);
        
        // Fallback to local response
        useFallbackResponse();
      }
    } catch (error) {
      console.error('Error sending to Support backend:', error);
      
      // Use fallback response when API is unavailable
      useFallbackResponse();
    } finally {
      // Remove typing indicator regardless of outcome
      if (typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator);
      }
      
      // Report event if analytics enabled
      if (config.reportData) {
        reportWidgetEvent('message_received');
      }
    }
  }
  
  /**
   * Uses a fallback response when the API is unavailable
   */
  function useFallbackResponse() {
    const fallbackResponses = [
      "I'll look into that for you right away.",
      "Thank you for your question. Here's what I found...",
      "I understand your concern. Let me help you with that.",
      "Based on the page you're viewing, I suggest...",
      "I've analyzed your question and have a solution."
    ];
    
    const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    addMessageToChat('assistant', fallbackResponse);
  }
  
  /**
   * Display suggested actions from the API response
   */
  function displaySuggestedActions(actions) {
    // Create container for action buttons
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'support-suggested-actions';
    
    // Create buttons for each action
    actions.forEach(action => {
      const actionButton = document.createElement('button');
      actionButton.className = 'support-action-button';
      actionButton.textContent = action.label || action.text || 'Action';
      actionButton.onclick = () => {
        // Handle the action click
        if (action.type === 'url' && action.url) {
          window.open(action.url, '_blank');
        } else if (action.type === 'message' && action.message) {
          openChatWithContext(action.message);
        } else if (action.type === 'function' && action.function) {
          // Custom function handler would go here
          console.log('Function action:', action.function);
        }
        
        // Remove the actions after one is clicked
        if (actionsContainer.parentNode) {
          actionsContainer.parentNode.removeChild(actionsContainer);
        }
      };
      
      actionsContainer.appendChild(actionButton);
    });
    
    // Add to chat
    shadowRoot.querySelector('.support-chat-messages').appendChild(actionsContainer);
  }
  
  /**
   * Start monitoring text fields on the page for context-aware support
   */
  function startTextFieldMonitoring() {
    // Find all input and textarea elements
    const textFields = document.querySelectorAll('input[type="text"], input[type="email"], input[type="search"], textarea');
    
    // Add event listeners to each field
    textFields.forEach(field => {
      if (!state.monitoredFields.has(field)) {
        field.addEventListener('focus', handleFieldFocus);
        field.addEventListener('blur', handleFieldBlur);
        field.addEventListener('input', handleFieldInput);
        
        // Mark as monitored
        state.monitoredFields.set(field, {
          lastValue: field.value,
          fieldType: field.tagName.toLowerCase() + (field.type ? '-' + field.type : ''),
          fieldName: field.name || field.id || null
        });
      }
    });
    
    // Set up mutation observer to detect new fields
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              // Check if it's a text field
              if (node.matches && node.matches('input[type="text"], input[type="email"], input[type="search"], textarea')) {
                // Add listeners
                if (!state.monitoredFields.has(node)) {
                  node.addEventListener('focus', handleFieldFocus);
                  node.addEventListener('blur', handleFieldBlur);
                  node.addEventListener('input', handleFieldInput);
                  
                  state.monitoredFields.set(node, {
                    lastValue: node.value,
                    fieldType: node.tagName.toLowerCase() + (node.type ? '-' + node.type : ''),
                    fieldName: node.name || node.id || null
                  });
                }
              }
              
              // Check children
              const childFields = node.querySelectorAll('input[type="text"], input[type="email"], input[type="search"], textarea');
              childFields.forEach(field => {
                if (!state.monitoredFields.has(field)) {
                  field.addEventListener('focus', handleFieldFocus);
                  field.addEventListener('blur', handleFieldBlur);
                  field.addEventListener('input', handleFieldInput);
                  
                  state.monitoredFields.set(field, {
                    lastValue: field.value,
                    fieldType: field.tagName.toLowerCase() + (field.type ? '-' + field.type : ''),
                    fieldName: field.name || field.id || null
                  });
                }
              });
            }
          });
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  /**
   * Handle text field focus event
   */
  function handleFieldFocus(event) {
    const field = event.target;
    const fieldData = state.monitoredFields.get(field);
    
    if (fieldData) {
      // Update context with active field
      state.contextData.activeField = {
        type: fieldData.fieldType,
        name: fieldData.fieldName,
        value: field.value
      };
      
      // Check if we should show support button near field
      if (shouldShowInlineSupport(field)) {
        showInlineSupportButton(field);
      }
    }
  }
  
  /**
   * Handle text field blur event
   */
  function handleFieldBlur(event) {
    const field = event.target;
    const fieldData = state.monitoredFields.get(field);
    
    // Remove inline support button if any
    removeInlineSupportButton();
    
    // Check if field content should trigger suggestions
    if (field.value.length > config.suggestionsThreshold) {
      analyzeFieldContent(field, field.value, fieldData);
    }
  }
  
  /**
   * Analyze field content for potential support needs
   */
  function analyzeFieldContent(field, content, fieldData) {
    // Detect potential issues in the content
    const helpKeywords = ['help', 'issue', 'problem', 'error', 'not working', 'failed', 'stuck', 'confused', 'trouble'];
    const questionPatterns = [/how (do|can|to) .+\?/i, /why (is|does|won't) .+\?/i, /what (is|are|does) .+\?/i];
    const frustrationIndicators = ['!', '!!!', '???', 'wtf', 'omg', 'urgent', 'asap'];
    
    // Analyze for help keywords
    const hasHelpKeyword = helpKeywords.some(keyword => content.toLowerCase().includes(keyword));
    
    // Analyze for question patterns
    const hasQuestionPattern = questionPatterns.some(pattern => pattern.test(content));
    
    // Analyze for frustration indicators
    const hasFrustrationIndicator = frustrationIndicators.some(indicator => 
      content.toLowerCase().includes(indicator.toLowerCase()));
    
    // Analyze for long text which might indicate complex issues
    const isLongDescription = content.length > 100;
    
    // Decide whether to show suggestion based on analysis
    if (hasHelpKeyword || hasQuestionPattern || hasFrustrationIndicator || isLongDescription) {
      // Show suggestion near the field
      showTextSuggestion(field, determineHelpfulSuggestion(content, fieldData));
    }
  }
  
  /**
   * Determine a helpful suggestion based on content analysis
   */
  function determineHelpfulSuggestion(content, fieldData) {
    const lowerContent = content.toLowerCase();
    
    // Create context-aware suggestion
    if (fieldData && fieldData.fieldName) {
      const fieldName = fieldData.fieldName.toLowerCase();
      
      // Check for specific field contexts
      if (fieldName.includes('email') && lowerContent.includes('problem')) {
        return "It looks like you're having trouble with email. Would you like assistance?";
      }
      
      if (fieldName.includes('payment') || lowerContent.includes('payment')) {
        return "Need help with payment issues? Our support team can assist you.";
      }
      
      if (fieldName.includes('login') || lowerContent.includes('login') || lowerContent.includes('password')) {
        return "Having trouble logging in? Click here for immediate help.";
      }
    }
    
    // General suggestions based on content
    if (lowerContent.includes('error') || lowerContent.includes('not working')) {
      return "I noticed you're experiencing an error. Would you like help troubleshooting?";
    }
    
    if (lowerContent.includes('how to') || lowerContent.includes('how do i')) {
      return "Need guidance on how to do something? Our support team can help.";
    }
    
    // Default suggestion
    return "Would you like assistance with your question?";
  }
  
  /**
   * Show a suggestion bubble near the text field
   */
  function showTextSuggestion(field, suggestionText) {
    // Remove any existing suggestions first
    removeTextSuggestion();
    
    // Create suggestion element
    const suggestion = document.createElement('div');
    suggestion.className = 'support-text-suggestion';
    suggestion.textContent = suggestionText;
    suggestion.setAttribute('role', 'button');
    suggestion.setAttribute('tabindex', '0');
    
    // Position suggestion near field
    const fieldRect = field.getBoundingClientRect();
    suggestion.style.position = 'absolute';
    suggestion.style.top = `${fieldRect.bottom + 5}px`;
    suggestion.style.left = `${fieldRect.left}px`;
    
    // Add to shadow DOM
    shadowRoot.appendChild(suggestion);
    
    // Add click event
    suggestion.addEventListener('click', () => {
      removeTextSuggestion();
      openChatWithContext(`I need help with: "${field.value}"`);
    });
    
    // Auto-remove after delay if not clicked
    setTimeout(() => {
      if (shadowRoot.contains(suggestion)) {
        suggestion.style.opacity = '0';
        setTimeout(() => removeTextSuggestion(), 500);
      }
    }, 8000);
  }
  
  /**
   * Remove any shown text suggestions
   */
  function removeTextSuggestion() {
    const suggestion = shadowRoot.querySelector('.support-text-suggestion');
    if (suggestion) {
      suggestion.remove();
    }
  }
  
  /**
   * Open chat window with a pre-filled context message
   */
  function openChatWithContext(contextMessage) {
    // Open the chat window
    openChat();
    
    // Fill the input field with the context message
    const inputField = shadowRoot.querySelector('.support-chat-input input');
    if (inputField) {
      inputField.value = contextMessage;
      
      // Optional: automatically send the message
      setTimeout(() => sendMessage(), 500);
    }
  }
  
  /**
   * Handle text field input event
   */
  function handleFieldInput(event) {
    const field = event.target;
    const fieldData = state.monitoredFields.get(field);
    
    if (fieldData) {
      // Update stored value
      fieldData.lastValue = field.value;
      
      // Update active field in context
      if (state.contextData.activeField) {
        state.contextData.activeField.value = field.value;
      }
      
      // Check for real-time help triggers
      const currentValue = field.value;
      
      // If the field contains a question mark, check if it's a complex question
      if (currentValue.includes('?')) {
        const questionWords = ['how', 'why', 'what', 'when', 'where', 'which', 'who', 'can', 'could'];
        const words = currentValue.toLowerCase().split(/\s+/);
        
        // If it starts with a question word and is longer than 5 words, offer help
        if (questionWords.includes(words[0]) && words.length > 5) {
          // Show inline support button with a slight delay
          setTimeout(() => showInlineSupportButton(field), 500);
        }
      }
      
      // Check for error-related keywords that might indicate user frustration
      const errorKeywords = ['error', 'failed', 'wrong', 'not working', 'help', 'stuck'];
      if (errorKeywords.some(keyword => currentValue.toLowerCase().includes(keyword))) {
        // Show support suggestion
        if (currentValue.length > 15) { // Ensure it's not just a short mention
          analyzeFieldContent(field, currentValue, fieldData);
        }
      }
      
      // Real-time detection of long, complex text entry that might need help
      if (currentValue.length > 80 && !state.pendingSuggestions.includes(field)) {
        state.pendingSuggestions.push(field);
        setTimeout(() => {
          // Remove from pending list
          state.pendingSuggestions = state.pendingSuggestions.filter(f => f !== field);
          
          // If user is still typing, don't interrupt
          if (document.activeElement === field) {
            showInlineSupportButton(field);
          }
        }, 3000);
      }
    }
  }
  
  /**
   * Check if inline support should be shown for a field
   */
  function shouldShowInlineSupport(field) {
    // Implement logic to determine if this field could benefit from support
    // For example, fields with names like "problem", "issue", "help", etc.
    const supportTriggers = ['problem', 'issue', 'help', 'question', 'support', 'error'];
    
    // Check field name or ID
    const identifier = field.name || field.id || '';
    if (supportTriggers.some(trigger => identifier.toLowerCase().includes(trigger))) {
      return true;
    }
    
    // Check if field is part of a form with support-related purpose
    const form = field.closest('form');
    if (form) {
      const formId = form.id || '';
      const formName = form.getAttribute('name') || '';
      const formAction = form.getAttribute('action') || '';
      
      if (supportTriggers.some(trigger => 
        formId.toLowerCase().includes(trigger) || 
        formName.toLowerCase().includes(trigger) || 
        formAction.toLowerCase().includes(trigger))) {
        return true;
      }
    }
    
    // Otherwise, don't show inline support
    return false;
  }
  
  /**
   * Show inline support button next to a field
   */
  function showInlineSupportButton(field) {
    // Remove any existing button first
    removeInlineSupportButton();
    
    // Create support button
    const button = document.createElement('div');
    button.className = 'support-inline-button';
    button.innerHTML = '?';
    button.title = 'Get help with this field';
    
    // Position button next to field
    const fieldRect = field.getBoundingClientRect();
    button.style.position = 'absolute';
    button.style.top = `${fieldRect.top + (fieldRect.height / 2) - 12}px`;
    button.style.left = `${fieldRect.right + 5}px`;
    
    // Add to shadow DOM
    shadowRoot.appendChild(button);
    
    // Add click event
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      // Open chat with context
      openChatWithContext(`I need help with the ${field.name || 'input field'}`);
    });
  }
  
  /**
   * Remove inline support button
   */
  function removeInlineSupportButton() {
    const button = shadowRoot.querySelector('.support-inline-button');
    if (button) {
      button.remove();
    }
  }
  
  /**
   * Open chat with prefilled context message
   */
  function openChatWithContext(contextMessage) {
    openChat();
    
    // Set the input field with context
    const inputField = shadowRoot.querySelector('.support-chat-input input');
    if (inputField) {
      inputField.value = contextMessage;
      inputField.focus();
    }
  }
  
  /**
   * Capture click context for better understanding of user actions
   */
  function captureClickContext(event) {
    // Capture data about what was clicked to provide context
    const target = event.target;
    
    // Don't capture clicks in our own widget
    if (target === widgetContainer || widgetContainer.contains(target)) {
      return;
    }
    
    // Get some context about what was clicked
    const clickContext = {
      tagName: target.tagName,
      className: target.className,
      id: target.id,
      text: target.textContent ? target.textContent.substring(0, 100).trim() : '',
      href: target.href || (target.closest('a') ? target.closest('a').href : null),
      timestamp: new Date().toISOString()
    };
    
    // Store in context data for potential future use
    state.contextData.lastClick = clickContext;
  }
  
  /**
   * Handle window resize
   */
  function handleResize() {
    // Adjust widget positioning if needed based on window size
    if (window.innerWidth < 768) {
      // Mobile adjustments
      widgetContainer.style.bottom = '10px';
      widgetContainer.style.right = '10px';
    } else {
      // Desktop position
      widgetContainer.style.bottom = '20px';
      widgetContainer.style.right = '20px';
    }
  }
  
  /**
   * Handle visibility change
   */
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // The tab became visible, useful for session tracking
      if (config.reportData) {
        reportWidgetEvent('page_visible');
      }
    }
  }
  
  /**
   * Detect selected text for context-aware support
   */
  function detectSelectedText() {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 10) {
      // Store selected text in context
      state.contextData.selectedText = selection.toString().trim();
      
      // If enough text is selected, show a contextual helper
      if (state.contextData.selectedText.length > 20) {
        // Show subtle support option
        showTextSelectionHelper(selection);
      }
    } else {
      // Clear selection context
      delete state.contextData.selectedText;
      // Remove any existing selection helper
      const helper = shadowRoot.querySelector('.support-text-suggestion');
      if (helper) {
        helper.remove();
      }
    }
  }
  
  /**
   * Show a helper overlay when text is selected
   */
  function showTextSelectionHelper(selection) {
    // Remove any existing helper
    const existingHelper = shadowRoot.querySelector('.support-text-suggestion');
    if (existingHelper) {
      existingHelper.remove();
    }
    
    // Create helper element
    const helper = document.createElement('div');
    helper.className = 'support-text-suggestion';
    helper.textContent = 'Need help with this? Ask Support AI';
    
    // Position near selection
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    helper.style.position = 'absolute';
    helper.style.top = `${rect.bottom + window.scrollY + 10}px`;
    helper.style.left = `${rect.left + window.scrollX}px`;
    
    // Add to shadow DOM
    shadowRoot.appendChild(helper);
    
    // Add click handler
    helper.addEventListener('click', () => {
      // Open chat with selected text as context
      openChatWithContext(`I need help understanding: "${state.contextData.selectedText.substring(0, 100)}..."`);
      
      // Remove helper
      helper.remove();
    });
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (helper.parentNode) {
        helper.remove();
      }
    }, 5000);
  }
  
  /**
   * Report widget events to the backend for analytics
   */
  function reportWidgetEvent(eventType, eventData = {}) {
    // Skip if reporting is disabled
    if (!config.reportData) return;
    
    // Prepare data
    const data = {
      eventType,
      timestamp: new Date().toISOString(),
      tenantId: config.tenantId,
      url: state.hostPage.url,
      title: state.hostPage.title,
      ...eventData
    };
    
    // In a real implementation, send this to the backend
    // For now just log to console
    console.log('Support AI Event:', data);
    
    /*
    // Real implementation would use fetch
    fetch('https://api.supportai.com/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(data)
    }).catch(err => console.error('Failed to report event:', err));
    */
  }
  
  // Initialize when the page is loaded
  if (document.readyState === 'complete') {
    initialize();
  } else {
    window.addEventListener('load', initialize);
  }
  
  // Expose public API
  window.SupportAI = {
    // Open the chat programmatically
    open: openChat,
    
    // Close the chat programmatically
    close: closeChat,
    
    // Send a message programmatically 
    sendMessage: (message) => {
      if (!state.chatOpen) {
        openChat();
      }
      
      // Set the input field
      const inputField = shadowRoot.querySelector('.support-chat-input input');
      if (inputField) {
        inputField.value = message;
        // Trigger send
        sendMessage();
      }
    },
    
    // Update configuration
    updateConfig: (newConfig) => {
      Object.assign(config, newConfig);
      
      // Update styles if needed
      if (styleElement) {
        styleElement.textContent = generateStyles();
      }
    }
  };
})();