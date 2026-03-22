"""
Ticket Lookup Agent using ChromaDB
Searches for similar tickets using ChromaDB vector similarity
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import traceback

try:
    from services.chroma_vector_service import get_chroma_service
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

logger = logging.getLogger(__name__)

class ChromaTicketLookupAgent:
    """Agent for finding similar tickets using ChromaDB vector similarity."""
    
    def __init__(self):
        self.agent_name = "ChromaTicketLookupAgent"
        self.workflow_trace = []
        
        if not CHROMA_AVAILABLE:
            logger.warning("ChromaDB not available, using fallback mode")
            self.chroma_service = None
        else:
            try:
                self.chroma_service = get_chroma_service()
                self._initialize_sample_tickets()
            except Exception as e:
                logger.error(f"Failed to initialize ChromaDB service: {e}")
                self.chroma_service = None
    
    def _initialize_sample_tickets(self):
        """Initialize sample tickets in ChromaDB for testing."""
        try:
            stats = self.chroma_service.get_collection_stats()
            ticket_count = stats.get("ticket_rag", {}).get("count", 0)
            
            if ticket_count == 0:
                sample_tickets = [
                    {
                        "id": 1001,
                        "title": "Cannot login after password reset",
                        "description": "User attempted password reset but still cannot access account. Getting 'invalid credentials' error.",
                        "category": "authentication",
                        "status": "resolved"
                    },
                    {
                        "id": 1002, 
                        "title": "Payment method not working",
                        "description": "Credit card keeps getting declined even though bank says card is fine. Need to update billing.",
                        "category": "billing",
                        "status": "resolved"
                    },
                    {
                        "id": 1003,
                        "title": "Account locked after multiple failed attempts",
                        "description": "User account automatically locked due to security policy. Need account unlock.",
                        "category": "security",
                        "status": "resolved"
                    }
                ]
                
                for ticket in sample_tickets:
                    self.chroma_service.upsert_ticket(
                        ticket_id=ticket["id"],
                        title=ticket["title"],
                        description=ticket["description"],
                        metadata={
                            "category": ticket["category"],
                            "status": ticket["status"],
                            "source": "sample_data"
                        }
                    )
                
                logger.info(f"Initialized {len(sample_tickets)} sample tickets")
        except Exception as e:
            logger.error(f"Failed to initialize sample tickets: {e}")
    
    def _add_trace_step(self, step: str, input_data: str, resource: str, output_data: str, duration_ms: float, success: bool):
        """Add a step to the workflow trace."""
        self.workflow_trace.append({
            "step": step,
            "agent": self.agent_name,
            "input": input_data,
            "resource": resource,
            "output": output_data,
            "duration_ms": round(duration_ms, 2),
            "success": success,
            "timestamp": datetime.now().isoformat()
        })
    
    async def run(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Main execution method for ticket similarity search.
        
        Args:
            query: Search query for similar tickets
            context: Optional context (tenant_id, limit, etc.)
            
        Returns:
            Dict containing similar tickets and metadata
        """
        start_time = datetime.now()
        self.workflow_trace = []  # Reset trace
        
        try:
            # Step 1: Process query
            processed_query = query.strip()
            tenant_id = context.get("tenant_id", 1) if context else 1
            limit = context.get("limit", 3) if context else 3
            
            self._add_trace_step(
                step="2a",
                input_data=f"Query: {query[:50]}...",
                resource="Query Processing",
                output_data=f"Processed query: {processed_query[:50]}...",
                duration_ms=3.0,
                success=True
            )
            
            # Step 2: Vector search
            if self.chroma_service:
                search_start = datetime.now()
                results = self.chroma_service.search_tickets(processed_query, limit)
                search_duration = (datetime.now() - search_start).total_seconds() * 1000
                
                self._add_trace_step(
                    step="2b",
                    input_data=f"Vector search for: {processed_query[:30]}...",
                    resource="ChromaDB + Gemini Embeddings",
                    output_data=f"Found {len(results)} similar tickets",
                    duration_ms=search_duration,
                    success=True
                )
                
                # Step 3: Format results
                similar_tickets = []
                for result in results:
                    metadata = result["metadata"]
                    ticket = {
                        "id": metadata.get("ticket_id", "unknown"),
                        "title": metadata.get("title", "Unknown Title"),
                        "description": metadata.get("description", "No description")[:300] + "...",
                        "similarity_score": result["similarity"],
                        "category": metadata.get("category", "general"),
                        "status": metadata.get("status", "unknown"),
                        "metadata": metadata
                    }
                    similar_tickets.append(ticket)
                
                confidence_score = max([r["similarity"] for r in results]) if results else 0.0
                
            else:
                # Fallback mode
                self._add_trace_step(
                    step="2b",
                    input_data=f"Fallback search for: {processed_query[:30]}...",
                    resource="Local Fallback",
                    output_data="Using fallback tickets",
                    duration_ms=5.0,
                    success=True
                )
                
                similar_tickets = [{
                    "id": "fallback_1",
                    "title": "Similar Issue",
                    "description": "A similar issue was reported and resolved. Please check our knowledge base.",
                    "similarity_score": 0.6,
                    "category": "general",
                    "status": "resolved",
                    "metadata": {"source": "fallback"}
                }]
                confidence_score = 0.6
            
            total_duration = (datetime.now() - start_time).total_seconds() * 1000
            
            self._add_trace_step(
                step="2c",
                input_data=f"Format {len(similar_tickets)} results",
                resource="Result Formatting",
                output_data=f"Formatted tickets with confidence: {confidence_score:.3f}",
                duration_ms=3.0,
                success=True
            )
            
            result = {
                "success": True,
                "similar_tickets": similar_tickets,
                "confidence_score": confidence_score,
                "query": query,
                "total_results": len(similar_tickets),
                "processing_time_ms": round(total_duration, 2),
                "data_source": "chromadb" if self.chroma_service else "fallback",
                "workflow_trace": self.workflow_trace
            }
            
            logger.info(f"TicketLookup completed: {len(similar_tickets)} results, confidence: {confidence_score:.3f}")
            return result
            
        except Exception as e:
            error_duration = (datetime.now() - start_time).total_seconds() * 1000
            
            self._add_trace_step(
                step="2_error",
                input_data=query[:50] + "...",
                resource="Error Handling",
                output_data=f"Error: {str(e)[:100]}...",
                duration_ms=error_duration,
                success=False
            )
            
            logger.error(f"TicketLookup failed: {e}")
            logger.debug(traceback.format_exc())
            
            return {
                "success": False,
                "error": str(e),
                "similar_tickets": [],
                "confidence_score": 0.0,
                "query": query,
                "processing_time_ms": round(error_duration, 2),
                "workflow_trace": self.workflow_trace
            }
    
    def get_workflow_trace(self) -> List[Dict[str, Any]]:
        """Get the current workflow trace."""
        return self.workflow_trace
    
    def get_stats(self) -> Dict[str, Any]:
        """Get agent statistics."""
        if self.chroma_service:
            return self.chroma_service.get_collection_stats()
        else:
            return {"status": "fallback_mode", "chroma_available": False}