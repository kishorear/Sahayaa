"""
FastAPI MCP (Model Context Protocol) service for ticket management and similarity search.
Provides endpoints for ticket CRUD, instruction templates, and vector similarity search.
"""

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime

from .database import get_db, init_database, test_connection
from .models import (
    Ticket, Message, Instruction, TicketEmbedding,
    TicketCreate, TicketResponse, TicketWithResolution,
    InstructionCreate, InstructionResponse,
    MessageCreate, MessageResponse,
    SimilarTicketResult, SimilaritySearchRequest
)
from .embedding_service import embedding_service
from .vector_storage import vector_storage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="MCP Ticket Service",
    description="Multi-agent customer support ticket management and similarity search service",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure as needed for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup."""
    logger.info("Starting MCP service...")
    
    # Test database connection
    if not test_connection():
        raise RuntimeError("Database connection failed")
    
    # Initialize database tables
    init_database()
    
    # Log service status
    embedding_info = embedding_service.get_provider_info()
    vector_info = vector_storage.get_collection_info()
    
    logger.info(f"Embedding service: {embedding_info}")
    logger.info(f"Vector storage: {vector_info}")
    logger.info("MCP service started successfully")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "embedding_service": embedding_service.get_provider_info(),
        "vector_storage": vector_storage.get_collection_info(),
        "timestamp": datetime.utcnow().isoformat()
    }

# Ticket endpoints

@app.post("/tickets/", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    """Create a new ticket."""
    try:
        db_ticket = Ticket(**ticket.dict())
        db.add(db_ticket)
        db.commit()
        db.refresh(db_ticket)
        
        # Generate and store embedding for the ticket
        await _update_ticket_embedding(db_ticket, db)
        
        logger.info(f"Created ticket {db_ticket.id}")
        return db_ticket
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tickets/{ticket_id}", response_model=TicketWithResolution)
async def get_ticket(ticket_id: int, db: Session = Depends(get_db)):
    """Get a specific ticket with its messages."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Get messages for this ticket
    messages = db.query(Message).filter(Message.ticket_id == ticket_id).order_by(Message.created_at).all()
    
    # Find resolution message (typically from support or ai)
    resolution = None
    for msg in messages:
        if msg.sender in ["support", "ai", "resolution"] and ticket.status == "resolved":
            resolution = msg.content
            break
    
    # Convert to response model
    ticket_dict = ticket.__dict__.copy()
    ticket_dict.update({
        "resolution": resolution,
        "messages": [msg.__dict__ for msg in messages]
    })
    
    return TicketWithResolution(**ticket_dict)

@app.get("/tickets/", response_model=List[TicketResponse])
async def list_tickets(
    tenant_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List tickets with optional filtering."""
    query = db.query(Ticket)
    
    # Apply filters
    if tenant_id is not None:
        query = query.filter(Ticket.tenant_id == tenant_id)
    if status:
        query = query.filter(Ticket.status == status)
    if category:
        query = query.filter(Ticket.category == category)
    
    # Apply pagination and ordering
    tickets = query.order_by(desc(Ticket.created_at)).offset(offset).limit(limit).all()
    return tickets

@app.put("/tickets/{ticket_id}/resolve")
async def resolve_ticket(
    ticket_id: int, 
    resolution: str,
    resolved_by: str = "support",
    db: Session = Depends(get_db)
):
    """Resolve a ticket with a resolution message."""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    try:
        # Update ticket status
        ticket.status = "resolved"
        ticket.resolved_at = datetime.utcnow()
        
        # Add resolution message
        resolution_msg = Message(
            ticket_id=ticket_id,
            sender=resolved_by,
            content=resolution
        )
        db.add(resolution_msg)
        
        db.commit()
        
        # Update embedding with resolution
        await _update_ticket_embedding(ticket, db)
        
        logger.info(f"Resolved ticket {ticket_id}")
        return {"message": "Ticket resolved successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error resolving ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Similarity search endpoint

@app.get("/tickets/similar/", response_model=List[SimilarTicketResult])
async def search_similar_tickets(
    query: str = Query(..., description="Search query"),
    top_k: int = Query(5, le=20, description="Number of results to return"),
    tenant_id: Optional[int] = Query(None, description="Filter by tenant ID"),
    min_score: float = Query(0.5, description="Minimum similarity score"),
    db: Session = Depends(get_db)
):
    """Search for similar tickets using vector similarity."""
    try:
        # Generate embedding for the query
        query_embedding = embedding_service.embed_text(query)
        
        # Search for similar tickets
        similar_tickets = vector_storage.search_similar_tickets(
            query_embedding=query_embedding,
            top_k=top_k,
            min_score=min_score,
            tenant_id=tenant_id
        )
        
        logger.info(f"Found {len(similar_tickets)} similar tickets for query: {query[:50]}...")
        return similar_tickets
    except Exception as e:
        logger.error(f"Error searching similar tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Instruction endpoints

@app.post("/instructions/", response_model=InstructionResponse)
async def create_instruction(instruction: InstructionCreate, db: Session = Depends(get_db)):
    """Create a new instruction template."""
    try:
        db_instruction = Instruction(**instruction.dict())
        db.add(db_instruction)
        db.commit()
        db.refresh(db_instruction)
        
        logger.info(f"Created instruction '{db_instruction.name}'")
        return db_instruction
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating instruction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/instructions/", response_model=List[InstructionResponse])
async def list_instructions(
    tenant_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """List instruction templates."""
    query = db.query(Instruction)
    
    # Apply filters
    if tenant_id is not None:
        query = query.filter(Instruction.tenant_id == tenant_id)
    if category:
        query = query.filter(Instruction.category == category)
    if active_only:
        query = query.filter(Instruction.active == True)
    
    instructions = query.order_by(Instruction.priority, Instruction.name).all()
    return instructions

@app.get("/instructions/{instruction_id}", response_model=InstructionResponse)
async def get_instruction(instruction_id: int, db: Session = Depends(get_db)):
    """Get a specific instruction template."""
    instruction = db.query(Instruction).filter(Instruction.id == instruction_id).first()
    if not instruction:
        raise HTTPException(status_code=404, detail="Instruction not found")
    return instruction

@app.get("/instructions/by-name/{name}", response_model=InstructionResponse)
async def get_instruction_by_name(name: str, db: Session = Depends(get_db)):
    """Get an instruction template by name."""
    instruction = db.query(Instruction).filter(Instruction.name == name).first()
    if not instruction:
        raise HTTPException(status_code=404, detail="Instruction not found")
    return instruction

# Message endpoints

@app.post("/messages/", response_model=MessageResponse)
async def create_message(message: MessageCreate, db: Session = Depends(get_db)):
    """Add a message to a ticket."""
    # Verify ticket exists
    ticket = db.query(Ticket).filter(Ticket.id == message.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    try:
        db_message = Message(**message.dict())
        db.add(db_message)
        
        # Update ticket's updated_at timestamp
        ticket.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_message)
        
        # Update ticket embedding if this is a resolution
        if message.sender in ["support", "ai", "resolution"]:
            await _update_ticket_embedding(ticket, db)
        
        logger.info(f"Added message to ticket {message.ticket_id}")
        return db_message
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tickets/{ticket_id}/messages", response_model=List[MessageResponse])
async def get_ticket_messages(ticket_id: int, db: Session = Depends(get_db)):
    """Get all messages for a ticket."""
    # Verify ticket exists
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    messages = db.query(Message).filter(Message.ticket_id == ticket_id).order_by(Message.created_at).all()
    return messages

# Helper functions

async def _update_ticket_embedding(ticket: Ticket, db: Session):
    """Update or create embedding for a ticket."""
    try:
        # Get all messages for context
        messages = db.query(Message).filter(Message.ticket_id == ticket.id).order_by(Message.created_at).all()
        
        # Build text for embedding (title + description + resolution if available)
        text_parts = [ticket.title, ticket.description]
        
        # Add resolution from messages
        resolution_text = None
        for msg in messages:
            if msg.sender in ["support", "ai", "resolution"] and ticket.status == "resolved":
                resolution_text = msg.content
                text_parts.append(f"Resolution: {msg.content}")
                break
        
        full_text = " ".join(text_parts)
        
        # Generate embedding
        embedding = embedding_service.embed_text(full_text)
        
        # Prepare metadata for vector storage
        metadata = {
            "tenant_id": ticket.tenant_id,
            "title": ticket.title,
            "description": ticket.description,
            "category": ticket.category,
            "status": ticket.status,
            "resolution": resolution_text
        }
        
        # Store in vector database
        vector_storage.store_ticket_embedding(ticket.id, embedding, metadata)
        
        # Store embedding info in database for tracking
        existing_embedding = db.query(TicketEmbedding).filter(TicketEmbedding.ticket_id == ticket.id).first()
        if existing_embedding:
            existing_embedding.embedding_vector = embedding
            existing_embedding.updated_at = datetime.utcnow()
        else:
            db_embedding = TicketEmbedding(
                ticket_id=ticket.id,
                embedding_vector=embedding
            )
            db.add(db_embedding)
        
        db.commit()
        logger.debug(f"Updated embedding for ticket {ticket.id}")
        
    except Exception as e:
        logger.error(f"Error updating embedding for ticket {ticket.id}: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)