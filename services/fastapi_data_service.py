"""
FastAPI Data Service - Pure data storage and JSON API responses
Single responsibility: Store/retrieve data, return JSON only
No business logic, orchestration, or external service calls
"""

import os
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

app = FastAPI(title="Data Service API", version="1.0.0")

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

class TicketResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    tenantId: int
    status: str
    priority: str
    createdAt: datetime
    updatedAt: Optional[datetime] = None
    resolution: Optional[str] = None
    resolvedAt: Optional[datetime] = None

class MessageCreate(BaseModel):
    ticketId: int
    sender: str
    content: str
    metadata: Optional[dict] = None

class MessageResponse(BaseModel):
    id: int
    ticketId: int
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