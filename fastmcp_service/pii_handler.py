"""
PII (Personally Identifiable Information) Handler
Masks and validates content before sending to LLM services.
"""

import re
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class PIIHandler:
    """Handles PII detection, masking, and prompt validation."""
    
    def __init__(self):
        # PII patterns (simplified for demo)
        self.patterns = {
            'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'phone': re.compile(r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b'),
            'ssn': re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),
            'credit_card': re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'),
            'ip_address': re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b'),
        }
        
        # Replacement tokens
        self.replacements = {
            'email': '[EMAIL_REDACTED]',
            'phone': '[PHONE_REDACTED]',
            'ssn': '[SSN_REDACTED]',
            'credit_card': '[CARD_REDACTED]',
            'ip_address': '[IP_REDACTED]',
        }
        
        # Validation patterns for dangerous content
        self.dangerous_patterns = [
            re.compile(r'(?i)\b(drop|delete|truncate)\s+(table|database)\b'),
            re.compile(r'(?i)\bexec\s*\('),
            re.compile(r'(?i)\beval\s*\('),
            re.compile(r'<script[^>]*>'),
        ]
    
    def clean_pii(self, text: str) -> str:
        """Remove PII from text content."""
        if not text:
            return text
        
        cleaned_text = text
        pii_found = []
        
        for pii_type, pattern in self.patterns.items():
            matches = pattern.findall(cleaned_text)
            if matches:
                pii_found.extend(matches)
                cleaned_text = pattern.sub(self.replacements[pii_type], cleaned_text)
        
        if pii_found:
            logger.info(f"Masked {len(pii_found)} PII items from content")
        
        return cleaned_text
    
    def validate_prompt(self, prompt: str) -> bool:
        """Validate prompt for dangerous content."""
        if not prompt:
            return False
        
        # Check for dangerous patterns
        for pattern in self.dangerous_patterns:
            if pattern.search(prompt):
                logger.warning(f"Dangerous pattern detected in prompt")
                return False
        
        # Basic length check
        if len(prompt) > 10000:
            logger.warning("Prompt too long")
            return False
        
        return True
    
    def get_pii_summary(self, text: str) -> Dict[str, int]:
        """Get summary of PII types found in text."""
        summary = {}
        
        for pii_type, pattern in self.patterns.items():
            matches = pattern.findall(text)
            summary[pii_type] = len(matches)
        
        return summary