# Loose Coupling Architecture Guide

## Overview
This document outlines the loosely coupled service architecture for the AI-powered support ticket management system. Each service has a single responsibility and communicates through well-defined APIs.

## Service Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   FastAPI Service   │    │  Qdrant Ingestion  │    │   Agent Orchestrator│
│   (Data & JSON)    │    │     Service         │    │   (Business Logic)  │
├─────────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│ • Ticket CRUD       │    │ • File scanning     │    │ • Multi-agent coord │
│ • Message storage   │    │ • Document parsing  │    │ • LLM API calls     │
│ • JSON responses    │    │ • MarkItDown conv   │    │ • Workflow logic    │
│ • No business logic │    │ • 384-dim vectors   │    │ • Service calls     │
│ • Pure data layer   │    │ • Qdrant upserts    │    │ • Result formatting │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                            │                            │
         │                            │                            │
         ▼                            ▼                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Shared Infrastructure                          │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┤
│   PostgreSQL    │     Qdrant      │    OpenAI API   │   Redis Cache   │
│   (Primary DB)  │ (Vector Storage)│   (Embeddings)  │   (Optional)    │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## Service Responsibilities

### 1. FastAPI Data Service (`services/fastapi_data_service.py`)

**Single Responsibility:** Pure data storage and JSON API responses

**What it DOES:**
- CRUD operations for tickets, messages, instructions
- Data validation using Pydantic models
- JSON serialization/deserialization
- Database connection management
- Simple data queries and filtering

**What it DOES NOT do:**
- Business logic or decision making
- External API calls (OpenAI, Qdrant, etc.)
- Data transformation beyond basic formatting
- Workflow orchestration
- AI/ML processing

**API Endpoints:**
```
POST /tickets/              - Create ticket
GET  /tickets/{id}          - Get ticket by ID
GET  /tickets/              - List tickets with filters
PUT  /tickets/{id}          - Update ticket
DELETE /tickets/{id}        - Delete ticket
POST /messages/             - Create message
GET  /messages/             - List messages
POST /instructions/         - Store instruction template
GET  /instructions/         - List instruction templates
GET  /health               - Service health check
```

### 2. Qdrant Ingestion Service (`services/qdrant_ingestion_service.py`)

**Single Responsibility:** Document processing and vector storage

**What it DOES:**
- Scan `instructions/` directory for supported files (.txt, .pdf, .docx, .pptx, .xlsx)
- Convert documents to Markdown using MarkItDown
- Generate 384-dimensional embeddings via OpenAI
- Upsert vectors to Qdrant with payload `{filename, text}`
- Provide similarity search functionality

**What it DOES NOT do:**
- Ticket management or business decisions
- User authentication or authorization
- Workflow orchestration
- Direct database operations beyond vector storage

**Key Methods:**
```python
def scan_and_process_all() -> Dict[str, Any]
def convert_to_markdown(file_path: Path) -> str  
def generate_embedding(text: str) -> List[float]
def upsert_to_qdrant(filename: str, text: str, embedding: List[float]) -> bool
def search_instructions(query: str, top_k: int = 3) -> List[Dict[str, Any]]
```

### 3. Agent Orchestrator (`agents/support_team_agent.py`)

**Single Responsibility:** Business logic coordination and workflow orchestration

**What it DOES:**
- Coordinate multiple specialized agents
- Make LLM API calls for resolution generation
- Call FastAPI service for ticket operations
- Call Qdrant service for instruction lookup
- Implement business rules and decision logic
- Format final results for presentation

**What it DOES NOT do:**
- Direct database operations
- File processing or document conversion
- Vector storage operations
- Low-level data persistence

**Workflow:**
1. Process user input via ChatProcessorAgent
2. Lookup instructions via InstructionLookupAgent → Qdrant Service
3. Find similar tickets via TicketLookupAgent → FastAPI Service
4. Generate resolution using OpenAI LLM
5. Format result via TicketFormatterAgent

## Service Communication Patterns

### 1. Agent → FastAPI Service
```python
# Agents call FastAPI for data operations
response = requests.post(f"{mcp_service_url}/tickets/", json=ticket_data)
response = requests.get(f"{mcp_service_url}/tickets/similar/", params={"query": query})
```

### 2. Agent → Qdrant Ingestion Service
```python
# Agents call Qdrant service for instruction lookup
ingestion_service = QdrantIngestionService()
results = ingestion_service.search_instructions(query, top_k=3)
```

### 3. Service Independence
- FastAPI service knows nothing about Qdrant or AI processing
- Qdrant service knows nothing about tickets or business logic
- Agents orchestrate but don't implement low-level operations

## Implementation Guidelines

### For FastAPI Service Engineers:

1. **Keep it Simple:** Only implement CRUD operations and JSON responses
2. **No External Calls:** Never call OpenAI, Qdrant, or other external services
3. **Data Focus:** Focus on data integrity, validation, and persistence
4. **Stateless:** Each endpoint should be independent and stateless

Example of GOOD FastAPI code:
```python
@app.post("/tickets/", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate):
    """Create a new ticket - pure data operation."""
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO tickets (title, description, category, "tenantId", status)
                VALUES (%(title)s, %(description)s, %(category)s, %(tenantId)s, %(status)s)
                RETURNING *
            """, ticket.dict())
            result = cur.fetchone()
            conn.commit()
            return TicketResponse(**dict(result))
```

Example of BAD FastAPI code:
```python
# DON'T DO THIS - No business logic in FastAPI service
@app.post("/tickets/auto-resolve/")
async def auto_resolve_ticket(ticket_id: int):
    # This belongs in the Agent Orchestrator, not here
    openai_response = openai.chat.completions.create(...)  # ❌ WRONG
    similar_tickets = qdrant_client.search(...)            # ❌ WRONG
    decision = analyze_urgency(...)                        # ❌ WRONG
```

### For Qdrant Ingestion Engineers:

1. **File Focus:** Only care about scanning, converting, and storing documents
2. **Pure Processing:** Convert files to vectors, nothing more
3. **No Business Logic:** Don't make decisions about ticket priorities or categories

Example of GOOD Qdrant code:
```python
def scan_and_process_all(self) -> Dict[str, Any]:
    """Scan instructions/ and process all supported files."""
    supported_files = []
    for extension in ['.txt', '.pdf', '.docx', '.pptx', '.xlsx']:
        supported_files.extend(self.instructions_dir.glob(f"**/*{extension}"))
    
    for file_path in supported_files:
        markdown_text = self.convert_to_markdown(file_path)
        embedding = self.generate_embedding(markdown_text)
        self.upsert_to_qdrant(file_path.name, markdown_text, embedding)
```

### For Agent Engineers:

1. **Orchestration Focus:** Coordinate services but don't implement their logic
2. **Business Rules:** Implement decision-making and workflow logic
3. **Service Calls:** Use HTTP/API calls to interact with other services

Example of GOOD Agent code:
```python
def process_support_request(self, user_message: str, context: Dict) -> Dict:
    """Orchestrate the complete support workflow."""
    
    # Step 1: Process user input
    normalized = self.chat_processor.normalize_message(user_message)
    
    # Step 2: Call external services
    instructions = self.instruction_lookup.search(normalized.query)
    similar_tickets = self.ticket_lookup.search_similar(normalized.query)
    
    # Step 3: Business logic - generate resolution
    resolution = self.generate_llm_resolution(normalized, instructions, similar_tickets)
    
    # Step 4: Format and store result
    ticket_data = self.format_ticket(normalized, resolution)
    created_ticket = self.create_ticket_via_api(ticket_data)
    
    return {"ticket": created_ticket, "resolution": resolution}
```

## Optional Redis Integration

Redis can be used as a shared cache for instruction templates at startup, but it's optional:

```python
# Optional: Cache frequently accessed instructions
def cache_instructions_at_startup():
    """Load popular instructions into Redis for faster access."""
    if redis_available:
        popular_instructions = qdrant_service.get_popular_instructions()
        for instruction in popular_instructions:
            redis_client.setex(f"instruction:{instruction.id}", 3600, instruction.text)
```

## Testing Each Service Independently

### FastAPI Service Test:
```bash
# Test pure data operations
curl -X POST http://localhost:8000/tickets/ \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Test ticket","category":"general","tenantId":1}'
```

### Qdrant Service Test:
```bash
# Test document processing
python -c "
from services.qdrant_ingestion_service import QdrantIngestionService
service = QdrantIngestionService()
result = service.scan_and_process_all()
print(result)
"
```

### Agent Test:
```bash
# Test orchestration
python -c "
from agents.support_team_agent import SupportTeamAgent
agent = SupportTeamAgent()
result = agent.process_support_request('I need help with login', {'user_id': 'test'})
print(result)
"
```

## Benefits of This Architecture

1. **Independent Development:** Each service can be developed and deployed separately
2. **Technology Flexibility:** Services can use different technologies/languages
3. **Scalability:** Each service can be scaled independently based on load
4. **Testing:** Easy to unit test each service in isolation
5. **Maintenance:** Changes to one service don't affect others
6. **Debugging:** Clear separation makes issues easier to trace and fix

## Migration Notes

If you have existing tightly coupled code:

1. **Extract Data Operations:** Move all database CRUD to FastAPI service
2. **Extract File Processing:** Move document processing to Qdrant service  
3. **Extract Business Logic:** Move orchestration and AI calls to Agent layer
4. **Use HTTP APIs:** Replace direct function calls with HTTP requests between services
5. **Remove Cross-Dependencies:** Ensure services don't import each other's modules

This architecture ensures each service has a single, clear responsibility and can evolve independently while maintaining clean interfaces between components.