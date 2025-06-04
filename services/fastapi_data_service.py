"""
FastAPI Data Service - Pure data storage and JSON API responses
Single responsibility: Store/retrieve data, return JSON only
No business logic, orchestration, or external service calls
"""

import os
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Data Service API", 
    version="1.0.0",
    description="Pure data storage and JSON API responses - no business logic"
)

# Add CORS middleware
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
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)

# Pydantic models for JSON serialization
class TicketCreate(BaseModel):
    title: str
    description: str
    category: Optional[str] = "general"
    tenantId: int
    status: Optional[str] = "new"
    priority: Optional[str] = "medium"
    source: Optional[str] = "api"
    complexity: Optional[str] = "medium"
    assignedTo: Optional[str] = None
    createdBy: Optional[int] = None
    teamId: Optional[int] = None

class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignedTo: Optional[str] = None
    resolution: Optional[str] = None

class TicketResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    tenantId: int
    status: str
    priority: str
    source: str
    complexity: str
    assignedTo: Optional[str] = None
    createdBy: Optional[int] = None
    teamId: Optional[int] = None
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    resolution: Optional[str] = None
    resolvedAt: Optional[datetime] = None

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
    metadata: Optional[Dict[str, Any]] = None
    createdAt: datetime

class InstructionCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = "general"
    tags: Optional[List[str]] = None

class InstructionResponse(BaseModel):
    id: int
    title: str
    content: str
    category: str
    tags: List[str]
    createdAt: datetime
    updatedAt: Optional[datetime] = None

# Health check response
class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str
    database: str

# API endpoints - Pure data operations only

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint - tests database connectivity only."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        
        return HealthResponse(
            status="healthy",
            service="Data Service API",
            timestamp=datetime.utcnow().isoformat(),
            database="connected"
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

# Ticket CRUD endpoints

@app.post("/tickets/", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate):
    """Create a new ticket - pure data operation."""
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

@app.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: int):
    """Get a single ticket by ID."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM tickets WHERE id = %s", (ticket_id,))
                result = cur.fetchone()
                
                if not result:
                    raise HTTPException(status_code=404, detail="Ticket not found")
                
                return TicketResponse(**dict(result))
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tickets/", response_model=List[TicketResponse])
async def list_tickets(
    tenant_id: Optional[int] = Query(None, description="Filter by tenant ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    category: Optional[str] = Query(None, description="Filter by category"),
    assigned_to: Optional[str] = Query(None, description="Filter by assigned user"),
    limit: int = Query(100, le=1000, description="Maximum number of tickets to return"),
    offset: int = Query(0, ge=0, description="Number of tickets to skip")
):
    """List tickets with optional filtering."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build query with filters
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
                
                if assigned_to:
                    conditions.append('"assignedTo" = %s')
                    params.append(assigned_to)
                
                where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
                
                query = f"""
                    SELECT * FROM tickets
                    {where_clause}
                    ORDER BY "createdAt" DESC
                    LIMIT %s OFFSET %s
                """
                params.extend([limit, offset])
                
                cur.execute(query, params)
                results = cur.fetchall()
                
                return [TicketResponse(**dict(row)) for row in results]
                
    except Exception as e:
        logger.error(f"Error listing tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(ticket_id: int, ticket_update: TicketUpdate):
    """Update a ticket - pure data operation."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build update query dynamically
                update_fields = []
                params = []
                
                for field, value in ticket_update.dict(exclude_unset=True).items():
                    if value is not None:
                        # Handle camelCase to snake_case for database columns
                        if field == "assignedTo":
                            field = '"assignedTo"'
                        update_fields.append(f"{field} = %s")
                        params.append(value)
                
                if not update_fields:
                    raise HTTPException(status_code=400, detail="No fields to update")
                
                # Add timestamp update
                update_fields.append('"updatedAt" = CURRENT_TIMESTAMP')
                
                # If resolving, set resolved timestamp
                if ticket_update.status == "resolved" and ticket_update.resolution:
                    update_fields.append('"resolvedAt" = CURRENT_TIMESTAMP')
                
                params.append(ticket_id)
                
                query = f"""
                    UPDATE tickets 
                    SET {', '.join(update_fields)}
                    WHERE id = %s
                    RETURNING *
                """
                
                cur.execute(query, params)
                result = cur.fetchone()
                conn.commit()
                
                if not result:
                    raise HTTPException(status_code=404, detail="Ticket not found")
                
                logger.info(f"Updated ticket {ticket_id}")
                return TicketResponse(**dict(result))
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: int):
    """Delete a ticket - pure data operation."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM tickets WHERE id = %s RETURNING id", (ticket_id,))
                result = cur.fetchone()
                conn.commit()
                
                if not result:
                    raise HTTPException(status_code=404, detail="Ticket not found")
                
                logger.info(f"Deleted ticket {ticket_id}")
                return {"message": f"Ticket {ticket_id} deleted successfully"}
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Message CRUD endpoints

@app.post("/messages/", response_model=MessageResponse)
async def create_message(message: MessageCreate):
    """Create a new message - pure data operation."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO messages ("ticketId", sender, content, metadata)
                    VALUES (%(ticketId)s, %(sender)s, %(content)s, %(metadata)s)
                    RETURNING *
                """, message.dict())
                
                result = cur.fetchone()
                conn.commit()
                
                logger.info(f"Created message for ticket {message.ticketId}")
                return MessageResponse(**dict(result))
                
    except Exception as e:
        logger.error(f"Error creating message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/messages/", response_model=List[MessageResponse])
async def list_messages(
    ticket_id: Optional[int] = Query(None, description="Filter by ticket ID"),
    sender: Optional[str] = Query(None, description="Filter by sender"),
    limit: int = Query(100, le=1000, description="Maximum number of messages to return"),
    offset: int = Query(0, ge=0, description="Number of messages to skip")
):
    """List messages with optional filtering."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build query with filters
                conditions = []
                params = []
                
                if ticket_id is not None:
                    conditions.append('"ticketId" = %s')
                    params.append(ticket_id)
                
                if sender:
                    conditions.append('sender = %s')
                    params.append(sender)
                
                where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
                
                query = f"""
                    SELECT * FROM messages
                    {where_clause}
                    ORDER BY "createdAt" DESC
                    LIMIT %s OFFSET %s
                """
                params.extend([limit, offset])
                
                cur.execute(query, params)
                results = cur.fetchall()
                
                return [MessageResponse(**dict(row)) for row in results]
                
    except Exception as e:
        logger.error(f"Error listing messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Instruction template endpoints

@app.post("/instructions/", response_model=InstructionResponse)
async def create_instruction(instruction: InstructionCreate):
    """Create an instruction template - pure data operation."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Handle tags as JSON array
                tags = instruction.tags or []
                
                cur.execute("""
                    INSERT INTO instructions (title, content, category, tags)
                    VALUES (%(title)s, %(content)s, %(category)s, %(tags)s)
                    RETURNING *
                """, {
                    "title": instruction.title,
                    "content": instruction.content,
                    "category": instruction.category,
                    "tags": tags
                })
                
                result = cur.fetchone()
                conn.commit()
                
                logger.info(f"Created instruction: {instruction.title[:50]}...")
                return InstructionResponse(**dict(result))
                
    except Exception as e:
        logger.error(f"Error creating instruction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/instructions/", response_model=List[InstructionResponse])
async def list_instructions(
    category: Optional[str] = Query(None, description="Filter by category"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    limit: int = Query(100, le=1000, description="Maximum number of instructions to return"),
    offset: int = Query(0, ge=0, description="Number of instructions to skip")
):
    """List instruction templates with optional filtering."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build query with filters
                conditions = []
                params = []
                
                if category:
                    conditions.append('category = %s')
                    params.append(category)
                
                if tag:
                    conditions.append('%s = ANY(tags)')
                    params.append(tag)
                
                where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
                
                query = f"""
                    SELECT * FROM instructions
                    {where_clause}
                    ORDER BY "createdAt" DESC
                    LIMIT %s OFFSET %s
                """
                params.extend([limit, offset])
                
                cur.execute(query, params)
                results = cur.fetchall()
                
                return [InstructionResponse(**dict(row)) for row in results]
                
    except Exception as e:
        logger.error(f"Error listing instructions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/instructions/{instruction_id}", response_model=InstructionResponse)
async def get_instruction(instruction_id: int):
    """Get a single instruction by ID."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM instructions WHERE id = %s", (instruction_id,))
                result = cur.fetchone()
                
                if not result:
                    raise HTTPException(status_code=404, detail="Instruction not found")
                
                return InstructionResponse(**dict(result))
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting instruction {instruction_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Simple search endpoint (text-based, no vector similarity)
@app.get("/tickets/search/", response_model=List[TicketResponse])
async def search_tickets(
    query: str = Query(..., description="Search query"),
    tenant_id: Optional[int] = Query(None, description="Filter by tenant ID"),
    limit: int = Query(10, le=100, description="Maximum number of results")
):
    """Simple text search across ticket titles and descriptions."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                # Build search query
                conditions = ["(title ILIKE %s OR description ILIKE %s)"]
                params = [f"%{query}%", f"%{query}%"]
                
                if tenant_id is not None:
                    conditions.append('"tenantId" = %s')
                    params.append(tenant_id)
                
                where_clause = " WHERE " + " AND ".join(conditions)
                
                search_query = f"""
                    SELECT * FROM tickets
                    {where_clause}
                    ORDER BY "createdAt" DESC
                    LIMIT %s
                """
                params.append(limit)
                
                cur.execute(search_query, params)
                results = cur.fetchall()
                
                return [TicketResponse(**dict(row)) for row in results]
                
    except Exception as e:
        logger.error(f"Error searching tickets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    sender: str
    content: str
    createdAt: datetime
    metadata: Optional[dict] = None

class InstructionCreate(BaseModel):
    name: str
    title: str
    content: str
    tags: Optional[List[str]] = None

class InstructionResponse(BaseModel):
    id: int
    name: str
    title: str
    content: str
    tags: Optional[List[str]] = None
    createdAt: datetime

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}

# Ticket endpoints
@app.post("/tickets/", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate):
    """Store ticket data and return JSON"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO tickets (title, description, category, "tenantId", status, priority, "createdAt")
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            ticket.title,
            ticket.description,
            ticket.category,
            ticket.tenantId,
            ticket.status,
            ticket.priority,
            datetime.utcnow()
        ))
        
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        return TicketResponse(**dict(result))
        
    except Exception as e:
        logger.error(f"Error creating ticket: {e}")
        raise HTTPException(status_code=500, detail="Failed to create ticket")

@app.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: int):
    """Retrieve ticket JSON by ID"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM tickets WHERE id = %s', (ticket_id,))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        return TicketResponse(**dict(result))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving ticket: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve ticket")

@app.get("/tickets/", response_model=List[TicketResponse])
async def list_tickets(
    tenant_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    limit: int = Query(50, le=100)
):
    """List tickets with optional filtering"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        query = 'SELECT * FROM tickets WHERE 1=1'
        params = []
        
        if tenant_id:
            query += ' AND "tenantId" = %s'
            params.append(tenant_id)
        
        if status:
            query += ' AND status = %s'
            params.append(status)
        
        if category:
            query += ' AND category = %s'
            params.append(category)
        
        query += ' ORDER BY "createdAt" DESC LIMIT %s'
        params.append(limit)
        
        cursor.execute(query, params)
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return [TicketResponse(**dict(row)) for row in results]
        
    except Exception as e:
        logger.error(f"Error listing tickets: {e}")
        raise HTTPException(status_code=500, detail="Failed to list tickets")

@app.get("/tickets/similar/", response_model=List[TicketResponse])
async def find_similar_tickets(
    query: str = Query(..., description="Search query"),
    top_k: int = Query(3, le=10),
    tenant_id: Optional[int] = Query(None)
):
    """Find similar tickets using text search"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Simple text-based similarity using PostgreSQL full-text search
        search_query = """
            SELECT *, 
                   ts_rank(to_tsvector('english', title || ' ' || description), query) as rank
            FROM tickets,
                 to_tsquery('english', %s) query
            WHERE to_tsvector('english', title || ' ' || description) @@ query
        """
        params = [query.replace(' ', ' & ')]
        
        if tenant_id:
            search_query += ' AND "tenantId" = %s'
            params.append(tenant_id)
        
        search_query += ' ORDER BY rank DESC LIMIT %s'
        params.append(top_k)
        
        cursor.execute(search_query, params)
        results = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return [TicketResponse(**{k: v for k, v in dict(row).items() if k != 'rank'}) for row in results]
        
    except Exception as e:
        logger.error(f"Error finding similar tickets: {e}")
        raise HTTPException(status_code=500, detail="Failed to find similar tickets")

@app.put("/tickets/{ticket_id}/resolve", response_model=TicketResponse)
async def resolve_ticket(ticket_id: int, resolution: str):
    """Update ticket status to resolved"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE tickets 
            SET status = 'resolved', 
                resolution = %s, 
                "resolvedAt" = %s,
                "updatedAt" = %s
            WHERE id = %s
            RETURNING *
        """, (resolution, datetime.utcnow(), datetime.utcnow(), ticket_id))
        
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        return TicketResponse(**dict(result))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving ticket: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve ticket")

@app.get("/instructions/", response_model=List[InstructionResponse])
async def list_instructions(limit: int = Query(50, le=100)):
    """List instruction templates"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM instructions 
            ORDER BY "createdAt" DESC 
            LIMIT %s
        """, (limit,))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return [InstructionResponse(**dict(row)) for row in results]
        
    except Exception as e:
        logger.error(f"Error listing instructions: {e}")
        raise HTTPException(status_code=500, detail="Failed to list instructions")

@app.get("/stats/")
async def get_stats():
    """Return basic system statistics as JSON"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        stats = {}
        
        # Ticket counts
        cursor.execute('SELECT COUNT(*) as total FROM tickets')
        stats['tickets_total'] = cursor.fetchone()['total']
        
        cursor.execute('SELECT status, COUNT(*) as count FROM tickets GROUP BY status')
        stats['tickets_by_status'] = {row['status']: row['count'] for row in cursor.fetchall()}
        
        cursor.close()
        conn.close()
        
        return stats
        
    except Exception as e:
        logger.error(f"Error retrieving stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve stats")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)