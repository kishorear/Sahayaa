"""
Test script for the MCP service.
Tests ticket CRUD operations, similarity search, and instruction management.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
import json
from typing import Dict, Any

# Add mcp_service to path
sys.path.append(str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

# Test with existing database
from mcp_service.database import get_db, test_connection
from mcp_service.models import Ticket, Message, Instruction
from mcp_service.embedding_service import embedding_service
from mcp_service.vector_storage import vector_storage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MCPServiceTester:
    """Test the MCP service components."""
    
    def __init__(self):
        self.db_gen = get_db()
        self.db = next(self.db_gen)
        self.test_results = []
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()
    
    def log_test(self, test_name: str, success: bool, message: str = ""):
        """Log test result."""
        status = "PASS" if success else "FAIL"
        logger.info(f"[{status}] {test_name}: {message}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message
        })
    
    def test_database_connection(self):
        """Test database connectivity."""
        try:
            success = test_connection()
            self.log_test("Database Connection", success, "Connected to PostgreSQL")
            return success
        except Exception as e:
            self.log_test("Database Connection", False, str(e))
            return False
    
    def test_existing_tickets(self):
        """Test reading existing tickets from the database."""
        try:
            # Query existing tickets using the current schema
            tickets = self.db.execute("""
                SELECT id, title, description, status, category, 
                       created_at, resolved_at, ai_resolved
                FROM tickets 
                ORDER BY created_at DESC 
                LIMIT 5
            """).fetchall()
            
            count = len(tickets)
            self.log_test("Read Existing Tickets", True, f"Found {count} tickets")
            
            if tickets:
                logger.info("Sample tickets:")
                for ticket in tickets[:3]:
                    logger.info(f"  ID: {ticket[0]}, Title: {ticket[1][:50]}...")
            
            return True
        except Exception as e:
            self.log_test("Read Existing Tickets", False, str(e))
            return False
    
    def test_embedding_service(self):
        """Test embedding service functionality."""
        try:
            # Test text embedding
            test_text = "User cannot log into their account"
            embedding = embedding_service.embed_text(test_text)
            
            # Validate embedding
            is_valid = (
                isinstance(embedding, list) and 
                len(embedding) == 384 and 
                all(isinstance(x, (int, float)) for x in embedding)
            )
            
            provider_info = embedding_service.get_provider_info()
            message = f"Provider: {provider_info['provider']}, Dimensions: {len(embedding)}"
            
            self.log_test("Embedding Service", is_valid, message)
            return is_valid
        except Exception as e:
            self.log_test("Embedding Service", False, str(e))
            return False
    
    def test_vector_storage(self):
        """Test vector storage connectivity."""
        try:
            is_available = vector_storage.is_available()
            collection_info = vector_storage.get_collection_info()
            
            message = f"Available: {is_available}"
            if is_available:
                message += f", Collection: {collection_info.get('name', 'N/A')}"
            
            self.log_test("Vector Storage", True, message)
            return True
        except Exception as e:
            self.log_test("Vector Storage", False, str(e))
            return False
    
    def test_similarity_search(self):
        """Test similarity search with existing data."""
        try:
            if not vector_storage.is_available():
                self.log_test("Similarity Search", True, "Skipped - Vector storage not available")
                return True
            
            # Test search
            test_query = "authentication login problem"
            query_embedding = embedding_service.embed_text(test_query)
            
            results = vector_storage.search_similar_tickets(
                query_embedding=query_embedding,
                top_k=3,
                min_score=0.3
            )
            
            message = f"Found {len(results)} similar items"
            self.log_test("Similarity Search", True, message)
            
            if results:
                logger.info("Sample results:")
                for result in results[:2]:
                    logger.info(f"  Score: {result.score:.3f}, Title: {result.title[:50]}...")
            
            return True
        except Exception as e:
            self.log_test("Similarity Search", False, str(e))
            return False
    
    def test_create_instruction(self):
        """Test creating an instruction template."""
        try:
            # Create test instruction
            test_instruction = Instruction(
                tenant_id=1,
                name="test_auth_instruction",
                title="Authentication Test Instruction",
                content="This is a test instruction for authentication issues.",
                category="testing",
                tags=["test", "authentication"],
                active=True,
                priority=10
            )
            
            self.db.add(test_instruction)
            self.db.commit()
            self.db.refresh(test_instruction)
            
            # Verify creation
            created = self.db.query(Instruction).filter(
                Instruction.name == "test_auth_instruction"
            ).first()
            
            success = created is not None
            message = f"Created instruction ID: {created.id}" if success else "Failed to create"
            
            self.log_test("Create Instruction", success, message)
            
            # Clean up
            if created:
                self.db.delete(created)
                self.db.commit()
            
            return success
        except Exception as e:
            self.log_test("Create Instruction", False, str(e))
            self.db.rollback()
            return False
    
    def test_ticket_with_resolution(self):
        """Test creating a ticket with resolution and embedding."""
        try:
            # Create test ticket
            test_ticket = Ticket(
                tenant_id=1,
                title="Test API Authentication Issue",
                description="User cannot authenticate with API using their credentials",
                status="resolved",
                category="authentication",
                complexity="medium",
                source="api",
                ai_resolved=False
            )
            
            self.db.add(test_ticket)
            self.db.commit()
            self.db.refresh(test_ticket)
            
            # Add resolution message
            resolution_msg = Message(
                ticket_id=test_ticket.id,
                sender="support",
                content="Issue resolved by regenerating API credentials and updating authentication method."
            )
            
            self.db.add(resolution_msg)
            self.db.commit()
            
            # Test embedding generation
            ticket_text = f"{test_ticket.title} {test_ticket.description} Resolution: {resolution_msg.content}"
            embedding = embedding_service.embed_text(ticket_text)
            
            # Store in vector storage if available
            if vector_storage.is_available():
                metadata = {
                    "tenant_id": test_ticket.tenant_id,
                    "title": test_ticket.title,
                    "description": test_ticket.description,
                    "category": test_ticket.category,
                    "status": test_ticket.status,
                    "resolution": resolution_msg.content
                }
                vector_storage.store_ticket_embedding(test_ticket.id, embedding, metadata)
            
            message = f"Created ticket ID: {test_ticket.id} with resolution and embedding"
            self.log_test("Ticket with Resolution", True, message)
            
            # Clean up
            self.db.delete(resolution_msg)
            self.db.delete(test_ticket)
            self.db.commit()
            
            return True
        except Exception as e:
            self.log_test("Ticket with Resolution", False, str(e))
            self.db.rollback()
            return False
    
    def generate_report(self):
        """Generate test report."""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r["success"])
        
        logger.info("\n" + "="*60)
        logger.info("MCP SERVICE TEST REPORT")
        logger.info("="*60)
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Passed: {passed_tests}")
        logger.info(f"Failed: {total_tests - passed_tests}")
        logger.info(f"Success Rate: {passed_tests/total_tests*100:.1f}%")
        logger.info("="*60)
        
        return passed_tests == total_tests

async def run_tests():
    """Run all MCP service tests."""
    logger.info("Starting MCP Service Tests...")
    
    with MCPServiceTester() as tester:
        # Run tests in order
        tests = [
            tester.test_database_connection,
            tester.test_existing_tickets,
            tester.test_embedding_service,
            tester.test_vector_storage,
            tester.test_similarity_search,
            tester.test_create_instruction,
            tester.test_ticket_with_resolution
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                logger.error(f"Test failed with exception: {e}")
        
        # Generate report
        success = tester.generate_report()
        return success

if __name__ == "__main__":
    success = asyncio.run(run_tests())
    sys.exit(0 if success else 1)