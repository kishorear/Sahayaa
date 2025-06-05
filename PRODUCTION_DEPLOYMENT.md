# Production Deployment Guide

## Loose Coupling Architecture Implementation Complete

This guide covers deploying the AI-powered support ticket management system with loosely coupled microservices architecture.

## Architecture Overview

The system now uses HTTP-based microservices communication instead of direct OpenAI API calls:

- **Node.js Backend**: Main application server with agent service client
- **Agent Orchestrator**: Python FastAPI service for complete ticket workflows
- **Data Service**: FastAPI service for database operations
- **Qdrant Service**: Vector storage for instruction similarity search
- **Frontend**: Single endpoint `/api/agent-workflow` for complete processing

## Required Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Qdrant Configuration (Local Docker Instance)
QDRANT_URL=http://localhost:6333
# QDRANT_API_KEY is not needed for local instance

# Service URLs (for microservices deployment)
DATA_SERVICE_URL=http://localhost:8000
AGENT_SERVICE_URL=http://localhost:8001

# Performance Configuration
MAX_VECTOR_COUNT_BEFORE_SHARD=1000000
QDRANT_TIMEOUT_MS=30000
LLM_TIMEOUT_MS=45000
LOG_LEVEL=info
LOG_FORMAT=json
```

## Deployment Options

### Option 1: Integrated Deployment (Recommended for Development)

The system runs with graceful degradation - if microservices are unavailable, it falls back to direct OpenAI calls:

```bash
# Start the main application
npm run dev
```

This provides:
- Full functionality through Node.js backend
- Automatic fallback when agent service unavailable
- Single endpoint for frontend integration

### Option 2: Full Microservices Deployment

For production environments requiring full loose coupling:

```bash
# Terminal 1: Start Agent Orchestrator
python agents.py

# Terminal 2: Start Data Service
python services/fastapi_data_service.py

# Terminal 3: Start Node.js Application
npm run dev
```

## API Endpoints

### Frontend Integration

**Primary Endpoint**: `POST /api/agent-workflow`

```javascript
// Frontend usage
const response = await fetch('/api/agent-workflow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_message: "I can't log into my account",
    user_context: { source: "web_chat" },
    tenant_id: 1,
    user_id: "user123"
  })
});

const result = await response.json();
// Returns: { success, ticket: {...}, processing_time_ms, error }
```

### Agent Service Endpoints (Direct Access)

- `POST /process` - Complete agent workflow
- `POST /classify` - Ticket classification only
- `POST /auto-resolve` - Auto-resolution attempt
- `POST /chat-response` - Generate chat responses
- `GET /health` - Service health check

## Monitoring and Logging

### Structured Logging

All services output structured JSON logs:

```json
{
  "timestamp": "2025-06-04T23:21:50.956651",
  "level": "INFO",
  "logger": "agent_orchestrator",
  "message": "Support request processing completed",
  "service": "agent_orchestrator",
  "request_id": "req_1234567890",
  "processing_time_ms": 1250.0,
  "ticket_id": 123,
  "confidence_score": 0.95
}
```

### Key Metrics Monitored

- **Ingestion Counts**: Document processing and vector storage
- **Search Queries**: Performance and result quality
- **Agent Transitions**: Workflow step progression
- **Collection Size**: Qdrant vector count approaching shard threshold
- **Processing Times**: End-to-end request latency

### Collection Size Monitoring

Automatic warnings when Qdrant collection approaches 1M vectors:

```json
{
  "level": "WARNING",
  "message": "Vector collection requires sharding",
  "current_count": 1500000,
  "threshold": 1000000,
  "recommendation": "implement_sharding_or_upgrade_storage"
}
```

## Testing and Validation

### Run Validation Suite

```bash
# Simple validation without external dependencies
python test_simple_validation.py

# Comprehensive test suite (requires pytest)
python test_production_ready_suite.py
```

### Integration Testing

```bash
# Test agent service integration
python test_agent_integration.py
```

## Graceful Degradation Features

The system maintains full functionality even when microservices are unavailable:

1. **Agent Service Down**: Falls back to direct OpenAI calls in Node.js
2. **Qdrant Unavailable**: Uses local file storage for instructions
3. **Data Service Down**: Direct database operations in Node.js
4. **Network Issues**: Configurable timeouts and retry logic

## Production Considerations

### Scaling Recommendations

- **Vector Storage**: Plan sharding when approaching 1M vectors
- **Agent Service**: Horizontal scaling with load balancer
- **Database**: Connection pooling and read replicas
- **Monitoring**: Log aggregation and alerting systems

### Security

- Environment variables for all secrets
- No hardcoded API keys or database credentials
- Service authentication tokens in production
- TLS encryption between services

### Performance Optimization

- Connection pooling for database and external services
- Caching for frequently accessed instructions
- Async processing for non-critical operations
- Request timeout configurations

## Troubleshooting

### Common Issues

1. **Service Connection Errors**: Check environment variables and service ports
2. **Authentication Failures**: Verify API keys in environment
3. **Database Connection**: Confirm DATABASE_URL format and permissions
4. **Qdrant Issues**: Service runs without Qdrant, uses local fallback

### Health Checks

```bash
# Check agent service
curl http://localhost:8001/health

# Check main application
curl http://localhost:5000/api/health
```

### Log Analysis

Monitor these log messages for issues:
- `Agent service unavailable, falling back to legacy workflow`
- `Vector collection approaching shard threshold`
- `Failed to connect to Qdrant, using local storage`
- `Database connection error, retrying...`

## Migration from Direct OpenAI

The system automatically handles migration:

1. **No Code Changes**: Existing endpoints continue working
2. **Progressive Enhancement**: Microservices add capabilities when available
3. **Backward Compatibility**: All existing features preserved
4. **Performance Improvement**: Reduced latency through agent orchestration

## Success Metrics

The loose coupling architecture provides:

- **Zero Downtime**: Service failures don't break the application
- **Independent Development**: Teams can work on services separately
- **Horizontal Scaling**: Services scale based on demand
- **Monitoring Visibility**: Comprehensive logging and metrics
- **Production Ready**: Environment-driven configuration and testing

Your system is now production-ready with comprehensive monitoring, testing, and graceful degradation capabilities.