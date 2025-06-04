"""
FastAPI MCP service compatible with existing PostgreSQL schema.
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
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="MCP Ticket Service",
    description="Multi-agent customer support ticket management and similarity search",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
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

# Pydantic models (compatible with existing schema)
class TicketCreate(BaseModel):
    tenantId: int = 1
    teamId: Optional[int] = None
    createdBy: Optional[int] = None
    title: str
    description: str
    status: str = "new"
    category: str
    complexity: str = "medium"
    assignedTo: Optional[str] = None
    source: str = "chat"

class TicketResponse(BaseModel):
    id: int
    tenantId: int
    teamId: Optional[int]
    createdBy: Optional[int]
    title: str
    description: str
    status: str
    category: str
    complexity: Optional[str]
    assignedTo: Optional[str]
    source: Optional[str]
    createdAt: datetime
    updatedAt: datetime
    resolvedAt: Optional[datetime] = None
    aiResolved: Optional[bool]
    aiNotes: Optional[str]

class TicketWithResolution(TicketResponse):
    resolution: Optional[str] = None
    messages: Optional[List[Dict[str, Any]]] = None

class MessageCreate(BaseModel):
    ticketId: int
    sender: str
    content: str
    metadata: Optional[Dict[str, Any]] = None

class MessageResponse(BaseModel):
    id: int
    ticketId: int
    sender: str
    content: str
    metadata: Optional[Dict[str, Any]]
    createdAt: datetime
    updatedAt: datetime

class InstructionCreate(BaseModel):
    name: str
    title: str
    content: str
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    tenantId: int = 1

class InstructionResponse(BaseModel):
    id: int
    name: str
    title: str
    content: str
    category: Optional[str]
    tags: Optional[List[str]]
    tenantId: int
    createdAt: datetime

class SimilarTicketResult(BaseModel):
    ticket_id: int
    score: float
    title: str
    description: str
    resolution: Optional[str] = None
    category: str
    status: str

class InstructionSearchResult(BaseModel):
    filename: str
    score: float
    text_excerpt: str
    full_text: str

# Import services with error handling
try:
    from instruction_processor_local import InstructionProcessor
    instruction_processor = InstructionProcessor()
    INSTRUCTION_SEARCH_AVAILABLE = True
    logger.info("Instruction search service initialized")
except Exception as e:
    INSTRUCTION_SEARCH_AVAILABLE = False
    logger.warning(f"Instruction search not available: {e}")

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
            "instruction_search": INSTRUCTION_SEARCH_AVAILABLE,
            "openai_api": bool(os.getenv("OPENAI_API_KEY")),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

# Ticket endpoints (compatible with existing schema)
@app.post("/tickets/", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate):
    """Create a new ticket using existing schema."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO tickets ("tenantId", "teamId", "createdBy", title, description, 
                                       status, category, complexity, "assignedTo", source, "aiResolved")
                    VALUES (%(tenantId)s, %(teamId)s, %(createdBy)s, %(title)s, %(description)s,
                            %(status)s, %(category)s, %(complexity)s, %(assignedTo)s, %(source)s, false)
                    RETURNING *
                """, ticket.dict())
                
                result = cur.fetchone()
                conn.commit()
                
                logger.info(f"Created ticket {result['id']}: {result['title'][:50]}...")
                return TicketResponse(**dict(result))
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
                cur.execute('SELECT * FROM tickets WHERE id = %s', (ticket_id,))
                ticket = cur.fetchone()
                
                if not ticket:
                    raise HTTPException(status_code=404, detail="Ticket not found")
                
                # Get messages
                cur.execute("""
                    SELECT id, "ticketId", sender, content, metadata, "createdAt", "updatedAt"
                    FROM messages 
                    WHERE "ticketId" = %s 
                    ORDER BY "createdAt"
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
                    conditions.append('"tenantId" = %s')
                    params.append(tenant_id)
                
                if status:
                    conditions.append('status = %s')
                    params.append(status)
                
                if category:
                    conditions.append('category = %s')
                    params.append(category)
                
                where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
                params.extend([limit, offset])
                
                cur.execute(f"""
                    SELECT * FROM tickets 
                    {where_clause}
                    ORDER BY "createdAt" DESC 
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
                    SET status = 'resolved', "resolvedAt" = NOW(), "updatedAt" = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (ticket_id,))
                
                ticket = cur.fetchone()
                if not ticket:
                    raise HTTPException(status_code=404, detail="Ticket not found")
                
                # Add resolution message
                cur.execute("""
                    INSERT INTO messages ("ticketId", sender, content)
                    VALUES (%s, %s, %s)
                """, (ticket_id, resolved_by, resolution))
                
                conn.commit()
                logger.info(f"Resolved ticket {ticket_id}")
                
                return {"message": "Ticket resolved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Similarity search endpoints
@app.get("/tickets/similar/", response_model=List[SimilarTicketResult])
async def search_similar_tickets(
    query: str = Query(...),
    top_k: int = Query(5, le=20),
    tenant_id: Optional[int] = Query(None),
    min_score: float = Query(0.5)
):
    """Search for similar tickets (placeholder - requires vector service)."""
    # For now, return text-based search until vector service is fully configured
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                conditions = ["(title ILIKE %s OR description ILIKE %s)"]
                params = [f"%{query}%", f"%{query}%"]
                
                if tenant_id is not None:
                    conditions.append('"tenantId" = %s')
                    params.append(tenant_id)
                
                where_clause = "WHERE " + " AND ".join(conditions)
                params.append(top_k)
                
                cur.execute(f"""
                    SELECT id, title, description, category, status,
                           CASE 
                               WHEN title ILIKE %s THEN 0.9
                               WHEN description ILIKE %s THEN 0.7
                               ELSE 0.5
                           END as score
                    FROM tickets 
                    {where_clause}
                    ORDER BY score DESC
                    LIMIT %s
                """, [f"%{query}%", f"%{query}%"] + params)
                
                results = []
                for row in cur.fetchall():
                    result = SimilarTicketResult(
                        ticket_id=row['id'],
                        score=float(row['score']),
                        title=row['title'],
                        description=row['description'],
                        category=row['category'],
                        status=row['status'],
                        resolution=None  # Would need to fetch from messages
                    )
                    results.append(result)
                
                return results
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
                        "tenantId" INTEGER NOT NULL DEFAULT 1,
                        name VARCHAR NOT NULL UNIQUE,
                        title VARCHAR NOT NULL,
                        content TEXT NOT NULL,
                        category VARCHAR,
                        tags JSONB,
                        active BOOLEAN DEFAULT true,
                        priority INTEGER DEFAULT 10,
                        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                    )
                """)
                
                cur.execute("""
                    INSERT INTO instructions ("tenantId", name, title, content, category, tags)
                    VALUES (%(tenantId)s, %(name)s, %(title)s, %(content)s, %(category)s, %(tags)s)
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
                
                logger.info(f"Created instruction: {instruction.name}")
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
                    conditions.append('"tenantId" = %s')
                    params.append(tenant_id)
                
                if category:
                    conditions.append('category = %s')
                    params.append(category)
                
                if active_only:
                    conditions.append('active = true')
                
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

@app.get("/instructions/search/", response_model=List[InstructionSearchResult])
async def search_instructions(
    query: str = Query(...),
    top_k: int = Query(3, le=10)
):
    """Search instruction documents using semantic similarity."""
    if not INSTRUCTION_SEARCH_AVAILABLE:
        raise HTTPException(status_code=503, detail="Instruction search service not available")
    
    try:
        results = instruction_processor.search_instructions(query, top_k)
        
        search_results = []
        for result in results:
            search_result = InstructionSearchResult(
                filename=result['filename'],
                score=result['score'],
                text_excerpt=result['text_excerpt'],
                full_text=result['full_text']
            )
            search_results.append(search_result)
        
        logger.info(f"Found {len(search_results)} instruction results for: {query[:50]}...")
        return search_results
    except Exception as e:
        logger.error(f"Error searching instructions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/instructions/by-name/{name}", response_model=InstructionResponse)
async def get_instruction_by_name(name: str):
    """Get an instruction template by name."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute('SELECT * FROM instructions WHERE name = %s', (name,))
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

# Message endpoints
@app.post("/messages/", response_model=MessageResponse)
async def create_message(message: MessageCreate):
    """Add a message to a ticket."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Verify ticket exists
                cur.execute('SELECT id FROM tickets WHERE id = %s', (message.ticketId,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Ticket not found")
                
                # Create message
                cur.execute("""
                    INSERT INTO messages ("ticketId", sender, content, metadata)
                    VALUES (%s, %s, %s, %s)
                    RETURNING *
                """, (message.ticketId, message.sender, message.content, 
                     json.dumps(message.metadata) if message.metadata else None))
                
                result = cur.fetchone()
                
                # Update ticket timestamp
                cur.execute("""
                    UPDATE tickets SET "updatedAt" = NOW() WHERE id = %s
                """, (message.ticketId,))
                
                conn.commit()
                
                # Parse metadata back
                result_dict = dict(result)
                if result_dict['metadata']:
                    result_dict['metadata'] = json.loads(result_dict['metadata'])
                
                logger.info(f"Added message to ticket {message.ticketId}")
                return MessageResponse(**result_dict)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tickets/{ticket_id}/messages", response_model=List[MessageResponse])
async def get_ticket_messages(ticket_id: int):
    """Get all messages for a ticket."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Verify ticket exists
                cur.execute('SELECT id FROM tickets WHERE id = %s', (ticket_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Ticket not found")
                
                cur.execute("""
                    SELECT * FROM messages 
                    WHERE "ticketId" = %s 
                    ORDER BY "createdAt"
                """, (ticket_id,))
                
                messages = cur.fetchall()
                
                # Parse metadata for each message
                result = []
                for msg in messages:
                    msg_dict = dict(msg)
                    if msg_dict['metadata']:
                        msg_dict['metadata'] = json.loads(msg_dict['metadata'])
                    result.append(MessageResponse(**msg_dict))
                
                return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting messages for ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Utility endpoints
@app.get("/stats/")
async def get_system_stats():
    """Get system statistics."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Get ticket counts by status
                cur.execute("""
                    SELECT status, COUNT(*) as count 
                    FROM tickets 
                    GROUP BY status
                """)
                status_counts = {row['status']: row['count'] for row in cur.fetchall()}
                
                # Get total counts
                cur.execute("SELECT COUNT(*) as count FROM tickets")
                total_tickets = cur.fetchone()['count']
                
                cur.execute("SELECT COUNT(*) as count FROM messages")
                total_messages = cur.fetchone()['count']
                
                # Get instruction stats if table exists
                instruction_count = 0
                try:
                    cur.execute("SELECT COUNT(*) as count FROM instructions")
                    instruction_count = cur.fetchone()['count']
                except:
                    pass
                
                return {
                    "tickets": {
                        "total": total_tickets,
                        "by_status": status_counts
                    },
                    "messages": {
                        "total": total_messages
                    },
                    "instructions": {
                        "total": instruction_count
                    },
                    "services": {
                        "instruction_search": INSTRUCTION_SEARCH_AVAILABLE,
                        "openai_embeddings": bool(os.getenv("OPENAI_API_KEY"))
                    }
                }
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)