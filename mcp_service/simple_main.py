"""
FastAPI MCP service that works with existing PostgreSQL schema.
Provides ticket CRUD, instruction templates, and vector similarity search.
"""

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import psycopg2
import psycopg2.extras
import os
import logging
from datetime import datetime
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="MCP Ticket Service",
    description="Multi-agent customer support ticket management and similarity search",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable required")

def get_db_connection():
    """Get database connection."""
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)

# Pydantic models
class TicketCreate(BaseModel):
    tenant_id: int = 1
    team_id: Optional[int] = None
    created_by: Optional[int] = None
    title: str
    description: str
    status: str = "new"
    category: str
    complexity: str = "medium"
    assigned_to: Optional[str] = None
    source: str = "chat"

class TicketResponse(BaseModel):
    id: int
    tenant_id: int
    title: str
    description: str
    status: str
    category: str
    complexity: str
    source: str
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    ai_resolved: bool

class TicketWithResolution(TicketResponse):
    resolution: Optional[str] = None
    messages: Optional[List[Dict[str, Any]]] = None

class InstructionCreate(BaseModel):
    name: str
    title: str
    content: str
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    tenant_id: int = 1

class InstructionResponse(BaseModel):
    id: int
    name: str
    title: str
    content: str
    category: Optional[str]
    tags: Optional[List[str]]
    tenant_id: int
    created_at: datetime

class SimilarTicketResult(BaseModel):
    ticket_id: int
    score: float
    title: str
    description: str
    resolution: Optional[str] = None
    category: str
    status: str

# Import embedding and vector services
try:
    from .embedding_service import embedding_service
    from .vector_storage import vector_storage
    EMBEDDING_AVAILABLE = True
except ImportError:
    EMBEDDING_AVAILABLE = False
    logger.warning("Embedding services not available")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        
        return {
            "status": "healthy",
            "database": "connected",
            "embedding_service": EMBEDDING_AVAILABLE,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.post("/tickets/", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate):
    """Create a new ticket."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO tickets (tenant_id, team_id, created_by, title, description, 
                                       status, category, complexity, assigned_to, source, ai_resolved)
                    VALUES (%(tenant_id)s, %(team_id)s, %(created_by)s, %(title)s, %(description)s,
                            %(status)s, %(category)s, %(complexity)s, %(assigned_to)s, %(source)s, false)
                    RETURNING *
                """, ticket.dict())
                
                result = cur.fetchone()
                conn.commit()
                
                # Generate embedding if available
                if EMBEDDING_AVAILABLE:
                    await _update_ticket_embedding(result['id'], result)
                
                return TicketResponse(**result)
    except Exception as e:
        logger.error(f"Error creating ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tickets/{ticket_id}", response_model=TicketWithResolution)
async def get_ticket(ticket_id: int):
    """Get a specific ticket with messages."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get ticket
                cur.execute("SELECT * FROM tickets WHERE id = %s", (ticket_id,))
                ticket = cur.fetchone()
                
                if not ticket:
                    raise HTTPException(status_code=404, detail="Ticket not found")
                
                # Get messages
                cur.execute("""
                    SELECT id, ticket_id, sender, content, created_at, updated_at
                    FROM messages 
                    WHERE ticket_id = %s 
                    ORDER BY created_at
                """, (ticket_id,))
                messages = cur.fetchall()
                
                # Find resolution
                resolution = None
                for msg in messages:
                    if msg['sender'] in ['support', 'ai', 'resolution'] and ticket['status'] == 'resolved':
                        resolution = msg['content']
                        break
                
                ticket_dict = dict(ticket)
                ticket_dict.update({
                    'resolution': resolution,
                    'messages': [dict(msg) for msg in messages]
                })
                
                return TicketWithResolution(**ticket_dict)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tickets/", response_model=List[TicketResponse])
async def list_tickets(
    tenant_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """List tickets with optional filtering."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                conditions = []
                params = []
                
                if tenant_id is not None:
                    conditions.append("tenant_id = %s")
                    params.append(tenant_id)
                
                if status:
                    conditions.append("status = %s")
                    params.append(status)
                
                if category:
                    conditions.append("category = %s")
                    params.append(category)
                
                where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
                params.extend([limit, offset])
                
                cur.execute(f"""
                    SELECT * FROM tickets 
                    {where_clause}
                    ORDER BY created_at DESC 
                    LIMIT %s OFFSET %s
                """, params)
                
                tickets = cur.fetchall()
                return [TicketResponse(**dict(ticket)) for ticket in tickets]
    except Exception as e:
        logger.error(f"Error listing tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/tickets/{ticket_id}/resolve")
async def resolve_ticket(ticket_id: int, resolution: str, resolved_by: str = "support"):
    """Resolve a ticket with a resolution message."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Update ticket
                cur.execute("""
                    UPDATE tickets 
                    SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (ticket_id,))
                
                ticket = cur.fetchone()
                if not ticket:
                    raise HTTPException(status_code=404, detail="Ticket not found")
                
                # Add resolution message
                cur.execute("""
                    INSERT INTO messages (ticket_id, sender, content)
                    VALUES (%s, %s, %s)
                """, (ticket_id, resolved_by, resolution))
                
                conn.commit()
                
                # Update embedding if available
                if EMBEDDING_AVAILABLE:
                    await _update_ticket_embedding(ticket_id, ticket)
                
                return {"message": "Ticket resolved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tickets/similar/", response_model=List[SimilarTicketResult])
async def search_similar_tickets(
    query: str = Query(...),
    top_k: int = Query(5, le=20),
    tenant_id: Optional[int] = Query(None),
    min_score: float = Query(0.5)
):
    """Search for similar tickets using vector similarity."""
    if not EMBEDDING_AVAILABLE:
        raise HTTPException(status_code=503, detail="Embedding service not available")
    
    try:
        # Generate embedding for query
        query_embedding = embedding_service.embed_text(query)
        
        # Search for similar tickets
        similar_tickets = vector_storage.search_similar_tickets(
            query_embedding=query_embedding,
            top_k=top_k,
            min_score=min_score,
            tenant_id=tenant_id
        )
        
        return similar_tickets
    except Exception as e:
        logger.error(f"Error searching similar tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Instruction endpoints
@app.post("/instructions/", response_model=InstructionResponse)
async def create_instruction(instruction: InstructionCreate):
    """Create a new instruction template."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Create instructions table if it doesn't exist
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS instructions (
                        id SERIAL PRIMARY KEY,
                        tenant_id INTEGER NOT NULL DEFAULT 1,
                        name VARCHAR NOT NULL UNIQUE,
                        title VARCHAR NOT NULL,
                        content TEXT NOT NULL,
                        category VARCHAR,
                        tags JSONB,
                        active BOOLEAN DEFAULT true,
                        priority INTEGER DEFAULT 10,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
                
                cur.execute("""
                    INSERT INTO instructions (tenant_id, name, title, content, category, tags)
                    VALUES (%(tenant_id)s, %(name)s, %(title)s, %(content)s, %(category)s, %(tags)s)
                    RETURNING *
                """, {
                    **instruction.dict(),
                    'tags': json.dumps(instruction.tags) if instruction.tags else None
                })
                
                result = cur.fetchone()
                conn.commit()
                
                # Parse tags back to list
                if result['tags']:
                    result = dict(result)
                    result['tags'] = json.loads(result['tags'])
                
                return InstructionResponse(**result)
    except Exception as e:
        logger.error(f"Error creating instruction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/instructions/", response_model=List[InstructionResponse])
async def list_instructions(
    tenant_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    active_only: bool = Query(True)
):
    """List instruction templates."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                conditions = []
                params = []
                
                if tenant_id is not None:
                    conditions.append("tenant_id = %s")
                    params.append(tenant_id)
                
                if category:
                    conditions.append("category = %s")
                    params.append(category)
                
                if active_only:
                    conditions.append("active = true")
                
                where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
                
                cur.execute(f"""
                    SELECT * FROM instructions 
                    {where_clause}
                    ORDER BY priority, name
                """, params)
                
                instructions = cur.fetchall()
                
                # Parse tags for each instruction
                result = []
                for instruction in instructions:
                    instruction_dict = dict(instruction)
                    if instruction_dict['tags']:
                        instruction_dict['tags'] = json.loads(instruction_dict['tags'])
                    result.append(InstructionResponse(**instruction_dict))
                
                return result
    except Exception as e:
        logger.error(f"Error listing instructions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/instructions/by-name/{name}", response_model=InstructionResponse)
async def get_instruction_by_name(name: str):
    """Get an instruction template by name."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM instructions WHERE name = %s", (name,))
                instruction = cur.fetchone()
                
                if not instruction:
                    raise HTTPException(status_code=404, detail="Instruction not found")
                
                instruction_dict = dict(instruction)
                if instruction_dict['tags']:
                    instruction_dict['tags'] = json.loads(instruction_dict['tags'])
                
                return InstructionResponse(**instruction_dict)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting instruction {name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper function for embeddings
async def _update_ticket_embedding(ticket_id: int, ticket_data: dict):
    """Update or create embedding for a ticket."""
    if not EMBEDDING_AVAILABLE:
        return
    
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get messages for context
                cur.execute("""
                    SELECT content, sender FROM messages 
                    WHERE ticket_id = %s 
                    ORDER BY created_at
                """, (ticket_id,))
                messages = cur.fetchall()
                
                # Build text for embedding
                text_parts = [ticket_data['title'], ticket_data['description']]
                
                # Add resolution if available
                resolution_text = None
                for msg in messages:
                    if msg['sender'] in ['support', 'ai', 'resolution'] and ticket_data['status'] == 'resolved':
                        resolution_text = msg['content']
                        text_parts.append(f"Resolution: {msg['content']}")
                        break
                
                full_text = " ".join(text_parts)
                
                # Generate embedding
                embedding = embedding_service.embed_text(full_text)
                
                # Prepare metadata
                metadata = {
                    "tenant_id": ticket_data['tenant_id'],
                    "title": ticket_data['title'],
                    "description": ticket_data['description'],
                    "category": ticket_data['category'],
                    "status": ticket_data['status'],
                    "resolution": resolution_text
                }
                
                # Store in vector database
                vector_storage.store_ticket_embedding(ticket_id, embedding, metadata)
                
    except Exception as e:
        logger.error(f"Error updating embedding for ticket {ticket_id}: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)