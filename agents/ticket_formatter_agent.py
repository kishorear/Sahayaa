"""
TicketFormatterAgent - Produces professionally-formatted ticket bodies
Given a new ticket ID, subject, and resolution steps, creates structured ticket content.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import re

logger = logging.getLogger(__name__)

class TicketFormatterAgent:
    """
    Agent responsible for creating professionally-formatted ticket bodies
    based on ticket information, subject, and resolution steps.
    """
    
    def __init__(self):
        self.template_styles = {
            "professional": self._professional_template,
            "technical": self._technical_template,
            "customer_friendly": self._customer_friendly_template
        }
        self.default_style = "professional"
    
    def format_ticket(self, ticket_id: int, subject: str, resolution_steps: List[str],
                     context: Optional[Dict[str, Any]] = None,
                     style: str = "professional") -> Dict[str, Any]:
        """
        Main function to format a ticket with professional structure.
        
        Args:
            ticket_id: The ticket ID number
            subject: The ticket subject/title
            resolution_steps: List of resolution steps or instructions
            context: Optional context including urgency, category, similar tickets
            style: Formatting style (professional, technical, customer_friendly)
        
        Returns:
            Dictionary with formatted ticket body and metadata
        """
        try:
            start_time = datetime.utcnow()
            
            # Validate inputs
            if not subject or not resolution_steps:
                raise ValueError("Subject and resolution steps are required")
            
            # Get formatting template
            formatter = self.template_styles.get(style, self.template_styles[self.default_style])
            
            # Prepare formatting context
            format_context = {
                "ticket_id": ticket_id,
                "subject": subject.strip(),
                "resolution_steps": [step.strip() for step in resolution_steps if step.strip()],
                "timestamp": datetime.utcnow(),
                "context": context or {},
                "style": style
            }
            
            # Generate formatted content
            formatted_content = formatter(format_context)
            
            # Calculate formatting time
            end_time = datetime.utcnow()
            format_time = (end_time - start_time).total_seconds() * 1000
            
            result = {
                "ticket_id": ticket_id,
                "subject": subject,
                "formatted_body": formatted_content["body"],
                "formatting_metadata": {
                    "style_used": style,
                    "steps_count": len(resolution_steps),
                    "format_time_ms": round(format_time, 2),
                    "template_version": formatted_content.get("version", "1.0"),
                    "sections_included": formatted_content.get("sections", [])
                },
                "context": context or {},
                "timestamp": start_time.isoformat()
            }
            
            logger.info(f"Formatted ticket {ticket_id} with {len(resolution_steps)} steps using {style} style")
            return result
            
        except Exception as e:
            logger.error(f"Error formatting ticket {ticket_id}: {e}")
            return {
                "ticket_id": ticket_id,
                "subject": subject,
                "formatted_body": self._create_fallback_format(ticket_id, subject, resolution_steps),
                "error": str(e),
                "formatting_metadata": {"style_used": "fallback"},
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _professional_template(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Professional business template for ticket formatting."""
        ticket_id = context["ticket_id"]
        subject = context["subject"]
        steps = context["resolution_steps"]
        ticket_context = context.get("context", {})
        
        # Build professional ticket body
        sections = []
        
        # Header section
        sections.append(f"# Ticket #{ticket_id}: {subject}")
        sections.append("")
        
        # Summary section
        sections.append("## Issue Summary")
        urgency = ticket_context.get("urgency_level", "medium")
        category = ticket_context.get("suggested_category", "general")
        
        sections.append(f"**Priority Level:** {urgency.title()}")
        sections.append(f"**Category:** {category.title()}")
        sections.append(f"**Created:** {context['timestamp'].strftime('%Y-%m-%d %H:%M UTC')}")
        sections.append("")
        
        # Problem description
        if ticket_context.get("normalized_prompt"):
            sections.append("## Problem Description")
            sections.append(ticket_context["normalized_prompt"])
            sections.append("")
        
        # Related tickets section
        similar_tickets = ticket_context.get("similar_tickets", [])
        if similar_tickets:
            sections.append("## Related Tickets")
            for ticket in similar_tickets[:3]:
                ticket_ref = ticket.get("ticket_id", "Unknown")
                title = ticket.get("title", "No title")
                score = ticket.get("relevance_score", 0)
                sections.append(f"- **#{ticket_ref}**: {title} (Similarity: {score:.2f})")
            sections.append("")
        
        # Resolution steps
        sections.append("## Resolution Steps")
        for i, step in enumerate(steps, 1):
            sections.append(f"### Step {i}")
            sections.append(self._format_step_content(step))
            sections.append("")
        
        # Additional information
        instructions = ticket_context.get("relevant_instructions", [])
        if instructions:
            sections.append("## Relevant Documentation")
            for instruction in instructions[:2]:
                title = instruction.get("title", "Documentation")
                sections.append(f"- **{title}**")
                if instruction.get("content_excerpt"):
                    excerpt = instruction["content_excerpt"][:200] + "..." if len(instruction["content_excerpt"]) > 200 else instruction["content_excerpt"]
                    sections.append(f"  {excerpt}")
            sections.append("")
        
        # Footer
        sections.append("---")
        sections.append("*This ticket was automatically formatted by the support system.*")
        
        return {
            "body": "\n".join(sections),
            "version": "1.0",
            "sections": ["header", "summary", "description", "related_tickets", "resolution", "documentation", "footer"]
        }
    
    def _technical_template(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Technical template with detailed diagnostics."""
        ticket_id = context["ticket_id"]
        subject = context["subject"]
        steps = context["resolution_steps"]
        ticket_context = context.get("context", {})
        
        sections = []
        
        # Technical header
        sections.append(f"# Technical Support Ticket #{ticket_id}")
        sections.append(f"**Subject:** {subject}")
        sections.append(f"**Timestamp:** {context['timestamp'].isoformat()}")
        sections.append("")
        
        # Diagnostic information
        sections.append("## Diagnostic Information")
        sections.append(f"- **Category:** {ticket_context.get('suggested_category', 'unknown')}")
        sections.append(f"- **Priority:** {ticket_context.get('urgency_level', 'medium')}")
        
        if ticket_context.get("processing_metadata"):
            metadata = ticket_context["processing_metadata"]
            sections.append(f"- **Text Analysis:** {metadata.get('text_length_after_cleaning', 0)} characters processed")
            sections.append(f"- **PII Detected:** {metadata.get('pii_masked_count', 0)} items masked")
        
        sections.append("")
        
        # Issue analysis
        sections.append("## Issue Analysis")
        if ticket_context.get("normalized_prompt"):
            sections.append("**Processed Query:**")
            sections.append(f"```")
            sections.append(ticket_context["normalized_prompt"])
            sections.append("```")
            sections.append("")
        
        # Similar cases
        similar_tickets = ticket_context.get("similar_tickets", [])
        if similar_tickets:
            sections.append("## Similar Cases Analysis")
            sections.append("| Ticket ID | Title | Similarity | Status |")
            sections.append("|-----------|-------|------------|---------|")
            for ticket in similar_tickets[:5]:
                tid = ticket.get("ticket_id", "N/A")
                title = ticket.get("title", "No title")[:40] + "..." if len(ticket.get("title", "")) > 40 else ticket.get("title", "No title")
                sim = ticket.get("relevance_score", 0)
                status = ticket.get("status", "unknown")
                sections.append(f"| #{tid} | {title} | {sim:.3f} | {status} |")
            sections.append("")
        
        # Technical resolution
        sections.append("## Technical Resolution")
        for i, step in enumerate(steps, 1):
            sections.append(f"### Resolution Step {i}")
            sections.append("```")
            sections.append(step)
            sections.append("```")
            sections.append("")
        
        # Knowledge base references
        instructions = ticket_context.get("relevant_instructions", [])
        if instructions:
            sections.append("## Knowledge Base References")
            for instruction in instructions:
                title = instruction.get("title", "Reference")
                score = instruction.get("relevance_score", 0)
                sections.append(f"- **{title}** (Relevance: {score:.3f})")
            sections.append("")
        
        return {
            "body": "\n".join(sections),
            "version": "1.0",
            "sections": ["header", "diagnostics", "analysis", "similar_cases", "resolution", "references"]
        }
    
    def _customer_friendly_template(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Customer-friendly template with simple language."""
        ticket_id = context["ticket_id"]
        subject = context["subject"]
        steps = context["resolution_steps"]
        ticket_context = context.get("context", {})
        
        sections = []
        
        # Friendly header
        sections.append(f"# Support Ticket #{ticket_id}")
        sections.append(f"## {subject}")
        sections.append("")
        
        # Status information
        urgency = ticket_context.get("urgency_level", "medium")
        urgency_text = {
            "low": "Low priority - we'll get to this soon",
            "medium": "Normal priority - we're working on this",
            "high": "High priority - we're addressing this quickly",
            "critical": "Critical issue - immediate attention required"
        }.get(urgency, "We're working on this")
        
        sections.append(f"**Status:** {urgency_text}")
        sections.append(f"**Created:** {context['timestamp'].strftime('%B %d, %Y at %I:%M %p UTC')}")
        sections.append("")
        
        # What happened
        if ticket_context.get("normalized_prompt"):
            sections.append("## What You Reported")
            sections.append(ticket_context["normalized_prompt"])
            sections.append("")
        
        # How we're helping
        sections.append("## How We're Helping You")
        for i, step in enumerate(steps, 1):
            sections.append(f"**Step {i}:**")
            # Simplify technical language
            simplified_step = self._simplify_language(step)
            sections.append(simplified_step)
            sections.append("")
        
        # Additional help
        similar_tickets = ticket_context.get("similar_tickets", [])
        if similar_tickets and any(t.get("resolution") for t in similar_tickets):
            sections.append("## Similar Issues We've Solved")
            resolved_tickets = [t for t in similar_tickets if t.get("resolution")][:2]
            for ticket in resolved_tickets:
                title = ticket.get("title", "Similar issue")
                sections.append(f"- {title}")
                if ticket.get("resolution"):
                    resolution = ticket["resolution"][:150] + "..." if len(ticket["resolution"]) > 150 else ticket["resolution"]
                    sections.append(f"  *Solution: {resolution}*")
            sections.append("")
        
        # What to expect
        sections.append("## What Happens Next")
        sections.append("Our support team will:")
        sections.append("- Review your ticket within 24 hours")
        sections.append("- Keep you updated on our progress")
        sections.append("- Let you know when the issue is resolved")
        sections.append("")
        
        sections.append("Thank you for contacting support!")
        
        return {
            "body": "\n".join(sections),
            "version": "1.0",
            "sections": ["header", "status", "report", "solution", "similar", "next_steps"]
        }
    
    def _format_step_content(self, step: str) -> str:
        """Format individual step content with proper structure."""
        # Clean up the step text
        step = step.strip()
        
        # Add bullet points if the step contains multiple actions
        if '\n' in step or ';' in step:
            # Split on common delimiters
            parts = re.split(r'[;\n]', step)
            formatted_parts = []
            for part in parts:
                part = part.strip()
                if part:
                    if not part.startswith('-') and not part.startswith('*'):
                        part = f"- {part}"
                    formatted_parts.append(part)
            return '\n'.join(formatted_parts)
        else:
            return step
    
    def _simplify_language(self, text: str) -> str:
        """Simplify technical language for customer-friendly format."""
        # Replace technical terms with simpler alternatives
        replacements = {
            "API": "system connection",
            "endpoint": "connection point",
            "authentication": "login process",
            "credentials": "login information",
            "cache": "temporary storage",
            "database": "data storage",
            "server": "system",
            "configuration": "settings",
            "implementation": "setup",
            "deployment": "installation"
        }
        
        simplified = text
        for technical, simple in replacements.items():
            simplified = re.sub(rf'\b{technical}\b', simple, simplified, flags=re.IGNORECASE)
        
        return simplified
    
    def _create_fallback_format(self, ticket_id: int, subject: str, steps: List[str]) -> str:
        """Create basic fallback format when main formatting fails."""
        sections = [
            f"Ticket #{ticket_id}: {subject}",
            "",
            "Resolution Steps:",
            ""
        ]
        
        for i, step in enumerate(steps, 1):
            sections.append(f"{i}. {step}")
        
        sections.extend([
            "",
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
        ])
        
        return "\n".join(sections)
    
    def get_available_styles(self) -> List[str]:
        """Get list of available formatting styles."""
        return list(self.template_styles.keys())
    
    def validate_resolution_steps(self, steps: List[str]) -> Dict[str, Any]:
        """Validate and analyze resolution steps."""
        if not steps:
            return {"valid": False, "error": "No resolution steps provided"}
        
        validation_result = {
            "valid": True,
            "total_steps": len(steps),
            "empty_steps": sum(1 for step in steps if not step.strip()),
            "avg_length": sum(len(step) for step in steps) / len(steps),
            "has_technical_content": any(
                keyword in step.lower() 
                for step in steps 
                for keyword in ["api", "database", "server", "config", "authentication"]
            ),
            "estimated_complexity": "low"
        }
        
        # Estimate complexity based on content
        if validation_result["avg_length"] > 200 or validation_result["has_technical_content"]:
            validation_result["estimated_complexity"] = "high"
        elif validation_result["avg_length"] > 100:
            validation_result["estimated_complexity"] = "medium"
        
        return validation_result