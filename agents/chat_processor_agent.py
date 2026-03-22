"""
ChatProcessorAgent - Processes raw user chat input
Strips PII, tags urgency, and outputs normalized prompts for downstream agents.
"""

import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum
import hashlib

logger = logging.getLogger(__name__)

class UrgencyLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class PIIType(Enum):
    EMAIL = "email"
    PHONE = "phone"
    SSN = "ssn"
    CREDIT_CARD = "credit_card"
    IP_ADDRESS = "ip_address"
    ACCOUNT_ID = "account_id"

class ChatProcessorAgent:
    """
    Agent responsible for processing raw user chat input.
    Normalizes text, removes PII, and determines urgency.
    """
    
    def __init__(self):
        self.pii_patterns = self._init_pii_patterns()
        self.urgency_keywords = self._init_urgency_keywords()
        self.category_keywords = self._init_category_keywords()
    
    def _init_pii_patterns(self) -> Dict[PIIType, re.Pattern]:
        """Initialize regex patterns for PII detection."""
        return {
            PIIType.EMAIL: re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            PIIType.PHONE: re.compile(r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b'),
            PIIType.SSN: re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'),
            PIIType.CREDIT_CARD: re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
            PIIType.IP_ADDRESS: re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b'),
            PIIType.ACCOUNT_ID: re.compile(r'\b(?:acc|account|id|user)[-_]?\s*:?\s*([a-zA-Z0-9]{6,})\b', re.IGNORECASE)
        }
    
    def _init_urgency_keywords(self) -> Dict[UrgencyLevel, List[str]]:
        """Initialize keywords that indicate different urgency levels."""
        return {
            UrgencyLevel.CRITICAL: [
                "emergency", "urgent", "critical", "down", "outage", "broken", "not working",
                "can't access", "cannot access", "locked out", "security breach", "hacked",
                "data loss", "payment failed", "service unavailable", "system down"
            ],
            UrgencyLevel.HIGH: [
                "important", "asap", "soon", "quickly", "priority", "escalate",
                "billing issue", "payment problem", "account suspended", "deadline",
                "business impact", "production", "live environment"
            ],
            UrgencyLevel.MEDIUM: [
                "help", "support", "question", "issue", "problem", "error",
                "bug", "feature", "request", "how to", "tutorial", "guide"
            ],
            UrgencyLevel.LOW: [
                "inquiry", "information", "documentation", "clarification",
                "general", "feedback", "suggestion", "improvement"
            ]
        }
    
    def _init_category_keywords(self) -> Dict[str, List[str]]:
        """Initialize keywords for automatic categorization."""
        return {
            "authentication": [
                "login", "password", "auth", "sign in", "2fa", "mfa", "oauth",
                "credentials", "token", "session", "logout", "access denied"
            ],
            "billing": [
                "payment", "invoice", "billing", "subscription", "plan", "charge",
                "refund", "credit card", "paypal", "pricing", "cost", "upgrade", "downgrade"
            ],
            "technical": [
                "api", "integration", "webhook", "endpoint", "error code", "bug",
                "performance", "timeout", "connection", "database", "server"
            ],
            "account": [
                "profile", "settings", "preferences", "data", "export", "import",
                "delete account", "close account", "gdpr", "privacy"
            ],
            "feature_request": [
                "feature", "enhancement", "suggestion", "improvement", "new",
                "add", "support for", "would like", "can you", "please add"
            ]
        }
    
    def process_chat(self, raw_input: str, user_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Main processing function for chat input.
        
        Args:
            raw_input: Raw user chat text
            user_context: Optional context (user_id, session_id, etc.)
        
        Returns:
            Normalized chat data with PII removed and metadata
        """
        try:
            if not raw_input or not raw_input.strip():
                raise ValueError("Empty input provided")
            
            result = {
                "original_length": len(raw_input),
                "processed_at": datetime.utcnow().isoformat(),
                "user_context": user_context or {},
                "pii_detected": [],
                "urgency_level": UrgencyLevel.MEDIUM.value,
                "suggested_category": "general",
                "normalized_prompt": "",
                "confidence_scores": {},
                "processing_metadata": {}
            }
            
            # Step 1: Detect and mask PII
            cleaned_text, pii_found = self._detect_and_mask_pii(raw_input)
            result["pii_detected"] = pii_found
            result["processing_metadata"]["pii_masked_count"] = len(pii_found)
            
            # Step 2: Determine urgency level
            urgency_level, urgency_confidence = self._determine_urgency(cleaned_text)
            result["urgency_level"] = urgency_level.value
            result["confidence_scores"]["urgency"] = urgency_confidence
            
            # Step 3: Suggest category
            category, category_confidence = self._suggest_category(cleaned_text)
            result["suggested_category"] = category
            result["confidence_scores"]["category"] = category_confidence
            
            # Step 4: Normalize the prompt
            normalized_prompt = self._normalize_prompt(cleaned_text)
            result["normalized_prompt"] = normalized_prompt
            
            # Step 5: Add processing metadata
            result["processing_metadata"].update({
                "text_length_after_cleaning": len(cleaned_text),
                "normalization_applied": len(normalized_prompt) != len(cleaned_text),
                "urgency_keywords_found": self._count_urgency_keywords(cleaned_text),
                "category_keywords_found": self._count_category_keywords(cleaned_text)
            })
            
            logger.info(f"Processed chat: urgency={urgency_level.value}, category={category}, pii_count={len(pii_found)}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing chat: {e}")
            raise
    
    def _detect_and_mask_pii(self, text: str) -> tuple[str, List[Dict[str, Any]]]:
        """Detect and mask PII in the text."""
        cleaned_text = text
        pii_found = []
        
        for pii_type, pattern in self.pii_patterns.items():
            matches = pattern.finditer(text)
            for match in matches:
                pii_hash = hashlib.sha256(match.group().encode()).hexdigest()[:8]
                
                pii_found.append({
                    "type": pii_type.value,
                    "position": match.span(),
                    "hash": pii_hash,
                    "length": len(match.group())
                })
                
                mask = self._get_pii_mask(pii_type)
                cleaned_text = cleaned_text.replace(match.group(), mask)
        
        return cleaned_text, pii_found
    
    def _get_pii_mask(self, pii_type: PIIType) -> str:
        """Get appropriate mask for PII type."""
        masks = {
            PIIType.EMAIL: "[EMAIL_REDACTED]",
            PIIType.PHONE: "[PHONE_REDACTED]",
            PIIType.SSN: "[SSN_REDACTED]",
            PIIType.CREDIT_CARD: "[CARD_REDACTED]",
            PIIType.IP_ADDRESS: "[IP_REDACTED]",
            PIIType.ACCOUNT_ID: "[ACCOUNT_REDACTED]"
        }
        return masks.get(pii_type, "[PII_REDACTED]")
    
    def _determine_urgency(self, text: str) -> tuple[UrgencyLevel, float]:
        """Determine urgency level based on keywords and context."""
        text_lower = text.lower()
        urgency_scores = {}
        
        for level, keywords in self.urgency_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword in text_lower:
                    score += text_lower.count(keyword) * self._get_keyword_weight(keyword)
            urgency_scores[level] = score
        
        if not urgency_scores or max(urgency_scores.values()) == 0:
            return UrgencyLevel.MEDIUM, 0.5
        
        best_level = max(urgency_scores, key=urgency_scores.get)
        confidence = min(urgency_scores[best_level] / 10.0, 1.0)
        
        return best_level, confidence
    
    def _suggest_category(self, text: str) -> tuple[str, float]:
        """Suggest ticket category based on content analysis."""
        text_lower = text.lower()
        category_scores = {}
        
        for category, keywords in self.category_keywords.items():
            score = 0
            for keyword in keywords:
                if keyword in text_lower:
                    score += text_lower.count(keyword) * self._get_keyword_weight(keyword)
            if score > 0:
                category_scores[category] = score
        
        if not category_scores:
            return "general", 0.3
        
        best_category = max(category_scores, key=category_scores.get)
        confidence = min(category_scores[best_category] / 5.0, 1.0)
        
        return best_category, confidence
    
    def _normalize_prompt(self, text: str) -> str:
        """Normalize the prompt for downstream processing."""
        normalized = text.strip()
        normalized = re.sub(r'\s+', ' ', normalized)
        normalized = re.sub(r'[.]{2,}', '...', normalized)
        normalized = re.sub(r'[!]{2,}', '!', normalized)
        normalized = re.sub(r'[?]{2,}', '?', normalized)
        
        if normalized and not normalized[-1] in '.!?':
            normalized += '.'
        
        if normalized:
            normalized = normalized[0].upper() + normalized[1:]
        
        return normalized
    
    def _get_keyword_weight(self, keyword: str) -> float:
        """Get weight for keyword based on its importance."""
        high_impact = ["emergency", "critical", "urgent", "down", "broken", "hacked"]
        medium_impact = ["important", "asap", "help", "problem", "error"]
        
        if keyword in high_impact:
            return 3.0
        elif keyword in medium_impact:
            return 2.0
        else:
            return 1.0
    
    def _count_urgency_keywords(self, text: str) -> Dict[str, int]:
        """Count urgency keywords found in text."""
        text_lower = text.lower()
        counts = {}
        
        for level, keywords in self.urgency_keywords.items():
            level_count = 0
            for keyword in keywords:
                level_count += text_lower.count(keyword)
            counts[level.value] = level_count
        
        return counts
    
    def _count_category_keywords(self, text: str) -> Dict[str, int]:
        """Count category keywords found in text."""
        text_lower = text.lower()
        counts = {}
        
        for category, keywords in self.category_keywords.items():
            category_count = 0
            for keyword in keywords:
                category_count += text_lower.count(keyword)
            counts[category] = category_count
        
        return counts