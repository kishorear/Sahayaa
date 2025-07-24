# Sahayaa AI Agent Architecture - Complete System Layout

## 🏗️ Architecture Overview

The Sahayaa AI platform implements a sophisticated multi-agent architecture with MCP (Model Context Protocol) integration, vector search capabilities, and microservices orchestration. The system processes customer support requests through specialized AI agents working in coordination.

## 🌟 Core Architecture Components

### 1. **Multi-Agent Orchestration Layer**
```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT ORCHESTRATION LAYER                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ SupportTeam     │  │ Agent           │  │ Microservices│ │
│  │ Orchestrator    │  │ Orchestrator    │  │ Orchestrator │ │
│  │ (TypeScript)    │  │ (Python)        │  │ (Python)     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. **Specialized AI Agents Pipeline**
```
User Message → [1] Chat Preprocessor → [2] Instruction Lookup → [3] Ticket Lookup → [4] LLM Processing → [5] Ticket Formatter → Final Response
```

## 🤖 Detailed Agent Specifications

### **1. SupportTeamOrchestrator (Master Coordinator)**
- **Location**: `server/ai/agents/support-team-orchestrator.ts`
- **Language**: TypeScript/Node.js
- **Role**: Master coordinator for the entire agent workflow
- **Dependencies**:
  - Google Generative AI (Gemini)
  - Redis Memory Service
  - Database Storage Layer
  - All sub-agents (1-4 below)

**Core Responsibilities**:
1. Accept raw user messages from chat widget/API
2. Coordinate all sub-agents in proper sequence
3. Generate solution steps using LLM (Google Gemini)
4. Create tickets in database with full resolution context
5. Return formatted final response to frontend
6. Handle error management and fallback mechanisms

**Workflow Process**:
```typescript
async processUserMessage(input: OrchestratorInput): Promise<OrchestratorResult> {
  // Step 1: Run ChatProcessorAgent
  const preprocessResult = await this.preprocessorAgent.processMessage({...});
  
  // Step 2: Run InstructionLookupAgent  
  const instructionResult = await this.instructionLookupAgent.lookupInstructions({...});
  
  // Step 3: Run TicketLookupAgent
  const ticketResult = await this.ticketLookupAgent.lookupSimilarTickets({...});
  
  // Step 4: Generate solution with LLM
  const solutionResult = await this.generateSolutionSteps(...);
  
  // Step 5: Create actual database ticket
  const createdTicket = await this.createTicketInDatabase(...);
  
  // Step 6: Format final response
  const formattedResult = await this.formatterAgent.formatTicket(...);
  
  return formattedResult;
}
```

### **2. ChatPreprocessorAgent (Text Normalization)**
- **Location**: `server/ai/agents/chat-preprocessor-agent.ts`
- **Language**: TypeScript/Node.js  
- **Role**: Text normalization and preprocessing
- **Dependencies**: Google Generative AI (Gemini)

**Core Responsibilities**:
1. Normalize user text (remove filler words, fix grammar)
2. Detect and mask PII (Personal Identifiable Information)
3. Determine urgency level (LOW, MEDIUM, HIGH, CRITICAL)
4. Analyze sentiment (positive, negative, neutral)
5. Store session context in memory

**Processing Pipeline**:
```typescript
async preprocess(message: string, sessionId: string): Promise<PreprocessorResult> {
  // 1. Text normalization using Gemini API or fallback
  const normalizedPrompt = await this.normalizeText(message);
  
  // 2. PII detection and masking
  const { maskedText, piiPlaceholders } = this.detectAndMaskPII(normalizedPrompt);
  
  // 3. Urgency determination
  const urgency = await this.determineUrgency(maskedText);
  
  // 4. Sentiment analysis
  const sentiment = await this.analyzeSentiment(maskedText);
  
  return { normalizedPrompt: maskedText, urgency, sentiment, ... };
}
```

**PII Detection Patterns**:
- Email addresses → `[EMAIL_REDACTED]`
- Phone numbers → `[PHONE_REDACTED]`
- Credit card numbers → `[CARD_REDACTED]`
- SSNs → `[SSN_REDACTED]`

### **3. InstructionLookupAgent (Knowledge Base Search)**
- **Location**: `server/ai/agents/instruction-lookup-agent.ts`
- **Language**: TypeScript/Node.js
- **Role**: Vector-based similarity search through instruction documents
- **Dependencies**: ChromaDB Python Service, Redis Memory

**Core Responsibilities**:
1. Search ChromaDB for relevant instruction documents
2. Use vector embeddings for semantic similarity matching
3. Return top-K most relevant instruction excerpts
4. Provide fallback to local ChromaDB service

**Search Architecture**:
```typescript
async lookupInstructions(input: InstructionLookupInput): Promise<InstructionLookupOutput> {
  try {
    // Primary: Remote ChromaDB service
    const response = await axios.post('http://localhost:3001/api/chromadb/search-instructions', {
      query: input.normalizedPrompt,
      top_k: input.topK || 3,
      collection: 'instruction_texts'
    });
    
    return formatInstructionResults(response.data);
  } catch (error) {
    // Fallback: Local ChromaDB Python service
    return this.fallbackToLocalChromaDB(input);
  }
}
```

**Instruction Result Format**:
```typescript
interface InstructionResult {
  filename: string;           // Source document filename
  text_excerpt: string;       // Relevant text excerpt (200 chars)
  score: number;              // Similarity confidence score
  metadata: object;           // Additional document metadata
}
```

### **4. TicketLookupAgent (Historical Ticket Search)**
- **Location**: `server/ai/agents/ticket-lookup-agent.ts`
- **Language**: TypeScript/Node.js
- **Role**: MCP-based similarity search for historical tickets
- **Dependencies**: MCP FastAPI Service (Port 8000), Redis Memory

**Core Responsibilities**:
1. Search MCP FastAPI service for similar resolved tickets
2. Find tickets with successful resolution patterns
3. Return similarity scores and resolution excerpts
4. Provide tenant-aware filtering

**MCP Integration**:
```typescript
async lookupSimilarTickets(input: TicketLookupInput): Promise<TicketLookupOutput> {
  const response = await axios.post(`${this.mcpServiceUrl}/tickets/similar/`, {
    query: input.normalizedPrompt,
    tenant_id: input.tenantId || 1,
    top_k: input.topK || 3,
    urgency: input.urgency,
    sentiment: input.sentiment
  });
  
  return formatTicketResults(response.data.similar_tickets);
}
```

**Ticket Result Format**:
```typescript
interface TicketResult {
  ticket_id: number;
  similarity_score: number;   // 0.0 to 1.0 confidence
  resolution_excerpt: string; // First 200 chars of resolution
  title: string;
  category: string;
  status: string;
  metadata: object;
}
```

### **5. TicketFormatterAgent (Response Formatting)**
- **Location**: `server/ai/agents/ticket-formatter-agent.ts`
- **Language**: TypeScript/Node.js
- **Role**: Professional ticket response formatting
- **Dependencies**: Google Generative AI (Gemini)

**Core Responsibilities**:
1. Format solution steps into professional ticket responses
2. Select appropriate templates based on urgency/category
3. Generate proper ticket titles and subjects
4. Apply consistent branding and tone

**Template Selection Logic**:
```typescript
private selectTemplate(input: TicketFormatterInput): string {
  if (input.urgency === 'CRITICAL' || input.urgency === 'HIGH') {
    return this.templates['urgent'];
  }
  if (input.category === 'billing') return this.templates['billing'];
  if (input.category === 'technical') return this.templates['technical'];
  return this.templates['standard'];
}
```

**Available Templates**:
- `standard` - Default professional template
- `urgent` - High-priority escalation template
- `billing` - Billing department specific template
- `technical` - Technical support template
- `simple` - Concise response template

## 🔧 Supporting Services Architecture

### **MCP Service Layer (Port 8000)**
- **Location**: `mcp_service/main.py`
- **Language**: Python FastAPI
- **Role**: Data persistence and vector search backend

**Core Components**:
```python
# Database Models
class Ticket(Base):
    id: int
    title: str
    description: str
    status: str
    category: str
    tenant_id: int
    created_at: datetime

class TicketEmbedding(Base):
    ticket_id: int
    embedding_vector: List[float]
    model_name: str
```

**Key Endpoints**:
- `POST /tickets/` - Create new tickets
- `GET /tickets/{id}` - Retrieve ticket with resolution
- `POST /tickets/similar/` - Similarity search
- `POST /instructions/` - Manage instruction documents
- `GET /health` - Service health check

### **Agent Orchestrator Service (Port 8001)**
- **Location**: `services/agent_orchestrator.py`
- **Language**: Python FastAPI
- **Role**: Business logic coordination and LLM integration

**Workflow Coordination**:
```python
def process_support_request(self, user_message: str, user_context: Dict) -> Dict:
    # Step 1: Process user input
    normalized_input = self._process_user_input(user_message, user_context)
    
    # Step 2: Search instructions
    instructions = self._search_instructions(normalized_input["normalized_query"])
    
    # Step 3: Search similar tickets  
    similar_tickets = self._search_similar_tickets(normalized_input["normalized_query"])
    
    # Step 4: Generate LLM resolution
    llm_resolution = self._generate_llm_resolution(normalized_input, instructions, similar_tickets)
    
    # Step 5: Create ticket
    created_ticket = self._create_ticket_via_api(ticket_data)
    
    # Step 6: Format final result
    return self._format_final_ticket(created_ticket, llm_resolution)
```

### **Vector Storage System**
**ChromaDB Integration**:
- Collection: `instruction_texts` - Knowledge base documents
- Collection: `ticket_embeddings` - Historical ticket vectors
- Embedding Model: Google AI Text Embeddings
- Similarity Method: Cosine similarity
- Supported Document Types: .txt, .pdf, .docx, .pptx, .xlsx

### **Enhanced Security & RBAC System**
- **Location**: `enhanced_agent_system.py`
- **Language**: Python
- **Role**: Role-based access control and security enforcement

**Permission Matrix**:
```python
ROLE_PERMISSIONS = {
    'creator': ['*'],  # Full access
    'administrator': ['read_tickets', 'write_tickets', 'read_instructions', 'write_instructions', 'agent_upload'],
    'support_engineer': ['read_tickets', 'write_tickets', 'read_instructions', 'agent_upload'],
    'engineer': ['read_tickets', 'read_instructions'],
    'user': ['read_tickets_own', 'read_instructions']
}
```

## 🌐 System Integration Flow

### **Complete Request Processing Flow**:
```
1. USER REQUEST
   ↓
   Frontend Chat Interface
   ↓
2. MAIN APPLICATION (Port 5000)
   ↓
   Node.js Express Server
   ↓
3. SUPPORT TEAM ORCHESTRATOR
   ↓
   TypeScript Agent Coordination
   ↓
4. MULTI-AGENT PIPELINE
   ├── ChatPreprocessorAgent (Text normalization)
   ├── InstructionLookupAgent (ChromaDB search)
   ├── TicketLookupAgent (MCP similarity search)
   └── TicketFormatterAgent (Response formatting)
   ↓
5. LLM PROCESSING
   ↓
   Google Gemini AI (Solution generation)
   ↓
6. DATABASE PERSISTENCE
   ↓
   PostgreSQL (Ticket creation)
   ↓
7. FORMATTED RESPONSE
   ↓
   Professional ticket with resolution steps
   ↓
8. USER INTERFACE
   ↓
   Final formatted response displayed
```

### **Data Flow Architecture**:
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │────│   Main App      │────│  Orchestrator   │
│   (React)       │    │   (Node.js)     │    │  (TypeScript)   │
│   Port: 5000    │    │   Port: 5000    │    │  Integrated     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   MCP Service   │────│  Vector Storage │
                       │   (FastAPI)     │    │   (ChromaDB)    │
                       │   Port: 8000    │    │   Collections   │
                       └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   Database      │
                       │   (Primary)     │
                       └─────────────────┘
```

## 🔄 Agent Communication Protocols

### **Inter-Agent Data Sharing**:
- **Redis Memory Service**: Session-based context sharing
- **Session Data Structure**:
```typescript
interface SessionContext {
  normalized_prompt: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  masked_pii: PiiPlaceholder[];
  sentiment: 'positive' | 'negative' | 'neutral';
  instruction_hits: InstructionResult[];
  ticket_hits: TicketResult[];
  timestamp: string;
}
```

### **Error Handling & Fallback Mechanisms**:
1. **Service Unavailability**: Graceful degradation to local processing
2. **API Failures**: Multiple retry attempts with exponential backoff
3. **Vector Search Failures**: Fallback to keyword-based search
4. **LLM Failures**: Template-based response generation

## 🚀 Deployment Architecture

### **Microservices Configuration**:
```yaml
services:
  main_app:
    port: 5000
    type: node_express
    dependencies: [postgres, redis]
    
  mcp_service:
    port: 8000
    type: python_fastapi
    dependencies: [postgres, chromadb]
    
  agent_orchestrator:
    port: 8001
    type: python_fastapi
    dependencies: [openai_api, google_ai]
    
  vector_storage:
    type: chromadb
    collections: [instruction_texts, ticket_embeddings]
    
  database:
    type: postgresql
    schemas: [tickets, messages, instructions, embeddings]
```

### **Environment Variables**:
```bash
# AI Provider Keys
OPENAI_API_KEY=required
GOOGLE_AI_API_KEY=required
ANTHROPIC_API_KEY=optional

# Service URLs
DATA_SERVICE_URL=http://localhost:8000
AGENT_SERVICE_URL=http://localhost:8001
MCP_SERVICE_URL=http://localhost:8000

# Database
DATABASE_URL=postgresql://...

# Vector Storage
CHROMADB_HOST=localhost
CHROMADB_PORT=8000
VECTOR_DIMENSION=1536

# Security
JWT_SECRET=production_secret
ENCRYPTION_KEY=secure_key
```

## 📊 Performance Characteristics

### **Processing Times** (Typical):
- ChatPreprocessorAgent: 50-200ms
- InstructionLookupAgent: 100-300ms (vector search)
- TicketLookupAgent: 150-400ms (MCP search)
- LLM Processing: 1000-3000ms (solution generation)
- TicketFormatterAgent: 50-150ms
- **Total Workflow**: 1.5-4 seconds end-to-end

### **Scalability Features**:
- Horizontal scaling via Docker containers
- Connection pooling for database operations
- Redis-based session management
- Asynchronous processing where possible
- Circuit breaker patterns for resilience

## 🔧 Monitoring & Observability

### **Health Check Endpoints**:
- `/health` - Overall system health
- `/api/agents/status` - Agent availability status
- `/api/monitoring` - Real-time metrics dashboard

### **Metrics Tracked**:
- Request processing times
- Agent success/failure rates
- Vector search performance
- LLM API response times
- Database query performance
- Error rates by component

This architecture provides a robust, scalable, and maintainable AI agent system capable of handling complex customer support workflows with high accuracy and professional response formatting.