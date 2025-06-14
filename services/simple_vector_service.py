"""
Simple Vector Storage Service
File-based vector storage using Google AI embeddings as a ChromaDB replacement
"""

import os
import json
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import hashlib

# Import Google AI for embeddings
try:
    import google.generativeai as genai
    GOOGLE_AI_AVAILABLE = True
except ImportError:
    GOOGLE_AI_AVAILABLE = False

logger = logging.getLogger(__name__)

class SimpleVectorService:
    """Simple file-based vector storage with Google AI embeddings."""
    
    def __init__(self, persist_directory: str = "./vector_storage/simple"):
        self.persist_directory = Path(persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        
        self.instruction_file = self.persist_directory / "instructions.json"
        self.ticket_file = self.persist_directory / "tickets.json"
        
        # Initialize Google AI
        api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
        if api_key and GOOGLE_AI_AVAILABLE:
            genai.configure(api_key=api_key)
            self.use_embeddings = True
            logger.info("Google AI embeddings initialized")
        else:
            self.use_embeddings = False
            logger.warning("Google AI not available, using keyword matching")
        
        # Load existing data
        self.instructions = self._load_data(self.instruction_file)
        self.tickets = self._load_data(self.ticket_file)
        
        # Initialize with sample data if empty
        if not self.instructions:
            self._create_sample_instructions()
        if not self.tickets:
            self._create_sample_tickets()
    
    def _load_data(self, file_path: Path) -> List[Dict[str, Any]]:
        """Load data from JSON file."""
        try:
            if file_path.exists():
                with open(file_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load {file_path}: {e}")
        return []
    
    def _save_data(self, data: List[Dict[str, Any]], file_path: Path):
        """Save data to JSON file."""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            logger.error(f"Failed to save {file_path}: {e}")
    
    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Google AI or fallback to keyword hash."""
        if self.use_embeddings and GOOGLE_AI_AVAILABLE:
            try:
                result = genai.embed_content(
                    model="models/embedding-001",
                    content=text,
                    task_type="retrieval_document"
                )
                return result['embedding']
            except Exception as e:
                logger.warning(f"Embedding generation failed: {e}")
        
        # Fallback: Simple keyword-based vector
        words = text.lower().split()
        word_set = set(words[:50])  # Use first 50 words
        vector = [hash(word) % 1000 / 1000.0 for word in sorted(word_set)]
        # Pad or truncate to 384 dimensions
        if len(vector) < 384:
            vector.extend([0.0] * (384 - len(vector)))
        else:
            vector = vector[:384]
        return vector
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        try:
            vec1 = np.array(vec1)
            vec2 = np.array(vec2)
            
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return float(dot_product / (norm1 * norm2))
        except:
            return 0.0
    
    def _create_sample_instructions(self):
        """Create sample instructions for testing."""
        sample_instructions = [
            {
                "filename": "password_reset.txt",
                "text": "Password Reset Instructions: Go to login page, click 'Forgot Password', enter email, check email for reset link, follow link to create new password.",
                "metadata": {"source": "system", "category": "authentication"}
            },
            {
                "filename": "account_access.txt", 
                "text": "Account Access Troubleshooting: For login issues check password, account lock status, email verification, browser cache, and two-factor authentication.",
                "metadata": {"source": "system", "category": "access"}
            },
            {
                "filename": "billing_support.txt",
                "text": "Billing Support: View invoices in account settings, update payment methods, download receipts, contact billing team for refunds or subscription changes.",
                "metadata": {"source": "system", "category": "billing"}
            }
        ]
        
        for instruction in sample_instructions:
            self.upsert_instruction(
                filename=instruction["filename"],
                text=instruction["text"],
                metadata=instruction["metadata"]
            )
    
    def _create_sample_tickets(self):
        """Create sample tickets for testing."""
        sample_tickets = [
            {
                "ticket_id": 1001,
                "title": "Cannot login after password reset",
                "description": "User attempted password reset but still cannot access account. Getting 'invalid credentials' error.",
                "metadata": {"category": "authentication", "status": "resolved"}
            },
            {
                "ticket_id": 1002,
                "title": "Payment method not working", 
                "description": "Credit card keeps getting declined even though bank says card is fine. Need to update billing information.",
                "metadata": {"category": "billing", "status": "resolved"}
            },
            {
                "ticket_id": 1003,
                "title": "Account locked after multiple failed attempts",
                "description": "User account automatically locked due to security policy. Need account unlock and password reset.",
                "metadata": {"category": "security", "status": "resolved"}
            }
        ]
        
        for ticket in sample_tickets:
            self.upsert_ticket(
                ticket_id=ticket["ticket_id"],
                title=ticket["title"],
                description=ticket["description"],
                metadata=ticket["metadata"]
            )
    
    def upsert_instruction(self, filename: str, text: str, metadata: Dict[str, Any] = None) -> bool:
        """Upsert an instruction document."""
        try:
            # Generate embedding
            embedding = self._generate_embedding(text)
            
            # Create document
            doc = {
                "id": hashlib.md5(filename.encode()).hexdigest(),
                "filename": filename,
                "text": text,
                "embedding": embedding,
                "metadata": metadata or {},
                "created_at": datetime.now().isoformat()
            }
            
            # Remove existing document with same filename
            self.instructions = [i for i in self.instructions if i.get("filename") != filename]
            
            # Add new document
            self.instructions.append(doc)
            
            # Save to file
            self._save_data(self.instructions, self.instruction_file)
            
            logger.info(f"Upserted instruction: {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert instruction {filename}: {e}")
            return False
    
    def upsert_ticket(self, ticket_id: int, title: str, description: str, metadata: Dict[str, Any] = None) -> bool:
        """Upsert a ticket."""
        try:
            # Combine title and description for embedding
            text = f"{title}\n\n{description}"
            
            # Generate embedding
            embedding = self._generate_embedding(text)
            
            # Create document
            doc = {
                "id": f"ticket_{ticket_id}",
                "ticket_id": ticket_id,
                "title": title,
                "description": description,
                "text": text,
                "embedding": embedding,
                "metadata": metadata or {},
                "created_at": datetime.now().isoformat()
            }
            
            # Remove existing ticket with same ID
            self.tickets = [t for t in self.tickets if t.get("ticket_id") != ticket_id]
            
            # Add new ticket
            self.tickets.append(doc)
            
            # Save to file
            self._save_data(self.tickets, self.ticket_file)
            
            logger.info(f"Upserted ticket: {ticket_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert ticket {ticket_id}: {e}")
            return False
    
    def search_instructions(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Search for similar instructions."""
        try:
            if not self.instructions:
                return []
            
            # Generate query embedding
            query_embedding = self._generate_embedding(query)
            
            # Calculate similarities
            results = []
            for instruction in self.instructions:
                similarity = self._cosine_similarity(query_embedding, instruction["embedding"])
                result = {
                    "id": instruction["id"],
                    "document": instruction["text"],
                    "metadata": instruction["metadata"],
                    "similarity": similarity,
                    "distance": 1 - similarity
                }
                results.append(result)
            
            # Sort by similarity and return top_k
            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Failed to search instructions: {e}")
            return []
    
    def search_tickets(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Search for similar tickets."""
        try:
            if not self.tickets:
                return []
            
            # Generate query embedding
            query_embedding = self._generate_embedding(query)
            
            # Calculate similarities
            results = []
            for ticket in self.tickets:
                similarity = self._cosine_similarity(query_embedding, ticket["embedding"])
                result = {
                    "id": ticket["id"],
                    "document": ticket["text"],
                    "metadata": {
                        "ticket_id": ticket["ticket_id"],
                        "title": ticket["title"],
                        "description": ticket["description"],
                        **ticket["metadata"]
                    },
                    "similarity": similarity,
                    "distance": 1 - similarity
                }
                results.append(result)
            
            # Sort by similarity and return top_k
            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]
            
        except Exception as e:
            logger.error(f"Failed to search tickets: {e}")
            return []
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the collections."""
        return {
            "instruction_texts": {
                "count": len(self.instructions),
                "collection": "instructions"
            },
            "ticket_rag": {
                "count": len(self.tickets),
                "collection": "tickets"
            },
            "storage_type": "simple_vector",
            "embeddings_enabled": self.use_embeddings,
            "persist_directory": str(self.persist_directory)
        }

# Global instance
_vector_service = None

def get_vector_service() -> SimpleVectorService:
    """Get the global vector service instance."""
    global _vector_service
    if _vector_service is None:
        _vector_service = SimpleVectorService()
    return _vector_service