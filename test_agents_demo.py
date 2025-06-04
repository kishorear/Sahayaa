"""
Test and demonstrate the complete four-agent customer support system.
Shows end-to-end processing from raw chat input to formatted ticket resolution.
"""

import sys
import logging
from pathlib import Path

# Add the project root to Python path
sys.path.append('/home/runner/workspace')

from agents.chat_processor_agent import ChatProcessorAgent
from agents.instruction_lookup_agent import InstructionLookupAgent
from agents.ticket_lookup_agent import TicketLookupAgent
from agents.ticket_formatter_agent import TicketFormatterAgent
from agents.multi_agent_orchestrator import MultiAgentOrchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_individual_agents():
    """Test each agent individually to ensure they work correctly."""
    print("Testing Individual Agents")
    print("=" * 50)
    
    # Test 1: ChatProcessorAgent
    print("\n1. Testing ChatProcessorAgent")
    chat_agent = ChatProcessorAgent()
    
    test_input = "URGENT: I can't log into my account with email john@company.com and need help immediately!"
    result = chat_agent.process_chat(test_input)
    
    print(f"   Input: {test_input}")
    print(f"   Urgency: {result['urgency_level']}")
    print(f"   Category: {result['suggested_category']}")
    print(f"   PII Detected: {len(result['pii_detected'])} items")
    print(f"   Normalized: {result['normalized_prompt']}")
    
    # Test 2: InstructionLookupAgent
    print("\n2. Testing InstructionLookupAgent")
    instruction_agent = InstructionLookupAgent()
    
    lookup_result = instruction_agent.lookup_instructions("login authentication problems")
    print(f"   Query: login authentication problems")
    print(f"   Instructions Found: {len(lookup_result['instructions_found'])}")
    print(f"   Search Method: {lookup_result['search_metadata']['search_method']}")
    
    if lookup_result['instructions_found']:
        top_result = lookup_result['instructions_found'][0]
        print(f"   Top Result: {top_result.get('title', 'Unknown')}")
        print(f"   Relevance: {top_result.get('relevance_score', 0):.3f}")
    
    # Test 3: TicketLookupAgent
    print("\n3. Testing TicketLookupAgent")
    ticket_agent = TicketLookupAgent()
    
    similar_result = ticket_agent.lookup_similar_tickets("authentication login issues")
    print(f"   Query: authentication login issues")
    print(f"   Similar Tickets: {len(similar_result['similar_tickets'])}")
    print(f"   Search Method: {similar_result['search_metadata']['search_method']}")
    
    if similar_result['similar_tickets']:
        top_ticket = similar_result['similar_tickets'][0]
        print(f"   Top Match: #{top_ticket.get('ticket_id', 'N/A')} - {top_ticket.get('title', 'No title')}")
        print(f"   Relevance: {top_ticket.get('relevance_score', 0):.3f}")
    
    # Test 4: TicketFormatterAgent
    print("\n4. Testing TicketFormatterAgent")
    formatter_agent = TicketFormatterAgent()
    
    resolution_steps = [
        "Check user credentials and account status",
        "Reset password if authentication fails",
        "Verify two-factor authentication settings",
        "Test login process and confirm resolution"
    ]
    
    format_result = formatter_agent.format_ticket(
        ticket_id=12345,
        subject="User Authentication Login Issues",
        resolution_steps=resolution_steps,
        style="professional"
    )
    
    print(f"   Ticket ID: {format_result['ticket_id']}")
    print(f"   Subject: {format_result['subject']}")
    print(f"   Style: {format_result['formatting_metadata']['style_used']}")
    print(f"   Steps Included: {format_result['formatting_metadata']['steps_count']}")
    print(f"   Preview: {format_result['formatted_body'][:150]}...")

def test_orchestrated_workflow():
    """Test the complete orchestrated multi-agent workflow."""
    print("\n\nTesting Complete Multi-Agent Workflow")
    print("=" * 50)
    
    orchestrator = MultiAgentOrchestrator()
    
    test_scenarios = [
        {
            "name": "Critical Authentication Issue",
            "input": "EMERGENCY: All users in our company cannot log in! This is affecting our production systems and we need immediate help!",
            "context": {"user_id": "admin123", "tenant_id": 1, "account_type": "enterprise"}
        },
        {
            "name": "Billing Question",
            "input": "Hi, I was charged twice for my subscription this month. Can you help me understand why and process a refund?",
            "context": {"user_id": "customer456", "tenant_id": 2}
        },
        {
            "name": "Technical API Issue",
            "input": "Our webhook endpoints are returning 500 errors when we try to receive notifications. This started yesterday.",
            "context": {"user_id": "developer789", "tenant_id": 1, "integration_type": "api"}
        }
    ]
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n{i}. {scenario['name']}")
        print("-" * 40)
        print(f"Input: {scenario['input']}")
        
        try:
            # Process through complete workflow
            result = orchestrator.process_support_request(
                raw_user_input=scenario['input'],
                user_context=scenario['context']
            )
            
            # Extract key results
            metadata = result.get('orchestration_metadata', {})
            final_output = result.get('final_output', {})
            ticket_summary = final_output.get('ticket_summary', {})
            analysis = final_output.get('analysis_summary', {})
            
            # Display results
            print(f"Success: {metadata.get('success', False)}")
            print(f"Processing Time: {metadata.get('total_processing_time_ms', 0):.2f}ms")
            print(f"Agents Used: {len(metadata.get('agents_used', []))}")
            
            print(f"\nTicket Generated:")
            print(f"  ID: #{ticket_summary.get('ticket_id', 'N/A')}")
            print(f"  Subject: {ticket_summary.get('subject', 'N/A')}")
            print(f"  Urgency: {ticket_summary.get('urgency', 'N/A')}")
            print(f"  Category: {ticket_summary.get('category', 'N/A')}")
            
            print(f"\nAnalysis Results:")
            print(f"  PII Detected: {analysis.get('pii_detected', 0)} items")
            print(f"  Urgency Confidence: {analysis.get('urgency_confidence', 0):.2f}")
            print(f"  Category Confidence: {analysis.get('category_confidence', 0):.2f}")
            print(f"  Similar Tickets Found: {analysis.get('similar_tickets_found', 0)}")
            print(f"  Relevant Instructions: {analysis.get('relevant_instructions_found', 0)}")
            
            # Show recommendations
            recommendations = final_output.get('recommendations', {})
            similar_tickets = recommendations.get('similar_tickets', [])
            relevant_docs = recommendations.get('relevant_documentation', [])
            
            if similar_tickets:
                print(f"\nTop Similar Tickets:")
                for ticket in similar_tickets[:2]:
                    print(f"  - #{ticket.get('ticket_id')}: {ticket.get('title', 'No title')[:50]}... (Score: {ticket.get('relevance_score', 0):.2f})")
            
            if relevant_docs:
                print(f"\nRelevant Documentation:")
                for doc in relevant_docs[:2]:
                    print(f"  - {doc.get('title', 'Unknown')}: {doc.get('source', 'Unknown')} (Score: {doc.get('relevance_score', 0):.2f})")
            
            # Show formatted ticket preview
            if ticket_summary.get('formatted_body'):
                print(f"\nFormatted Ticket Preview:")
                preview_lines = ticket_summary['formatted_body'].split('\n')[:10]
                for line in preview_lines:
                    print(f"  {line}")
                if len(ticket_summary['formatted_body'].split('\n')) > 10:
                    print("  ... (truncated)")
                    
        except Exception as e:
            print(f"Error: {e}")
            logger.exception("Workflow test failed")

def test_agent_performance():
    """Test agent performance and response times."""
    print("\n\nAgent Performance Testing")
    print("=" * 50)
    
    import time
    
    # Test processing speed for different input sizes
    test_inputs = [
        "Short query: login issue",
        "Medium length query: I'm having trouble logging into my account and need assistance with password reset procedures for my company email.",
        "Long detailed query: " + " ".join([
            "I am experiencing significant difficulties with our enterprise authentication system.",
            "Multiple users across different departments are reporting login failures.",
            "The issues started after our recent security policy update.",
            "We need immediate assistance to resolve this business-critical problem.",
            "Our production systems are affected and this is causing major operational disruptions.",
            "Please provide detailed troubleshooting steps and escalate if necessary."
        ])
    ]
    
    chat_agent = ChatProcessorAgent()
    
    for i, test_input in enumerate(test_inputs, 1):
        print(f"\nTest {i}: {len(test_input)} characters")
        
        start_time = time.time()
        result = chat_agent.process_chat(test_input)
        end_time = time.time()
        
        processing_time = (end_time - start_time) * 1000
        
        print(f"  Processing Time: {processing_time:.2f}ms")
        print(f"  Urgency: {result['urgency_level']}")
        print(f"  Category: {result['suggested_category']}")
        print(f"  PII Items: {len(result['pii_detected'])}")

def main():
    """Run all tests to demonstrate the multi-agent system."""
    print("Multi-Agent Customer Support System Demo")
    print("=" * 60)
    
    try:
        # Test individual agents
        test_individual_agents()
        
        # Test complete workflow
        test_orchestrated_workflow()
        
        # Test performance
        test_agent_performance()
        
        print("\n" + "=" * 60)
        print("Demo completed successfully!")
        print("All four agents are working together to provide comprehensive customer support.")
        
    except Exception as e:
        print(f"\nDemo failed: {e}")
        logger.exception("Demo execution failed")

if __name__ == "__main__":
    main()