"""
InstructionLookupAgent - Searches for relevant instruction texts
Takes normalized prompts, embeds them, and queries instruction_texts in Qdrant for top 3 results.
"""

import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import openai
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class InstructionLookupAgent:
    """
    Agent responsible for finding relevant instruction documents
    based on user queries using semantic similarity search.
    """
    
    def __init__(self, mcp_service_url: str = "http://localhost:8000"):
        self.mcp_service_url = mcp_service_url.rstrip('/')
        self.openai_client = None
        self.embedding_model = "text-embedding-3-small"
        self.dimensions = 384
        self._initialize_openai()
    
    def _initialize_openai(self):
        """Initialize OpenAI client for embeddings."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("No OpenAI API key found - instruction lookup will be limited")
            return
        
        try:
            self.openai_client = openai.OpenAI(api_key=api_key)
            logger.info("OpenAI client initialized for instruction lookup")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
    
    def lookup_instructions(self, normalized_prompt: str, top_k: int = 3, 
                          context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Main function to lookup relevant instructions.
        
        Args:
            normalized_prompt: Cleaned and normalized user query
            top_k: Number of top results to return
            context: Optional context from ChatProcessorAgent
        
        Returns:
            Dictionary with instruction results and metadata
        """
        try:
            start_time = datetime.utcnow()
            
            result = {
                "query": normalized_prompt,
                "top_k_requested": top_k,
                "instructions_found": [],
                "search_metadata": {
                    "search_method": "none",
                    "embedding_generated": False,
                    "search_time_ms": 0,
                    "total_results": 0
                },
                "context": context or {},
                "timestamp": start_time.isoformat()
            }
            
            # Method 1: Try semantic search via MCP service if available
            semantic_results = self._search_via_mcp_service(normalized_prompt, top_k)
            
            if semantic_results:
                result["instructions_found"] = semantic_results
                result["search_metadata"]["search_method"] = "mcp_semantic"
                result["search_metadata"]["total_results"] = len(semantic_results)
                logger.info(f"Found {len(semantic_results)} instructions via MCP semantic search")
            
            else:
                # Method 2: Fallback to direct keyword matching
                keyword_results = self._search_by_keywords(normalized_prompt, top_k)
                result["instructions_found"] = keyword_results
                result["search_metadata"]["search_method"] = "keyword_fallback"
                result["search_metadata"]["total_results"] = len(keyword_results)
                logger.info(f"Found {len(keyword_results)} instructions via keyword search")
            
            # Calculate search time
            end_time = datetime.utcnow()
            search_time = (end_time - start_time).total_seconds() * 1000
            result["search_metadata"]["search_time_ms"] = round(search_time, 2)
            
            # Enhance results with relevance scoring
            result["instructions_found"] = self._enhance_results_with_scoring(
                result["instructions_found"], normalized_prompt
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Error in instruction lookup: {e}")
            return {
                "query": normalized_prompt,
                "instructions_found": [],
                "error": str(e),
                "search_metadata": {"search_method": "failed"},
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _search_via_mcp_service(self, query: str, top_k: int) -> List[Dict[str, Any]]:
        """Search for instructions via the MCP service semantic search endpoint."""
        try:
            import requests
            
            # Call MCP service instruction search endpoint
            response = requests.get(
                f"{self.mcp_service_url}/instructions/search/",
                params={"query": query, "top_k": top_k},
                timeout=10
            )
            
            if response.status_code == 200:
                results = response.json()
                
                # Convert MCP service format to our internal format
                converted_results = []
                for result in results:
                    converted_results.append({
                        "filename": result.get("filename", "unknown"),
                        "title": result.get("filename", "unknown").replace("_", " ").title(),
                        "content_excerpt": result.get("text_excerpt", ""),
                        "full_content": result.get("full_text", ""),
                        "similarity_score": result.get("score", 0.0),
                        "source": "mcp_semantic_search",
                        "metadata": {
                            "search_method": "vector_similarity",
                            "model_used": self.embedding_model
                        }
                    })
                
                return converted_results
            
            elif response.status_code == 503:
                logger.info("MCP instruction search service not available")
                return []
            
            else:
                logger.warning(f"MCP service returned status {response.status_code}")
                return []
                
        except requests.exceptions.RequestException as e:
            logger.warning(f"Could not connect to MCP service: {e}")
            return []
        except Exception as e:
            logger.error(f"Error searching via MCP service: {e}")
            return []
    
    def _search_by_keywords(self, query: str, top_k: int) -> List[Dict[str, Any]]:
        """Fallback keyword-based search when semantic search is unavailable."""
        # Extract keywords from query
        keywords = self._extract_keywords(query)
        
        # Predefined instruction mappings for fallback
        instruction_database = {
            "authentication": {
                "filename": "authentication_guide.txt",
                "title": "Authentication and Login Guide",
                "content_excerpt": "Comprehensive guide for handling login issues, password resets, and 2FA problems.",
                "keywords": ["login", "password", "auth", "2fa", "sign in", "credentials", "token"]
            },
            "billing": {
                "filename": "billing_procedures.txt", 
                "title": "Billing and Payment Procedures",
                "content_excerpt": "Step-by-step procedures for payment processing, subscriptions, and billing issues.",
                "keywords": ["payment", "billing", "invoice", "subscription", "refund", "charge"]
            },
            "api": {
                "filename": "api_documentation.txt",
                "title": "API Integration Documentation", 
                "content_excerpt": "Technical documentation for API usage, rate limits, and troubleshooting.",
                "keywords": ["api", "integration", "webhook", "endpoint", "rate limit", "technical"]
            },
            "account": {
                "filename": "account_management.txt",
                "title": "Account Management Guide",
                "content_excerpt": "User account settings, profile management, and data handling procedures.",
                "keywords": ["account", "profile", "settings", "data", "export", "delete"]
            }
        }
        
        # Score instructions based on keyword matches
        scored_instructions = []
        
        for category, instruction in instruction_database.items():
            score = 0
            for keyword in keywords:
                if keyword.lower() in instruction["keywords"]:
                    score += 1
                if keyword.lower() in instruction["title"].lower():
                    score += 2
                if keyword.lower() in instruction["content_excerpt"].lower():
                    score += 1
            
            if score > 0:
                scored_instructions.append({
                    "filename": instruction["filename"],
                    "title": instruction["title"],
                    "content_excerpt": instruction["content_excerpt"],
                    "full_content": f"# {instruction['title']}\n\n{instruction['content_excerpt']}\n\n[Full content would be loaded from file]",
                    "similarity_score": min(score / 5.0, 1.0),  # Normalize to 0-1
                    "source": "keyword_matching",
                    "metadata": {
                        "search_method": "keyword_based",
                        "keywords_matched": [kw for kw in keywords if kw.lower() in instruction["keywords"]],
                        "category": category
                    }
                })
        
        # Sort by score and return top_k
        scored_instructions.sort(key=lambda x: x["similarity_score"], reverse=True)
        return scored_instructions[:top_k]
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text."""
        import re
        
        # Basic keyword extraction
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        
        # Remove common stop words
        stop_words = {
            "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
            "by", "from", "up", "about", "into", "through", "during", "before", 
            "after", "above", "below", "between", "among", "throughout", "despite",
            "have", "has", "had", "will", "would", "could", "should", "may", "might",
            "can", "cannot", "is", "are", "was", "were", "been", "being", "be"
        }
        
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        # Return unique keywords, preserving order
        seen = set()
        unique_keywords = []
        for keyword in keywords:
            if keyword not in seen:
                seen.add(keyword)
                unique_keywords.append(keyword)
        
        return unique_keywords[:10]  # Limit to top 10 keywords
    
    def _enhance_results_with_scoring(self, results: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """Enhance results with additional relevance scoring."""
        query_keywords = set(self._extract_keywords(query))
        
        for result in results:
            # Calculate keyword overlap score
            content_keywords = set(self._extract_keywords(result.get("content_excerpt", "")))
            title_keywords = set(self._extract_keywords(result.get("title", "")))
            
            keyword_overlap = len(query_keywords.intersection(content_keywords.union(title_keywords)))
            total_keywords = len(query_keywords)
            
            keyword_score = keyword_overlap / max(total_keywords, 1)
            
            # Combine with existing similarity score
            existing_score = result.get("similarity_score", 0)
            
            # Weighted combination: 70% semantic similarity, 30% keyword overlap
            if existing_score > 0:
                combined_score = (0.7 * existing_score) + (0.3 * keyword_score)
            else:
                combined_score = keyword_score
            
            result["relevance_score"] = round(combined_score, 3)
            result["metadata"] = result.get("metadata", {})
            result["metadata"]["keyword_overlap"] = keyword_overlap
            result["metadata"]["keyword_score"] = round(keyword_score, 3)
        
        # Sort by relevance score
        results.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
        
        return results
    
    def format_instructions_for_agents(self, lookup_result: Dict[str, Any]) -> str:
        """Format instruction results for consumption by other agents."""
        if not lookup_result.get("instructions_found"):
            return "No relevant instructions found for the given query."
        
        formatted_output = []
        formatted_output.append(f"Found {len(lookup_result['instructions_found'])} relevant instructions:\n")
        
        for i, instruction in enumerate(lookup_result["instructions_found"], 1):
            formatted_output.append(f"### Instruction {i}: {instruction.get('title', 'Unknown')}")
            formatted_output.append(f"**Relevance Score:** {instruction.get('relevance_score', 0):.2f}")
            formatted_output.append(f"**Source:** {instruction.get('filename', 'Unknown')}")
            formatted_output.append(f"**Content:**")
            formatted_output.append(instruction.get('content_excerpt', 'No content available'))
            formatted_output.append("")  # Empty line for separation
        
        return "\n".join(formatted_output)
    
    def get_instruction_summary(self, lookup_result: Dict[str, Any]) -> Dict[str, Any]:
        """Get a summary of the instruction lookup for logging/monitoring."""
        instructions = lookup_result.get("instructions_found", [])
        
        return {
            "total_found": len(instructions),
            "avg_relevance": round(
                sum(inst.get("relevance_score", 0) for inst in instructions) / max(len(instructions), 1), 3
            ),
            "search_method": lookup_result.get("search_metadata", {}).get("search_method", "unknown"),
            "search_time_ms": lookup_result.get("search_metadata", {}).get("search_time_ms", 0),
            "top_instruction": instructions[0].get("title", "None") if instructions else "None"
        }