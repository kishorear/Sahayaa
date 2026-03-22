"""
TicketLookupAgent - Searches for similar tickets
Takes normalized prompts, queries the MCP service's /tickets/similar/ endpoint, and returns top 3 results.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import requests

logger = logging.getLogger(__name__)

class TicketLookupAgent:
    """
    Agent responsible for finding similar tickets based on user queries.
    Uses the MCP service's similarity search endpoint.
    """
    
    def __init__(self, mcp_service_url: str = "http://localhost:8000"):
        self.mcp_service_url = mcp_service_url.rstrip('/')
        self.request_timeout = 10
        self.default_top_k = 3
    
    def lookup_similar_tickets(self, normalized_prompt: str, top_k: int = 3, 
                             context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Main function to lookup similar tickets.
        
        Args:
            normalized_prompt: Cleaned and normalized user query
            top_k: Number of top results to return
            context: Optional context from ChatProcessorAgent
        
        Returns:
            Dictionary with similar tickets and metadata
        """
        try:
            start_time = datetime.utcnow()
            
            result = {
                "query": normalized_prompt,
                "top_k_requested": top_k,
                "similar_tickets": [],
                "search_metadata": {
                    "search_method": "none",
                    "api_endpoint": f"{self.mcp_service_url}/tickets/similar/",
                    "search_time_ms": 0,
                    "total_results": 0,
                    "min_score_threshold": 0.5
                },
                "context": context or {},
                "timestamp": start_time.isoformat()
            }
            
            # Extract tenant context if available
            tenant_id = None
            if context and "user_context" in context:
                tenant_id = context["user_context"].get("tenant_id")
            
            # Query MCP service for similar tickets
            similar_tickets = self._query_mcp_service(normalized_prompt, top_k, tenant_id)
            
            if similar_tickets:
                result["similar_tickets"] = similar_tickets
                result["search_metadata"]["search_method"] = "mcp_similarity_api"
                result["search_metadata"]["total_results"] = len(similar_tickets)
                logger.info(f"Found {len(similar_tickets)} similar tickets via MCP service")
            else:
                result["search_metadata"]["search_method"] = "no_results"
                logger.info("No similar tickets found")
            
            # Calculate search time
            end_time = datetime.utcnow()
            search_time = (end_time - start_time).total_seconds() * 1000
            result["search_metadata"]["search_time_ms"] = round(search_time, 2)
            
            # Enhance results with additional analysis
            result["similar_tickets"] = self._enhance_ticket_results(
                result["similar_tickets"], normalized_prompt
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error in ticket lookup: {e}")
            return {
                "query": normalized_prompt,
                "similar_tickets": [],
                "error": str(e),
                "search_metadata": {"search_method": "failed"},
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _query_mcp_service(self, query: str, top_k: int, tenant_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Query the MCP service similarity endpoint."""
        try:
            # Prepare query parameters
            params = {
                "query": query,
                "top_k": top_k,
                "min_score": 0.3  # Lower threshold to get more results
            }
            
            if tenant_id:
                params["tenant_id"] = tenant_id
            
            # Make request to MCP service
            response = requests.get(
                f"{self.mcp_service_url}/tickets/similar/",
                params=params,
                timeout=self.request_timeout
            )
            
            if response.status_code == 200:
                tickets = response.json()
                
                # Convert to internal format with additional metadata
                converted_tickets = []
                for ticket in tickets:
                    converted_tickets.append({
                        "ticket_id": ticket.get("ticket_id"),
                        "title": ticket.get("title", ""),
                        "description": ticket.get("description", ""),
                        "category": ticket.get("category", ""),
                        "status": ticket.get("status", ""),
                        "resolution": ticket.get("resolution"),
                        "similarity_score": ticket.get("score", 0.0),
                        "source": "mcp_similarity_search",
                        "metadata": {
                            "search_method": "similarity_api",
                            "original_score": ticket.get("score", 0.0)
                        }
                    })
                
                return converted_tickets
            
            elif response.status_code == 503:
                logger.warning("MCP similarity search service not available")
                return []
            
            else:
                logger.warning(f"MCP service returned status {response.status_code}: {response.text}")
                return []
                
        except requests.exceptions.ConnectionError:
            logger.warning(f"Could not connect to MCP service at {self.mcp_service_url}")
            return []
        except requests.exceptions.Timeout:
            logger.warning(f"Request to MCP service timed out after {self.request_timeout}s")
            return []
        except Exception as e:
            logger.error(f"Error querying MCP service: {e}")
            return []
    
    def _enhance_ticket_results(self, tickets: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """Enhance ticket results with additional analysis."""
        query_lower = query.lower()
        
        for ticket in tickets:
            # Calculate text-based relevance scores
            title_match = self._calculate_text_match(query_lower, ticket.get("title", "").lower())
            desc_match = self._calculate_text_match(query_lower, ticket.get("description", "").lower())
            
            # Determine resolution availability
            has_resolution = bool(ticket.get("resolution"))
            
            # Calculate composite relevance score
            similarity_score = ticket.get("similarity_score", 0)
            text_score = max(title_match, desc_match * 0.7)  # Weight title matches higher
            
            # Combine scores: 60% similarity, 40% text matching
            composite_score = (0.6 * similarity_score) + (0.4 * text_score)
            
            ticket["relevance_score"] = round(composite_score, 3)
            ticket["metadata"] = ticket.get("metadata", {})
            ticket["metadata"].update({
                "title_match_score": round(title_match, 3),
                "description_match_score": round(desc_match, 3),
                "has_resolution": has_resolution,
                "composite_score": round(composite_score, 3)
            })
        
        # Sort by relevance score
        tickets.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
        
        return tickets
    
    def _calculate_text_match(self, query: str, text: str) -> float:
        """Calculate text matching score between query and text."""
        if not query or not text:
            return 0.0
        
        # Simple word-based matching
        query_words = set(query.split())
        text_words = set(text.split())
        
        if not query_words:
            return 0.0
        
        # Calculate Jaccard similarity
        intersection = len(query_words.intersection(text_words))
        union = len(query_words.union(text_words))
        
        return intersection / union if union > 0 else 0.0
    
    def get_ticket_details(self, ticket_id: int) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific ticket."""
        try:
            response = requests.get(
                f"{self.mcp_service_url}/tickets/{ticket_id}",
                timeout=self.request_timeout
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.warning(f"Could not get ticket {ticket_id}: status {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error getting ticket details for {ticket_id}: {e}")
            return None
    
    def format_tickets_for_agents(self, lookup_result: Dict[str, Any]) -> str:
        """Format ticket results for consumption by other agents."""
        if not lookup_result.get("similar_tickets"):
            return "No similar tickets found for the given query."
        
        formatted_output = []
        formatted_output.append(f"Found {len(lookup_result['similar_tickets'])} similar tickets:\n")
        
        for i, ticket in enumerate(lookup_result["similar_tickets"], 1):
            formatted_output.append(f"### Ticket {i}: #{ticket.get('ticket_id', 'Unknown')}")
            formatted_output.append(f"**Title:** {ticket.get('title', 'No title')}")
            formatted_output.append(f"**Status:** {ticket.get('status', 'Unknown')}")
            formatted_output.append(f"**Category:** {ticket.get('category', 'Unknown')}")
            formatted_output.append(f"**Relevance Score:** {ticket.get('relevance_score', 0):.2f}")
            
            # Add description (truncated)
            description = ticket.get('description', '')
            if len(description) > 200:
                description = description[:200] + "..."
            formatted_output.append(f"**Description:** {description}")
            
            # Add resolution if available
            if ticket.get('resolution'):
                resolution = ticket.get('resolution', '')
                if len(resolution) > 150:
                    resolution = resolution[:150] + "..."
                formatted_output.append(f"**Resolution:** {resolution}")
            else:
                formatted_output.append("**Resolution:** Not available")
            
            formatted_output.append("")  # Empty line for separation
        
        return "\n".join(formatted_output)
    
    def get_lookup_summary(self, lookup_result: Dict[str, Any]) -> Dict[str, Any]:
        """Get a summary of the ticket lookup for logging/monitoring."""
        tickets = lookup_result.get("similar_tickets", [])
        
        # Calculate statistics
        total_found = len(tickets)
        avg_relevance = 0
        resolved_count = 0
        
        if tickets:
            avg_relevance = sum(ticket.get("relevance_score", 0) for ticket in tickets) / total_found
            resolved_count = sum(1 for ticket in tickets if ticket.get("status") == "resolved")
        
        return {
            "total_found": total_found,
            "avg_relevance": round(avg_relevance, 3),
            "resolved_tickets": resolved_count,
            "search_method": lookup_result.get("search_metadata", {}).get("search_method", "unknown"),
            "search_time_ms": lookup_result.get("search_metadata", {}).get("search_time_ms", 0),
            "top_ticket_id": tickets[0].get("ticket_id") if tickets else None,
            "has_resolutions": sum(1 for ticket in tickets if ticket.get("resolution")) if tickets else 0
        }
    
    def extract_resolution_patterns(self, lookup_result: Dict[str, Any]) -> List[str]:
        """Extract common resolution patterns from similar tickets."""
        tickets = lookup_result.get("similar_tickets", [])
        resolutions = []
        
        for ticket in tickets:
            if ticket.get("resolution") and ticket.get("status") == "resolved":
                resolutions.append(ticket["resolution"])
        
        return resolutions