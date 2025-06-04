"""
Agent Workflow Endpoint - Single entry point for frontend to trigger complete agent workflow
Accepts {user_message} and returns the final ticket with full resolution
"""

import os
import logging
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from services.agent_orchestrator import AgentOrchestrator
from services.qdrant_ingestion_service import QdrantIngestionService

load_dotenv()

# Configure structured logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
LOG_FORMAT = os.getenv('LOG_FORMAT', 'json')

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'service': 'agent_orchestrator'
        }
        if hasattr(record, 'extra_data'):
            log_entry.update(record.extra_data)
        return json.dumps(log_entry)

# Setup logger
logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
if LOG_FORMAT == 'json':
    handler.setFormatter(JSONFormatter())
else:
    handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)
logger.setLevel(getattr(logging, LOG_LEVEL))

# Environment configuration
DATA_SERVICE_URL = os.getenv('DATA_SERVICE_URL', 'http://localhost:8000')
QDRANT_URL = os.getenv('QDRANT_URL', 'http://localhost:6333')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
AGENT_SERVICE_PORT = int(os.getenv('AGENT_SERVICE_PORT', '8001'))
MAX_VECTOR_COUNT_BEFORE_SHARD = int(os.getenv('MAX_VECTOR_COUNT_BEFORE_SHARD', '1000000'))

logger.info("Agent service starting", extra={'extra_data': {
    'data_service_url': DATA_SERVICE_URL,
    'qdrant_url': QDRANT_URL,
    'agent_service_port': AGENT_SERVICE_PORT
}})

# FastAPI app
app = FastAPI(
    title="Agent Workflow API",
    version="1.0.0",
    description="Single endpoint for complete agent workflow processing"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class AgentWorkflowRequest(BaseModel):
    user_message: str
    user_context: Optional[Dict[str, Any]] = None
    tenant_id: Optional[int] = 1
    user_id: Optional[str] = None
    team_id: Optional[int] = None

class AgentWorkflowResponse(BaseModel):
    success: bool
    ticket_id: Optional[int] = None
    ticket_title: str
    status: str
    category: str
    urgency: str
    resolution_steps: list
    resolution_steps_count: int
    confidence_score: float
    processing_time_ms: float
    created_at: str
    source: str
    error: Optional[str] = None

# Initialize services
orchestrator = None
qdrant_service = None

def initialize_services():
    """Initialize agent orchestrator and supporting services."""
    global orchestrator, qdrant_service
    
    try:
        # Initialize Qdrant service (optional)
        try:
            qdrant_service = QdrantIngestionService()
            logger.info("Qdrant service initialized successfully")
        except Exception as e:
            logger.warning(f"Qdrant service unavailable: {e}")
            qdrant_service = None
        
        # Initialize orchestrator with data service URL
        data_service_url = os.getenv("DATA_SERVICE_URL", "http://localhost:8000")
        orchestrator = AgentOrchestrator(
            data_service_url=data_service_url,
            qdrant_service=qdrant_service
        )
        
        logger.info("Agent orchestrator initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    initialize_services()

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Services not initialized")
    
    status = orchestrator.get_service_status()
    return {
        "status": "healthy",
        "timestamp": status["timestamp"],
        "services": status["services"]
    }

@app.post("/process", response_model=AgentWorkflowResponse)
async def process_support_request(request: AgentWorkflowRequest):
    """
    Main workflow endpoint - processes user message and returns complete ticket resolution.
    
    This endpoint:
    1. Processes user input through the agent orchestrator
    2. Searches for relevant instructions via Qdrant service
    3. Finds similar tickets via FastAPI data service
    4. Generates AI resolution using OpenAI LLM
    5. Creates ticket via FastAPI data service
    6. Returns formatted response with ticket details and resolution
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Agent orchestrator not available")
    
    try:
        # Prepare user context
        user_context = request.user_context or {}
        user_context.update({
            "tenant_id": request.tenant_id,
            "user_id": request.user_id,
            "team_id": request.team_id
        })
        
        # Process the support request through orchestrator
        start_time = time.time()
        request_id = f"req_{int(start_time * 1000)}"
        
        logger.info("Processing support request", extra={'extra_data': {
            'request_id': request_id,
            'message_preview': request.user_message[:50],
            'tenant_id': request.tenant_id,
            'user_id': request.user_id,
            'team_id': request.team_id
        }})
        
        # Check Qdrant collection size for monitoring
        try:
            if ingestion_service:
                collection_info = await ingestion_service.get_collection_info()
                if collection_info and collection_info.get('vectors_count', 0) > MAX_VECTOR_COUNT_BEFORE_SHARD:
                    logger.warning("Vector collection approaching shard threshold", extra={'extra_data': {
                        'collection_size': collection_info.get('vectors_count'),
                        'shard_threshold': MAX_VECTOR_COUNT_BEFORE_SHARD,
                        'recommendation': 'consider_sharding_or_upgrade'
                    }})
        except Exception as e:
            logger.warning(f"Failed to check collection size: {e}")
        
        result = orchestrator.process_support_request(
            user_message=request.user_message,
            user_context=user_context
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        logger.info("Support request processing completed", extra={'extra_data': {
            'request_id': request_id,
            'processing_time_ms': processing_time,
            'ticket_id': result.get('ticket_id'),
            'status': result.get('status'),
            'category': result.get('category'),
            'confidence_score': result.get('confidence_score')
        }})
        
        # Extract workflow metadata
        workflow_metadata = result.get("workflow_metadata", {})
        final_ticket = result.get("final_ticket", {})
        
        if not workflow_metadata.get("success"):
            # Workflow failed
            error_message = workflow_metadata.get("error", "Unknown workflow error")
            logger.error(f"Workflow failed: {error_message}")
            
            return AgentWorkflowResponse(
                success=False,
                ticket_id=None,
                ticket_title="Error Processing Request",
                status="error",
                category="technical_issue",
                urgency="medium",
                resolution_steps=["Please contact support for assistance with this issue."],
                resolution_steps_count=1,
                confidence_score=0.0,
                processing_time_ms=workflow_metadata.get("total_time_ms", 0),
                created_at=workflow_metadata.get("end_time", ""),
                source="agent_workflow_error",
                error=error_message
            )
        
        # Successful workflow
        logger.info(f"Workflow completed successfully in {workflow_metadata.get('total_time_ms', 0):.1f}ms")
        
        return AgentWorkflowResponse(
            success=True,
            ticket_id=final_ticket.get("ticket_id"),
            ticket_title=final_ticket.get("title", "Support Request"),
            status=final_ticket.get("status", "new"),
            category=final_ticket.get("category", "general"),
            urgency=final_ticket.get("urgency", "medium"),
            resolution_steps=final_ticket.get("resolution_steps", []),
            resolution_steps_count=final_ticket.get("resolution_steps_count", 0),
            confidence_score=final_ticket.get("confidence_score", 0.0),
            processing_time_ms=workflow_metadata.get("total_time_ms", 0),
            created_at=final_ticket.get("created_at", ""),
            source=final_ticket.get("source", "agent_workflow")
        )
        
    except Exception as e:
        logger.error(f"Error processing support request: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process support request: {str(e)}"
        )

@app.post("/classify")
async def classify_ticket(request: Dict[str, Any]):
    """
    Classify a ticket using the agent orchestrator (replacement for direct OpenAI calls).
    
    Expected request format:
    {
        "title": "ticket title",
        "description": "ticket description",
        "context": "optional context"
    }
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Agent orchestrator not available")
    
    try:
        title = request.get("title", "")
        description = request.get("description", "")
        context = request.get("context", "")
        
        if not title or not description:
            raise HTTPException(status_code=400, detail="Title and description are required")
        
        # Use orchestrator's input processing to classify
        user_context = {"tenant_id": request.get("tenant_id", 1)}
        normalized_input = orchestrator._process_user_input(f"{title}. {description}", user_context)
        
        # Return classification in format expected by Node.js code
        return {
            "category": normalized_input["category"],
            "complexity": "medium",  # Default complexity
            "assignedTo": "support",  # Default assignment
            "canAutoResolve": normalized_input["urgency"] == "low",
            "aiNotes": f"Classified as {normalized_input['category']} with {normalized_input['urgency']} urgency"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error classifying ticket: {e}")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")

@app.post("/auto-resolve")
async def auto_resolve_ticket(request: Dict[str, Any]):
    """
    Attempt to auto-resolve a ticket using the agent orchestrator (replacement for direct OpenAI calls).
    
    Expected request format:
    {
        "title": "ticket title",
        "description": "ticket description", 
        "previousMessages": [...],
        "context": "optional context"
    }
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Agent orchestrator not available")
    
    try:
        title = request.get("title", "")
        description = request.get("description", "")
        context = request.get("context", "")
        
        if not title or not description:
            raise HTTPException(status_code=400, detail="Title and description are required")
        
        # Use orchestrator to generate resolution
        user_message = f"{title}. {description}"
        user_context = {"tenant_id": request.get("tenant_id", 1)}
        
        # Process through orchestrator's workflow
        normalized_input = orchestrator._process_user_input(user_message, user_context)
        
        # Search for instructions and similar tickets
        instructions = orchestrator._search_instructions(normalized_input["normalized_query"])
        similar_tickets = orchestrator._search_similar_tickets(
            normalized_input["normalized_query"], 
            user_context.get("tenant_id")
        )
        
        # Generate LLM resolution
        llm_resolution = orchestrator._generate_llm_resolution(
            normalized_input, 
            instructions, 
            similar_tickets
        )
        
        if llm_resolution.get("success"):
            resolution_text = "\n".join(llm_resolution.get("resolution_steps", []))
            resolved = llm_resolution.get("confidence_score", 0) > 0.7
            
            return {
                "resolved": resolved,
                "response": resolution_text
            }
        else:
            return {
                "resolved": False,
                "response": "I apologize, but I'm unable to process your request right now. A support representative will assist you shortly."
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error auto-resolving ticket: {e}")
        raise HTTPException(status_code=500, detail=f"Auto-resolve failed: {str(e)}")

@app.post("/chat-response")
async def generate_chat_response(request: Dict[str, Any]):
    """
    Generate a chat response using the agent orchestrator (replacement for direct OpenAI calls).
    
    Expected request format:
    {
        "ticketContext": {...},
        "messageHistory": [...],
        "userMessage": "user message",
        "knowledgeContext": "optional context"
    }
    """
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Agent orchestrator not available")
    
    try:
        user_message = request.get("userMessage", "")
        ticket_context = request.get("ticketContext", {})
        
        if not user_message:
            raise HTTPException(status_code=400, detail="User message is required")
        
        # Use orchestrator to generate response
        user_context = {
            "tenant_id": ticket_context.get("tenantId", 1),
            "ticket_id": ticket_context.get("id")
        }
        
        # Process through orchestrator
        normalized_input = orchestrator._process_user_input(user_message, user_context)
        
        # Search for relevant instructions
        instructions = orchestrator._search_instructions(normalized_input["normalized_query"])
        
        # Generate contextual response
        if instructions.get("success") and instructions.get("results"):
            context_text = "\n".join([
                result.get("text", "")[:200] 
                for result in instructions["results"][:2]
            ])
            response = f"Based on our knowledge base:\n\n{context_text}\n\nIs this helpful for your question about: {user_message}?"
        else:
            response = f"I understand you're asking about: {user_message}. Let me help you with that. Could you provide more details so I can assist you better?"
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating chat response: {e}")
        raise HTTPException(status_code=500, detail=f"Chat response generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or default to 8001
    port = int(os.getenv("AGENT_PORT", "8001"))
    
    print(f"Starting Agent Workflow API on port {port}")
    print("Available endpoints:")
    print(f"  POST http://localhost:{port}/process - Main workflow endpoint")
    print(f"  POST http://localhost:{port}/classify - Ticket classification")
    print(f"  POST http://localhost:{port}/auto-resolve - Auto-resolve attempt")
    print(f"  POST http://localhost:{port}/chat-response - Chat response generation")
    print(f"  GET  http://localhost:{port}/health - Health check")
    
    uvicorn.run(app, host="0.0.0.0", port=port)