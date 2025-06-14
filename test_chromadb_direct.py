#!/usr/bin/env python3
"""
Direct ChromaDB Testing - Verify ChromaDB implementation with Google AI embeddings
"""

import asyncio
import json
import time
import os
from datetime import datetime
from typing import Dict, Any, List

# Set environment
os.environ['GEMINI_API_KEY'] = os.getenv('GEMINI_API_KEY', os.getenv('GOOGLE_API_KEY', ''))

async def test_chromadb_service():
    """Test ChromaDB service directly."""
    try:
        from services.chroma_vector_service import get_chroma_service
        
        print("Initializing ChromaDB service...")
        service = get_chroma_service()
        
        # Test basic stats
        stats = service.get_collection_stats()
        print(f"Collection stats: {stats}")
        
        # Test instruction upsert
        print("Testing instruction upsert...")
        success = service.upsert_instruction(
            filename="test_password_reset.txt",
            text="To reset your password: 1. Go to login page 2. Click forgot password 3. Enter email 4. Check email for reset link",
            metadata={"category": "authentication", "source": "test"}
        )
        print(f"Instruction upsert: {'SUCCESS' if success else 'FAILED'}")
        
        # Test ticket upsert
        print("Testing ticket upsert...")
        success = service.upsert_ticket(
            ticket_id=9001,
            title="Cannot login after password reset",
            description="User tried to reset password but still cannot access account. Getting invalid credentials error.",
            metadata={"category": "authentication", "status": "resolved"}
        )
        print(f"Ticket upsert: {'SUCCESS' if success else 'FAILED'}")
        
        # Test instruction search
        print("Testing instruction search...")
        results = service.search_instructions("password reset help", 2)
        print(f"Found {len(results)} instruction results")
        for i, result in enumerate(results):
            print(f"  {i+1}. Similarity: {result['similarity']:.3f}")
            print(f"     Text: {result['document'][:60]}...")
        
        # Test ticket search
        print("Testing ticket search...")
        results = service.search_tickets("login problems", 2)
        print(f"Found {len(results)} ticket results")
        for i, result in enumerate(results):
            print(f"  {i+1}. Similarity: {result['similarity']:.3f}")
            print(f"     Title: {result['metadata'].get('title', 'N/A')}")
        
        # Final stats
        final_stats = service.get_collection_stats()
        print(f"Final stats: {final_stats}")
        
        return {
            "success": True,
            "instruction_count": final_stats['instruction_texts']['count'],
            "ticket_count": final_stats['ticket_rag']['count'],
            "storage_type": final_stats['storage_type']
        }
        
    except Exception as e:
        print(f"ChromaDB test failed: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

async def test_chromadb_agents():
    """Test ChromaDB agents with workflow tracing."""
    try:
        from agents.chroma_instruction_lookup_agent import ChromaInstructionLookupAgent
        from agents.chroma_ticket_lookup_agent import ChromaTicketLookupAgent
        
        print("\nTesting ChromaDB Instruction Lookup Agent...")
        instruction_agent = ChromaInstructionLookupAgent()
        
        query = "password reset procedure"
        start_time = time.time()
        result = await instruction_agent.run(query, {"tenant_id": 1, "top_k": 3})
        duration = (time.time() - start_time) * 1000
        
        print(f"Instruction lookup completed in {duration:.1f}ms")
        print(f"Success: {result['success']}")
        print(f"Instructions found: {result['total_results']}")
        print(f"Confidence: {result['confidence_score']:.3f}")
        
        if result['workflow_trace']:
            print("Workflow trace:")
            for step in result['workflow_trace']:
                status = "✓" if step['success'] else "✗"
                print(f"  {status} {step['step']}: {step['agent']} ({step['duration_ms']}ms)")
                print(f"    Resource: {step['resource']}")
                print(f"    Output: {step['output']}")
        
        print("\nTesting ChromaDB Ticket Lookup Agent...")
        ticket_agent = ChromaTicketLookupAgent()
        
        query = "login issues"
        start_time = time.time()
        result = await ticket_agent.run(query, {"tenant_id": 1, "limit": 3})
        duration = (time.time() - start_time) * 1000
        
        print(f"Ticket lookup completed in {duration:.1f}ms")
        print(f"Success: {result['success']}")
        print(f"Tickets found: {result['total_results']}")
        print(f"Confidence: {result['confidence_score']:.3f}")
        
        if result['workflow_trace']:
            print("Workflow trace:")
            for step in result['workflow_trace']:
                status = "✓" if step['success'] else "✗"
                print(f"  {status} {step['step']}: {step['agent']} ({step['duration_ms']}ms)")
                print(f"    Resource: {step['resource']}")
                print(f"    Output: {step['output']}")
        
        return {"success": True, "instruction_agent": True, "ticket_agent": True}
        
    except Exception as e:
        print(f"ChromaDB agent test failed: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

async def main():
    """Run comprehensive ChromaDB testing."""
    print("CHROMADB IMPLEMENTATION VERIFICATION")
    print("=" * 50)
    
    # Test ChromaDB service
    service_result = await test_chromadb_service()
    
    # Test ChromaDB agents if service works
    if service_result["success"]:
        agent_result = await test_chromadb_agents()
    else:
        agent_result = {"success": False, "error": "Service test failed"}
    
    # Summary
    print("\nSUMMARY")
    print("-" * 20)
    print(f"ChromaDB Service: {'PASS' if service_result['success'] else 'FAIL'}")
    print(f"ChromaDB Agents: {'PASS' if agent_result['success'] else 'FAIL'}")
    
    if service_result.get("storage_type"):
        print(f"Storage Type: {service_result['storage_type']}")
    if service_result.get("instruction_count") is not None:
        print(f"Instructions: {service_result['instruction_count']}")
    if service_result.get("ticket_count") is not None:
        print(f"Tickets: {service_result['ticket_count']}")
    
    # Save report
    report = {
        "test_timestamp": datetime.now().isoformat(),
        "chromadb_service": service_result,
        "chromadb_agents": agent_result,
        "overall_success": service_result["success"] and agent_result["success"]
    }
    
    with open(f"chromadb_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json", 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\nOverall Success: {'YES' if report['overall_success'] else 'NO'}")

if __name__ == "__main__":
    asyncio.run(main())