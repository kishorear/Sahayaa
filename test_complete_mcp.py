"""
Complete test for the MCP service components.
Tests the FastAPI service, instruction processing, and database integration.
"""

import os
import sys
import json
import time
import logging
import requests
import threading
import subprocess
from pathlib import Path
from typing import Dict, Any
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MCPServiceTester:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.server_process = None
        self.test_results = []
    
    def log_test(self, test_name: str, success: bool, message: str = ""):
        status = "PASS" if success else "FAIL"
        logger.info(f"[{status}] {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message
        })
    
    def test_database_connectivity(self):
        """Test database connection and schema."""
        try:
            DATABASE_URL = os.getenv("DATABASE_URL")
            conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
            cursor = conn.cursor()
            
            # Test basic connection
            cursor.execute("SELECT COUNT(*) as count FROM tickets")
            ticket_count = cursor.fetchone()['count']
            
            cursor.close()
            conn.close()
            
            self.log_test("Database Connectivity", True, f"Found {ticket_count} tickets")
            return True
        except Exception as e:
            self.log_test("Database Connectivity", False, str(e))
            return False
    
    def test_instruction_processing(self):
        """Test instruction document processing."""
        try:
            # Import and run instruction processor
            sys.path.append('/home/runner/workspace')
            from instruction_processor_local import InstructionProcessor
            
            processor = InstructionProcessor()
            
            # Process files (should create samples if none exist)
            results = processor.scan_and_process_all()
            
            success = results['processed'] > 0 and results['failed'] == 0
            message = f"Processed {results['processed']} files, {results['failed']} failed"
            
            if success and results['processed'] > 0:
                # Test search functionality
                search_results = processor.search_instructions("login problems", top_k=2)
                if search_results:
                    message += f", found {len(search_results)} search results"
                else:
                    message += ", no search results found"
            
            self.log_test("Instruction Processing", success, message)
            return success
        except Exception as e:
            self.log_test("Instruction Processing", False, str(e))
            return False
    
    def start_fastapi_server(self):
        """Start the FastAPI server in background."""
        try:
            # Start server process
            cmd = [
                sys.executable, "-c",
                """
import uvicorn
import sys
sys.path.append('/home/runner/workspace')
from mcp_service.schema_compatible_main import app
uvicorn.run(app, host='0.0.0.0', port=8000, log_level='warning')
"""
            ]
            
            self.server_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd='/home/runner/workspace'
            )
            
            # Wait for server to start
            time.sleep(3)
            
            # Test if server is responding
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                self.log_test("FastAPI Server Start", True, "Server started successfully")
                return True
            else:
                self.log_test("FastAPI Server Start", False, f"Server responded with {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("FastAPI Server Start", False, str(e))
            return False
    
    def stop_fastapi_server(self):
        """Stop the FastAPI server."""
        if self.server_process:
            self.server_process.terminate()
            self.server_process.wait()
    
    def test_api_endpoints(self):
        """Test key API endpoints."""
        try:
            # Test health endpoint
            response = requests.get(f"{self.base_url}/health")
            if response.status_code != 200:
                self.log_test("API Health Check", False, f"Status {response.status_code}")
                return False
            
            health_data = response.json()
            self.log_test("API Health Check", True, f"Database: {health_data.get('database', 'unknown')}")
            
            # Test stats endpoint
            response = requests.get(f"{self.base_url}/stats/")
            if response.status_code == 200:
                stats = response.json()
                ticket_count = stats.get('tickets', {}).get('total', 0)
                self.log_test("API Stats", True, f"Total tickets: {ticket_count}")
            else:
                self.log_test("API Stats", False, f"Status {response.status_code}")
            
            # Test ticket listing
            response = requests.get(f"{self.base_url}/tickets/?limit=5")
            if response.status_code == 200:
                tickets = response.json()
                self.log_test("API Ticket List", True, f"Retrieved {len(tickets)} tickets")
            else:
                self.log_test("API Ticket List", False, f"Status {response.status_code}")
            
            # Test instruction search if available
            response = requests.get(f"{self.base_url}/instructions/search/?query=authentication")
            if response.status_code == 200:
                results = response.json()
                self.log_test("API Instruction Search", True, f"Found {len(results)} results")
            elif response.status_code == 503:
                self.log_test("API Instruction Search", True, "Service not available (expected)")
            else:
                self.log_test("API Instruction Search", False, f"Status {response.status_code}")
            
            return True
            
        except Exception as e:
            self.log_test("API Endpoints", False, str(e))
            return False
    
    def test_ticket_crud(self):
        """Test ticket creation and retrieval."""
        try:
            # Create a test ticket
            ticket_data = {
                "title": "Test MCP Service Ticket",
                "description": "This is a test ticket created by the MCP service test",
                "category": "testing",
                "tenantId": 1,
                "status": "new"
            }
            
            response = requests.post(f"{self.base_url}/tickets/", json=ticket_data)
            if response.status_code != 200:
                self.log_test("Ticket Creation", False, f"Status {response.status_code}")
                return False
            
            created_ticket = response.json()
            ticket_id = created_ticket['id']
            self.log_test("Ticket Creation", True, f"Created ticket ID: {ticket_id}")
            
            # Retrieve the ticket
            response = requests.get(f"{self.base_url}/tickets/{ticket_id}")
            if response.status_code == 200:
                retrieved_ticket = response.json()
                self.log_test("Ticket Retrieval", True, f"Retrieved ticket: {retrieved_ticket['title']}")
            else:
                self.log_test("Ticket Retrieval", False, f"Status {response.status_code}")
            
            # Add a message to the ticket
            message_data = {
                "ticketId": ticket_id,
                "sender": "test_user",
                "content": "This is a test message for the MCP service"
            }
            
            response = requests.post(f"{self.base_url}/messages/", json=message_data)
            if response.status_code == 200:
                self.log_test("Message Creation", True, "Added message to ticket")
            else:
                self.log_test("Message Creation", False, f"Status {response.status_code}")
            
            return True
            
        except Exception as e:
            self.log_test("Ticket CRUD", False, str(e))
            return False
    
    def test_similarity_search(self):
        """Test ticket similarity search."""
        try:
            # Test text-based similarity search
            response = requests.get(f"{self.base_url}/tickets/similar/?query=login%20authentication&top_k=3")
            
            if response.status_code == 200:
                results = response.json()
                self.log_test("Similarity Search", True, f"Found {len(results)} similar tickets")
                
                if results:
                    # Log first result as example
                    first_result = results[0]
                    logger.info(f"  Sample result: {first_result.get('title', 'N/A')[:50]}... (score: {first_result.get('score', 0)})")
            else:
                self.log_test("Similarity Search", False, f"Status {response.status_code}")
                return False
            
            return True
            
        except Exception as e:
            self.log_test("Similarity Search", False, str(e))
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence."""
        logger.info("Starting comprehensive MCP service tests...")
        
        # Test 1: Database connectivity
        if not self.test_database_connectivity():
            logger.error("Database connectivity failed - aborting tests")
            return False
        
        # Test 2: Instruction processing
        self.test_instruction_processing()
        
        # Test 3: Start FastAPI server
        if not self.start_fastapi_server():
            logger.error("Could not start FastAPI server - aborting API tests")
            return False
        
        try:
            # Test 4: API endpoints
            self.test_api_endpoints()
            
            # Test 5: Ticket CRUD operations
            self.test_ticket_crud()
            
            # Test 6: Similarity search
            self.test_similarity_search()
            
        finally:
            # Always stop the server
            self.stop_fastapi_server()
        
        # Generate summary
        self.generate_summary()
        
        return True
    
    def generate_summary(self):
        """Generate test summary."""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        
        logger.info("\n" + "="*60)
        logger.info("MCP SERVICE TEST SUMMARY")
        logger.info("="*60)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Passed: {passed_tests}")
        logger.info(f"Failed: {total_tests - passed_tests}")
        logger.info(f"Success Rate: {passed_tests/total_tests*100:.1f}%")
        
        if passed_tests < total_tests:
            logger.info("\nFailed Tests:")
            for result in self.test_results:
                if not result["success"]:
                    logger.info(f"  ❌ {result['test']}: {result['message']}")
        
        logger.info("\nPassed Tests:")
        for result in self.test_results:
            if result["success"]:
                logger.info(f"  ✅ {result['test']}: {result['message']}")
        
        logger.info("="*60)

def main():
    """Run the comprehensive test suite."""
    tester = MCPServiceTester()
    
    try:
        success = tester.run_all_tests()
        return success
    except KeyboardInterrupt:
        logger.info("\nTest interrupted by user")
        tester.stop_fastapi_server()
        return False
    except Exception as e:
        logger.error(f"Test suite failed: {e}")
        tester.stop_fastapi_server()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)