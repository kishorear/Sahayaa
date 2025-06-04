# Loosely Coupled Multi-Agent Support System Architecture

## Service Separation & Responsibilities

### 1. FastAPI Service (Port 8000)
**Single Responsibility**: Data storage and JSON API responses
- Handles ticket CRUD operations via PostgreSQL
- Stores instruction templates in database
- Returns JSON responses only
- No business logic or orchestration
- Schema-compatible with existing camelCase columns

**Endpoints**:
```
POST /tickets/          - Store ticket data
GET  /tickets/{id}      - Retrieve ticket JSON
GET  /tickets/similar/  - Text-based similarity search
POST /instructions/     - Store instruction templates
GET  /instructions/     - Retrieve instruction JSON
```

### 2. Qdrant Ingestion Service
**Single Responsibility**: Document processing and vector storage
- Scans `instructions/` directory for supported files
- Converts documents to Markdown via MarkItDown
- Generates 384-dimensional embeddings
- Upserts to Qdrant `instruction_texts` collection
- Payload format: `{filename, text}`

**Supported Formats**: .txt, .pdf, .docx, .pptx, .xlsx

### 3. Agent Orchestration Layer
**Single Responsibility**: Workflow coordination and LLM integration
- Calls FastAPI service for ticket operations
- Queries Qdrant for instruction similarity search
- Orchestrates LLM API calls for resolution generation
- No direct database or vector storage access
- Stateless operation flow

### 4. Optional Redis Cache
**Single Responsibility**: In-memory instruction template caching
- Caches frequently accessed instruction templates at startup
- Fallback to direct SQL + Qdrant if unavailable
- Optional performance optimization only

## Data Flow Architecture

```
User Request
    ↓
Agent Orchestrator
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│  FastAPI API    │  Qdrant Search  │   LLM API       │
│  (JSON only)    │  (Vectors only) │  (Text only)    │
└─────────────────┴─────────────────┴─────────────────┘
    ↓                      ↓                ↓
PostgreSQL            Qdrant Cloud     OpenAI/Gemini
```

## Interface Contracts

### FastAPI Service Contract
```typescript
// Input: Structured data
// Output: JSON responses only
interface TicketResponse {
  id: number;
  title: string;
  description: string;
  resolution?: string;
  // ... existing schema fields
}
```

### Qdrant Service Contract
```typescript
// Input: Document files
// Output: Vector embeddings
interface QdrantPayload {
  filename: string;
  text: string;
}
```

### Agent Orchestrator Contract
```typescript
// Input: User message
// Output: Formatted ticket
interface AgentResponse {
  ticket_id: number;
  formatted_body: string;
  resolution_steps: string[];
}
```

## Benefits of Loose Coupling

1. **Independent Scaling**: Each service scales based on its specific load
2. **Technology Independence**: Services can use different tech stacks
3. **Fault Isolation**: Failure in one service doesn't cascade
4. **Development Velocity**: Teams can work on services independently
5. **Testing Simplicity**: Each service can be unit tested in isolation

## Service Communication

- **HTTP APIs**: RESTful JSON communication between services
- **No Shared Databases**: Each service owns its data store
- **Event-Driven**: Optional async communication via message queues
- **Circuit Breakers**: Graceful degradation when services unavailable

## Deployment Independence

Each service can be:
- Deployed separately
- Versioned independently  
- Scaled horizontally based on demand
- Monitored with service-specific metrics
- Updated without affecting other services