# 🎨 Customization Guide

Complete guide for customizing the Sahayaa AI Chat Widget appearance, behavior, and multi-agent workflow visualization.

## 🖌️ Visual Customization

### Brand Colors

#### Primary Color Customization
```javascript
window.sahayaaConfig = {
  primaryColor: "#6366F1",        // Your brand's primary color
  secondaryColor: "#8b5cf6",      // Accent color for gradients
  backgroundColor: "#ffffff",      // Chat window background
  textColor: "#334155"            // Main text color
};
```

#### CSS Custom Properties
Add custom CSS to override default colors:

```css
:root {
  --sahayaa-primary: #6366f1;
  --sahayaa-secondary: #8b5cf6;
  --sahayaa-background: #ffffff;
  --sahayaa-text: #334155;
  --sahayaa-border: #e2e8f0;
  --sahayaa-shadow: rgba(0, 0, 0, 0.1);
}

/* Dark theme override */
@media (prefers-color-scheme: dark) {
  :root {
    --sahayaa-primary: #818cf8;
    --sahayaa-secondary: #a78bfa;
    --sahayaa-background: #1e293b;
    --sahayaa-text: #e2e8f0;
    --sahayaa-border: #475569;
    --sahayaa-shadow: rgba(0, 0, 0, 0.3);
  }
}
```

### Widget Positioning

#### Standard Positions
```javascript
// Right corner (default)
window.sahayaaConfig = {
  position: "right"
};

// Left corner
window.sahayaaConfig = {
  position: "left"
};

// Centered bottom
window.sahayaaConfig = {
  position: "center"
};
```

#### Custom Positioning with CSS
```css
.sahayaa-widget-container {
  /* Custom positioning */
  bottom: 80px !important;
  right: 30px !important;
  
  /* Or fixed to specific element */
  position: absolute !important;
  bottom: 0 !important;
  right: 0 !important;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .sahayaa-widget-container {
    bottom: 20px !important;
    right: 15px !important;
    left: 15px !important;
    width: calc(100% - 30px) !important;
  }
}
```

### Chat Button Styling

#### Custom Button Design
```css
.sahayaa-chat-button {
  /* Custom gradient */
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  
  /* Custom size */
  width: 70px !important;
  height: 70px !important;
  
  /* Custom shadow */
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4) !important;
  
  /* Custom border */
  border: 3px solid rgba(255, 255, 255, 0.2) !important;
}

.sahayaa-chat-button:hover {
  transform: scale(1.15) !important;
  box-shadow: 0 16px 50px rgba(102, 126, 234, 0.6) !important;
}

/* Custom icon */
.sahayaa-chat-button svg {
  width: 28px !important;
  height: 28px !important;
}
```

#### Custom Button Icon
```html
<!-- Replace default icon with custom SVG -->
<style>
.sahayaa-chat-button svg {
  display: none;
}

.sahayaa-chat-button::after {
  content: "💬";
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
```

### Chat Window Styling

#### Custom Window Design
```css
.sahayaa-chat-window {
  /* Custom dimensions */
  width: 400px !important;
  height: 600px !important;
  
  /* Custom border radius */
  border-radius: 20px !important;
  
  /* Custom shadow */
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.2) !important;
  
  /* Custom border */
  border: 2px solid rgba(99, 102, 241, 0.1) !important;
}

/* Custom header */
.sahayaa-chat-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  padding: 25px !important;
}

/* Custom messages area */
.sahayaa-messages {
  background: linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 100%) !important;
  padding: 25px !important;
}
```

#### Message Bubble Customization
```css
/* User messages */
.sahayaa-message-bubble.user {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-radius: 20px 20px 5px 20px !important;
  padding: 15px 20px !important;
  font-weight: 500 !important;
}

/* AI messages */
.sahayaa-message-bubble.ai {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
  border: 2px solid #e2e8f0 !important;
  border-radius: 20px 20px 20px 5px !important;
  padding: 15px 20px !important;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08) !important;
}

/* System messages (agent workflow) */
.sahayaa-message-bubble.system {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border-radius: 15px !important;
  font-size: 13px !important;
}
```

### Agent Workflow Visualization

#### Custom Workflow Styling
```css
/* Workflow container */
.sahayaa-workflow-details {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%) !important;
  border-left: 4px solid #667eea !important;
  border-radius: 15px !important;
  padding: 20px !important;
}

/* Workflow title */
.sahayaa-workflow-title {
  color: #334155 !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  margin-bottom: 15px !important;
}

/* Individual workflow steps */
.sahayaa-workflow-step {
  background: rgba(255, 255, 255, 0.9) !important;
  border: 2px solid #e2e8f0 !important;
  border-radius: 12px !important;
  padding: 15px !important;
  margin-bottom: 12px !important;
  transition: all 0.3s ease !important;
}

.sahayaa-workflow-step:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12) !important;
  border-color: #667eea !important;
}

/* Status indicators */
.sahayaa-step-status.complete {
  background: #10b981 !important;
  animation: pulse-green 2s infinite !important;
}

.sahayaa-step-status.found {
  background: #3b82f6 !important;
  animation: pulse-blue 2s infinite !important;
}

.sahayaa-step-status.processing {
  background: #f59e0b !important;
  animation: pulse-orange 2s infinite !important;
}

/* Custom animations */
@keyframes pulse-green {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; box-shadow: 0 0 10px #10b981; }
}

@keyframes pulse-blue {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; box-shadow: 0 0 10px #3b82f6; }
}

@keyframes pulse-orange {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; box-shadow: 0 0 10px #f59e0b; }
}
```

#### Hide/Show Specific Agent Details
```css
/* Hide confidence scores */
.sahayaa-step-data [data-field="confidence"] {
  display: none !important;
}

/* Hide processing times */
.sahayaa-step-duration {
  display: none !important;
}

/* Highlight specific agents */
.sahayaa-step-name:contains("ChatProcessor") {
  color: #059669 !important;
  font-weight: 700 !important;
}

.sahayaa-step-name:contains("InstructionLookup") {
  color: #dc2626 !important;
  font-weight: 700 !important;
}

.sahayaa-step-name:contains("TicketLookup") {
  color: #7c3aed !important;
  font-weight: 700 !important;
}
```

## 🎛️ Behavior Customization

### Custom Greeting Messages

#### Dynamic Greetings Based on Page
```javascript
function getPageSpecificGreeting() {
  const path = window.location.pathname;
  const greetings = {
    '/pricing': "Looking for pricing information? I'm here to help!",
    '/support': "Having technical issues? Let me assist you right away.",
    '/billing': "Questions about your account or billing? I've got you covered.",
    '/docs': "Need help understanding our documentation?",
    'default': "How can I help you today?"
  };
  
  return greetings[path] || greetings.default;
}

window.sahayaaConfig = {
  greetingMessage: getPageSpecificGreeting()
};
```

#### Time-Based Greetings
```javascript
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning! How can I help you today?";
  if (hour < 17) return "Good afternoon! What can I assist you with?";
  return "Good evening! How may I help you?";
}

window.sahayaaConfig = {
  greetingMessage: getTimeBasedGreeting()
};
```

### Custom Message Processing

#### Pre-process User Messages
```javascript
// Listen for messages before they're sent
window.addEventListener('sahayaaBeforeMessage', function(event) {
  const originalMessage = event.detail.message;
  
  // Add custom processing
  let processedMessage = originalMessage;
  
  // Auto-correct common issues
  processedMessage = processedMessage.replace(/cant/gi, "can't");
  processedMessage = processedMessage.replace(/wont/gi, "won't");
  
  // Add context for specific pages
  if (window.location.pathname === '/checkout') {
    processedMessage = `[CHECKOUT PAGE] ${processedMessage}`;
  }
  
  // Update the message
  event.detail.message = processedMessage;
});
```

#### Custom Response Processing
```javascript
// Listen for AI responses
window.addEventListener('sahayaaAfterResponse', function(event) {
  const response = event.detail.response;
  
  // Add custom formatting
  if (response.includes('ticket')) {
    // Highlight ticket creation
    event.detail.response = response + "\n\n✅ I can create a support ticket for you if needed.";
  }
  
  // Log custom analytics
  if (event.detail.processingSteps) {
    console.log('Agent workflow completed:', event.detail.processingSteps.length, 'steps');
  }
});
```

### Custom Event Tracking

#### Enhanced Analytics
```javascript
window.sahayaaConfig = {
  // Enable detailed tracking
  trackEvents: true,
  customAnalytics: true
};

// Custom event handler
window.addEventListener('sahayaaWidgetEvent', function(event) {
  const { event: eventName, data, sessionId } = event.detail;
  
  // Send to your analytics platform
  if (window.gtag) {
    gtag('event', eventName, {
      event_category: 'sahayaa_widget',
      event_label: sessionId,
      custom_parameter: data
    });
  }
  
  // Send to Mixpanel
  if (window.mixpanel) {
    mixpanel.track(eventName, {
      session_id: sessionId,
      ...data
    });
  }
  
  // Custom business logic
  if (eventName === 'agent_workflow_completed') {
    console.log('Workflow confidence:', data.confidence);
    if (data.confidence < 0.8) {
      // Maybe suggest human handoff
      console.log('Low confidence detected, consider human handoff');
    }
  }
});
```

## 🌍 Internationalization

### Multi-Language Support

#### Language Configuration
```javascript
// Detect browser language
const userLanguage = navigator.language.substring(0, 2);

const translations = {
  en: {
    greeting: "How can I help you today?",
    placeholder: "Type your message...",
    agentWorkflow: "Behind the Scenes: Agent Workflow Analysis",
    processing: "AI agents processing..."
  },
  es: {
    greeting: "¿Cómo puedo ayudarte hoy?",
    placeholder: "Escribe tu mensaje...",
    agentWorkflow: "Detrás de Escena: Análisis de Flujo de Agentes",
    processing: "Agentes de IA procesando..."
  },
  fr: {
    greeting: "Comment puis-je vous aider aujourd'hui?",
    placeholder: "Tapez votre message...",
    agentWorkflow: "Dans les Coulisses: Analyse du Flux d'Agents",
    processing: "Agents IA en cours de traitement..."
  }
};

window.sahayaaConfig = {
  language: userLanguage,
  greetingMessage: translations[userLanguage]?.greeting || translations.en.greeting,
  placeholder: translations[userLanguage]?.placeholder || translations.en.placeholder
};
```

#### RTL Language Support
```javascript
// Arabic/Hebrew support
window.sahayaaConfig = {
  language: "ar",
  rtl: true,
  greetingMessage: "كيف يمكنني مساعدتك اليوم؟"
};
```

```css
/* RTL styling */
.sahayaa-widget-container[data-rtl="true"] {
  left: 20px !important;
  right: auto !important;
}

.sahayaa-widget-container[data-rtl="true"] .sahayaa-message {
  direction: rtl !important;
}

.sahayaa-widget-container[data-rtl="true"] .sahayaa-message.user {
  justify-content: flex-start !important;
}

.sahayaa-widget-container[data-rtl="true"] .sahayaa-message.ai {
  justify-content: flex-end !important;
}
```

## 📱 Mobile Customization

### Responsive Design Overrides
```css
/* Mobile-specific styling */
@media (max-width: 768px) {
  .sahayaa-chat-window {
    width: calc(100vw - 20px) !important;
    height: 70vh !important;
    border-radius: 20px 20px 0 0 !important;
    bottom: 0 !important;
    left: 10px !important;
    right: 10px !important;
  }
  
  .sahayaa-chat-button {
    width: 50px !important;
    height: 50px !important;
    bottom: 15px !important;
    right: 15px !important;
  }
  
  .sahayaa-workflow-details {
    padding: 12px !important;
  }
  
  .sahayaa-workflow-step {
    padding: 10px !important;
    margin-bottom: 8px !important;
  }
}

/* Tablet adjustments */
@media (min-width: 769px) and (max-width: 1024px) {
  .sahayaa-chat-window {
    width: 380px !important;
    height: 550px !important;
  }
}
```

### Touch Interactions
```javascript
window.sahayaaConfig = {
  // Mobile-optimized settings
  mobileOptimized: true,
  touchGestures: true,
  swipeToClose: true,
  hapticFeedback: true
};
```

```css
/* Touch-friendly buttons */
@media (hover: none) and (pointer: coarse) {
  .sahayaa-chat-button {
    width: 60px !important;
    height: 60px !important;
  }
  
  .sahayaa-workflow-step {
    min-height: 44px !important; /* Minimum touch target */
  }
  
  .sahayaa-input-field {
    font-size: 16px !important; /* Prevent zoom on iOS */
    padding: 15px !important;
  }
}
```

## 🎭 Themes and Skins

### Dark Theme
```css
/* Dark theme implementation */
.sahayaa-widget-container.dark-theme .sahayaa-chat-window {
  background: #1e293b !important;
  border: 1px solid #475569 !important;
}

.sahayaa-widget-container.dark-theme .sahayaa-messages {
  background: linear-gradient(to bottom, #0f172a 0%, #1e293b 100%) !important;
}

.sahayaa-widget-container.dark-theme .sahayaa-message-bubble.ai {
  background: #334155 !important;
  color: #e2e8f0 !important;
  border-color: #475569 !important;
}

.sahayaa-widget-container.dark-theme .sahayaa-workflow-details {
  background: linear-gradient(135deg, #334155 0%, #475569 100%) !important;
}

.sahayaa-widget-container.dark-theme .sahayaa-input-field {
  background: #475569 !important;
  color: #e2e8f0 !important;
  border-color: #64748b !important;
}
```

### Custom Corporate Theme
```css
/* Corporate theme example */
.sahayaa-widget-container.corporate-theme {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
}

.sahayaa-widget-container.corporate-theme .sahayaa-chat-button {
  background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
  border-radius: 8px !important; /* Less rounded for corporate look */
}

.sahayaa-widget-container.corporate-theme .sahayaa-chat-window {
  border-radius: 8px !important;
  border: 2px solid #e5e7eb !important;
}

.sahayaa-widget-container.corporate-theme .sahayaa-message-bubble {
  border-radius: 8px !important; /* Consistent with corporate style */
}

.sahayaa-widget-container.corporate-theme .sahayaa-workflow-details {
  border-left: 4px solid #1e40af !important;
  background: #f9fafb !important;
}
```

## 🔧 Advanced Customization

### Custom Agent Workflow Display

#### Agent Step Icons
```javascript
const agentIcons = {
  'ChatProcessor Agent': '🧠',
  'InstructionLookup Agent': '📚', 
  'TicketLookup Agent': '🎫',
  'LLM Resolution Agent': '🤖',
  'TicketFormatter Agent': '📋'
};

// Custom workflow step rendering
window.addEventListener('sahayaaRenderWorkflowStep', function(event) {
  const { step, element } = event.detail;
  const icon = agentIcons[step.step] || '⚙️';
  
  // Add icon to step header
  const header = element.querySelector('.sahayaa-step-name');
  if (header) {
    header.innerHTML = `${icon} ${header.textContent}`;
  }
});
```

#### Custom Confidence Visualization
```css
/* Confidence bar visualization */
.sahayaa-step-confidence {
  position: relative;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}

.sahayaa-step-confidence::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #10b981, #059669);
  border-radius: 2px;
  width: var(--confidence-percent);
  transition: width 1s ease-out;
}

/* High confidence (90%+) */
.sahayaa-step-confidence.high::after {
  background: linear-gradient(90deg, #10b981, #059669);
}

/* Medium confidence (70-90%) */
.sahayaa-step-confidence.medium::after {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

/* Low confidence (<70%) */
.sahayaa-step-confidence.low::after {
  background: linear-gradient(90deg, #ef4444, #dc2626);
}
```

### Performance Optimizations

#### Lazy Loading Styles
```css
/* Critical styles - inline these */
.sahayaa-chat-button {
  /* Only essential button styles */
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #6366f1;
  border: none;
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 2147483647;
}

/* Non-critical styles - load async */
.sahayaa-chat-window,
.sahayaa-workflow-details,
.sahayaa-message-bubble {
  /* Detailed styling loaded after initial render */
}
```

#### Reduced Motion
```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  .sahayaa-chat-button,
  .sahayaa-chat-window,
  .sahayaa-message,
  .sahayaa-workflow-step {
    animation: none !important;
    transition: none !important;
  }
  
  .sahayaa-step-status {
    animation: none !important;
  }
  
  .sahayaa-typing-dot {
    animation: none !important;
  }
}
```

## 🧪 Testing Customizations

### Visual Testing
```html
<!-- Create a test page for customizations -->
<!DOCTYPE html>
<html>
<head>
  <title>Widget Customization Test</title>
  <link rel="stylesheet" href="your-custom-styles.css">
</head>
<body>
  <h1>Testing Widget Customizations</h1>
  
  <!-- Test different configurations -->
  <button onclick="testTheme('light')">Light Theme</button>
  <button onclick="testTheme('dark')">Dark Theme</button>
  <button onclick="testTheme('corporate')">Corporate Theme</button>
  
  <script>
    function testTheme(theme) {
      const container = document.querySelector('.sahayaa-widget-container');
      container.className = `sahayaa-widget-container ${theme}-theme`;
    }
    
    // Test configuration
    window.sahayaaConfig = {
      apiKey: "test_key",
      serverUrl: "http://localhost:3000",
      primaryColor: "#6366f1",
      enableAgentWorkflow: true,
      showBehindTheScenes: true,
      showConfidenceScores: true,
      debugMode: true
    };
  </script>
  
  <script src="sahayaa-chat-widget.js"></script>
</body>
</html>
```

### CSS Validation
```bash
# Validate custom CSS
npx stylelint your-custom-styles.css

# Check for performance issues
npx uncss your-custom-styles.css --html test-page.html
```

### Accessibility Testing
```javascript
// Test accessibility features
function testAccessibility() {
  const widget = document.querySelector('.sahayaa-chat-button');
  
  // Check ARIA attributes
  console.log('ARIA label:', widget.getAttribute('aria-label'));
  
  // Check keyboard navigation
  widget.focus();
  
  // Check color contrast
  const styles = getComputedStyle(widget);
  console.log('Background:', styles.backgroundColor);
  console.log('Color:', styles.color);
}
```

## 📚 Examples Gallery

### E-commerce Style
```css
.ecommerce-widget .sahayaa-chat-button {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  border: 2px solid #10b981;
}

.ecommerce-widget .sahayaa-message-bubble.ai {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #166534;
}
```

### SaaS Platform Style
```css
.saas-widget .sahayaa-chat-button {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  box-shadow: 0 10px 40px rgba(59, 130, 246, 0.4);
}

.saas-widget .sahayaa-workflow-details {
  background: #eff6ff;
  border-left: 4px solid #3b82f6;
}
```

### Support Portal Style
```css
.support-widget .sahayaa-chat-button {
  background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
  animation: pulse-urgent 2s infinite;
}

@keyframes pulse-urgent {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; box-shadow: 0 0 20px #dc2626; }
}
```

---

This comprehensive customization guide provides everything needed to tailor the Sahayaa AI Chat Widget to match your brand, user experience requirements, and specific use cases while maintaining the powerful multi-agent workflow visualization capabilities.