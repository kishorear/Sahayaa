"""
Agent Orchestrator Service - Business logic coordination and workflow orchestration
Single responsibility: Coordinate multiple specialized agents, implement business rules,
make LLM API calls, and format results for presentation
"""

import os
import logging
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime
import openai
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

class AgentOrchestrator:
    """
    Coordinating service that orchestrates the complete support workflow:
    1. Process user input and extract key information
    2. Call FastAPI service for ticket operations
    3. Call Qdrant service for instruction lookup
    4. Generate resolution using LLM API
    5. Format and return comprehensive results
    """
    
    def __init__(self, data_service_url: str = "http://localhost:8000", 
                 qdrant_service: Optional[object] = None):
        self.data_service_url = data_service_url.rstrip('/')
        self.qdrant_service = qdrant_service
        
        # Initialize OpenAI client
        self.openai_client = None
        self._initialize_openai()
        
        logger.info("Agent orchestrator initialized")
    
    def _initialize_openai(self):
        """Initialize OpenAI client for LLM processing."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("No OpenAI API key found - LLM features will be unavailable")
            return
        
        try:
            self.openai_client = openai.OpenAI(api_key=api_key)
            logger.info("OpenAI client initialized for LLM processing")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
    
    def process_support_request(self, user_message: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main orchestration method - coordinates all services to process a support request.
        
        Args:
            user_message: The user's support request
            user_context: Context information (user_id, tenant_id, etc.)
        
        Returns:
            Complete workflow result with ticket, resolution, and metadata
        """
        start_time = datetime.utcnow()
        workflow_result = {
            "workflow_metadata": {
                "start_time": start_time.isoformat(),
                "success": False,
                "steps_completed": [],
                "errors": []
            },
            "workflow_steps": {},
            "final_ticket": None
        }
        
        try:
            # Step 1: Process and normalize user input
            logger.info("Step 1: Processing user input")
            normalized_input = self._process_user_input(user_message, user_context)
            workflow_result["workflow_steps"]["input_processing"] = normalized_input
            workflow_result["workflow_metadata"]["steps_completed"].append("input_processing")
            
            # Step 2: Search for relevant instructions
            logger.info("Step 2: Searching for relevant instructions")
            instructions = self._search_instructions(normalized_input["normalized_query"])
            workflow_result["workflow_steps"]["instruction_search"] = instructions
            workflow_result["workflow_metadata"]["steps_completed"].append("instruction_search")
            
            # Step 3: Search for similar tickets
            logger.info("Step 3: Searching for similar tickets")
            similar_tickets = self._search_similar_tickets(normalized_input["normalized_query"], user_context.get("tenant_id"))
            workflow_result["workflow_steps"]["similar_tickets"] = similar_tickets
            workflow_result["workflow_metadata"]["steps_completed"].append("similar_tickets")
            
            # Step 4: Generate LLM resolution
            logger.info("Step 4: Generating LLM resolution")
            llm_resolution = self._generate_llm_resolution(normalized_input, instructions, similar_tickets)
            workflow_result["workflow_steps"]["llm_resolution"] = llm_resolution
            workflow_result["workflow_metadata"]["steps_completed"].append("llm_resolution")
            
            # Step 5: Create ticket via data service
            logger.info("Step 5: Creating ticket")
            ticket_data = self._prepare_ticket_data(normalized_input, llm_resolution, user_context)
            created_ticket = self._create_ticket_via_api(ticket_data)
            workflow_result["workflow_steps"]["ticket_creation"] = created_ticket
            workflow_result["workflow_metadata"]["steps_completed"].append("ticket_creation")
            
            # Step 6: Format final result
            logger.info("Step 6: Formatting final result")
            final_ticket = self._format_final_ticket(created_ticket, llm_resolution, normalized_input)
            workflow_result["final_ticket"] = final_ticket
            workflow_result["workflow_metadata"]["steps_completed"].append("formatting")
            
            # Mark workflow as successful
            end_time = datetime.utcnow()
            total_time = (end_time - start_time).total_seconds() * 1000
            workflow_result["workflow_metadata"].update({
                "success": True,
                "end_time": end_time.isoformat(),
                "total_time_ms": round(total_time, 2)
            })
            
            logger.info(f"Support request processed successfully in {total_time:.2f}ms")
            return workflow_result
            
        except Exception as e:
            logger.error(f"Workflow failed: {e}")
            end_time = datetime.utcnow()
            total_time = (end_time - start_time).total_seconds() * 1000
            
            workflow_result["workflow_metadata"].update({
                "success": False,
                "end_time": end_time.isoformat(),
                "total_time_ms": round(total_time, 2),
                "error": str(e)
            })
            workflow_result["workflow_metadata"]["errors"].append(str(e))
            
            return workflow_result
    
    def _process_user_input(self, user_message: str, user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Process and normalize user input - extract key information."""
        # Extract basic information from the message
        normalized_query = user_message.strip()
        
        # Determine urgency based on keywords
        urgency_keywords = ["urgent", "asap", "immediately", "critical", "emergency"]
        urgency = "high" if any(keyword in normalized_query.lower() for keyword in urgency_keywords) else "medium"
        
        # Determine category based on keywords
        category_mapping = {
            "login": ["login", "password", "authenticate", "access"],
            "billing": ["billing", "payment", "subscription", "charge"],
            "technical": ["api", "error", "bug", "integration", "500", "404"],
            "account": ["account", "profile", "settings", "user"]
        }
        
        category = "general"
        for cat, keywords in category_mapping.items():
            if any(keyword in normalized_query.lower() for keyword in keywords):
                category = cat
                break
        
        return {
            "original_message": user_message,
            "normalized_query": normalized_query,
            "urgency": urgency,
            "category": category,
            "user_context": user_context,
            "extracted_keywords": self._extract_keywords(normalized_query)
        }
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract key terms from the text for search."""
        # Simple keyword extraction - remove common words
        stop_words = {"i", "me", "my", "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "can", "cant", "cannot"}
        
        words = text.lower().split()
        keywords = [word.strip(".,!?;:") for word in words if word.lower() not in stop_words and len(word) > 2]
        
        return keywords[:10]  # Return top 10 keywords
    
    def _search_instructions(self, query: str) -> Dict[str, Any]:
        """Search for relevant instructions using Qdrant service."""
        try:
            if self.qdrant_service:
                results = self.qdrant_service.search_instructions(query, top_k=3)
                return {
                    "success": True,
                    "results": results,
                    "count": len(results)
                }
            else:
                logger.warning("Qdrant service not available - skipping instruction search")
                return {
                    "success": False,
                    "results": [],
                    "count": 0,
                    "error": "Qdrant service not available"
                }
        except Exception as e:
            logger.error(f"Instruction search failed: {e}")
            return {
                "success": False,
                "results": [],
                "count": 0,
                "error": str(e)
            }
    
    def _search_similar_tickets(self, query: str, tenant_id: Optional[int]) -> Dict[str, Any]:
        """Search for similar tickets using FastAPI data service."""
        try:
            params = {"query": query, "limit": 5}
            if tenant_id:
                params["tenant_id"] = tenant_id
            
            response = requests.get(f"{self.data_service_url}/tickets/search/", params=params)
            
            if response.status_code == 200:
                tickets = response.json()
                return {
                    "success": True,
                    "results": tickets,
                    "count": len(tickets)
                }
            else:
                logger.warning(f"Ticket search failed: {response.status_code}")
                return {
                    "success": False,
                    "results": [],
                    "count": 0,
                    "error": f"API error: {response.status_code}"
                }
        except Exception as e:
            logger.error(f"Similar ticket search failed: {e}")
            return {
                "success": False,
                "results": [],
                "count": 0,
                "error": str(e)
            }
    
    def _generate_llm_resolution(self, normalized_input: Dict[str, Any], 
                               instructions: Dict[str, Any], 
                               similar_tickets: Dict[str, Any]) -> Dict[str, Any]:
        """Generate resolution steps using LLM."""
        if not self.openai_client:
            return {
                "success": False,
                "resolution_steps": ["Please contact support for assistance with this issue."],
                "explanation": "LLM service unavailable - using fallback response",
                "confidence_score": 0.1
            }
        
        try:
            # Build context for LLM
            context_parts = [
                f"User issue: {normalized_input['original_message']}",
                f"Category: {normalized_input['category']}",
                f"Urgency: {normalized_input['urgency']}"
            ]
            
            # Add instruction context
            if instructions["success"] and instructions["results"]:
                context_parts.append("Relevant instructions:")
                for idx, instruction in enumerate(instructions["results"][:2], 1):
                    context_parts.append(f"{idx}. {instruction.get('text', '')[:200]}...")
            
            # Add similar ticket context
            if similar_tickets["success"] and similar_tickets["results"]:
                context_parts.append("Similar resolved tickets:")
                for idx, ticket in enumerate(similar_tickets["results"][:2], 1):
                    resolution = ticket.get("resolution", "No resolution available")
                    context_parts.append(f"{idx}. Issue: {ticket.get('title', 'Unknown')}")
                    if resolution and resolution != "No resolution available":
                        context_parts.append(f"   Resolution: {resolution[:150]}...")
            
            context = "\n".join(context_parts)
            
            # Create LLM prompt
            system_prompt = """You are a helpful customer support assistant. Based on the user's issue and available context, provide a clear, step-by-step resolution. Format your response as numbered steps that are specific and actionable."""
            
            user_prompt = f"""Based on this context, provide a step-by-step resolution:

{context}

Please provide:
1. Clear, numbered resolution steps
2. Brief explanation of the approach
3. Confidence score (0.0-1.0) for this resolution"""
            
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            llm_response = response.choices[0].message.content
            
            # Parse the LLM response to extract steps
            lines = llm_response.split('\n')
            resolution_steps = []
            explanation = ""
            confidence_score = 0.8  # Default confidence
            
            for line in lines:
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('-') or line.startswith('•')):
                    # This looks like a step
                    resolution_steps.append(line)
                elif "explanation" in line.lower() or "approach" in line.lower():
                    explanation = line
                elif "confidence" in line.lower():
                    # Try to extract confidence score
                    try:
                        import re
                        score_match = re.search(r'(\d+\.?\d*)', line)
                        if score_match:
                            confidence_score = float(score_match.group(1))
                            if confidence_score > 1.0:
                                confidence_score = confidence_score / 100
                    except:
                        pass
            
            if not resolution_steps:
                resolution_steps = [llm_response]  # Use entire response if no steps found
            
            return {
                "success": True,
                "resolution_steps": resolution_steps,
                "explanation": explanation or "Generated using AI analysis of similar issues",
                "confidence_score": confidence_score,
                "raw_llm_response": llm_response
            }
            
        except Exception as e:
            logger.error(f"LLM resolution generation failed: {e}")
            return {
                "success": False,
                "resolution_steps": [
                    "1. Please provide more details about your issue",
                    "2. Contact our support team for personalized assistance"
                ],
                "explanation": f"LLM generation failed: {str(e)}",
                "confidence_score": 0.2,
                "error": str(e)
            }
    
    def _prepare_ticket_data(self, normalized_input: Dict[str, Any], 
                           llm_resolution: Dict[str, Any], 
                           user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare ticket data for creation via FastAPI service."""
        resolution_text = "\n".join(llm_resolution.get("resolution_steps", []))
        
        return {
            "title": f"{normalized_input['category'].title()}: {normalized_input['original_message'][:50]}...",
            "description": normalized_input['original_message'],
            "category": normalized_input['category'],
            "tenantId": user_context.get("tenant_id", 1),
            "status": "resolved" if llm_resolution.get("success") else "new",
            "priority": normalized_input['urgency'],
            "source": "agent_orchestrator",
            "complexity": "medium",
            "resolution": resolution_text if llm_resolution.get("success") else None,
            "createdBy": user_context.get("user_id"),
            "teamId": user_context.get("team_id")
        }
    
    def _create_ticket_via_api(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create ticket using FastAPI data service."""
        try:
            response = requests.post(f"{self.data_service_url}/tickets/", json=ticket_data)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "ticket": response.json()
                }
            else:
                logger.error(f"Ticket creation failed: {response.status_code} - {response.text}")
                return {
                    "success": False,
                    "error": f"API error: {response.status_code}",
                    "details": response.text
                }
        except Exception as e:
            logger.error(f"Ticket creation request failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _format_final_ticket(self, created_ticket: Dict[str, Any], 
                           llm_resolution: Dict[str, Any], 
                           normalized_input: Dict[str, Any]) -> Dict[str, Any]:
        """Format the final ticket response for presentation."""
        if not created_ticket.get("success"):
            return {
                "ticket_id": None,
                "status": "error",
                "error": created_ticket.get("error", "Unknown error")
            }
        
        ticket = created_ticket["ticket"]
        resolution_steps = llm_resolution.get("resolution_steps", [])
        
        return {
            "ticket_id": ticket.get("id"),
            "title": ticket.get("title"),
            "status": ticket.get("status"),
            "category": ticket.get("category"),
            "urgency": normalized_input.get("urgency"),
            "resolution_steps": resolution_steps,
            "resolution_steps_count": len(resolution_steps),
            "confidence_score": llm_resolution.get("confidence_score", 0.0),
            "created_at": ticket.get("createdAt"),
            "tenant_id": ticket.get("tenantId"),
            "source": "AI-powered orchestration"
        }
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get status of all connected services."""
        status = {
            "orchestrator": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {}
        }
        
        # Check FastAPI data service
        try:
            response = requests.get(f"{self.data_service_url}/health", timeout=5)
            status["services"]["data_service"] = {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "url": self.data_service_url
            }
        except Exception as e:
            status["services"]["data_service"] = {
                "status": "unavailable",
                "error": str(e)
            }
        
        # Check Qdrant service
        status["services"]["qdrant_service"] = {
            "status": "available" if self.qdrant_service else "unavailable"
        }
        
        # Check OpenAI service
        status["services"]["openai_service"] = {
            "status": "available" if self.openai_client else "unavailable"
        }
        
        return status

if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)
    
    orchestrator = AgentOrchestrator()
    
    # Test the orchestrator
    test_message = "I can't log into my account and the password reset isn't working"
    test_context = {"user_id": "test123", "tenant_id": 1}
    
    result = orchestrator.process_support_request(test_message, test_context)
    print(f"Workflow completed: {result['workflow_metadata']['success']}")
    if result.get('final_ticket'):
        print(f"Ticket created: #{result['final_ticket']['ticket_id']}")