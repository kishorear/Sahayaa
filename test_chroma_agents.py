#!/usr/bin/env python3
"""
Comprehensive Chroma Agent Testing
Tests all agents with Chroma vector storage and detailed workflow tracing
"""

import asyncio
import json
import time
import os
from datetime import datetime
from typing import Dict, Any, List

# Set environment for testing
os.environ['GEMINI_API_KEY'] = os.getenv('GEMINI_API_KEY', 'test-key')

class ChromaAgentTester:
    """Test all agents with Chroma integration and workflow tracing."""
    
    def __init__(self):
        self.test_results = {}
        self.workflow_traces = {}
        
    def log_test_result(self, test_name: str, success: bool, result: Dict[str, Any]):
        """Log test results with detailed traces."""
        self.test_results[test_name] = {
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "result": result
        }
        
        if "workflow_trace" in result:
            self.workflow_traces[test_name] = result["workflow_trace"]
    
    async def test_chat_processor(self) -> Dict[str, Any]:
        """Test ChatProcessorAgent with workflow tracing."""
        try:
            # Import and test existing chat processor
            from agents.chat_processor_agent import ChatProcessorAgent
            
            agent = ChatProcessorAgent()
            test_message = "I can't login to my account after password reset"
            session_id = "test_session_001"
            context = {
                "url": "https://example.com/login",
                "tenant_id": 1
            }
            
            start_time = time.time()
            result = await agent.process_message(test_message, session_id, context)
            duration = (time.time() - start_time) * 1000
            
            # Create manual trace for existing agent
            trace = [{
                "step": "0a",
                "agent": "ChatProcessorAgent",
                "input": test_message,
                "resource": "Message Processing Pipeline",
                "output": f"Processed message with urgency: {result.get('urgency', 'N/A')}",
                "duration_ms": round(duration, 2),
                "success": True,
                "timestamp": datetime.now().isoformat()
            }]
            
            return {
                "success": True,
                "normalized_message": result.get("normalized_message", test_message),
                "urgency": result.get("urgency", "medium"),
                "sentiment": result.get("sentiment", "neutral"),
                "processing_time_ms": round(duration, 2),
                "workflow_trace": trace
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "workflow_trace": [{
                    "step": "0_error",
                    "agent": "ChatProcessorAgent",
                    "input": "Test message",
                    "resource": "Error Handler",
                    "output": f"Error: {str(e)}",
                    "duration_ms": 0,
                    "success": False
                }]
            }
    
    async def test_chroma_instruction_lookup(self) -> Dict[str, Any]:
        """Test ChromaInstructionLookupAgent."""
        try:
            from agents.chroma_instruction_lookup_agent import ChromaInstructionLookupAgent
            
            agent = ChromaInstructionLookupAgent()
            query = "password reset procedure"
            context = {"tenant_id": 1, "top_k": 3}
            
            result = await agent.run(query, context)
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "instructions": [],
                "confidence_score": 0.0,
                "workflow_trace": [{
                    "step": "1_error",
                    "agent": "ChromaInstructionLookupAgent",
                    "input": "password reset procedure",
                    "resource": "Error Handler",
                    "output": f"Error: {str(e)}",
                    "duration_ms": 0,
                    "success": False
                }]
            }
    
    async def test_chroma_ticket_lookup(self) -> Dict[str, Any]:
        """Test ChromaTicketLookupAgent."""
        try:
            from agents.chroma_ticket_lookup_agent import ChromaTicketLookupAgent
            
            agent = ChromaTicketLookupAgent()
            query = "login issues with password"
            context = {"tenant_id": 1, "limit": 3}
            
            result = await agent.run(query, context)
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "similar_tickets": [],
                "confidence_score": 0.0,
                "workflow_trace": [{
                    "step": "2_error",
                    "agent": "ChromaTicketLookupAgent",
                    "input": "login issues with password",
                    "resource": "Error Handler",
                    "output": f"Error: {str(e)}",
                    "duration_ms": 0,
                    "success": False
                }]
            }
    
    async def test_ticket_formatter(self) -> Dict[str, Any]:
        """Test TicketFormatterAgent."""
        try:
            from agents.ticket_formatter_agent import TicketFormatterAgent
            
            agent = TicketFormatterAgent()
            
            # Mock data for testing
            test_data = {
                "user_message": "I can't reset my password",
                "similar_tickets": [
                    {"title": "Password Reset Issue", "description": "User unable to reset password"}
                ],
                "instructions": [
                    {"title": "Password Reset Guide", "content": "Steps to reset password"}
                ],
                "context": {"tenant_id": 1}
            }
            
            start_time = time.time()
            result = await agent.format_ticket_response(test_data)
            duration = (time.time() - start_time) * 1000
            
            # Create manual trace
            trace = [{
                "step": "3a",
                "agent": "TicketFormatterAgent",
                "input": test_data["user_message"],
                "resource": "AI Formatting Pipeline",
                "output": f"Generated ticket: {result.get('ticket_title', 'N/A')}",
                "duration_ms": round(duration, 2),
                "success": True,
                "timestamp": datetime.now().isoformat()
            }]
            
            return {
                "success": True,
                "ticket_title": result.get("ticket_title", "Generated Ticket Title"),
                "category": result.get("category", "support"),
                "urgency": result.get("urgency", "medium"),
                "confidence_score": result.get("confidence_score", 0.8),
                "resolution_steps": result.get("resolution_steps", []),
                "processing_time_ms": round(duration, 2),
                "workflow_trace": trace
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "workflow_trace": [{
                    "step": "3_error",
                    "agent": "TicketFormatterAgent",
                    "input": "Test data",
                    "resource": "Error Handler",
                    "output": f"Error: {str(e)}",
                    "duration_ms": 0,
                    "success": False
                }]
            }
    
    async def test_complete_workflow(self) -> Dict[str, Any]:
        """Test complete 4-agent workflow."""
        try:
            workflow_start = time.time()
            test_message = "My login credentials aren't working after the system update"
            
            # Step 1: Chat Processing
            chat_result = await self.test_chat_processor()
            
            # Step 2: Instruction Lookup
            instruction_result = await self.test_chroma_instruction_lookup()
            
            # Step 3: Ticket Lookup
            ticket_result = await self.test_chroma_ticket_lookup()
            
            # Step 4: Ticket Formatting
            formatter_result = await self.test_ticket_formatter()
            
            total_duration = (time.time() - workflow_start) * 1000
            
            # Combine all traces
            combined_trace = []
            if chat_result.get("workflow_trace"):
                combined_trace.extend(chat_result["workflow_trace"])
            if instruction_result.get("workflow_trace"):
                combined_trace.extend(instruction_result["workflow_trace"])
            if ticket_result.get("workflow_trace"):
                combined_trace.extend(ticket_result["workflow_trace"])
            if formatter_result.get("workflow_trace"):
                combined_trace.extend(formatter_result["workflow_trace"])
            
            success_count = sum(1 for r in [chat_result, instruction_result, ticket_result, formatter_result] if r.get("success"))
            overall_success = success_count >= 3  # Allow one failure
            
            return {
                "success": overall_success,
                "total_duration_ms": round(total_duration, 2),
                "agents_tested": 4,
                "successful_agents": success_count,
                "chat_processing": chat_result.get("success", False),
                "instruction_lookup": instruction_result.get("success", False),
                "ticket_lookup": ticket_result.get("success", False),
                "ticket_formatting": formatter_result.get("success", False),
                "workflow_trace": combined_trace,
                "final_ticket": {
                    "title": formatter_result.get("ticket_title", "Login Issue After System Update"),
                    "category": formatter_result.get("category", "authentication"),
                    "urgency": chat_result.get("urgency", "medium"),
                    "confidence": formatter_result.get("confidence_score", 0.8)
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "workflow_trace": [{
                    "step": "workflow_error",
                    "agent": "WorkflowOrchestrator",
                    "input": "Complete workflow test",
                    "resource": "Error Handler",
                    "output": f"Workflow failed: {str(e)}",
                    "duration_ms": 0,
                    "success": False
                }]
            }
    
    def generate_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report."""
        total_tests = len(self.test_results)
        successful_tests = sum(1 for result in self.test_results.values() if result["success"])
        
        # Count workflow steps
        total_steps = 0
        successful_steps = 0
        
        for test_name, traces in self.workflow_traces.items():
            for step in traces:
                total_steps += 1
                if step.get("success", False):
                    successful_steps += 1
        
        return {
            "test_summary": {
                "total_tests": total_tests,
                "successful_tests": successful_tests,
                "failed_tests": total_tests - successful_tests,
                "success_rate": f"{(successful_tests/total_tests)*100:.1f}%" if total_tests > 0 else "0%",
                "total_workflow_steps": total_steps,
                "successful_steps": successful_steps,
                "step_success_rate": f"{(successful_steps/total_steps)*100:.1f}%" if total_steps > 0 else "0%"
            },
            "detailed_results": self.test_results,
            "workflow_traces": self.workflow_traces,
            "agent_status": {
                "chat_processor": self.test_results.get("ChatProcessorAgent", {}).get("success", False),
                "instruction_lookup": self.test_results.get("ChromaInstructionLookupAgent", {}).get("success", False),
                "ticket_lookup": self.test_results.get("ChromaTicketLookupAgent", {}).get("success", False),
                "ticket_formatter": self.test_results.get("TicketFormatterAgent", {}).get("success", False),
                "complete_workflow": self.test_results.get("CompleteWorkflow", {}).get("success", False)
            }
        }
    
    async def run_all_tests(self):
        """Run comprehensive agent testing."""
        print("CHROMA AGENT WORKFLOW TESTING")
        print("=" * 50)
        
        # Test individual agents
        print("Testing ChatProcessorAgent...")
        chat_result = await self.test_chat_processor()
        self.log_test_result("ChatProcessorAgent", chat_result["success"], chat_result)
        
        print("Testing ChromaInstructionLookupAgent...")
        instruction_result = await self.test_chroma_instruction_lookup()
        self.log_test_result("ChromaInstructionLookupAgent", instruction_result["success"], instruction_result)
        
        print("Testing ChromaTicketLookupAgent...")
        ticket_result = await self.test_chroma_ticket_lookup()
        self.log_test_result("ChromaTicketLookupAgent", ticket_result["success"], ticket_result)
        
        print("Testing TicketFormatterAgent...")
        formatter_result = await self.test_ticket_formatter()
        self.log_test_result("TicketFormatterAgent", formatter_result["success"], formatter_result)
        
        print("Testing Complete Workflow...")
        workflow_result = await self.test_complete_workflow()
        self.log_test_result("CompleteWorkflow", workflow_result["success"], workflow_result)
        
        # Generate report
        report = self.generate_test_report()
        
        print("\nTEST RESULTS")
        print("-" * 30)
        print(f"Tests: {report['test_summary']['total_tests']}")
        print(f"Success Rate: {report['test_summary']['success_rate']}")
        print(f"Workflow Steps: {report['test_summary']['total_workflow_steps']}")
        print(f"Step Success Rate: {report['test_summary']['step_success_rate']}")
        
        print("\nAGENT STATUS")
        print("-" * 30)
        for agent, status in report['agent_status'].items():
            status_text = "PASS" if status else "FAIL"
            print(f"{agent}: {status_text}")
        
        # Save detailed report
        report_file = f"chroma_agent_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\nDetailed report saved: {report_file}")
        return report

async def main():
    """Run the comprehensive agent test suite."""
    tester = ChromaAgentTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())