/**
 * Sahayaa AI Chat Widget with Enhanced Agent Workflow Integration
 * Includes behind-the-scenes processing visualization and multi-agent orchestration
 */

(function() {
  'use strict';

  // Default configuration that can be overridden
  const defaultConfig = {
    apiKey: "__API_KEY__",
    serverUrl: "__SERVER_URL__",
    primaryColor: "#6366F1",
    position: "right",
    greetingMessage: "How can I help you today?",
    autoOpen: false,
    requireAuth: false,
    enableBranding: true,
    trackEvents: true,
    
    // Enhanced Agent Workflow Settings
    enableAgentWorkflow: true,
    showBehindTheScenes: true,
    showConfidenceScores: false,
    showProcessingTimes: false,
    maxProcessingTime: 5000,
    confidenceThreshold: 0.8
  };

  // Merge with user configuration
  const config = { ...defaultConfig, ...(window.sahayaaConfig || {}) };

  // Demo responses for different message types
  const demoResponses = {
    greeting: [
      "Hello! I'm your Sahayaa AI assistant. Our multi-agent system is ready to help you with any questions or issues. What can I assist you with today?",
      "Hi there! Welcome to Sahayaa AI support. I'm powered by several specialized agents working together to provide you the best possible assistance."
    ],
    technical: [
      "I understand you're experiencing a technical issue. Let me engage our specialized technical support agents to analyze your problem and provide a comprehensive solution.",
      "Our technical team agents are analyzing your issue. Based on similar cases, I can guide you through the most effective troubleshooting steps."
    ],
    billing: [
      "I can help you with billing-related questions. Our billing optimization agents are reviewing your account to provide accurate information and potential cost-saving recommendations.",
      "Let me connect you with our billing analysis agents who can review your account details and usage patterns to address your concerns."
    ],
    ticket: [
      "I'll create a support ticket for you right away. Our ticket processing agents will classify this issue and route it to the appropriate team for the fastest resolution.",
      "Your support request is being processed by our intelligent ticket management system. I'll ensure it gets the right priority and routing for quick resolution."
    ],
    general: [
      "I'm here to help! Our AI agent network can assist with a wide range of questions. Let me analyze your request and provide the most relevant assistance.",
      "Thanks for reaching out! Our multi-agent system is processing your inquiry to provide you with the most accurate and helpful response."
    ]
  };

  // Function to determine response type
  function getResponseType(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return 'greeting';
    } else if (lowerMessage.includes('api') || lowerMessage.includes('technical') || lowerMessage.includes('error') || lowerMessage.includes('bug')) {
      return 'technical';
    } else if (lowerMessage.includes('billing') || lowerMessage.includes('payment') || lowerMessage.includes('price')) {
      return 'billing';
    } else if (lowerMessage.includes('ticket') || lowerMessage.includes('support') || lowerMessage.includes('help')) {
      return 'ticket';
    } else {
      return 'general';
    }
  }

  // Function to generate realistic processing steps
  function generateProcessingSteps(message, responseType) {
    const baseSteps = [
      {
        step: "ChatProcessor Agent",
        details: `Analyzing user message: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        duration: 450,
        status: 'complete',
        data: {
          category: responseType,
          confidence: 0.94,
          keywords_extracted: message.toLowerCase().split(' ').filter(w => w.length > 3).slice(0, 3)
        }
      }
    ];

    switch (responseType) {
      case 'technical':
        return [
          ...baseSteps,
          {
            step: "InstructionLookup Agent",
            details: "Searching knowledge base for technical documentation",
            duration: 680,
            status: 'found',
            data: {
              documents_found: 8,
              relevance_score: 0.89,
              top_matches: ["API Guide", "Error Resolution", "Integration Docs"]
            }
          },
          {
            step: "TicketLookup Agent",
            details: "Finding similar resolved technical tickets",
            duration: 520,
            status: 'found',
            data: {
              similar_tickets: 12,
              resolution_rate: 0.89,
              avg_resolution_time: "15 minutes"
            }
          },
          {
            step: "LLM Resolution Agent",
            details: "Generating comprehensive technical solution",
            duration: 890,
            status: 'complete',
            data: {
              model_used: "gpt-4",
              solution_confidence: 0.92,
              steps_generated: 5
            }
          }
        ];
      
      case 'billing':
        return [
          ...baseSteps,
          {
            step: "AccountContext Agent",
            details: "Retrieving customer account data",
            duration: 380,
            status: 'found',
            data: {
              account_status: "Active",
              usage_percentage: 0.67,
              optimization_available: true
            }
          },
          {
            step: "BillingOptimizer Agent",
            details: "Analyzing usage patterns",
            duration: 620,
            status: 'complete',
            data: {
              potential_savings: "$20/month",
              confidence: 0.87
            }
          }
        ];
        
      default:
        return [
          ...baseSteps,
          {
            step: "ContextAnalysis Agent",
            details: "Understanding user intent",
            duration: 590,
            status: 'complete',
            data: {
              intent_confidence: 0.85,
              context_sources: 4
            }
          }
        ];
    }
  }

  // Main Widget Class
  class SahayaaAIWidget {
    constructor() {
      this.container = null;
      this.button = null;
      this.chatWindow = null;
      this.messagesContainer = null;
      this.inputField = null;
      this.isOpen = false;
      this.messages = [];
      this.sessionId = this.generateSessionId();
      this.isAuthenticated = !config.requireAuth;
      this.userInfo = null;
      
      this.init();
    }

    generateSessionId() {
      return 'sahayaa_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    }

    init() {
      this.createWidgetContainer();
      this.createChatButton();
      this.createChatWindow();
      this.setupEventListeners();
      
      if (config.trackEvents) {
        this.trackEvent('widget_initialized');
      }
      
      if (config.autoOpen) {
        setTimeout(() => this.openChat(), 1000);
      }
    }

    createWidgetContainer() {
      this.container = document.createElement('div');
      this.container.className = 'sahayaa-widget-container';
      this.container.style.cssText = `
        position: fixed;
        bottom: 20px;
        ${config.position === 'left' ? 'left: 20px;' : config.position === 'center' ? 'left: 50%; transform: translateX(-50%);' : 'right: 20px;'}
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      document.body.appendChild(this.container);
    }

    createChatButton() {
      this.button = document.createElement('button');
      this.button.className = 'sahayaa-chat-button';
      this.button.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 13.54 2.38 14.99 3.06 16.26L2 22L7.74 20.94C9.01 21.62 10.46 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor"/>
        </svg>
      `;
      this.button.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${config.primaryColor};
        color: white;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      this.button.addEventListener('mouseenter', () => {
        this.button.style.transform = 'scale(1.1)';
      });
      
      this.button.addEventListener('mouseleave', () => {
        this.button.style.transform = 'scale(1)';
      });
      
      this.container.appendChild(this.button);
    }

    createChatWindow() {
      this.chatWindow = document.createElement('div');
      this.chatWindow.className = 'sahayaa-chat-window';
      this.chatWindow.style.cssText = `
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 350px;
        height: 500px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        display: none;
        flex-direction: column;
        overflow: hidden;
        transform: translateY(20px);
        opacity: 0;
        transition: all 0.3s ease;
      `;

      // Chat header
      const header = document.createElement('div');
      header.style.cssText = `
        background: ${config.primaryColor};
        color: white;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;
      header.innerHTML = `
        <div>
          <div style="font-weight: 600; font-size: 16px;">Sahayaa AI Support</div>
          <div style="font-size: 12px; opacity: 0.9;">Powered by Multi-Agent AI</div>
        </div>
        <button class="sahayaa-close-btn" style="background: none; border: none; color: white; cursor: pointer; font-size: 20px;">&times;</button>
      `;

      // Messages container
      this.messagesContainer = document.createElement('div');
      this.messagesContainer.className = 'sahayaa-messages';
      this.messagesContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background: #f8fafc;
      `;

      // Input container
      const inputContainer = document.createElement('div');
      inputContainer.style.cssText = `
        padding: 16px;
        border-top: 1px solid #e2e8f0;
        background: white;
      `;

      this.inputField = document.createElement('input');
      this.inputField.type = 'text';
      this.inputField.placeholder = 'Type your message...';
      this.inputField.style.cssText = `
        width: 100%;
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        outline: none;
        font-size: 14px;
      `;

      inputContainer.appendChild(this.inputField);
      this.chatWindow.appendChild(header);
      this.chatWindow.appendChild(this.messagesContainer);
      this.chatWindow.appendChild(inputContainer);
      this.container.appendChild(this.chatWindow);

      // Add welcome message
      this.addMessage('ai', config.greetingMessage);
      
      if (config.showBehindTheScenes) {
        this.addMessage('system', '🤖 **Behind the Scenes**: Multi-agent system initialized and ready to process your requests with full transparency.');
      }
    }

    setupEventListeners() {
      this.button.addEventListener('click', () => {
        this.isOpen ? this.closeChat() : this.openChat();
      });

      this.chatWindow.querySelector('.sahayaa-close-btn').addEventListener('click', () => {
        this.closeChat();
      });

      this.inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && this.inputField.value.trim()) {
          this.sendMessage(this.inputField.value.trim());
          this.inputField.value = '';
        }
      });
    }

    openChat() {
      this.isOpen = true;
      this.chatWindow.style.display = 'flex';
      setTimeout(() => {
        this.chatWindow.style.transform = 'translateY(0)';
        this.chatWindow.style.opacity = '1';
      }, 10);
      
      if (config.trackEvents) {
        this.trackEvent('chat_opened');
      }
    }

    closeChat() {
      this.isOpen = false;
      this.chatWindow.style.transform = 'translateY(20px)';
      this.chatWindow.style.opacity = '0';
      setTimeout(() => {
        this.chatWindow.style.display = 'none';
      }, 300);
      
      if (config.trackEvents) {
        this.trackEvent('chat_closed');
      }
    }

    async sendMessage(message) {
      this.addMessage('user', message);
      
      if (config.trackEvents) {
        this.trackEvent('message_sent', { message: message.substring(0, 100) });
      }

      // Show typing indicator
      const typingId = this.addTypingIndicator();
      
      try {
        if (config.enableAgentWorkflow) {
          await this.processWithAgentWorkflow(message);
        } else {
          await this.processWithBasicResponse(message);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        this.addMessage('ai', 'I apologize, but I encountered an error processing your request. Please try again.');
      } finally {
        this.removeTypingIndicator(typingId);
      }
    }

    async processWithAgentWorkflow(message) {
      const responseType = getResponseType(message);
      const processingSteps = generateProcessingSteps(message, responseType);
      
      // Simulate agent processing with realistic timing
      for (let i = 0; i < processingSteps.length; i++) {
        const step = processingSteps[i];
        await this.sleep(step.duration);
        
        if (config.showBehindTheScenes && i === 0) {
          this.updateTypingIndicator(`🔄 ${step.step} processing...`);
        }
      }

      // Generate response
      const responses = demoResponses[responseType];
      const response = responses[Math.floor(Math.random() * responses.length)];
      this.addMessage('ai', response);

      // Show behind-the-scenes processing if enabled
      if (config.showBehindTheScenes) {
        setTimeout(() => {
          this.addAgentWorkflowDetails(processingSteps);
        }, 1000);
      }
    }

    async processWithBasicResponse(message) {
      await this.sleep(1000 + Math.random() * 2000);
      
      const responseType = getResponseType(message);
      const responses = demoResponses[responseType];
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      this.addMessage('ai', response);
    }

    addMessage(sender, content) {
      const messageDiv = document.createElement('div');
      messageDiv.style.cssText = `
        margin-bottom: 16px;
        display: flex;
        ${sender === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
      `;

      const bubble = document.createElement('div');
      bubble.style.cssText = `
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.4;
        ${sender === 'user' 
          ? `background: ${config.primaryColor}; color: white;` 
          : sender === 'system'
          ? 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 500;'
          : 'background: white; color: #334155; border: 1px solid #e2e8f0;'
        }
      `;
      bubble.textContent = content;
      
      messageDiv.appendChild(bubble);
      this.messagesContainer.appendChild(messageDiv);
      this.scrollToBottom();
      
      this.messages.push({ sender, content, timestamp: new Date() });
    }

    addAgentWorkflowDetails(processingSteps) {
      const workflowDiv = document.createElement('div');
      workflowDiv.style.cssText = `
        margin-bottom: 16px;
        padding: 16px;
        background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        border-radius: 12px;
        border-left: 4px solid ${config.primaryColor};
      `;

      const title = document.createElement('div');
      title.style.cssText = `
        font-weight: 600;
        color: #334155;
        margin-bottom: 12px;
        font-size: 14px;
      `;
      title.textContent = '🔍 Behind the Scenes: Agent Workflow Analysis';

      workflowDiv.appendChild(title);

      processingSteps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.style.cssText = `
          background: white;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
          border: 1px solid #e2e8f0;
        `;

        const stepHeader = document.createElement('div');
        stepHeader.style.cssText = `
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 8px;
        `;

        const statusColor = step.status === 'complete' ? '#10b981' : step.status === 'found' ? '#3b82f6' : '#f59e0b';
        
        stepHeader.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 8px; height: 8px; background: ${statusColor}; border-radius: 50%;"></span>
            <span style="font-weight: 500; font-size: 12px;">${step.step}</span>
          </div>
          <span style="font-size: 10px; color: #64748b;">${step.duration}ms</span>
        `;

        const stepDetails = document.createElement('div');
        stepDetails.style.cssText = `
          font-size: 11px;
          color: #64748b;
          margin-bottom: 8px;
        `;
        stepDetails.textContent = step.details;

        if (step.data) {
          const dataDiv = document.createElement('div');
          dataDiv.style.cssText = `
            background: #f8fafc;
            border-radius: 4px;
            padding: 8px;
            font-size: 10px;
            font-family: monospace;
          `;
          
          const dataEntries = Object.entries(step.data).map(([key, value]) => {
            const displayValue = Array.isArray(value) ? value.join(', ') : 
                               typeof value === 'number' && value < 1 ? `${(value * 100).toFixed(0)}%` :
                               value?.toString();
            return `${key.replace(/_/g, ' ')}: ${displayValue}`;
          }).join(' • ');
          
          dataDiv.textContent = dataEntries;
          stepDiv.appendChild(stepHeader);
          stepDiv.appendChild(stepDetails);
          stepDiv.appendChild(dataDiv);
        } else {
          stepDiv.appendChild(stepHeader);
          stepDiv.appendChild(stepDetails);
        }

        workflowDiv.appendChild(stepDiv);
      });

      const totalTime = processingSteps.reduce((sum, step) => sum + step.duration, 0);
      const summary = document.createElement('div');
      summary.style.cssText = `
        text-align: center;
        font-size: 11px;
        color: #64748b;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
      `;
      summary.textContent = `Processing completed in ${totalTime}ms`;
      workflowDiv.appendChild(summary);

      this.messagesContainer.appendChild(workflowDiv);
      this.scrollToBottom();
    }

    addTypingIndicator() {
      const typingId = 'typing_' + Date.now();
      const typingDiv = document.createElement('div');
      typingDiv.id = typingId;
      typingDiv.style.cssText = `
        margin-bottom: 16px;
        display: flex;
        justify-content: flex-start;
      `;

      const bubble = document.createElement('div');
      bubble.style.cssText = `
        background: white;
        border: 1px solid #e2e8f0;
        padding: 12px 16px;
        border-radius: 18px;
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      bubble.innerHTML = `
        <div style="display: flex; gap: 4px;">
          <div style="width: 6px; height: 6px; background: ${config.primaryColor}; border-radius: 50%; animation: bounce 1.4s infinite;"></div>
          <div style="width: 6px; height: 6px; background: ${config.primaryColor}; border-radius: 50%; animation: bounce 1.4s infinite 0.2s;"></div>
          <div style="width: 6px; height: 6px; background: ${config.primaryColor}; border-radius: 50%; animation: bounce 1.4s infinite 0.4s;"></div>
        </div>
        <span style="font-size: 12px; color: #64748b;">AI agents processing...</span>
      `;

      typingDiv.appendChild(bubble);
      this.messagesContainer.appendChild(typingDiv);
      this.scrollToBottom();

      // Add bounce animation
      if (!document.getElementById('sahayaa-bounce-animation')) {
        const style = document.createElement('style');
        style.id = 'sahayaa-bounce-animation';
        style.textContent = `
          @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-10px); }
          }
        `;
        document.head.appendChild(style);
      }

      return typingId;
    }

    updateTypingIndicator(text) {
      const typingIndicator = this.messagesContainer.querySelector('[id^="typing_"]');
      if (typingIndicator) {
        const textSpan = typingIndicator.querySelector('span');
        if (textSpan) {
          textSpan.textContent = text;
        }
      }
    }

    removeTypingIndicator(typingId) {
      const typingDiv = document.getElementById(typingId);
      if (typingDiv) {
        typingDiv.remove();
      }
    }

    scrollToBottom() {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    trackEvent(eventName, data = {}) {
      if (!config.trackEvents) return;
      
      const eventData = {
        event: eventName,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        ...data
      };

      // Send to analytics endpoint if available
      if (config.serverUrl && config.apiKey) {
        fetch(`${config.serverUrl}/api/widget/analytics`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.apiKey
          },
          body: JSON.stringify(eventData)
        }).catch(error => {
          console.debug('Analytics tracking failed:', error);
        });
      }

      // Fire custom event for parent page to listen
      window.dispatchEvent(new CustomEvent('sahayaaWidgetEvent', {
        detail: eventData
      }));
    }
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new SahayaaAIWidget();
    });
  } else {
    new SahayaaAIWidget();
  }

  // Expose widget API to global scope
  window.SahayaaAI = {
    openChat: function() {
      window.dispatchEvent(new CustomEvent('sahayaaOpenChat'));
    },
    closeChat: function() {
      window.dispatchEvent(new CustomEvent('sahayaaCloseChat'));
    },
    trackEvent: function(eventName, data) {
      window.dispatchEvent(new CustomEvent('sahayaaTrackEvent', {
        detail: { eventName, data }
      }));
    }
  };

})();