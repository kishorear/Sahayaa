"""
Test SupportTeam agent focusing on LLM resolution generation.
This test demonstrates the core workflow with fallback modes.
"""

import sys
import os
sys.path.append('/home/runner/workspace')

from agents.support_team_agent import SupportTeamAgent

def test_llm_workflow():
    """Test the SupportTeam workflow with LLM generation."""
    print("SupportTeam Agent - LLM Resolution Test")
    print("=" * 50)
    
    # Check if OpenAI API key is available
    if not os.getenv("OPENAI_API_KEY"):
        print("OpenAI API key not found - testing fallback mode")
    else:
        print("OpenAI API key found - testing LLM integration")
    
    support_team = SupportTeamAgent()
    
    # Test authentication issue
    user_message = "I can't log into my account and password reset emails aren't arriving"
    
    print(f"\nUser Message: {user_message}")
    print("-" * 50)
    
    try:
        result = support_team.process_support_request(
            user_message=user_message,
            user_context={"user_id": "test123", "tenant_id": 1}
        )
        
        # Extract results
        metadata = result.get('workflow_metadata', {})
        final_ticket = result.get('final_ticket', {})
        
        print(f"Workflow Success: {metadata.get('success', False)}")
        print(f"Processing Time: {metadata.get('total_time_ms', 0):.1f}ms")
        
        print(f"\nTicket Details:")
        print(f"  ID: #{final_ticket.get('ticket_id', 'N/A')}")
        print(f"  Urgency: {final_ticket.get('urgency', 'N/A')}")
        print(f"  Category: {final_ticket.get('category', 'N/A')}")
        print(f"  Resolution Steps: {final_ticket.get('resolution_steps_count', 0)}")
        
        # Show ticket preview
        formatted_body = final_ticket.get('formatted_body', '')
        if formatted_body:
            print(f"\nFormatted Ticket (first 300 chars):")
            print(formatted_body[:300] + "...")
        
        print(f"\nWorkflow completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    test_llm_workflow()