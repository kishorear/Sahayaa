# Loose Coupling Implementation Guide

## Overview

This guide demonstrates the complete implementation of the loosely coupled architecture for the AI-powered support ticket management system. Each service has been designed with single responsibility and communicates through well-defined APIs.

## Architecture Implementation

### 1. FastAPI Data Service (`services/fastapi_data_service.py`)

**Purpose**: Pure data storage and JSON API responses

**Key Features**:
- Complete CRUD operations for tickets, messages, and instructions
- PostgreSQL database integration with existing schema
- RESTful API endpoints with proper error handling
- Health monitoring and database connectivity checks
- No external service dependencies

**API Endpoints**:
```
GET  /health                     - Database connectivity check
POST /tickets/                   - Create new ticket
GET  /tickets/{id}               - Get ticket by ID
GET  /tickets/                   - List tickets with filtering
PUT  /tickets/{id}               - Update ticket
DELETE /tickets/{id}             - Delete ticket
POST /messages/                  - Create message
GET  /messages/                  - List messages with filtering
POST /instructions/              - Create instruction template
GET  /instructions/              - List instruction templates
GET  /tickets/search/            - Simple text search
```

**Running the Service**:
```bash
cd services
python fastapi_data_service.py
# Service available at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 2. Qdrant Ingestion Service (`services/qdrant_ingestion_service.py`)

**Purpose**: Document processing and vector storage

**Key Features**:
- Scans `instructions/` directory for supported file types (.txt, .pdf, .docx, .pptx, .xlsx)
- Converts documents to Markdown format
- Generates 384-dimensional embeddings using OpenAI
- Stores vectors in Qdrant with payload `{filename, text}`
- Provides similarity search functionality

**Usage Example**:
```python
from services.qdrant_ingestion_service import QdrantIngestionService

# Initialize service
service = QdrantIngestionService()

# Process all instruction files
results = service.scan_and_process_all()
print(f"Processed {results['processed']} files")

# Search for relevant instructions
results = service.search_instructions("login help", top_k=3)
for result in results:
    print(f"File: {result['filename']}, Score: {result['score']}")
```

### 3. Agent Orchestrator (`services/agent_orchestrator.py`)

**Purpose**: Business logic coordination and workflow orchestration

**Key Features**:
- Coordinates multiple services through HTTP APIs
- Implements business rules and decision logic
- Generates resolutions using OpenAI LLM
- Processes user input and extracts key information
- Formats comprehensive results for presentation

**Workflow Process**:
1. Process and normalize user input
2. Search for relevant instructions via Qdrant service
3. Find similar tickets via FastAPI service
4. Generate resolution using LLM
5. Create ticket via FastAPI service
6. Format final comprehensive result

**Usage Example**:
```python
from services.agent_orchestrator import AgentOrchestrator

# Initialize orchestrator
orchestrator = AgentOrchestrator(
    data_service_url="http://localhost:8000",
    qdrant_service=qdrant_service  # Optional
)

# Process support request
result = orchestrator.process_support_request(
    user_message="I can't log into my account",
    user_context={"user_id": "123", "tenant_id": 1}
)

print(f"Ticket created: #{result['final_ticket']['ticket_id']}")
```

## Service Communication Patterns

### HTTP API Communication
Services communicate exclusively through HTTP APIs:

```python
# Agent calls FastAPI service
response = requests.post(f"{data_service_url}/tickets/", json=ticket_data)

# Agent calls Qdrant service
instructions = qdrant_service.search_instructions(query, top_k=3)
```

### Error Handling and Graceful Degradation
Each service handles unavailability of other services gracefully:

```python
def _search_instructions(self, query):
    try:
        if self.qdrant_service:
            return self.qdrant_service.search_instructions(query)
        else:
            return {"success": False, "results": [], "error": "Service unavailable"}
    except Exception as e:
        return {"success": False, "results": [], "error": str(e)}
```

## Testing the Implementation

### Comprehensive Test Suite (`test_loose_coupling_demo.py`)

The test suite demonstrates:
- Each service operating independently
- Services communicating through APIs only
- Graceful handling of service unavailability
- End-to-end workflow coordination

**Running Tests**:
```bash
python test_loose_coupling_demo.py
```

### Individual Service Tests

**Test FastAPI Data Service**:
```bash
# Start the service
python services/fastapi_data_service.py

# Test endpoints
curl -X GET http://localhost:8000/health
curl -X POST http://localhost:8000/tickets/ \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test ticket","tenantId":1}'
```

**Test Qdrant Ingestion Service**:
```bash
# Create test instruction files
mkdir instructions
echo "Login help: Reset your password by clicking forgot password" > instructions/login_help.txt

# Run processing
python -c "
from services.qdrant_ingestion_service import QdrantIngestionService
service = QdrantIngestionService()
results = service.scan_and_process_all()
print(results)
"
```

**Test Agent Orchestrator**:
```bash
python -c "
from services.agent_orchestrator import AgentOrchestrator
orchestrator = AgentOrchestrator()
result = orchestrator.process_support_request(
    'I need help with login', 
    {'user_id': 'test', 'tenant_id': 1}
)
print('Success:', result['workflow_metadata']['success'])
"
```

## Deployment Configuration

### Environment Variables

Each service requires specific environment variables:

```bash
# Required for all services
DATABASE_URL=postgresql://user:pass@host:port/db

# Required for Qdrant service and LLM features
OPENAI_API_KEY=your_openai_api_key

# Optional for Qdrant Cloud
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key
```

### Service Dependencies

**FastAPI Data Service**:
- PostgreSQL database
- No external service dependencies

**Qdrant Ingestion Service**:
- OpenAI API key for embeddings
- Qdrant instance (local or cloud)
- Document processing libraries (docx, openpyxl, PyPDF2, pptx)

**Agent Orchestrator**:
- FastAPI Data Service (HTTP)
- Qdrant Ingestion Service (optional)
- OpenAI API key for LLM features

### Production Deployment

**Option 1: Separate Services**
```bash
# Service 1: Data API
python services/fastapi_data_service.py --port 8000

# Service 2: Document processing (batch job)
python services/qdrant_ingestion_service.py

# Service 3: Agent orchestration
python services/agent_orchestrator.py --port 8001
```

**Option 2: Container Deployment**
```dockerfile
# Dockerfile for FastAPI Data Service
FROM python:3.11-slim
COPY services/fastapi_data_service.py .
RUN pip install fastapi uvicorn psycopg2-binary
CMD ["python", "fastapi_data_service.py"]
```

## Benefits Achieved

### 1. Independent Development
- Each service can be developed by different teams
- Services can be deployed independently
- Technology stack can vary per service

### 2. Scalability
- Scale data service independently based on database load
- Scale document processing based on file volume
- Scale orchestration based on user requests

### 3. Maintainability
- Clear service boundaries reduce complexity
- Changes to one service don't affect others
- Easy to debug and troubleshoot issues

### 4. Testing
- Unit test each service in isolation
- Mock external service dependencies
- Integration tests verify API contracts

### 5. Fault Tolerance
- Services continue operating when others are unavailable
- Graceful degradation with fallback responses
- No cascading failures

## Migration from Tightly Coupled Code

If you have existing tightly coupled code:

### Step 1: Extract Data Operations
Move all database CRUD operations to FastAPI service:
```python
# Before: Direct database access in business logic
def process_ticket(ticket_data):
    # Business logic mixed with data access
    cursor.execute("INSERT INTO tickets ...")
    
# After: HTTP API call
def process_ticket(ticket_data):
    response = requests.post(f"{data_service_url}/tickets/", json=ticket_data)
```

### Step 2: Extract Document Processing
Move file processing to Qdrant service:
```python
# Before: Document processing in main application
def handle_instruction_upload(file):
    text = extract_text(file)
    embedding = generate_embedding(text)
    store_in_vector_db(embedding)

# After: Service call
def handle_instruction_upload(file):
    qdrant_service.process_document(file)
```

### Step 3: Extract Business Logic
Move orchestration to Agent service:
```python
# Before: Mixed concerns
def handle_support_request(message):
    # Parse input, search data, generate response all mixed
    
# After: Clear orchestration
def handle_support_request(message):
    return orchestrator.process_support_request(message, context)
```

### Step 4: Remove Direct Dependencies
Replace function calls with HTTP requests:
```python
# Before: Direct import and function call
from data_module import create_ticket
ticket = create_ticket(data)

# After: HTTP API call
response = requests.post(f"{api_url}/tickets/", json=data)
ticket = response.json()
```

## Monitoring and Observability

### Health Checks
Each service provides health endpoints:
```python
# Data service health
GET /health -> {"status": "healthy", "database": "connected"}

# Orchestrator health 
orchestrator.get_service_status() -> {
    "services": {
        "data_service": {"status": "healthy"},
        "qdrant_service": {"status": "available"},
        "openai_service": {"status": "available"}
    }
}
```

### Logging and Metrics
Services log independently:
```python
logger.info(f"Created ticket {ticket_id}")
logger.error(f"Service unavailable: {service_name}")
```

### Performance Monitoring
Track service response times:
```python
workflow_result["workflow_metadata"]["total_time_ms"] = 150.2
workflow_result["workflow_metadata"]["steps_completed"] = ["input_processing", "ticket_creation"]
```

This implementation ensures each service maintains its single responsibility while providing a robust, scalable, and maintainable architecture for the AI-powered support system.