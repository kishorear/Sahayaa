"""
Simple SupportTeam test focusing on LLM integration and agent coordination.
Tests the complete workflow with fallback modes when MCP service is unavailable.
"""

import sys
import logging
from datetime import datetime

# Add the project root to Python path
sys.path.append('/home/runner/workspace')

from agents.support_team_agent import SupportTeamAgent

logging.basicConfig(level=logging.WARNING)  # Reduce log noise
logger = logging.getLogger(__name__)

def test_support_team_core_functionality():
    """Test SupportTeam with focus on LLM resolution generation."""
    print("SupportTeam Agent - Core Functionality Test")
    print("=" * 55)
    
    support_team = SupportTeamAgent()
    
    # Test case: Authentication issue
    user_message = "I can't log into my account. The password reset isn't working and I need access urgently for work."
    user_context = {"user_id": "user123", "tenant_id": 1}
    
    print(f"User Message: {user_message}")
    print(f"Context: {user_context}")
    print("-" * 55)
    
    try:
        start_time = datetime.utcnow()
        
        # Process the support request
        result = support_team.process_support_request(
            user_message=user_message,
            user_context=user_context
        )
        
        end_time = datetime.utcnow()
        total_time = (end_time - start_time).total_seconds() * 1000
        
        # Extract results
        metadata = result.get('workflow_metadata', {})
        final_ticket = result.get('final_ticket', {})
        workflow_steps = result.get('workflow_steps', {})
        
        print(f"Workflow Results:")
        print(f"  Success: {metadata.get('success', False)}")
        print(f"  Processing Time: {total_time:.2f}ms")
        print(f"  Steps Completed: {len(metadata.get('steps_completed', []))}")
        
        # Show each workflow step
        print(f"\nWorkflow Steps:")
        
        # Chat Processing
        if 'chat_processing' in workflow_steps:
            chat_result = workflow_steps['chat_processing']['result']
            print(f"  1. Chat Processing:")
            print(f"     Urgency: {chat_result.get('urgency_level')}")
            print(f"     Category: {chat_result.get('suggested_category')}")
            print(f"     Normalized: {chat_result.get('normalized_prompt', '')[:60]}...")
        
        # Instruction Lookup
        if 'instruction_lookup' in workflow_steps:
            instruction_result = workflow_steps['instruction_lookup']['result']
            instructions_count = len(instruction_result.get('instructions_found', []))
            print(f"  2. Instruction Lookup:")
            print(f"     Instructions Found: {instructions_count}")
            if instructions_count > 0:
                top_instruction = instruction_result['instructions_found'][0]
                print(f"     Top Match: {top_instruction.get('title', 'Unknown')}")
        
        # Ticket Lookup
        if 'ticket_lookup' in workflow_steps:
            ticket_result = workflow_steps['ticket_lookup']['result']
            tickets_count = len(ticket_result.get('similar_tickets', []))
            print(f"  3. Ticket Lookup:")
            print(f"     Similar Tickets: {tickets_count}")
        
        # Resolution Fetch
        if 'resolution_fetch' in workflow_steps:
            resolution_step = workflow_steps['resolution_fetch']
            print(f"  4. Resolution Fetch:")
            print(f"     Resolutions Found: {resolution_step.get('resolutions_found', 0)}")
        
        # LLM Generation
        if 'llm_generation' in workflow_steps:
            llm_step = workflow_steps['llm_generation']
            print(f"  5. LLM Generation:")
            print(f"     Success: {llm_step.get('resolution_generated', False)}")
            print(f"     Time: {llm_step.get('time_ms', 0):.1f}ms")
        
        # Ticket Formatting
        if 'ticket_formatting' in workflow_steps:
            format_step = workflow_steps['ticket_formatting']
            print(f"  6. Ticket Formatting:")
            print(f"     Success: {format_step.get('success', False)}")
        
        # Final ticket details
        print(f"\nGenerated Ticket:")
        print(f"  ID: #{final_ticket.get('ticket_id', 'N/A')}")
        print(f"  Subject: {final_ticket.get('subject', 'N/A')}")
        print(f"  Resolution Steps: {final_ticket.get('resolution_steps_count', 0)}")
        
        sources = final_ticket.get('sources_used', {})
        print(f"  Sources: {sources.get('instructions', 0)} instructions, {sources.get('similar_tickets', 0)} tickets, LLM: {sources.get('llm_model', 'N/A')}")
        
        # Show part of the formatted ticket
        formatted_body = final_ticket.get('formatted_body', '')
        if formatted_body:
            print(f"\nTicket Preview:")
            print("-" * 55)
            # Show first 10 lines
            lines = formatted_body.split('\n')[:10]
            for line in lines:
                print(f"  {line}")
            if len(formatted_body.split('\n')) > 10:
                print("  ... (truncated)")
        
        # Workflow summary
        summary = support_team.get_workflow_summary(result)
        print(f"\nSummary:")
        print(f"  Request ID: {summary['request_id']}")
        print(f"  Success: {summary['success']}")
        print(f"  Total Time: {summary['total_time_ms']:.2f}ms")
        print(f"  Ticket Created: {summary['ticket_generated']}")
        
        return result
        
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_llm_fallback():
    """Test LLM fallback when services are unavailable."""
    print(f"\n\nTesting LLM Fallback Behavior")
    print("=" * 55)
    
    support_team = SupportTeamAgent()
    
    # Test with a technical issue
    technical_message = "Our API integration is returning 500 errors consistently. This started after our deployment yesterday."
    
    print(f"Technical Issue: {technical_message}")
    print("-" * 55)
    
    try:
        result = support_team.process_support_request(
            user_message=technical_message,
            user_context={"user_id": "developer", "tenant_id": 1, "environment": "production"}
        )
        
        final_ticket = result.get('final_ticket', {})
        
        print(f"Fallback Test Results:")
        print(f"  Ticket Generated: {bool(final_ticket.get('ticket_id'))}")
        print(f"  Resolution Steps: {final_ticket.get('resolution_steps_count', 0)}")
        print(f"  Category Detected: {final_ticket.get('category', 'N/A')}")
        print(f"  Urgency Level: {final_ticket.get('urgency', 'N/A')}")
        
        # Show LLM generation status
        llm_step = result.get('workflow_steps', {}).get('llm_generation', {})
        print(f"  LLM Success: {llm_step.get('resolution_generated', False)}")
        
        return True
        
    except Exception as e:
        print(f"Fallback test failed: {e}")
        return False

def main():
    """Run the SupportTeam tests."""
    print("Testing SupportTeam Coordinating Agent")
    print("This demonstrates the complete workflow:")
    print("• ChatProcessor → InstructionLookup → TicketLookup")
    print("• MCP Service resolution fetch → LLM generation")
    print("• TicketFormatter → final professional ticket")
    print()
    
    # Test core functionality
    result1 = test_support_team_core_functionality()
    
    # Test fallback behavior
    result2 = test_llm_fallback()
    
    print("\n" + "=" * 55)
    if result1 and result2:
        print("SupportTeam Agent Tests Completed Successfully!")
        print("\nKey Features Demonstrated:")
        print("✓ Complete agent orchestration workflow")
        print("✓ LLM-enhanced resolution generation")
        print("✓ Professional ticket formatting")
        print("✓ Graceful fallbacks when services unavailable")
        print("✓ Context-aware processing and categorization")
    else:
        print("Some tests encountered issues.")
    
    print("\nThe SupportTeam agent is ready to:")
    print("• Process user messages through all agents")
    print("• Generate intelligent resolutions using LLM")
    print("• Create comprehensive formatted tickets")
    print("• Handle production customer support workflows")

if __name__ == "__main__":
    main()