#!/usr/bin/env python3
"""
Simple Agent Verification Test
Tests the actual agent service endpoints and workflow components.
"""

import asyncio
import json
import time
import requests
from datetime import datetime
import sys
import os

class AgentVerificationTester:
    """Simple verification test for agent workflow system."""
    
    def __init__(self):
        self.results = {}
        self.base_url = "http://localhost:8001"
        self.node_api_url = "http://localhost:5000"
        
    def log_result(self, test_name: str, status: str, details: dict = None):
        """Log test results."""
        print(f"[{status}] {test_name}")
        if details:
            for key, value in details.items():
                print(f"  {key}: {value}")
        print()
        
        self.results[test_name] = {
            'status': status,
            'details': details or {},
            'timestamp': datetime.now().isoformat()
        }
        
    def test_qdrant_service(self):
        """Test Qdrant vector database."""
        print("🔧 Testing Qdrant Vector Service")
        print("-" * 40)
        
        try:
            response = requests.get("http://localhost:6333/collections", timeout=3)
            if response.status_code == 200:
                collections = response.json()
                collection_names = [c['name'] for c in collections.get('result', {}).get('collections', [])]
                
                self.log_result("Qdrant Collections", "PASS", {
                    "collections_found": len(collection_names),
                    "collections": collection_names
                })
                
                # Test instruction_texts collection
                if 'instruction_texts' in collection_names:
                    self.test_qdrant_search("instruction_texts", "password reset")
                    
                # Test ticket_rag collection  
                if 'ticket_rag' in collection_names:
                    self.test_qdrant_search("ticket_rag", "login problem")
                    
            else:
                self.log_result("Qdrant Collections", "FAIL", {
                    "error": f"HTTP {response.status_code}"
                })
        except Exception as e:
            self.log_result("Qdrant Service", "FAIL", {
                "error": str(e),
                "note": "Using local vector storage fallback"
            })
            
    def test_qdrant_search(self, collection: str, query: str):
        """Test Qdrant collection search."""
        try:
            # Simple test with dummy embedding
            dummy_vector = [0.1] * 1536
            response = requests.post(
                f"http://localhost:6333/collections/{collection}/points/search",
                json={"vector": dummy_vector, "limit": 3},
                timeout=3
            )
            
            if response.status_code == 200:
                results = response.json()
                self.log_result(f"Qdrant {collection} Search", "PASS", {
                    "query": query,
                    "hits": len(results.get('result', [])),
                    "collection": collection
                })
            else:
                self.log_result(f"Qdrant {collection} Search", "FAIL", {
                    "error": f"HTTP {response.status_code}"
                })
        except Exception as e:
            self.log_result(f"Qdrant {collection} Search", "FAIL", {
                "error": str(e)
            })
            
    def test_mcp_fastapi_service(self):
        """Test MCP FastAPI service."""
        print("⚡ Testing MCP FastAPI Service")
        print("-" * 40)
        
        # Health check
        try:
            response = requests.get(f"{self.base_url}/healthz", timeout=3)
            if response.status_code == 200:
                health = response.json()
                self.log_result("MCP Health Check", "PASS", {
                    "status": health.get('status'),
                    "timestamp": health.get('timestamp')
                })
            else:
                self.log_result("MCP Health Check", "FAIL", {
                    "error": f"HTTP {response.status_code}"
                })
        except Exception as e:
            self.log_result("MCP FastAPI Service", "FAIL", {
                "error": str(e),
                "note": "Service not running on localhost:8001"
            })
            return
            
        # Test instructions endpoint
        try:
            response = requests.get(f"{self.base_url}/instructions/", timeout=3)
            if response.status_code == 200:
                instructions = response.json()
                self.log_result("MCP Instructions CRUD", "PASS", {
                    "instructions_count": len(instructions),
                    "endpoint": "/instructions/"
                })
        except Exception as e:
            self.log_result("MCP Instructions CRUD", "FAIL", {
                "error": str(e)
            })
            
        # Test tickets similarity
        try:
            response = requests.get(f"{self.base_url}/tickets/similar/?query=test&top_k=1", timeout=3)
            if response.status_code == 200:
                results = response.json()
                self.log_result("MCP Tickets Similarity", "PASS", {
                    "results_count": len(results),
                    "query": "test"
                })
        except Exception as e:
            self.log_result("MCP Tickets Similarity", "FAIL", {
                "error": str(e)
            })
            
    def test_node_agent_service(self):
        """Test Node.js agent service integration."""
        print("🤖 Testing Node.js Agent Service")
        print("-" * 40)
        
        # Test the agent workflow endpoint
        test_payload = {
            "user_message": "I can't log into my account after the password reset",
            "user_context": {
                "url": "https://example.com/login",
                "title": "Login Page",
                "userAgent": "Test Browser"
            },
            "tenant_id": 1,
            "user_id": "test_user_123"
        }
        
        try:
            start_time = time.time()
            response = requests.post(
                "http://localhost:8001/workflow",
                json=test_payload,
                timeout=30
            )
            processing_time = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                result = response.json()
                self.log_result("Agent Workflow Complete", "PASS", {
                    "input_message": test_payload["user_message"],
                    "success": result.get('success'),
                    "ticket_title": result.get('ticket_title', 'N/A'),
                    "category": result.get('category', 'N/A'),
                    "urgency": result.get('urgency', 'N/A'),
                    "confidence_score": result.get('confidence_score', 0),
                    "resolution_steps": len(result.get('resolution_steps', [])),
                    "processing_time_ms": round(processing_time, 2)
                })
            else:
                self.log_result("Agent Workflow", "FAIL", {
                    "error": f"HTTP {response.status_code}",
                    "response": response.text
                })
        except Exception as e:
            self.log_result("Agent Workflow", "FAIL", {
                "error": str(e)
            })
            
    def test_individual_agent_components(self):
        """Test individual agent components through the orchestrator."""
        print("🔍 Testing Individual Agent Components")
        print("-" * 40)
        
        # Test Chat Preprocessor
        try:
            response = requests.post(
                f"{self.base_url}/preprocess",
                json={
                    "message": "I need help with login issues",
                    "session_id": "test_123",
                    "context": {"url": "https://example.com"}
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                self.log_result("Chat Preprocessor Agent", "PASS", {
                    "normalized_message": result.get('normalized_message', 'N/A'),
                    "language": result.get('language', 'N/A'),
                    "intent": result.get('intent', 'N/A')
                })
            else:
                self.log_result("Chat Preprocessor Agent", "FAIL", {
                    "error": f"HTTP {response.status_code}"
                })
        except Exception as e:
            self.log_result("Chat Preprocessor Agent", "FAIL", {
                "error": str(e)
            })
            
        # Test Instruction Lookup
        try:
            response = requests.post(
                f"{self.base_url}/lookup-instructions",
                json={
                    "query": "password reset procedure",
                    "tenant_id": 1,
                    "top_k": 3
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                self.log_result("Instruction Lookup Agent", "PASS", {
                    "instructions_found": len(result.get('instructions', [])),
                    "confidence": result.get('confidence_score', 0),
                    "storage_type": result.get('storage_type', 'unknown')
                })
            else:
                self.log_result("Instruction Lookup Agent", "FAIL", {
                    "error": f"HTTP {response.status_code}"
                })
        except Exception as e:
            self.log_result("Instruction Lookup Agent", "FAIL", {
                "error": str(e)
            })
            
        # Test Ticket Lookup
        try:
            response = requests.post(
                f"{self.base_url}/lookup-tickets",
                json={
                    "query": "login problem authentication",
                    "tenant_id": 1,
                    "limit": 3
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                self.log_result("Ticket Lookup Agent", "PASS", {
                    "similar_tickets": len(result.get('similar_tickets', [])),
                    "confidence": result.get('confidence_score', 0)
                })
            else:
                self.log_result("Ticket Lookup Agent", "FAIL", {
                    "error": f"HTTP {response.status_code}"
                })
        except Exception as e:
            self.log_result("Ticket Lookup Agent", "FAIL", {
                "error": str(e)
            })
            
    def test_widget_integration(self):
        """Test widget integration with agent service."""
        print("🎛️ Testing Widget Integration")
        print("-" * 40)
        
        # Test widget chat endpoint
        try:
            response = requests.post(
                f"{self.node_api_url}/api/widget/chat",
                json={
                    "tenantId": 1,
                    "message": "I need help with my account",
                    "sessionId": "test_widget_123",
                    "context": {
                        "url": "https://example.com",
                        "title": "Test Page"
                    }
                },
                timeout=15
            )
            
            if response.status_code == 200:
                result = response.json()
                self.log_result("Widget Chat Integration", "PASS", {
                    "message_received": result.get('message', 'N/A')[:50] + "...",
                    "agent_used": result.get('agentUsed', False)
                })
            else:
                self.log_result("Widget Chat Integration", "FAIL", {
                    "error": f"HTTP {response.status_code}"
                })
        except Exception as e:
            self.log_result("Widget Chat Integration", "FAIL", {
                "error": str(e)
            })
            
        # Test widget ticket creation
        try:
            conversation = [
                {"role": "user", "content": "I can't login to my account", "timestamp": datetime.now().isoformat()},
                {"role": "assistant", "content": "I'll help you with that login issue", "timestamp": datetime.now().isoformat()}
            ]
            
            response = requests.post(
                f"{self.node_api_url}/api/widget/create-ticket",
                json={
                    "tenantId": 1,
                    "sessionId": "test_ticket_123",
                    "conversation": conversation,
                    "context": {
                        "url": "https://example.com/login",
                        "title": "Login Page"
                    }
                },
                timeout=20
            )
            
            if response.status_code == 200:
                result = response.json()
                self.log_result("Widget Ticket Creation", "PASS", {
                    "success": result.get('success'),
                    "ticket_id": result.get('ticket', {}).get('id', 'N/A'),
                    "ticket_title": result.get('ticket', {}).get('title', 'N/A'),
                    "agent_insights": "Present" if result.get('agentInsights') else "None"
                })
            else:
                self.log_result("Widget Ticket Creation", "FAIL", {
                    "error": f"HTTP {response.status_code}",
                    "response": response.text[:200]
                })
        except Exception as e:
            self.log_result("Widget Ticket Creation", "FAIL", {
                "error": str(e)
            })
            
    def generate_summary(self):
        """Generate test summary."""
        total = len(self.results)
        passed = sum(1 for r in self.results.values() if r['status'] == 'PASS')
        failed = total - passed
        
        print("=" * 60)
        print("📊 VERIFICATION SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%" if total > 0 else "0%")
        print()
        
        # Show failed tests
        if failed > 0:
            print("❌ Failed Tests:")
            for name, result in self.results.items():
                if result['status'] == 'FAIL':
                    print(f"  • {name}: {result['details'].get('error', 'Unknown error')}")
            print()
            
        # Recommendations
        print("💡 Recommendations:")
        if any('Qdrant' in name and result['status'] == 'FAIL' for name, result in self.results.items()):
            print("  • Start Qdrant: docker run -p 6333:6333 qdrant/qdrant")
            
        if any('MCP' in name and result['status'] == 'FAIL' for name, result in self.results.items()):
            print("  • Start MCP FastAPI: python agents.py")
            
        if failed == 0:
            print("  • All systems operational!")
            
        print()
        
        # Save results
        report_file = f"agent_verification_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"📄 Detailed results saved to: {report_file}")
        
    def run_all_tests(self):
        """Run all verification tests."""
        print("🚀 AGENT WORKFLOW VERIFICATION")
        print("=" * 60)
        print()
        
        self.test_qdrant_service()
        self.test_mcp_fastapi_service() 
        self.test_node_agent_service()
        self.test_individual_agent_components()
        self.test_widget_integration()
        
        self.generate_summary()

if __name__ == "__main__":
    tester = AgentVerificationTester()
    tester.run_all_tests()