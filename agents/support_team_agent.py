"""
SupportTeam Coordinating Agent - Complete workflow orchestration
Coordinates all agents and LLM to generate comprehensive ticket resolutions.
"""

import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import openai
import requests
from dotenv import load_dotenv

from .chat_processor_agent import ChatProcessorAgent
from .instruction_lookup_agent import InstructionLookupAgent
from .ticket_lookup_agent import TicketLookupAgent
from .ticket_formatter_agent import TicketFormatterAgent

load_dotenv()
logger = logging.getLogger(__name__)

class SupportTeamAgent:
    """
    Coordinating agent that orchestrates the complete support workflow:
    1. Process user message through ChatProcessorAgent
    2. Lookup instructions and similar tickets
    3. Fetch full ticket resolutions from MCP service
    4. Generate resolution steps using LLM
    5. Format final ticket with TicketFormatterAgent
    """
    
    def __init__(self, mcp_service_url: str = "http://localhost:8000"):
        self.mcp_service_url = mcp_service_url.rstrip('/')
        
        # Initialize all component agents
        self.chat_processor = ChatProcessorAgent()
        self.instruction_lookup = InstructionLookupAgent(mcp_service_url)
        self.ticket_lookup = TicketLookupAgent(mcp_service_url)
        self.ticket_formatter = TicketFormatterAgent()
        
        # Initialize OpenAI client
        self.openai_client = None
        self._initialize_openai()
        
        logger.info("SupportTeam coordinating agent initialized")
    
    def _initialize_openai(self):
        """Initialize OpenAI client for LLM resolution generation."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("No OpenAI API key found - LLM resolution generation will fail")
            return
        
        try:
            self.openai_client = openai.OpenAI(api_key=api_key)
            logger.info("OpenAI client initialized for resolution generation")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
    
    def process_support_request(self, user_message: str, 
                              user_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Complete support workflow from user message to formatted ticket.
        
        Args:
            user_message: Raw user message/complaint
            user_context: Optional user context (tenant_id, user_id, etc.)
        
        Returns:
            Complete workflow result with formatted ticket
        """
        try:
            start_time = datetime.utcnow()
            
            workflow_result = {
                "request_id": f"support_{int(start_time.timestamp())}",
                "user_message": user_message,
                "user_context": user_context or {},
                "workflow_steps": {},
                "final_ticket": {},
                "workflow_metadata": {
                    "start_time": start_time.isoformat(),
                    "total_time_ms": 0,
                    "success": False,
                    "steps_completed": []
                }
            }
            
            logger.info(f"Starting SupportTeam workflow: {workflow_result['request_id']}")
            
            # Step 1: ChatProcessorAgent - Process user message
            step1_start = datetime.utcnow()
            chat_result = self.chat_processor.process_chat(user_message, user_context)
            step1_time = (datetime.utcnow() - step1_start).total_seconds() * 1000
            
            normalized_prompt = chat_result.get("normalized_prompt", "")
            if not normalized_prompt:
                raise ValueError("Failed to normalize user message")
            
            workflow_result["workflow_steps"]["chat_processing"] = {
                "result": chat_result,
                "time_ms": round(step1_time, 2),
                "success": True
            }
            workflow_result["workflow_metadata"]["steps_completed"].append("chat_processing")
            
            # Step 2: InstructionLookupAgent - Get static instructions
            step2_start = datetime.utcnow()
            instruction_result = self.instruction_lookup.lookup_instructions(
                normalized_prompt, top_k=3, context=chat_result
            )
            step2_time = (datetime.utcnow() - step2_start).total_seconds() * 1000
            
            workflow_result["workflow_steps"]["instruction_lookup"] = {
                "result": instruction_result,
                "time_ms": round(step2_time, 2),
                "success": len(instruction_result.get("instructions_found", [])) > 0
            }
            workflow_result["workflow_metadata"]["steps_completed"].append("instruction_lookup")
            
            # Step 3: TicketLookupAgent - Get similar ticket IDs
            step3_start = datetime.utcnow()
            ticket_lookup_result = self.ticket_lookup.lookup_similar_tickets(
                normalized_prompt, top_k=5, context=chat_result
            )
            step3_time = (datetime.utcnow() - step3_start).total_seconds() * 1000
            
            workflow_result["workflow_steps"]["ticket_lookup"] = {
                "result": ticket_lookup_result,
                "time_ms": round(step3_time, 2),
                "success": len(ticket_lookup_result.get("similar_tickets", [])) > 0
            }
            workflow_result["workflow_metadata"]["steps_completed"].append("ticket_lookup")
            
            # Step 4: Fetch full ticket resolutions from MCP service
            step4_start = datetime.utcnow()
            full_resolutions = self._fetch_ticket_resolutions(ticket_lookup_result)
            step4_time = (datetime.utcnow() - step4_start).total_seconds() * 1000
            
            workflow_result["workflow_steps"]["resolution_fetch"] = {
                "resolutions_found": len(full_resolutions),
                "time_ms": round(step4_time, 2),
                "success": len(full_resolutions) > 0
            }
            workflow_result["workflow_metadata"]["steps_completed"].append("resolution_fetch")
            
            # Step 5: Generate resolution steps using LLM
            step5_start = datetime.utcnow()
            llm_resolution = self._generate_llm_resolution(
                normalized_prompt, full_resolutions, instruction_result
            )
            step5_time = (datetime.utcnow() - step5_start).total_seconds() * 1000
            
            workflow_result["workflow_steps"]["llm_generation"] = {
                "resolution_generated": bool(llm_resolution),
                "time_ms": round(step5_time, 2),
                "success": bool(llm_resolution)
            }
            workflow_result["workflow_metadata"]["steps_completed"].append("llm_generation")
            
            # Step 6: Format final ticket using TicketFormatterAgent
            step6_start = datetime.utcnow()
            
            # Extract subject from original message
            subject = self._extract_subject(user_message, chat_result)
            
            # Generate ticket ID
            ticket_id = self._generate_ticket_id()
            
            # Create comprehensive context for formatting
            formatting_context = self._build_formatting_context(
                chat_result, instruction_result, ticket_lookup_result, full_resolutions
            )
            
            formatted_ticket = self.ticket_formatter.format_ticket(
                ticket_id=ticket_id,
                subject=subject,
                resolution_steps=llm_resolution,
                context=formatting_context,
                style=self._determine_formatting_style(chat_result)
            )
            
            step6_time = (datetime.utcnow() - step6_start).total_seconds() * 1000
            
            workflow_result["workflow_steps"]["ticket_formatting"] = {
                "result": formatted_ticket,
                "time_ms": round(step6_time, 2),
                "success": bool(formatted_ticket.get("formatted_body"))
            }
            workflow_result["workflow_metadata"]["steps_completed"].append("ticket_formatting")
            
            # Compile final ticket result
            workflow_result["final_ticket"] = {
                "ticket_id": ticket_id,
                "subject": subject,
                "formatted_body": formatted_ticket.get("formatted_body", ""),
                "urgency": chat_result.get("urgency_level"),
                "category": chat_result.get("suggested_category"),
                "resolution_steps_count": len(llm_resolution),
                "sources_used": {
                    "instructions": len(instruction_result.get("instructions_found", [])),
                    "similar_tickets": len(full_resolutions),
                    "llm_model": "gpt-4o"
                }
            }
            
            # Calculate total time and mark success
            end_time = datetime.utcnow()
            total_time = (end_time - start_time).total_seconds() * 1000
            workflow_result["workflow_metadata"]["total_time_ms"] = round(total_time, 2)
            workflow_result["workflow_metadata"]["end_time"] = end_time.isoformat()
            workflow_result["workflow_metadata"]["success"] = True
            
            logger.info(f"SupportTeam workflow completed successfully in {total_time:.2f}ms")
            return workflow_result
            
        except Exception as e:
            logger.error(f"SupportTeam workflow failed: {e}")
            
            end_time = datetime.utcnow()
            total_time = (end_time - start_time).total_seconds() * 1000
            
            workflow_result["workflow_metadata"]["total_time_ms"] = round(total_time, 2)
            workflow_result["workflow_metadata"]["end_time"] = end_time.isoformat()
            workflow_result["workflow_metadata"]["success"] = False
            workflow_result["workflow_metadata"]["error"] = str(e)
            
            return workflow_result
    
    def _fetch_ticket_resolutions(self, ticket_lookup_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetch full ticket resolutions from the MCP service for similar tickets."""
        similar_tickets = ticket_lookup_result.get("similar_tickets", [])
        resolutions = []
        
        for ticket in similar_tickets:
            ticket_id = ticket.get("ticket_id")
            if not ticket_id:
                continue
                
            try:
                # Fetch full ticket details from MCP service
                response = requests.get(
                    f"{self.mcp_service_url}/tickets/{ticket_id}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    full_ticket = response.json()
                    
                    # Only include tickets with resolutions
                    if full_ticket.get("resolution"):
                        resolutions.append({
                            "ticket_id": ticket_id,
                            "title": full_ticket.get("title", ""),
                            "description": full_ticket.get("description", ""),
                            "resolution": full_ticket.get("resolution", ""),
                            "category": full_ticket.get("category", ""),
                            "status": full_ticket.get("status", ""),
                            "similarity_score": ticket.get("relevance_score", 0)
                        })
                        
                else:
                    logger.warning(f"Could not fetch ticket {ticket_id}: status {response.status_code}")
                    
            except Exception as e:
                logger.warning(f"Error fetching ticket {ticket_id}: {e}")
                continue
        
        logger.info(f"Fetched {len(resolutions)} complete ticket resolutions")
        return resolutions
    
    def _generate_llm_resolution(self, prompt: str, historical_resolutions: List[Dict[str, Any]], 
                                instruction_result: Dict[str, Any]) -> List[str]:
        """Generate resolution steps using LLM with historical context."""
        if not self.openai_client:
            logger.warning("No OpenAI client available, using fallback resolution")
            return self._fallback_resolution_steps(prompt)
        
        try:
            # Build context from historical resolutions
            resolution_context = []
            for resolution in historical_resolutions[:3]:  # Use top 3 resolutions
                resolution_context.append(
                    f"**Ticket #{resolution['ticket_id']}** ({resolution['category']})\n"
                    f"Problem: {resolution['description'][:200]}...\n"
                    f"Resolution: {resolution['resolution']}\n"
                )
            
            # Build context from instructions
            instruction_context = []
            instructions = instruction_result.get("instructions_found", [])
            for instruction in instructions[:2]:  # Use top 2 instructions
                instruction_context.append(
                    f"**{instruction.get('title', 'Guide')}:**\n"
                    f"{instruction.get('content_excerpt', '')[:300]}...\n"
                )
            
            # Construct the LLM prompt
            llm_prompt = self._build_llm_prompt(prompt, resolution_context, instruction_context)
            
            # Call OpenAI API
            # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an expert customer support specialist. Generate clear, "
                            "actionable resolution steps based on historical ticket resolutions "
                            "and documentation. Format your response as a numbered list of steps."
                        )
                    },
                    {
                        "role": "user",
                        "content": llm_prompt
                    }
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            llm_response = response.choices[0].message.content
            
            # Parse the response into individual steps
            resolution_steps = self._parse_llm_response(llm_response)
            
            logger.info(f"Generated {len(resolution_steps)} resolution steps using LLM")
            return resolution_steps
            
        except Exception as e:
            logger.error(f"LLM resolution generation failed: {e}")
            return self._fallback_resolution_steps(prompt)
    
    def _build_llm_prompt(self, problem: str, resolutions: List[str], instructions: List[str]) -> str:
        """Build comprehensive prompt for LLM resolution generation."""
        prompt_parts = []
        
        if resolutions:
            prompt_parts.append("Here are historical ticket resolutions for similar problems:")
            prompt_parts.extend(resolutions)
            prompt_parts.append("")
        
        if instructions:
            prompt_parts.append("Relevant documentation and guidelines:")
            prompt_parts.extend(instructions)
            prompt_parts.append("")
        
        prompt_parts.extend([
            f"Now draft clear, actionable steps to solve this problem:",
            f'"{problem}"',
            "",
            "Provide a numbered list of specific steps that a support agent should follow.",
            "Make each step clear, actionable, and include any necessary details.",
            "Focus on practical solutions based on the historical resolutions above."
        ])
        
        return "\n".join(prompt_parts)
    
    def _parse_llm_response(self, llm_response: str) -> List[str]:
        """Parse LLM response into individual resolution steps."""
        lines = llm_response.strip().split('\n')
        steps = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Remove numbering patterns (1., 1), Step 1:, etc.)
            import re
            step_text = re.sub(r'^(\d+[\.\)]\s*|\**Step\s*\d+\**:?\s*)', '', line, flags=re.IGNORECASE)
            step_text = step_text.strip()
            
            if step_text and len(step_text) > 10:  # Filter out very short lines
                steps.append(step_text)
        
        # If parsing fails, try splitting by common patterns
        if not steps:
            # Try splitting by sentences or periods
            sentences = llm_response.split('. ')
            for sentence in sentences:
                sentence = sentence.strip()
                if len(sentence) > 20:
                    steps.append(sentence)
        
        # Ensure we have at least some steps
        if not steps:
            steps = [llm_response.strip()]
        
        return steps[:8]  # Limit to 8 steps maximum
    
    def _fallback_resolution_steps(self, prompt: str) -> List[str]:
        """Generate fallback resolution steps when LLM is unavailable."""
        # Basic fallback based on common support patterns
        steps = [
            "Gather detailed information about the reported issue",
            "Review user account status and recent activity",
            "Check system logs for relevant error messages",
            "Apply appropriate troubleshooting procedures",
            "Test the solution to ensure it resolves the problem",
            "Document the resolution for future reference",
            "Follow up with the user to confirm satisfaction"
        ]
        
        # Customize based on detected keywords
        prompt_lower = prompt.lower()
        if "login" in prompt_lower or "auth" in prompt_lower:
            steps.insert(1, "Verify user credentials and authentication status")
            steps.insert(2, "Check for account lockouts or security issues")
        elif "payment" in prompt_lower or "billing" in prompt_lower:
            steps.insert(1, "Review billing history and payment methods")
            steps.insert(2, "Process any necessary refunds or adjustments")
        elif "api" in prompt_lower or "integration" in prompt_lower:
            steps.insert(1, "Review API logs and integration configuration")
            steps.insert(2, "Check for rate limiting or authentication issues")
        
        return steps
    
    def _extract_subject(self, user_message: str, chat_result: Dict[str, Any]) -> str:
        """Extract appropriate subject line using AI processing."""
        # Use AI-processed normalized prompt from chat result
        subject = chat_result.get("normalized_prompt", user_message)
        
        # AI agents should provide well-formatted subjects
        # Only limit to reasonable length if needed
        if len(subject) > 120:
            subject = subject[:117] + "..."
        
        # Add category prefix if detected by AI classification
        category = chat_result.get("suggested_category", "")
        if category and category != "general":
            subject = f"[{category.title()}] {subject}"
        
        return subject
    
    def _generate_ticket_id(self) -> int:
        """Generate unique ticket ID."""
        return int(datetime.utcnow().timestamp() * 1000) % 1000000
    
    def _build_formatting_context(self, chat_result: Dict[str, Any], 
                                instruction_result: Dict[str, Any],
                                ticket_lookup_result: Dict[str, Any],
                                resolutions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build comprehensive context for ticket formatting."""
        return {
            "urgency_level": chat_result.get("urgency_level"),
            "suggested_category": chat_result.get("suggested_category"),
            "normalized_prompt": chat_result.get("normalized_prompt"),
            "processing_metadata": chat_result.get("processing_metadata"),
            "similar_tickets": ticket_lookup_result.get("similar_tickets", []),
            "relevant_instructions": instruction_result.get("instructions_found", []),
            "historical_resolutions": resolutions,
            "confidence_scores": chat_result.get("confidence_scores", {}),
            "pii_detected": len(chat_result.get("pii_detected", [])) > 0,
            "llm_enhanced": True
        }
    
    def _determine_formatting_style(self, chat_result: Dict[str, Any]) -> str:
        """Determine appropriate formatting style based on analysis."""
        category = chat_result.get("suggested_category", "general")
        urgency = chat_result.get("urgency_level", "medium")
        
        # Technical issues get technical formatting
        if category in ["technical", "api"]:
            return "technical"
        
        # High urgency gets professional formatting
        if urgency in ["high", "critical"]:
            return "professional"
        
        # Default to customer-friendly
        return "customer_friendly"
    
    def get_workflow_summary(self, workflow_result: Dict[str, Any]) -> Dict[str, Any]:
        """Get summary of the complete workflow for monitoring."""
        metadata = workflow_result.get("workflow_metadata", {})
        final_ticket = workflow_result.get("final_ticket", {})
        
        return {
            "request_id": workflow_result.get("request_id"),
            "success": metadata.get("success", False),
            "total_time_ms": metadata.get("total_time_ms", 0),
            "steps_completed": len(metadata.get("steps_completed", [])),
            "ticket_generated": bool(final_ticket.get("ticket_id")),
            "urgency": final_ticket.get("urgency"),
            "category": final_ticket.get("category"),
            "resolution_steps": final_ticket.get("resolution_steps_count", 0),
            "sources_used": final_ticket.get("sources_used", {})
        }