#!/usr/bin/env python3
"""
Agent Workflow Verification Test Suite
Tests all components of the agent system including vector storage, MCP services, and individual agents.
"""

import asyncio
import json
import time
import traceback
from datetime import datetime
from pathlib import Path
import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    import requests
    # Import from the correct file structure
    from agents.chat_processor_agent import ChatProcessorAgent
    from agents.instruction_lookup_agent import InstructionLookupAgent
    from agents.ticket_lookup_agent import TicketLookupAgent
    from agents.ticket_formatter_agent import TicketFormatterAgent
    from agents.support_team_agent import SupportTeamAgent
    from agents.multi_agent_orchestrator import MultiAgentOrchestrator
except ImportError as e:
    print(f"Import error: {e}")
    print("Available files in agents directory:")
    import os
    if os.path.exists("agents"):
        for file in os.listdir("agents"):
            if file.endswith(".py"):
                print(f"  {file}")
    sys.exit(1)

class AgentWorkflowTester:
    """Comprehensive test suite for the agent workflow system."""
    
    def __init__(self):
        self.test_results = {}
        self.start_time = datetime.now()
        
    def log_test(self, test_name: str, status: str, details: dict = None):
        """Log test results."""
        self.test_results[test_name] = {
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'details': details or {}
        }
        print(f"[{status}] {test_name}")
        if details:
            for key, value in details.items():
                print(f"  {key}: {value}")
        print()
        
    def test_qdrant_connectivity(self):
        """Test Qdrant vector database connectivity."""
        try:
            # Test collections endpoint
            response = requests.get("http://localhost:6333/collections", timeout=5)
            if response.status_code == 200:
                collections = response.json()
                self.log_test("Qdrant Connectivity", "PASS", {
                    "collections_count": len(collections.get('result', {}).get('collections', [])),
                    "collections": [c['name'] for c in collections.get('result', {}).get('collections', [])]
                })
                return True
            else:
                self.log_test("Qdrant Connectivity", "FAIL", {
                    "error": f"HTTP {response.status_code}",
                    "fallback": "Using local vector storage"
                })
                return False
        except Exception as e:
            self.log_test("Qdrant Connectivity", "FAIL", {
                "error": str(e),
                "fallback": "Using local vector storage"
            })
            return False
            
    def test_qdrant_collections(self):
        """Test specific Qdrant collections."""
        try:
            # Test instruction_texts collection
            response = requests.post(
                "http://localhost:6333/collections/instruction_texts/points/search",
                json={
                    "vector": [0.1] * 1536,  # Dummy embedding
                    "limit": 1
                },
                timeout=5
            )
            
            if response.status_code == 200:
                results = response.json()
                self.log_test("Qdrant instruction_texts Collection", "PASS", {
                    "hits": len(results.get('result', [])),
                    "collection_exists": True
                })
            else:
                self.log_test("Qdrant instruction_texts Collection", "FAIL", {
                    "error": f"HTTP {response.status_code}"
                })
                
            # Test ticket_rag collection
            response = requests.post(
                "http://localhost:6333/collections/ticket_rag/points/search",
                json={
                    "vector": [0.1] * 1536,  # Dummy embedding
                    "limit": 1
                },
                timeout=5
            )
            
            if response.status_code == 200:
                results = response.json()
                self.log_test("Qdrant ticket_rag Collection", "PASS", {
                    "hits": len(results.get('result', [])),
                    "collection_exists": True
                })
            else:
                self.log_test("Qdrant ticket_rag Collection", "FAIL", {
                    "error": f"HTTP {response.status_code}"
                })
                
        except Exception as e:
            self.log_test("Qdrant Collections", "FAIL", {
                "error": str(e)
            })
            
    def test_mcp_fastapi_health(self):
        """Test MCP FastAPI service health."""
        try:
            response = requests.get("http://localhost:8001/healthz", timeout=5)
            if response.status_code == 200:
                health_data = response.json()
                self.log_test("MCP FastAPI Health", "PASS", {
                    "status": health_data.get('status'),
                    "timestamp": health_data.get('timestamp')
                })
                return True
            else:
                self.log_test("MCP FastAPI Health", "FAIL", {
                    "error": f"HTTP {response.status_code}"
                })
                return False
        except Exception as e:
            self.log_test("MCP FastAPI Health", "FAIL", {
                "error": str(e)
            })
            return False
            
    def test_mcp_instructions_crud(self):
        """Test MCP instructions CRUD operations."""
        try:
            # Test GET /instructions/
            response = requests.get("http://localhost:8001/instructions/", timeout=5)
            if response.status_code == 200:
                instructions = response.json()
                self.log_test("MCP Instructions CRUD", "PASS", {
                    "instructions_count": len(instructions),
                    "endpoint": "GET /instructions/"
                })
            else:
                self.log_test("MCP Instructions CRUD", "FAIL", {
                    "error": f"HTTP {response.status_code}",
                    "endpoint": "GET /instructions/"
                })
        except Exception as e:
            self.log_test("MCP Instructions CRUD", "FAIL", {
                "error": str(e)
            })
            
    def test_mcp_tickets_similarity(self):
        """Test MCP tickets similarity search."""
        try:
            response = requests.get(
                "http://localhost:8001/tickets/similar/?query=test&top_k=1", 
                timeout=5
            )
            if response.status_code == 200:
                results = response.json()
                self.log_test("MCP Tickets Similarity", "PASS", {
                    "results_count": len(results),
                    "query": "test",
                    "top_k": 1
                })
            else:
                self.log_test("MCP Tickets Similarity", "FAIL", {
                    "error": f"HTTP {response.status_code}"
                })
        except Exception as e:
            self.log_test("MCP Tickets Similarity", "FAIL", {
                "error": str(e)
            })
            
    async def test_chat_preprocessor_agent(self):
        """Test ChatProcessorAgent."""
        try:
            agent = ChatProcessorAgent()
            
            test_message = "I can't login to my account and need help"
            test_session_id = "test_session_123"
            test_context = {
                "url": "https://example.com/login",
                "page_title": "Login Page",
                "user_agent": "Test Browser"
            }
            
            start_time = time.time()
            result = await agent.process_message(test_message, test_session_id, test_context)
            processing_time = (time.time() - start_time) * 1000
            
            self.log_test("ChatProcessorAgent", "PASS", {
                "input_message": test_message,
                "output_normalized": result.get('normalized_message', 'N/A'),
                "detected_language": result.get('language', 'N/A'),
                "detected_intent": result.get('intent', 'N/A'),
                "processing_time_ms": round(processing_time, 2),
                "session_id": test_session_id
            })
            
        except Exception as e:
            self.log_test("ChatProcessorAgent", "FAIL", {
                "error": str(e),
                "traceback": traceback.format_exc()
            })
            
    async def test_instruction_lookup_agent(self):
        """Test InstructionLookupAgent."""
        try:
            agent = InstructionLookupAgent()
            
            test_query = "password reset procedure"
            test_context = {"tenant_id": 1, "user_type": "customer"}
            
            start_time = time.time()
            result = await agent.run(test_query, test_context)
            processing_time = (time.time() - start_time) * 1000
            
            self.log_test("InstructionLookupAgent", "PASS", {
                "input_query": test_query,
                "instructions_found": len(result.get('instructions', [])),
                "top_instruction": result.get('instructions', [{}])[0].get('title', 'N/A') if result.get('instructions') else 'N/A',
                "confidence_score": result.get('confidence_score', 0),
                "processing_time_ms": round(processing_time, 2),
                "vector_storage_type": "local" if not self.test_qdrant_connectivity() else "qdrant"
            })
            
        except Exception as e:
            self.log_test("InstructionLookupAgent", "FAIL", {
                "error": str(e),
                "traceback": traceback.format_exc()
            })
            
    async def test_ticket_lookup_agent(self):
        """Test TicketLookupAgent."""
        try:
            agent = TicketLookupAgent()
            
            test_query = "login issues with password"
            test_context = {"tenant_id": 1, "limit": 3}
            
            start_time = time.time()
            result = await agent.run(test_query, test_context)
            processing_time = (time.time() - start_time) * 1000
            
            self.log_test("TicketLookupAgent", "PASS", {
                "input_query": test_query,
                "similar_tickets_found": len(result.get('similar_tickets', [])),
                "top_ticket": result.get('similar_tickets', [{}])[0].get('title', 'N/A') if result.get('similar_tickets') else 'N/A',
                "confidence_score": result.get('confidence_score', 0),
                "processing_time_ms": round(processing_time, 2),
                "data_source": result.get('data_source', 'database')
            })
            
        except Exception as e:
            self.log_test("TicketLookupAgent", "FAIL", {
                "error": str(e),
                "traceback": traceback.format_exc()
            })
            
    async def test_ticket_formatter_agent(self):
        """Test TicketFormatterAgent."""
        try:
            agent = TicketFormatterAgent()
            
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
            result = await agent.run(test_data)
            processing_time = (time.time() - start_time) * 1000
            
            self.log_test("TicketFormatterAgent", "PASS", {
                "input_message": test_data["user_message"],
                "generated_title": result.get('ticket_title', 'N/A'),
                "generated_category": result.get('category', 'N/A'),
                "urgency_level": result.get('urgency', 'N/A'),
                "confidence_score": result.get('confidence_score', 0),
                "processing_time_ms": round(processing_time, 2),
                "resolution_steps": len(result.get('resolution_steps', []))
            })
            
        except Exception as e:
            self.log_test("TicketFormatterAgent", "FAIL", {
                "error": str(e),
                "traceback": traceback.format_exc()
            })
            
    async def test_support_team_orchestrator(self):
        """Test SupportTeamOrchestrator (main workflow)."""
        try:
            orchestrator = SupportTeamOrchestrator()
            
            test_request = {
                "user_message": "I'm having trouble logging into my account after the recent update",
                "user_context": {
                    "url": "https://example.com/login",
                    "user_agent": "Mozilla/5.0",
                    "tenant_id": 1
                },
                "tenant_id": 1,
                "user_id": "test_user_456"
            }
            
            start_time = time.time()
            result = await orchestrator.run(test_request)
            processing_time = (time.time() - start_time) * 1000
            
            self.log_test("SupportTeamOrchestrator", "PASS", {
                "input_message": test_request["user_message"],
                "workflow_success": result.get('success', False),
                "ticket_title": result.get('ticket_title', 'N/A'),
                "final_status": result.get('status', 'N/A'),
                "category": result.get('category', 'N/A'),
                "urgency": result.get('urgency', 'N/A'),
                "confidence_score": result.get('confidence_score', 0),
                "resolution_steps_count": len(result.get('resolution_steps', [])),
                "processing_time_ms": round(processing_time, 2),
                "agents_used": "All 4 sub-agents"
            })
            
        except Exception as e:
            self.log_test("SupportTeamOrchestrator", "FAIL", {
                "error": str(e),
                "traceback": traceback.format_exc()
            })
            
    def generate_test_report(self):
        """Generate a comprehensive test report."""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result['status'] == 'PASS')
        failed_tests = total_tests - passed_tests
        
        report = {
            "test_summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "success_rate": f"{(passed_tests/total_tests)*100:.1f}%" if total_tests > 0 else "0%",
                "test_duration": str(datetime.now() - self.start_time)
            },
            "detailed_results": self.test_results,
            "recommendations": self.generate_recommendations()
        }
        
        return report
        
    def generate_recommendations(self):
        """Generate recommendations based on test results."""
        recommendations = []
        
        # Check Qdrant status
        qdrant_tests = [k for k in self.test_results.keys() if 'Qdrant' in k]
        if any(self.test_results[test]['status'] == 'FAIL' for test in qdrant_tests):
            recommendations.append("Start Qdrant service: docker run -p 6333:6333 qdrant/qdrant")
            
        # Check MCP FastAPI status
        mcp_tests = [k for k in self.test_results.keys() if 'MCP' in k]
        if any(self.test_results[test]['status'] == 'FAIL' for test in mcp_tests):
            recommendations.append("Start MCP FastAPI service: python mcp_service/main.py")
            
        # Check agent performance
        agent_tests = [k for k in self.test_results.keys() if 'Agent' in k]
        failed_agents = [test for test in agent_tests if self.test_results[test]['status'] == 'FAIL']
        if failed_agents:
            recommendations.append(f"Review agent configurations for: {', '.join(failed_agents)}")
            
        if not recommendations:
            recommendations.append("All systems operational - no immediate actions required")
            
        return recommendations
        
    async def run_all_tests(self):
        """Run the complete test suite."""
        print("=" * 80)
        print("AGENT WORKFLOW VERIFICATION TEST SUITE")
        print("=" * 80)
        print()
        
        # Infrastructure tests
        print("🔧 INFRASTRUCTURE TESTS")
        print("-" * 40)
        self.test_qdrant_connectivity()
        self.test_qdrant_collections()
        self.test_mcp_fastapi_health()
        self.test_mcp_instructions_crud()
        self.test_mcp_tickets_similarity()
        
        # Agent tests
        print("🤖 AGENT TESTS")
        print("-" * 40)
        await self.test_chat_preprocessor_agent()
        await self.test_instruction_lookup_agent()
        await self.test_ticket_lookup_agent()
        await self.test_ticket_formatter_agent()
        await self.test_support_team_orchestrator()
        
        # Generate report
        print("📊 TEST REPORT")
        print("-" * 40)
        report = self.generate_test_report()
        
        print(f"Total Tests: {report['test_summary']['total_tests']}")
        print(f"Passed: {report['test_summary']['passed']}")
        print(f"Failed: {report['test_summary']['failed']}")
        print(f"Success Rate: {report['test_summary']['success_rate']}")
        print(f"Duration: {report['test_summary']['test_duration']}")
        print()
        
        print("💡 RECOMMENDATIONS")
        print("-" * 40)
        for rec in report['recommendations']:
            print(f"• {rec}")
        print()
        
        # Save detailed report
        report_file = f"agent_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        print(f"📄 Detailed report saved to: {report_file}")
        
        return report

async def main():
    """Main test execution."""
    tester = AgentWorkflowTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())