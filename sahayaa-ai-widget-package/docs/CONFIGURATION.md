# ⚙️ Configuration Guide

Complete configuration reference for the Sahayaa AI Chat Widget with multi-agent workflow capabilities.

## 🎨 Frontend Widget Configuration

### Basic Configuration

The widget is configured through the global `window.sahayaaConfig` object:

```javascript
window.sahayaaConfig = {
  // Required settings
  apiKey: "your_api_key_here",
  serverUrl: "https://your-widget-server.com",
  
  // Appearance settings
  primaryColor: "#6366F1",
  position: "right",
  greetingMessage: "How can I help you today?",
  
  // Behavior settings
  autoOpen: false,
  requireAuth: false,
  enableBranding: true,
  trackEvents: true,
  
  // Agent workflow settings
  enableAgentWorkflow: true,
  showBehindTheScenes: true,
  showConfidenceScores: false,
  showProcessingTimes: false,
  maxProcessingTime: 5000,
  confidenceThreshold: 0.8
};
```

### Complete Configuration Options

#### Authentication & API
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `apiKey` | string | **required** | API key for server authentication |
| `serverUrl` | string | **required** | Backend server URL |
| `requireAuth` | boolean | `false` | Require user login before chat |
| `authEndpoint` | string | `"/api/widget/auth"` | Custom authentication endpoint |

#### Visual Appearance
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `primaryColor` | string | `"#6366F1"` | Main brand color (hex, rgb, hsl) |
| `secondaryColor` | string | `"#8b5cf6"` | Secondary accent color |
| `backgroundColor` | string | `"#ffffff"` | Widget background color |
| `textColor` | string | `"#334155"` | Main text color |
| `position` | string | `"right"` | Widget position: `"left"`, `"right"`, `"center"` |
| `theme` | string | `"auto"` | Theme: `"light"`, `"dark"`, `"auto"` |
| `borderRadius` | number | `16` | Widget border radius in pixels |
| `enableBranding` | boolean | `true` | Show "Powered by Sahayaa" branding |

#### Behavior & Interaction
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `autoOpen` | boolean | `false` | Automatically open chat on page load |
| `openDelay` | number | `1000` | Delay before auto-opening (ms) |
| `greetingMessage` | string | `"How can I help you today?"` | Initial AI message |
| `placeholder` | string | `"Type your message..."` | Input field placeholder |
| `maxMessageLength` | number | `1000` | Maximum characters per message |
| `showTypingIndicator` | boolean | `true` | Show typing animation |
| `enableSounds` | boolean | `false` | Enable notification sounds |
| `enableEmojis` | boolean | `true` | Enable emoji support |

#### Agent Workflow Features
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enableAgentWorkflow` | boolean | `true` | Enable multi-agent processing |
| `showBehindTheScenes` | boolean | `true` | Show agent workflow details |
| `showConfidenceScores` | boolean | `false` | Display confidence percentages |
| `showProcessingTimes` | boolean | `false` | Show processing duration |
| `showAgentData` | boolean | `false` | Show detailed agent data |
| `maxProcessingTime` | number | `5000` | Max workflow timeout (ms) |
| `confidenceThreshold` | number | `0.8` | Minimum confidence for responses |
| `enableFallback` | boolean | `true` | Enable fallback when agents fail |

#### Analytics & Tracking
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `trackEvents` | boolean | `true` | Enable event tracking |
| `trackUserActions` | boolean | `true` | Track user interactions |
| `trackAgentMetrics` | boolean | `true` | Track agent performance |
| `analyticsEndpoint` | string | `"/api/widget/analytics"` | Custom analytics endpoint |
| `sessionTimeout` | number | `1800000` | Session timeout (30 minutes) |

#### Advanced Settings
| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `language` | string | `"en"` | Widget language: `"en"`, `"es"`, `"fr"`, `"de"` |
| `rtl` | boolean | `false` | Right-to-left text support |
| `accessibility` | boolean | `true` | Enable accessibility features |
| `mobileOptimized` | boolean | `true` | Enable mobile optimizations |
| `offlineMode` | boolean | `false` | Enable offline functionality |
| `cacheResponses` | boolean | `true` | Cache AI responses locally |
| `debugMode` | boolean | `false` | Enable debug logging |

### Environment-Specific Configurations

#### Development Configuration
```javascript
window.sahayaaConfig = {
  apiKey: "dev_api_key_12345",
  serverUrl: "http://localhost:3000",
  primaryColor: "#6366F1",
  debugMode: true,
  showBehindTheScenes: true,
  showConfidenceScores: true,
  showProcessingTimes: true,
  trackEvents: false  // Disable analytics in dev
};
```

#### Production Configuration
```javascript
window.sahayaaConfig = {
  apiKey: "prod_api_key_67890",
  serverUrl: "https://widget.yourdomain.com",
  primaryColor: "#1e40af",  // Your brand color
  enableBranding: false,    // Hide Sahayaa branding
  trackEvents: true,
  showBehindTheScenes: false,  // Hide technical details
  offlineMode: true,           // Enable offline support
  cacheResponses: true
};
```

#### Mobile-Optimized Configuration
```javascript
window.sahayaaConfig = {
  // Standard settings...
  mobileOptimized: true,
  autoOpen: false,        // Don't auto-open on mobile
  position: "bottom",     // Better for mobile
  borderRadius: 0,        // Full-width on mobile
  enableSounds: false,    // Respect user preferences
  maxMessageLength: 500   // Shorter messages on mobile
};
```

## 🖥️ Backend Server Configuration

### Environment Variables

All backend configuration is done through environment variables in the `.env` file:

#### Server Configuration
```bash
# Basic server settings
PORT=3000
NODE_ENV=production
HOST=0.0.0.0

# Service URLs
BASE_URL=https://your-widget-server.com
PUBLIC_URL=https://your-widget-server.com
```

#### Database Configuration
```bash
# PostgreSQL (recommended)
DATABASE_URL=postgresql://username:password@localhost:5432/sahayaa_widget

# MySQL alternative
# DATABASE_URL=mysql://username:password@localhost:3306/sahayaa_widget

# SQLite for development
# DATABASE_URL=sqlite:./sahayaa_widget.db

# Connection pool settings
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=10000
DB_POOL_ACQUIRE_TIMEOUT=60000
```

#### Security Configuration
```bash
# JWT token settings
JWT_SECRET=your_secure_jwt_secret_minimum_32_characters
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# API key encryption
API_KEY_SECRET=your_api_key_encryption_secret_32_chars
API_KEY_EXPIRES_IN=365d

# Session settings
SESSION_SECRET=your_session_secret_32_characters
SESSION_MAX_AGE=86400000
SESSION_SECURE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
```

#### CORS & Security
```bash
# CORS origins (comma-separated)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
CHAT_RATE_LIMIT_MAX=10       # Per minute
AUTH_RATE_LIMIT_MAX=5        # Per 15 minutes

# Security headers
HELMET_ENABLED=true
CONTENT_SECURITY_POLICY=true
HSTS_ENABLED=true
```

#### AI Provider Configuration
```bash
# OpenAI (recommended)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=1500
OPENAI_TEMPERATURE=0.7

# Google AI (optional)
GOOGLE_AI_API_KEY=your-google-ai-api-key
GOOGLE_AI_MODEL=gemini-pro

# Anthropic (optional)
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# AI fallback settings
AI_FALLBACK_ENABLED=true
AI_TIMEOUT_MS=10000
AI_RETRY_ATTEMPTS=3
AI_CACHE_ENABLED=true
AI_CACHE_TTL=3600
```

#### Agent Workflow Configuration
```bash
# Agent system settings
ENABLE_AGENT_WORKFLOW=true
AGENT_PROCESSING_TIMEOUT=10000
CONFIDENCE_THRESHOLD=0.7
MAX_AGENT_RETRIES=3

# Agent-specific settings
CHAT_PROCESSOR_ENABLED=true
INSTRUCTION_LOOKUP_ENABLED=true
TICKET_LOOKUP_ENABLED=true
TICKET_FORMATTER_ENABLED=true

# Vector storage settings
VECTOR_STORAGE_PATH=./vector_storage
VECTOR_DIMENSION=1536
MAX_VECTOR_COUNT_BEFORE_SHARD=10000
VECTOR_SIMILARITY_THRESHOLD=0.8
```

#### Logging Configuration
```bash
# Logging settings
LOG_LEVEL=info          # debug, info, warn, error
LOG_FORMAT=json         # json, text
LOG_FILE_ENABLED=true
LOG_FILE_PATH=./logs/widget-server.log
LOG_MAX_FILES=10
LOG_MAX_SIZE=10485760   # 10MB

# Request logging
REQUEST_LOGGING=true
LOG_REQUESTS=true
LOG_RESPONSES=false     # Don't log response bodies
LOG_ERRORS=true
```

#### File Upload Configuration
```bash
# File upload settings
UPLOAD_ENABLED=true
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760          # 10MB
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt,zip
UPLOAD_SCAN_ENABLED=true        # Virus scanning
UPLOAD_QUARANTINE_PATH=./quarantine
```

#### Analytics Configuration
```bash
# Analytics settings
ANALYTICS_ENABLED=true
ANALYTICS_RETENTION_DAYS=90
ANALYTICS_BATCH_SIZE=100
ANALYTICS_FLUSH_INTERVAL=30000  # 30 seconds

# External analytics integrations
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
MIXPANEL_TOKEN=your-mixpanel-token
SEGMENT_WRITE_KEY=your-segment-key
```

#### Email Configuration
```bash
# SMTP settings for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Email templates
EMAIL_TEMPLATE_PATH=./templates/email
NOTIFICATION_EMAILS=admin@yourdomain.com,support@yourdomain.com
```

#### Monitoring & Health Checks
```bash
# Health check settings
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000     # 30 seconds
LIVENESS_ENDPOINT=/liveness
READINESS_ENDPOINT=/readiness

# Metrics collection
METRICS_ENABLED=true
METRICS_ENDPOINT=/metrics
PROMETHEUS_ENABLED=false

# External monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-key
DATADOG_API_KEY=your-datadog-key
```

#### Cache Configuration
```bash
# Redis cache (optional)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_KEY_PREFIX=sahayaa:widget:

# Memory cache fallback
MEMORY_CACHE_ENABLED=true
MEMORY_CACHE_MAX_SIZE=100MB
MEMORY_CACHE_TTL=3600           # 1 hour
```

#### Backup Configuration
```bash
# Backup settings
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_PATH=./backups
BACKUP_COMPRESS=true

# Cloud backup (optional)
BACKUP_S3_BUCKET=your-backup-bucket
BACKUP_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

### Configuration Validation

#### Required Environment Variables
```bash
# These MUST be set for the server to start
PORT
NODE_ENV
DATABASE_URL
JWT_SECRET
API_KEY_SECRET
```

#### Validation Script
```javascript
// Add to your server startup
function validateConfig() {
  const required = [
    'PORT', 'NODE_ENV', 'DATABASE_URL', 
    'JWT_SECRET', 'API_KEY_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    process.exit(1);
  }
  
  // Validate JWT secret length
  if (process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }
  
  console.log('✅ Configuration validation passed');
}

validateConfig();
```

## 🎯 Configuration Presets

### E-commerce Platform
```javascript
// Frontend
window.sahayaaConfig = {
  primaryColor: "#059669",          // Green for commerce
  greetingMessage: "Need help with your order?",
  showBehindTheScenes: false,       // Keep it simple
  trackEvents: true,                // Important for commerce
  requireAuth: false,               // Easy access
  enableAgentWorkflow: true,
  confidenceThreshold: 0.85         // Higher confidence for orders
};
```

```bash
# Backend
CONFIDENCE_THRESHOLD=0.85
ANALYTICS_ENABLED=true
EMAIL_FROM=support@yourstore.com
CORS_ORIGINS=https://yourstore.com,https://www.yourstore.com
```

### SaaS Application
```javascript
// Frontend
window.sahayaaConfig = {
  primaryColor: "#3b82f6",          // Professional blue
  requireAuth: true,                // Users must be logged in
  showBehindTheScenes: true,        // Tech-savvy users
  showConfidenceScores: true,
  trackEvents: true,
  enableAgentWorkflow: true,
  greetingMessage: "Hi! I'm here to help with any technical questions."
};
```

```bash
# Backend
ENABLE_AGENT_WORKFLOW=true
CHAT_PROCESSOR_ENABLED=true
INSTRUCTION_LOOKUP_ENABLED=true
ANALYTICS_RETENTION_DAYS=365      # Longer retention for SaaS
LOG_LEVEL=debug                    # More detailed logging
```

### Customer Support Portal
```javascript
// Frontend
window.sahayaaConfig = {
  primaryColor: "#dc2626",          // Red for urgent support
  autoOpen: true,                   // Immediate help
  greetingMessage: "I'm here to help resolve your issue quickly.",
  showBehindTheScenes: true,        // Transparency builds trust
  trackEvents: true,
  enableAgentWorkflow: true,
  maxProcessingTime: 3000,          // Faster responses for support
  confidenceThreshold: 0.7          // Lower threshold for edge cases
};
```

```bash
# Backend
CONFIDENCE_THRESHOLD=0.7
AGENT_PROCESSING_TIMEOUT=8000
EMAIL_FROM=support@company.com
NOTIFICATION_EMAILS=support-team@company.com
ANALYTICS_ENABLED=true
REQUEST_LOGGING=true              # Log all support interactions
```

## 🔧 Dynamic Configuration

### Runtime Configuration Updates

Update widget configuration without page reload:

```javascript
// Update specific settings
window.sahayaaConfig.primaryColor = "#ef4444";
window.sahayaaConfig.showBehindTheScenes = false;

// Trigger reconfiguration
window.dispatchEvent(new CustomEvent('sahayaaConfigUpdate', {
  detail: window.sahayaaConfig
}));
```

### A/B Testing Configuration

```javascript
// A/B test different configurations
const configs = {
  control: {
    showBehindTheScenes: false,
    primaryColor: "#6366f1"
  },
  variant: {
    showBehindTheScenes: true,
    primaryColor: "#059669"
  }
};

const variant = Math.random() < 0.5 ? 'control' : 'variant';
window.sahayaaConfig = { ...window.sahayaaConfig, ...configs[variant] };

// Track the variant
window.sahayaaConfig.customData = { abTestVariant: variant };
```

### Environment Detection

```javascript
// Auto-configure based on environment
const isProduction = window.location.hostname !== 'localhost';
const isDevelopment = !isProduction;

window.sahayaaConfig = {
  apiKey: isProduction ? "prod_key_123" : "dev_key_456",
  serverUrl: isProduction ? "https://api.yourdomain.com" : "http://localhost:3000",
  debugMode: isDevelopment,
  showBehindTheScenes: isDevelopment,
  trackEvents: isProduction
};
```

## 🔍 Configuration Debugging

### Frontend Debug Mode

Enable debug logging to troubleshoot configuration issues:

```javascript
window.sahayaaConfig = {
  // ... your config
  debugMode: true
};

// Listen for debug events
window.addEventListener('sahayaaDebug', function(event) {
  console.log('Widget Debug:', event.detail);
});
```

### Backend Configuration Check

Add an endpoint to verify server configuration:

```javascript
app.get('/api/config/check', (req, res) => {
  res.json({
    server: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      cors: process.env.CORS_ORIGINS?.split(',') || []
    },
    features: {
      agentWorkflow: process.env.ENABLE_AGENT_WORKFLOW === 'true',
      analytics: process.env.ANALYTICS_ENABLED === 'true',
      fileUpload: process.env.UPLOAD_ENABLED === 'true'
    },
    aiProviders: {
      openai: !!process.env.OPENAI_API_KEY,
      google: !!process.env.GOOGLE_AI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY
    }
  });
});
```

### Configuration Validation Tool

```bash
# Create a validation script
node -e "
const config = require('dotenv').config();
const required = ['PORT', 'DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter(k => !process.env[k]);
console.log(missing.length ? 'Missing: ' + missing.join(', ') : '✅ Config valid');
"
```

## 📝 Configuration Best Practices

### Security Best Practices
1. **Never hardcode secrets** in frontend configuration
2. **Use environment variables** for all sensitive backend settings
3. **Rotate API keys** regularly (quarterly recommended)
4. **Set appropriate CORS origins** to prevent unauthorized access
5. **Use HTTPS** in production for all API communications

### Performance Best Practices
1. **Enable caching** for AI responses and analytics
2. **Set appropriate timeouts** for agent workflows
3. **Configure connection pooling** for database
4. **Use compression** for API responses
5. **Monitor and tune** rate limits based on usage

### Maintenance Best Practices
1. **Document configuration changes** with dates and reasons
2. **Test configuration** in staging before production
3. **Monitor logs** for configuration-related errors
4. **Backup configuration** files regularly
5. **Version control** all configuration templates

## 🔄 Configuration Migration

### Updating Configuration Schema

When updating to newer widget versions:

```javascript
// Migration helper
function migrateConfig(oldConfig) {
  const newConfig = { ...oldConfig };
  
  // v1.0 to v1.1 migration
  if (oldConfig.showAgentDetails !== undefined) {
    newConfig.showBehindTheScenes = oldConfig.showAgentDetails;
    delete newConfig.showAgentDetails;
  }
  
  // v1.1 to v1.2 migration
  if (!newConfig.confidenceThreshold) {
    newConfig.confidenceThreshold = 0.8;
  }
  
  return newConfig;
}

window.sahayaaConfig = migrateConfig(window.sahayaaConfig);
```

### Configuration Backup

```bash
# Backup current configuration
cp .env .env.backup.$(date +%Y%m%d)

# Save widget configuration
echo "window.sahayaaConfig = $(cat your-config.js)" > config-backup.js
```

---

This comprehensive configuration guide covers all aspects of customizing the Sahayaa AI Chat Widget for your specific needs, from basic appearance settings to advanced multi-agent workflow parameters.