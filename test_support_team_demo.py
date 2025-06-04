"""
Test the SupportTeam coordinating agent - complete workflow demonstration.
Shows end-to-end processing from user message to LLM-enhanced ticket resolution.
"""

import sys
import logging
from datetime import datetime

# Add the project root to Python path
sys.path.append('/home/runner/workspace')

from agents.support_team_agent import SupportTeamAgent

logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)

def test_support_team_workflow():
    """Test the complete SupportTeam coordinating workflow."""
    print("SupportTeam Coordinating Agent Demo")
    print("=" * 60)
    
    # Initialize the SupportTeam agent
    support_team = SupportTeamAgent()
    
    # Test scenarios representing different types of support requests
    test_scenarios = [
        {
            "name": "Critical Authentication Emergency",
            "message": "URGENT: Our entire team cannot log in! All authentication is failing and we have a client demo in 30 minutes. This is affecting our production environment!",
            "context": {
                "user_id": "manager123", 
                "tenant_id": 1, 
                "account_type": "enterprise",
                "priority": "critical"
            }
        },
        {
            "name": "Billing Dispute",
            "message": "Hi, I was charged $299 twice for my monthly subscription. I need a refund for the duplicate charge and want to understand why this happened.",
            "context": {
                "user_id": "customer456", 
                "tenant_id": 2,
                "subscription_tier": "premium"
            }
        },
        {
            "name": "API Integration Issue",
            "message": "Our webhook endpoints stopped working yesterday. We're getting 500 errors when trying to receive notifications from your API. This is breaking our production integrations.",
            "context": {
                "user_id": "developer789", 
                "tenant_id": 1,
                "integration_type": "webhook_api",
                "environment": "production"
            }
        },
        {
            "name": "Data Export Request",
            "message": "I need to export all my account data for GDPR compliance. How do I download everything including my tickets, messages, and user data?",
            "context": {
                "user_id": "compliance_user", 
                "tenant_id": 3,
                "region": "EU",
                "compliance_type": "GDPR"
            }
        }
    ]
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n{i}. Testing: {scenario['name']}")
        print("-" * 50)
        print(f"User Message: {scenario['message']}")
        print(f"Context: {scenario['context']}")
        
        try:
            start_time = datetime.utcnow()
            
            # Process through complete SupportTeam workflow
            result = support_team.process_support_request(
                user_message=scenario['message'],
                user_context=scenario['context']
            )
            
            end_time = datetime.utcnow()
            total_time = (end_time - start_time).total_seconds() * 1000
            
            # Extract workflow results
            metadata = result.get('workflow_metadata', {})
            workflow_steps = result.get('workflow_steps', {})
            final_ticket = result.get('final_ticket', {})
            
            # Display workflow summary
            print(f"\nWorkflow Results:")
            print(f"  Success: {metadata.get('success', False)}")
            print(f"  Total Time: {total_time:.2f}ms")
            print(f"  Steps Completed: {len(metadata.get('steps_completed', []))}/6")
            
            # Show step-by-step results
            print(f"\nStep-by-Step Analysis:")
            
            # Step 1: Chat Processing
            chat_step = workflow_steps.get('chat_processing', {})
            chat_result = chat_step.get('result', {})
            print(f"  1. Chat Processing ({chat_step.get('time_ms', 0):.1f}ms)")
            print(f"     Urgency: {chat_result.get('urgency_level', 'unknown')}")
            print(f"     Category: {chat_result.get('suggested_category', 'unknown')}")
            print(f"     PII Detected: {len(chat_result.get('pii_detected', []))} items")
            
            # Step 2: Instruction Lookup
            instruction_step = workflow_steps.get('instruction_lookup', {})
            instruction_result = instruction_step.get('result', {})
            instructions_found = len(instruction_result.get('instructions_found', []))
            print(f"  2. Instruction Lookup ({instruction_step.get('time_ms', 0):.1f}ms)")
            print(f"     Instructions Found: {instructions_found}")
            print(f"     Search Method: {instruction_result.get('search_metadata', {}).get('search_method', 'unknown')}")
            
            # Step 3: Ticket Lookup
            ticket_step = workflow_steps.get('ticket_lookup', {})
            ticket_result = ticket_step.get('result', {})
            similar_tickets = len(ticket_result.get('similar_tickets', []))
            print(f"  3. Ticket Lookup ({ticket_step.get('time_ms', 0):.1f}ms)")
            print(f"     Similar Tickets: {similar_tickets}")
            
            # Step 4: Resolution Fetch
            resolution_step = workflow_steps.get('resolution_fetch', {})
            resolutions_found = resolution_step.get('resolutions_found', 0)
            print(f"  4. Resolution Fetch ({resolution_step.get('time_ms', 0):.1f}ms)")
            print(f"     Full Resolutions: {resolutions_found}")
            
            # Step 5: LLM Generation
            llm_step = workflow_steps.get('llm_generation', {})
            print(f"  5. LLM Generation ({llm_step.get('time_ms', 0):.1f}ms)")
            print(f"     Resolution Generated: {llm_step.get('resolution_generated', False)}")
            
            # Step 6: Ticket Formatting
            format_step = workflow_steps.get('ticket_formatting', {})
            print(f"  6. Ticket Formatting ({format_step.get('time_ms', 0):.1f}ms)")
            print(f"     Format Success: {format_step.get('success', False)}")
            
            # Show final ticket summary
            print(f"\nGenerated Ticket Summary:")
            print(f"  Ticket ID: #{final_ticket.get('ticket_id', 'N/A')}")
            print(f"  Subject: {final_ticket.get('subject', 'N/A')}")
            print(f"  Urgency: {final_ticket.get('urgency', 'N/A')}")
            print(f"  Category: {final_ticket.get('category', 'N/A')}")
            print(f"  Resolution Steps: {final_ticket.get('resolution_steps_count', 0)}")
            
            sources_used = final_ticket.get('sources_used', {})
            print(f"  Sources Used:")
            print(f"    Instructions: {sources_used.get('instructions', 0)}")
            print(f"    Similar Tickets: {sources_used.get('similar_tickets', 0)}")
            print(f"    LLM Model: {sources_used.get('llm_model', 'N/A')}")
            
            # Show formatted ticket preview
            formatted_body = final_ticket.get('formatted_body', '')
            if formatted_body:
                print(f"\nFormatted Ticket Preview (first 500 chars):")
                print("-" * 50)
                preview = formatted_body[:500] + "..." if len(formatted_body) > 500 else formatted_body
                print(preview)
            
            # Get workflow summary for monitoring
            summary = support_team.get_workflow_summary(result)
            print(f"\nWorkflow Summary:")
            print(f"  Request ID: {summary['request_id']}")
            print(f"  Success Rate: {'100%' if summary['success'] else '0%'}")
            print(f"  Processing Speed: {summary['total_time_ms']:.2f}ms")
            print(f"  Ticket Generated: {summary['ticket_generated']}")
            
        except Exception as e:
            print(f"Error: {e}")
            logger.exception("SupportTeam workflow test failed")
        
        print("=" * 60)

def test_llm_resolution_quality():
    """Test the quality of LLM-generated resolutions."""
    print("\nLLM Resolution Quality Test")
    print("=" * 60)
    
    support_team = SupportTeamAgent()
    
    # Test with a focused technical issue
    technical_message = "Our API is returning 429 rate limit errors but we're well under our quota limits. This started happening after we updated our integration yesterday."
    
    print(f"Technical Issue: {technical_message}")
    print("-" * 50)
    
    try:
        result = support_team.process_support_request(
            user_message=technical_message,
            user_context={"user_id": "tech_lead", "tenant_id": 1, "api_tier": "enterprise"}
        )
        
        # Extract the LLM generation step
        llm_step = result.get('workflow_steps', {}).get('llm_generation', {})
        final_ticket = result.get('final_ticket', {})
        
        print(f"LLM Processing:")
        print(f"  Success: {llm_step.get('resolution_generated', False)}")
        print(f"  Processing Time: {llm_step.get('time_ms', 0):.2f}ms")
        print(f"  Steps Generated: {final_ticket.get('resolution_steps_count', 0)}")
        
        # Show the formatted ticket with LLM-generated resolution
        formatted_body = final_ticket.get('formatted_body', '')
        if formatted_body:
            print(f"\nComplete LLM-Enhanced Ticket:")
            print("-" * 50)
            print(formatted_body)
        
    except Exception as e:
        print(f"LLM test failed: {e}")

def main():
    """Run the complete SupportTeam demonstration."""
    try:
        # Test the complete workflow
        test_support_team_workflow()
        
        # Test LLM quality specifically
        test_llm_resolution_quality()
        
        print("\n" + "=" * 60)
        print("SupportTeam Demo Completed Successfully!")
        print("The coordinating agent successfully orchestrates:")
        print("• ChatProcessorAgent → normalized prompts")
        print("• InstructionLookupAgent → relevant documentation")
        print("• TicketLookupAgent → similar ticket IDs")
        print("• MCP Service → full ticket resolutions")
        print("• OpenAI LLM → intelligent resolution steps")
        print("• TicketFormatterAgent → professional formatting")
        
    except Exception as e:
        print(f"\nDemo failed: {e}")
        logger.exception("SupportTeam demo execution failed")

if __name__ == "__main__":
    main()