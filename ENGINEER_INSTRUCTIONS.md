# Engineer Instructions: Loose Coupling Architecture

## Quick Reference for Development Teams

### Service Responsibilities

**FastAPI Data Service** (`services/fastapi_data_service.py`)
- Pure data storage and JSON responses only
- No business logic, AI calls, or external service dependencies
- Complete CRUD for tickets, messages, instructions
- Run: `python services/fastapi_data_service.py`

**Qdrant Ingestion Service** (`services/qdrant_ingestion_service.py`)
- Document processing and vector storage only
- Scans instructions/ for .txt, .pdf, .docx, .pptx, .xlsx files
- Converts to Markdown, generates 384-dim vectors, stores in Qdrant
- No ticket management or business decisions

**Agent Orchestrator** (`services/agent_orchestrator.py`)
- Business logic coordination and workflow orchestration
- Calls other services via HTTP APIs
- Makes LLM API calls for resolution generation
- Implements decision-making and formatting logic

### Key Rules

1. **Data Service**: Never import openai, qdrant-client, or business logic modules
2. **Qdrant Service**: Never import fastapi, ticket models, or user management
3. **Orchestrator**: Coordinate via HTTP requests, no direct database access

### Communication Pattern

```python
# CORRECT: HTTP API calls between services
response = requests.post(f"{data_service_url}/tickets/", json=ticket_data)
instructions = qdrant_service.search_instructions(query)

# WRONG: Direct imports and function calls
from data_service import create_ticket  # ❌
ticket = create_ticket(data)            # ❌
```

### Testing Independence

Each service must work alone:
- Data service operates without Qdrant or OpenAI
- Qdrant service processes documents without ticket context
- Orchestrator handles service unavailability gracefully

### Quick Test Commands

```bash
# Test data service independence
python services/fastapi_data_service.py
curl http://localhost:8000/health

# Test document processing
python -c "from services.qdrant_ingestion_service import QdrantIngestionService; QdrantIngestionService().scan_and_process_all()"

# Test orchestration
python -c "from services.agent_orchestrator import AgentOrchestrator; AgentOrchestrator().get_service_status()"

# Full integration test
python test_loose_coupling_demo.py
```

### Error Handling

Services must handle missing dependencies gracefully:

```python
try:
    result = external_service.call()
    return {"success": True, "data": result}
except Exception as e:
    return {"success": False, "error": str(e), "fallback": fallback_data}
```

This architecture ensures each service can be developed, tested, deployed, and scaled independently while maintaining clean integration through well-defined APIs.