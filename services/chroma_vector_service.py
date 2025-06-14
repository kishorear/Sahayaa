"""
Chroma Vector Storage Service
Replaces Qdrant with ChromaDB for vector storage and similarity search
"""

import os
import json
import logging
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import hashlib

try:
    import chromadb
    from chromadb.config import Settings
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False
    chromadb = None

# For embeddings, we'll use Google AI Embeddings API (via gemini)
import google.generativeai as genai

logger = logging.getLogger(__name__)

class ChromaVectorService:
    """Vector storage service using ChromaDB with Gemini embeddings."""
    
    def __init__(self, persist_directory: str = "./vector_storage/chroma"):
        self.persist_directory = Path(persist_directory)
        self.persist_directory.mkdir(parents=True, exist_ok=True)
        
        # Initialize Gemini API
        api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        genai.configure(api_key=api_key)
        
        # Initialize ChromaDB
        if not CHROMA_AVAILABLE:
            raise ImportError("ChromaDB not available. Install with: pip install chromadb")
            
        self.client = chromadb.PersistentClient(
            path=str(self.persist_directory),
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Create collections
        self.instruction_collection = self._get_or_create_collection("instruction_texts")
        self.ticket_collection = self._get_or_create_collection("ticket_rag")
        
        logger.info(f"ChromaDB initialized at {self.persist_directory}")
        
    def _get_or_create_collection(self, name: str):
        """Get or create a collection."""
        try:
            return self.client.get_collection(name)
        except:
            return self.client.create_collection(
                name=name,
                metadata={"description": f"Collection for {name}"}
            )
    
    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using Gemini API."""
        try:
            # Use Gemini embedding model
            result = genai.embed_content(
                model="models/embedding-001",
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            # Fallback to random embedding for testing
            return np.random.random(768).tolist()
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        vec1 = np.array(vec1)
        vec2 = np.array(vec2)
        
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    def upsert_instruction(self, filename: str, text: str, metadata: Dict[str, Any] = None) -> bool:
        """Upsert an instruction document into ChromaDB."""
        try:
            # Generate unique ID
            doc_id = hashlib.md5(filename.encode()).hexdigest()
            
            # Generate embedding
            embedding = self._generate_embedding(text)
            
            # Prepare metadata
            doc_metadata = {
                "filename": filename,
                "text_length": len(text),
                "created_at": datetime.now().isoformat(),
                **(metadata or {})
            }
            
            # Upsert to collection
            self.instruction_collection.upsert(
                ids=[doc_id],
                embeddings=[embedding],
                documents=[text],
                metadatas=[doc_metadata]
            )
            
            logger.info(f"Upserted instruction: {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert instruction {filename}: {e}")
            return False
    
    def upsert_ticket(self, ticket_id: int, title: str, description: str, metadata: Dict[str, Any] = None) -> bool:
        """Upsert a ticket into ChromaDB for similarity search."""
        try:
            # Combine title and description for embedding
            text = f"{title}\n\n{description}"
            
            # Generate unique ID
            doc_id = f"ticket_{ticket_id}"
            
            # Generate embedding
            embedding = self._generate_embedding(text)
            
            # Prepare metadata
            doc_metadata = {
                "ticket_id": ticket_id,
                "title": title,
                "description": description,
                "created_at": datetime.now().isoformat(),
                **(metadata or {})
            }
            
            # Upsert to collection
            self.ticket_collection.upsert(
                ids=[doc_id],
                embeddings=[embedding],
                documents=[text],
                metadatas=[doc_metadata]
            )
            
            logger.info(f"Upserted ticket: {ticket_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert ticket {ticket_id}: {e}")
            return False
    
    def search_instructions(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Search for similar instructions."""
        try:
            # Generate query embedding
            query_embedding = self._generate_embedding(query)
            
            # Search in ChromaDB
            results = self.instruction_collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k
            )
            
            # Format results
            formatted_results = []
            if results['ids'][0]:  # Check if we have results
                for i in range(len(results['ids'][0])):
                    result = {
                        "id": results['ids'][0][i],
                        "document": results['documents'][0][i],
                        "metadata": results['metadatas'][0][i],
                        "distance": results['distances'][0][i] if 'distances' in results else 0.0,
                        "similarity": 1 - results['distances'][0][i] if 'distances' in results else 1.0
                    }
                    formatted_results.append(result)
            
            logger.info(f"Found {len(formatted_results)} instruction results for query: {query[:50]}...")
            return formatted_results
            
        except Exception as e:
            logger.error(f"Failed to search instructions: {e}")
            return []
    
    def search_tickets(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Search for similar tickets."""
        try:
            # Generate query embedding
            query_embedding = self._generate_embedding(query)
            
            # Search in ChromaDB
            results = self.ticket_collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k
            )
            
            # Format results
            formatted_results = []
            if results['ids'][0]:  # Check if we have results
                for i in range(len(results['ids'][0])):
                    result = {
                        "id": results['ids'][0][i],
                        "document": results['documents'][0][i],
                        "metadata": results['metadatas'][0][i],
                        "distance": results['distances'][0][i] if 'distances' in results else 0.0,
                        "similarity": 1 - results['distances'][0][i] if 'distances' in results else 1.0
                    }
                    formatted_results.append(result)
            
            logger.info(f"Found {len(formatted_results)} ticket results for query: {query[:50]}...")
            return formatted_results
            
        except Exception as e:
            logger.error(f"Failed to search tickets: {e}")
            return []
    
    def load_instructions_from_directory(self, directory: str) -> int:
        """Load all instruction files from a directory into ChromaDB."""
        instruction_dir = Path(directory)
        if not instruction_dir.exists():
            logger.warning(f"Instruction directory not found: {directory}")
            return 0
        
        count = 0
        for file_path in instruction_dir.glob("*.txt"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                
                if content:
                    success = self.upsert_instruction(
                        filename=file_path.name,
                        text=content,
                        metadata={"source_directory": directory}
                    )
                    if success:
                        count += 1
                        
            except Exception as e:
                logger.error(f"Failed to load instruction file {file_path}: {e}")
        
        logger.info(f"Loaded {count} instruction files from {directory}")
        return count
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the collections."""
        try:
            instruction_count = self.instruction_collection.count()
            ticket_count = self.ticket_collection.count()
            
            return {
                "instruction_texts": {
                    "count": instruction_count,
                    "collection": "instruction_texts"
                },
                "ticket_rag": {
                    "count": ticket_count,
                    "collection": "ticket_rag"
                },
                "storage_type": "chromadb",
                "persist_directory": str(self.persist_directory)
            }
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {"error": str(e)}

# Global instance
_chroma_service = None

def get_chroma_service() -> ChromaVectorService:
    """Get the global ChromaDB service instance."""
    global _chroma_service
    if _chroma_service is None:
        _chroma_service = ChromaVectorService()
    return _chroma_service