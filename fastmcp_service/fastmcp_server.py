"""
FastMCP Server for AI Agent Communication
Provides MCP endpoints for document ingestion, similarity search, and agent coordination.
"""

import os
import logging
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from tenacity import retry, stop_after_attempt, wait_exponential

try:
    from .simple_vector_storage import vector_storage
    from .pii_handler import PIIHandler
    from .metrics_collector import MetricsCollector
except ImportError:
    # Handle relative imports when running as module
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from simple_vector_storage import vector_storage
    from pii_handler import PIIHandler
    from metrics_collector import MetricsCollector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models
class DocumentRequest(BaseModel):
    id: str
    content: str
    metadata: Optional[Dict[str, Any]] = None

class SearchRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    filter_metadata: Optional[Dict[str, Any]] = None

class IngestionRequest(BaseModel):
    documents: List[DocumentRequest]
    tenant_id: Optional[int] = 1

class AgentRequest(BaseModel):
    agent_type: str
    query: str
    context: Optional[Dict[str, Any]] = None
    tenant_id: Optional[int] = 1

# Create FastAPI app
app = FastAPI(
    title="FastMCP Service",
    description="Model Context Protocol service for AI agent communication",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
pii_handler = PIIHandler()
metrics = MetricsCollector()

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting FastMCP service...")
    
    # Initialize vector storage
    if not await vector_storage.initialize():
        raise RuntimeError("Failed to initialize vector storage")
    
    logger.info("FastMCP service started successfully")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return await vector_storage.health_check()

@app.get("/metrics")
async def get_metrics():
    """Get service metrics."""
    return metrics.get_metrics()

@app.post("/documents/ingest")
async def ingest_documents(request: IngestionRequest, background_tasks: BackgroundTasks):
    """Ingest documents for vector storage."""
    try:
        # Start metrics tracking
        start_time = datetime.utcnow()
        
        # Process documents
        results = []
        for doc in request.documents:
            # Clean PII from content
            cleaned_content = pii_handler.clean_pii(doc.content)
            
            # Add tenant_id to metadata
            doc_metadata = doc.metadata or {}
            doc_metadata["tenant_id"] = request.tenant_id
            
            # Add document to vector storage
            success = await vector_storage.add_document(
                doc_id=doc.id,
                content=cleaned_content,
                metadata=doc_metadata
            )
            
            results.append({
                "id": doc.id,
                "success": success,
                "pii_cleaned": cleaned_content != doc.content
            })
        
        # Schedule pruning in background
        background_tasks.add_task(_prune_if_needed)
        
        # Record metrics
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        metrics.record_ingestion(len(request.documents), processing_time)
        
        return {
            "success": True,
            "documents_processed": len(results),
            "results": results,
            "processing_time_seconds": round(processing_time, 3)
        }
        
    except Exception as e:
        logger.error(f"Failed to ingest documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/documents/search")
async def search_documents(request: SearchRequest):
    """Search for similar documents."""
    try:
        start_time = datetime.utcnow()
        
        # Clean PII from query
        cleaned_query = pii_handler.clean_pii(request.query)
        
        # Validate query
        if not pii_handler.validate_prompt(cleaned_query):
            raise HTTPException(status_code=400, detail="Invalid query content")
        
        # Search vector storage
        results = await vector_storage.search_similar(
            query=cleaned_query,
            top_k=request.top_k,
            filter_metadata=request.filter_metadata
        )
        
        # Record metrics
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        metrics.record_search(len(results), processing_time)
        
        return {
            "success": True,
            "query": cleaned_query,
            "results": results,
            "count": len(results),
            "processing_time_seconds": round(processing_time, 3)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to search documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agents/process")
async def process_agent_request(request: AgentRequest):
    """Process request through agent system."""
    try:
        start_time = datetime.utcnow()
        
        # Clean PII from query
        cleaned_query = pii_handler.clean_pii(request.query)
        
        # Validate query
        if not pii_handler.validate_prompt(cleaned_query):
            raise HTTPException(status_code=400, detail="Invalid query content")
        
        # Route to appropriate agent
        result = await _route_to_agent(request.agent_type, cleaned_query, request.context)
        
        # Record metrics
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        metrics.record_agent_request(request.agent_type, processing_time)
        
        return {
            "success": True,
            "agent_type": request.agent_type,
            "query": cleaned_query,
            "result": result,
            "processing_time_seconds": round(processing_time, 3)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process agent request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats():
    """Get vector storage statistics."""
    try:
        stats = await vector_storage.get_collection_stats()
        return {
            "success": True,
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _route_to_agent(agent_type: str, query: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Route request to appropriate agent."""
    
    if agent_type == "instruction_lookup":
        return await _instruction_lookup_agent(query, context)
    elif agent_type == "ticket_lookup":
        return await _ticket_lookup_agent(query, context)
    elif agent_type == "chat_processor":
        return await _chat_processor_agent(query, context)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown agent type: {agent_type}")

async def _instruction_lookup_agent(query: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Instruction lookup agent."""
    filter_metadata = {"type": "instruction", "tenant_id": context.get("tenant_id", 1)}
    
    results = await vector_storage.search_similar(
        query=query,
        top_k=5,
        filter_metadata=filter_metadata
    )
    
    return {
        "agent": "instruction_lookup",
        "instructions_found": len(results),
        "top_instructions": results[:3],  # Return top 3
        "confidence": results[0]["similarity"] if results else 0
    }

async def _ticket_lookup_agent(query: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Ticket lookup agent."""
    filter_metadata = {"type": "ticket", "tenant_id": context.get("tenant_id", 1)}
    
    results = await vector_storage.search_similar(
        query=query,
        top_k=5,
        filter_metadata=filter_metadata
    )
    
    return {
        "agent": "ticket_lookup",
        "similar_tickets": results,
        "count": len(results),
        "best_match_similarity": results[0]["similarity"] if results else 0
    }

async def _chat_processor_agent(query: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Chat processor agent."""
    # Simple processing for now
    words = query.split()
    
    return {
        "agent": "chat_processor",
        "normalized_query": query.lower().strip(),
        "word_count": len(words),
        "detected_intent": "support_request",  # Simple classification
        "urgency": "medium",  # Simple classification
        "category": "general"  # Simple classification
    }

async def _prune_if_needed():
    """Background task to prune vectors if storage is getting full."""
    try:
        stats = await vector_storage.get_collection_stats()
        if stats.get("storage_usage_percent", 0) > 80:  # Prune at 80% capacity
            await vector_storage._prune_old_vectors(target_count=3000)
            logger.info("Vector storage pruned due to size limit")
    except Exception as e:
        logger.error(f"Failed to prune vectors: {e}")

if __name__ == "__main__":
    uvicorn.run(
        "fastmcp_service.fastmcp_server:app",
        host="0.0.0.0",
        port=8001,
        reload=False,
        log_level="info"
    )