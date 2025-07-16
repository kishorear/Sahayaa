"""
MCP (Model Context Protocol) Configuration and Setup
Custom MCP implementation with DATABASE_URL and establishes MCP client connections
"""

import os
import asyncio
import logging
from typing import Dict, Any, Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
import asyncpg
import aiohttp
import json
from datetime import datetime
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class MCPClient:
    """Custom MCP Client implementation with DATABASE_URL"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool: Optional[asyncpg.Pool] = None
        self.is_initialized = False
        self.connection_timeout = 30
        self.query_timeout = 60
        
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def initialize(self):
        """Initialize MCP client with database connection pool"""
        try:
            # Create connection pool for better performance
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=5,
                max_size=20,
                timeout=self.connection_timeout,
                command_timeout=self.query_timeout
            )
            
            # Test connection
            async with self.pool.acquire() as conn:
                await conn.execute("SELECT 1")
            
            self.is_initialized = True
            logger.info("MCP client initialized successfully with connection pool")
            return True
                    
        except Exception as e:
            logger.error(f"Failed to initialize MCP client: {e}")
            return False
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def query_tickets(self, query: str, limit: int = 10, tenant_id: int = 1) -> List[Dict[str, Any]]:
        """Query tickets using MCP protocol with enhanced search"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            async with self.pool.acquire() as conn:
                # Enhanced query with message content and metadata
                sql_query = """
                    SELECT DISTINCT t.id, t.title, t.description, t.status, t.category, 
                           t.urgency, t.created_at, t.updated_at, t.tenant_id,
                           t.source, t.resolution_summary, t.resolution_steps,
                           t.confidence_score, t.processing_time_ms,
                           m.content as latest_message,
                           u.name as created_by_name
                    FROM tickets t
                    LEFT JOIN messages m ON t.id = m.ticket_id 
                    LEFT JOIN users u ON t.created_by = u.id
                    WHERE t.tenant_id = $1 AND (
                        t.title ILIKE $2 OR 
                        t.description ILIKE $2 OR
                        t.resolution_summary ILIKE $2 OR
                        m.content ILIKE $2
                    )
                    ORDER BY t.created_at DESC
                    LIMIT $3
                """
                
                search_pattern = f"%{query}%"
                rows = await conn.fetch(sql_query, tenant_id, search_pattern, limit)
                
                # Convert to list of dictionaries
                results = []
                for row in rows:
                    ticket_dict = dict(row)
                    # Convert datetime objects to ISO strings
                    for key, value in ticket_dict.items():
                        if hasattr(value, 'isoformat'):
                            ticket_dict[key] = value.isoformat()
                    results.append(ticket_dict)
                
                logger.info(f"MCP ticket query returned {len(results)} results")
                return results
            
        except Exception as e:
            logger.error(f"MCP ticket query failed: {e}")
            return []
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def query_instructions(self, query: str, limit: int = 5, tenant_id: int = 1) -> List[Dict[str, Any]]:
        """Query instructions using MCP protocol with enhanced search"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            async with self.pool.acquire() as conn:
                # Enhanced query for instructions/documents
                sql_query = """
                    SELECT sd.id, sd.title, sd.content, sd.category, sd.status,
                           sd.created_at, sd.updated_at, sd.tenant_id,
                           sd.summary, sd.metadata, sd.tags, sd.view_count,
                           u.name as created_by_name
                    FROM support_documents sd
                    LEFT JOIN users u ON sd.created_by = u.id
                    WHERE sd.tenant_id = $1 AND sd.status = 'published' AND (
                        sd.title ILIKE $2 OR 
                        sd.content ILIKE $2 OR
                        sd.summary ILIKE $2 OR
                        sd.tags::text ILIKE $2
                    )
                    ORDER BY sd.view_count DESC, sd.created_at DESC
                    LIMIT $3
                """
                
                search_pattern = f"%{query}%"
                rows = await conn.fetch(sql_query, tenant_id, search_pattern, limit)
                
                # Convert to list of dictionaries
                results = []
                for row in rows:
                    doc_dict = dict(row)
                    # Convert datetime objects to ISO strings
                    for key, value in doc_dict.items():
                        if hasattr(value, 'isoformat'):
                            doc_dict[key] = value.isoformat()
                    results.append(doc_dict)
                
                logger.info(f"MCP instruction query returned {len(results)} results")
                return results
            
        except Exception as e:
            logger.error(f"MCP instruction query failed: {e}")
            return []
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_ticket_context(self, ticket_id: int, tenant_id: int = 1) -> Dict[str, Any]:
        """Get complete ticket context using MCP with full conversation history"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            async with self.pool.acquire() as conn:
                # Get ticket details with full context
                ticket_query = """
                    SELECT t.*, u.name as created_by_name, u.email as created_by_email
                    FROM tickets t
                    LEFT JOIN users u ON t.created_by = u.id
                    WHERE t.id = $1 AND t.tenant_id = $2
                """
                
                # Get all messages for the ticket
                messages_query = """
                    SELECT m.*, u.name as sender_name
                    FROM messages m
                    LEFT JOIN users u ON m.sender = u.username
                    WHERE m.ticket_id = $1
                    ORDER BY m.created_at ASC
                """
                
                # Get related attachments
                attachments_query = """
                    SELECT *
                    FROM attachments
                    WHERE ticket_id = $1
                    ORDER BY created_at DESC
                """
                
                # Execute all queries
                ticket_row = await conn.fetchrow(ticket_query, ticket_id, tenant_id)
                messages_rows = await conn.fetch(messages_query, ticket_id)
                attachments_rows = await conn.fetch(attachments_query, ticket_id)
                
                if not ticket_row:
                    return {}
                
                # Build comprehensive context
                context = dict(ticket_row)
                
                # Convert datetime objects to ISO strings
                for key, value in context.items():
                    if hasattr(value, 'isoformat'):
                        context[key] = value.isoformat()
                
                # Add messages
                context['messages'] = []
                for msg_row in messages_rows:
                    msg_dict = dict(msg_row)
                    for key, value in msg_dict.items():
                        if hasattr(value, 'isoformat'):
                            msg_dict[key] = value.isoformat()
                    context['messages'].append(msg_dict)
                
                # Add attachments
                context['attachments'] = []
                for att_row in attachments_rows:
                    att_dict = dict(att_row)
                    for key, value in att_dict.items():
                        if hasattr(value, 'isoformat'):
                            att_dict[key] = value.isoformat()
                    context['attachments'].append(att_dict)
                
                logger.info(f"Retrieved complete context for ticket {ticket_id}")
                return context
            
        except Exception as e:
            logger.error(f"MCP ticket context query failed: {e}")
            return {}
    
    async def health_check(self) -> Dict[str, Any]:
        """Check MCP service health with connection pool status"""
        try:
            if not self.is_initialized:
                await self.initialize()
            
            async with self.pool.acquire() as conn:
                # Test database connectivity
                result = await conn.fetchval("SELECT NOW()")
                
                # Get connection pool stats
                pool_stats = {
                    "size": self.pool.get_size(),
                    "min_size": self.pool.get_min_size(),
                    "max_size": self.pool.get_max_size(),
                    "idle_size": self.pool.get_idle_size()
                }
                
                return {
                    "status": "healthy",
                    "mcp_initialized": self.is_initialized,
                    "database_time": result.isoformat() if result else None,
                    "connection_pool": pool_stats,
                    "timestamp": datetime.now().isoformat()
                }
            
        except Exception as e:
            logger.error(f"MCP health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def close(self):
        """Close the connection pool"""
        if self.pool:
            await self.pool.close()
            self.is_initialized = False
            logger.info("MCP client connection pool closed")

class DatabaseFallback:
    """Direct database fallback when MCP is unavailable"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
    
    def get_connection(self):
        """Get database connection"""
        return psycopg2.connect(
            self.database_url,
            cursor_factory=RealDictCursor
        )
    
    async def query_tickets_fallback(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Fallback ticket query using direct database connection"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT t.*, m.content as latest_message
                        FROM tickets t
                        LEFT JOIN messages m ON t.id = m.ticket_id
                        WHERE t.title ILIKE %s OR t.description ILIKE %s
                        ORDER BY t.created_at DESC
                        LIMIT %s
                    """, (f"%{query}%", f"%{query}%", limit))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Database fallback query failed: {e}")
            return []
    
    async def query_instructions_fallback(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Fallback instruction query using direct database connection"""
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT * FROM instructions
                        WHERE title ILIKE %s OR content ILIKE %s
                        ORDER BY created_at DESC
                        LIMIT %s
                    """, (f"%{query}%", f"%{query}%", limit))
                    
                    results = cur.fetchall()
                    return [dict(row) for row in results]
                    
        except Exception as e:
            logger.error(f"Database fallback instruction query failed: {e}")
            return []

# Global MCP client instance
mcp_client: Optional[MCPClient] = None
database_fallback: Optional[DatabaseFallback] = None

async def initialize_mcp():
    """Initialize global MCP client"""
    global mcp_client, database_fallback
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable is required")
    
    mcp_client = MCPClient(database_url)
    database_fallback = DatabaseFallback(database_url)
    
    # Try to initialize MCP client
    success = await mcp_client.initialize()
    if success:
        logger.info("MCP client initialized successfully")
    else:
        logger.warning("MCP client initialization failed, using database fallback")
    
    return success

async def get_mcp_client() -> MCPClient:
    """Get initialized MCP client"""
    global mcp_client
    if not mcp_client:
        await initialize_mcp()
    return mcp_client

async def get_database_fallback() -> DatabaseFallback:
    """Get database fallback client"""
    global database_fallback
    if not database_fallback:
        database_url = os.getenv("DATABASE_URL")
        database_fallback = DatabaseFallback(database_url)
    return database_fallback