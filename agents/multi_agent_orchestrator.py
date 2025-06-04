"""
Multi-Agent Orchestrator - Coordinates all four agents for complete customer support workflow
Demonstrates end-to-end processing from raw chat input to formatted ticket resolution.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio

from .chat_processor_agent import ChatProcessorAgent
from .instruction_lookup_agent import InstructionLookupAgent
from .ticket_lookup_agent import TicketLookupAgent
from .ticket_formatter_agent import TicketFormatterAgent

logger = logging.getLogger(__name__)

class MultiAgentOrchestrator:
    """
    Orchestrates the complete multi-agent customer support workflow.
    Coordinates ChatProcessor, InstructionLookup, TicketLookup, and TicketFormatter agents.
    """
    
    def __init__(self, mcp_service_url: str = "http://localhost:8000"):
        self.mcp_service_url = mcp_service_url
        
        # Initialize all agents
        self.chat_processor = ChatProcessorAgent()
        self.instruction_lookup = InstructionLookupAgent(mcp_service_url)
        self.ticket_lookup = TicketLookupAgent(mcp_service_url)
        self.ticket_formatter = TicketFormatterAgent()
        
        logger.info("Multi-agent orchestrator initialized with all four agents")
    
    def process_support_request(self, raw_user_input: str, 
                              user_context: Optional[Dict[str, Any]] = None,
                              ticket_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Complete end-to-end processing of a customer support request.
        
        Args:
            raw_user_input: Raw customer chat input
            user_context: User session context (tenant_id, user_id, etc.)
            ticket_id: Optional existing ticket ID
        
        Returns:
            Complete processing result with all agent outputs
        """
        try:
            start_time = datetime.utcnow()
            
            # Initialize orchestration result
            orchestration_result = {
                "request_id": f"req_{int(start_time.timestamp())}",
                "raw_input": raw_user_input,
                "user_context": user_context or {},
                "ticket_id": ticket_id,
                "processing_stages": {},
                "final_output": {},
                "orchestration_metadata": {
                    "start_time": start_time.isoformat(),
                    "total_processing_time_ms": 0,
                    "agents_used": [],
                    "success": False
                }
            }
            
            logger.info(f"Starting multi-agent processing for request: {orchestration_result['request_id']}")
            
            # Stage 1: Chat Processing Agent
            stage1_start = datetime.utcnow()
            chat_result = self.chat_processor.process_chat(raw_user_input, user_context)
            stage1_time = (datetime.utcnow() - stage1_start).total_seconds() * 1000
            
            orchestration_result["processing_stages"]["chat_processing"] = {
                "result": chat_result,
                "processing_time_ms": round(stage1_time, 2),
                "success": chat_result.get("normalized_prompt") is not None
            }
            orchestration_result["orchestration_metadata"]["agents_used"].append("ChatProcessorAgent")
            
            normalized_prompt = chat_result.get("normalized_prompt", "")
            if not normalized_prompt:
                raise ValueError("Chat processing failed to produce normalized prompt")
            
            # Stage 2: Parallel Lookup Operations
            stage2_start = datetime.utcnow()
            
            # Run instruction and ticket lookups in parallel for efficiency
            instruction_result, ticket_result = self._run_parallel_lookups(
                normalized_prompt, chat_result
            )
            
            stage2_time = (datetime.utcnow() - stage2_start).total_seconds() * 1000
            
            orchestration_result["processing_stages"]["instruction_lookup"] = {
                "result": instruction_result,
                "processing_time_ms": round(stage2_time * 0.5, 2),  # Approximate split
                "success": len(instruction_result.get("instructions_found", [])) > 0
            }
            
            orchestration_result["processing_stages"]["ticket_lookup"] = {
                "result": ticket_result,
                "processing_time_ms": round(stage2_time * 0.5, 2),  # Approximate split
                "success": len(ticket_result.get("similar_tickets", [])) > 0
            }
            
            orchestration_result["orchestration_metadata"]["agents_used"].extend([
                "InstructionLookupAgent", "TicketLookupAgent"
            ])
            
            # Stage 3: Generate Resolution Steps
            resolution_steps = self._generate_resolution_steps(
                chat_result, instruction_result, ticket_result
            )
            
            # Stage 4: Ticket Formatting Agent
            stage4_start = datetime.utcnow()
            
            # Determine ticket ID for formatting
            format_ticket_id = ticket_id or self._generate_ticket_id()
            
            # Create comprehensive context for formatting
            formatting_context = self._build_formatting_context(
                chat_result, instruction_result, ticket_result
            )
            
            # Choose formatting style based on urgency and category
            formatting_style = self._determine_formatting_style(chat_result)
            
            formatter_result = self.ticket_formatter.format_ticket(
                ticket_id=format_ticket_id,
                subject=self._extract_subject(raw_user_input, chat_result),
                resolution_steps=resolution_steps,
                context=formatting_context,
                style=formatting_style
            )
            
            stage4_time = (datetime.utcnow() - stage4_start).total_seconds() * 1000
            
            orchestration_result["processing_stages"]["ticket_formatting"] = {
                "result": formatter_result,
                "processing_time_ms": round(stage4_time, 2),
                "success": formatter_result.get("formatted_body") is not None
            }
            orchestration_result["orchestration_metadata"]["agents_used"].append("TicketFormatterAgent")
            
            # Stage 5: Compile Final Output
            final_output = self._compile_final_output(
                chat_result, instruction_result, ticket_result, formatter_result
            )
            
            orchestration_result["final_output"] = final_output
            
            # Calculate total processing time
            end_time = datetime.utcnow()
            total_time = (end_time - start_time).total_seconds() * 1000
            orchestration_result["orchestration_metadata"]["total_processing_time_ms"] = round(total_time, 2)
            orchestration_result["orchestration_metadata"]["end_time"] = end_time.isoformat()
            orchestration_result["orchestration_metadata"]["success"] = True
            
            logger.info(f"Multi-agent processing completed successfully in {total_time:.2f}ms")
            return orchestration_result
            
        except Exception as e:
            logger.error(f"Multi-agent orchestration failed: {e}")
            
            end_time = datetime.utcnow()
            total_time = (end_time - start_time).total_seconds() * 1000
            
            orchestration_result["orchestration_metadata"]["total_processing_time_ms"] = round(total_time, 2)
            orchestration_result["orchestration_metadata"]["end_time"] = end_time.isoformat()
            orchestration_result["orchestration_metadata"]["success"] = False
            orchestration_result["orchestration_metadata"]["error"] = str(e)
            
            return orchestration_result
    
    def _run_parallel_lookups(self, normalized_prompt: str, 
                            chat_context: Dict[str, Any]) -> tuple[Dict[str, Any], Dict[str, Any]]:
        """Run instruction and ticket lookups in parallel for efficiency."""
        try:
            # For now, run sequentially (can be made truly parallel with asyncio if needed)
            instruction_result = self.instruction_lookup.lookup_instructions(
                normalized_prompt, top_k=3, context=chat_context
            )
            
            ticket_result = self.ticket_lookup.lookup_similar_tickets(
                normalized_prompt, top_k=3, context=chat_context
            )
            
            return instruction_result, ticket_result
            
        except Exception as e:
            logger.error(f"Error in parallel lookups: {e}")
            return {}, {}
    
    def _generate_resolution_steps(self, chat_result: Dict[str, Any],
                                 instruction_result: Dict[str, Any],
                                 ticket_result: Dict[str, Any]) -> List[str]:
        """Generate resolution steps based on all agent outputs."""
        steps = []
        
        # Extract category and urgency for contextual steps
        category = chat_result.get("suggested_category", "general")
        urgency = chat_result.get("urgency_level", "medium")
        
        # Add category-specific initial steps
        if category == "authentication":
            steps.append("Verify user credentials and check account status")
            steps.append("Review authentication logs for recent login attempts")
        elif category == "billing":
            steps.append("Review account billing history and current subscription status")
            steps.append("Verify payment method and process any failed transactions")
        elif category == "technical":
            steps.append("Gather technical details about the user's environment")
            steps.append("Review system logs and error messages")
        else:
            steps.append("Gather detailed information about the reported issue")
            steps.append("Review user account and recent activity")
        
        # Add steps from relevant instructions
        instructions = instruction_result.get("instructions_found", [])
        for instruction in instructions[:2]:  # Use top 2 instructions
            content = instruction.get("content_excerpt", "")
            if content and len(content) > 50:
                # Extract actionable steps from instruction content
                action_step = f"Follow guidance from {instruction.get('title', 'documentation')}: {content[:150]}..."
                steps.append(action_step)
        
        # Add steps from similar resolved tickets
        similar_tickets = ticket_result.get("similar_tickets", [])
        resolved_tickets = [t for t in similar_tickets if t.get("resolution") and t.get("status") == "resolved"]
        
        if resolved_tickets:
            best_resolution = resolved_tickets[0].get("resolution", "")
            if best_resolution:
                steps.append(f"Apply similar resolution from ticket #{resolved_tickets[0].get('ticket_id')}: {best_resolution[:150]}...")
        
        # Add urgency-based steps
        if urgency in ["high", "critical"]:
            steps.append("Escalate to senior support team for immediate attention")
            steps.append("Monitor resolution progress and provide regular updates")
        else:
            steps.append("Test the solution thoroughly before marking as resolved")
            steps.append("Follow up with the user to confirm issue resolution")
        
        # Ensure we have at least basic steps
        if not steps:
            steps = [
                "Investigate the reported issue thoroughly",
                "Implement appropriate solution based on findings",
                "Verify the solution resolves the user's problem",
                "Document the resolution for future reference"
            ]
        
        return steps
    
    def _build_formatting_context(self, chat_result: Dict[str, Any],
                                instruction_result: Dict[str, Any],
                                ticket_result: Dict[str, Any]) -> Dict[str, Any]:
        """Build comprehensive context for ticket formatting."""
        return {
            "urgency_level": chat_result.get("urgency_level"),
            "suggested_category": chat_result.get("suggested_category"),
            "normalized_prompt": chat_result.get("normalized_prompt"),
            "processing_metadata": chat_result.get("processing_metadata"),
            "similar_tickets": ticket_result.get("similar_tickets", []),
            "relevant_instructions": instruction_result.get("instructions_found", []),
            "confidence_scores": chat_result.get("confidence_scores", {}),
            "pii_detected": len(chat_result.get("pii_detected", [])) > 0
        }
    
    def _determine_formatting_style(self, chat_result: Dict[str, Any]) -> str:
        """Determine appropriate formatting style based on chat analysis."""
        category = chat_result.get("suggested_category", "general")
        urgency = chat_result.get("urgency_level", "medium")
        
        # Technical issues get technical formatting
        if category in ["technical", "api"]:
            return "technical"
        
        # High urgency gets professional formatting
        if urgency in ["high", "critical"]:
            return "professional"
        
        # Default to customer-friendly for general inquiries
        return "customer_friendly"
    
    def _extract_subject(self, raw_input: str, chat_result: Dict[str, Any]) -> str:
        """Extract appropriate subject line for the ticket."""
        normalized = chat_result.get("normalized_prompt", raw_input)
        category = chat_result.get("suggested_category", "")
        
        # Truncate and clean up for subject line
        subject = normalized[:80] + "..." if len(normalized) > 80 else normalized
        
        # Add category prefix if available
        if category and category != "general":
            subject = f"[{category.title()}] {subject}"
        
        return subject
    
    def _generate_ticket_id(self) -> int:
        """Generate a ticket ID when none is provided."""
        return int(datetime.utcnow().timestamp() * 1000) % 1000000
    
    def _compile_final_output(self, chat_result: Dict[str, Any],
                            instruction_result: Dict[str, Any],
                            ticket_result: Dict[str, Any],
                            formatter_result: Dict[str, Any]) -> Dict[str, Any]:
        """Compile the final comprehensive output."""
        return {
            "ticket_summary": {
                "ticket_id": formatter_result.get("ticket_id"),
                "subject": formatter_result.get("subject"),
                "urgency": chat_result.get("urgency_level"),
                "category": chat_result.get("suggested_category"),
                "formatted_body": formatter_result.get("formatted_body")
            },
            "analysis_summary": {
                "pii_detected": len(chat_result.get("pii_detected", [])),
                "urgency_confidence": chat_result.get("confidence_scores", {}).get("urgency", 0),
                "category_confidence": chat_result.get("confidence_scores", {}).get("category", 0),
                "similar_tickets_found": len(ticket_result.get("similar_tickets", [])),
                "relevant_instructions_found": len(instruction_result.get("instructions_found", []))
            },
            "recommendations": {
                "similar_tickets": [
                    {
                        "ticket_id": t.get("ticket_id"),
                        "title": t.get("title"),
                        "relevance_score": t.get("relevance_score", 0)
                    }
                    for t in ticket_result.get("similar_tickets", [])[:3]
                ],
                "relevant_documentation": [
                    {
                        "title": i.get("title"),
                        "relevance_score": i.get("relevance_score", 0),
                        "source": i.get("filename")
                    }
                    for i in instruction_result.get("instructions_found", [])[:3]
                ]
            },
            "agent_performance": {
                "chat_processing_success": chat_result.get("normalized_prompt") is not None,
                "instruction_lookup_success": len(instruction_result.get("instructions_found", [])) > 0,
                "ticket_lookup_success": len(ticket_result.get("similar_tickets", [])) > 0,
                "formatting_success": formatter_result.get("formatted_body") is not None
            }
        }
    
    def get_orchestration_summary(self, orchestration_result: Dict[str, Any]) -> Dict[str, Any]:
        """Get a summary of the orchestration for monitoring/logging."""
        metadata = orchestration_result.get("orchestration_metadata", {})
        final_output = orchestration_result.get("final_output", {})
        
        return {
            "request_id": orchestration_result.get("request_id"),
            "success": metadata.get("success", False),
            "total_time_ms": metadata.get("total_processing_time_ms", 0),
            "agents_used": metadata.get("agents_used", []),
            "ticket_created": final_output.get("ticket_summary", {}).get("ticket_id") is not None,
            "urgency_detected": final_output.get("ticket_summary", {}).get("urgency"),
            "category_detected": final_output.get("ticket_summary", {}).get("category"),
            "similar_tickets_found": final_output.get("analysis_summary", {}).get("similar_tickets_found", 0),
            "instructions_found": final_output.get("analysis_summary", {}).get("relevant_instructions_found", 0)
        }


# Example usage and testing function
def demo_multi_agent_workflow():
    """Demonstrate the complete multi-agent workflow with example inputs."""
    orchestrator = MultiAgentOrchestrator()
    
    # Test cases representing different types of support requests
    test_cases = [
        {
            "description": "Authentication Issue - High Urgency",
            "input": "URGENT: I can't log into my account with email john@company.com and I need access immediately for a client presentation!",
            "context": {"user_id": "user123", "tenant_id": 1, "session_id": "sess_abc123"}
        },
        {
            "description": "Billing Question - Medium Priority",
            "input": "Hi, I have a question about my subscription billing. I was charged twice this month and need help understanding why.",
            "context": {"user_id": "user456", "tenant_id": 1}
        },
        {
            "description": "Technical API Issue",
            "input": "Our API integration is returning 500 errors when we try to create webhooks. This is affecting our production system.",
            "context": {"user_id": "dev789", "tenant_id": 2, "account_type": "enterprise"}
        },
        {
            "description": "General Support Request",
            "input": "How do I export my data from the platform? I need to create a backup for compliance purposes.",
            "context": {"user_id": "user999", "tenant_id": 1}
        }
    ]
    
    print("🤖 Multi-Agent Customer Support System Demo")
    print("=" * 60)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test Case {i}: {test_case['description']}")
        print(f"User Input: {test_case['input']}")
        print("-" * 40)
        
        try:
            # Process the support request
            result = orchestrator.process_support_request(
                raw_user_input=test_case["input"],
                user_context=test_case["context"]
            )
            
            # Display summary
            summary = orchestrator.get_orchestration_summary(result)
            final_output = result.get("final_output", {})
            
            print(f"✅ Processing: {'Success' if summary['success'] else 'Failed'}")
            print(f"⏱️  Total Time: {summary['total_time_ms']:.2f}ms")
            print(f"🎯 Urgency: {summary['urgency_detected']}")
            print(f"📂 Category: {summary['category_detected']}")
            print(f"🔍 Similar Tickets: {summary['similar_tickets_found']}")
            print(f"📚 Instructions Found: {summary['instructions_found']}")
            
            # Show ticket preview
            ticket_summary = final_output.get("ticket_summary", {})
            if ticket_summary.get("formatted_body"):
                print(f"\n📄 Generated Ticket Preview:")
                preview = ticket_summary["formatted_body"][:200] + "..." if len(ticket_summary["formatted_body"]) > 200 else ticket_summary["formatted_body"]
                print(preview)
            
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print("=" * 60)

if __name__ == "__main__":
    demo_multi_agent_workflow()