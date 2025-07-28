"""
Simple Vector Storage Implementation
Uses numpy and pickle for local vector similarity search.
"""

import os
import logging
import pickle
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime
from openai import OpenAI
import hashlib

logger = logging.getLogger(__name__)

class SimpleVectorStorage:
    """Simple vector storage with cosine similarity search."""
    
    def __init__(self, persist_directory: str = "./vector_data", max_size_gb: float = 0.8):
        self.persist_directory = persist_directory
        self.max_size_gb = max_size_gb
        self.vectors_file = os.path.join(persist_directory, "vectors.pkl")
        self.metadata_file = os.path.join(persist_directory, "metadata.pkl")
        
        # In-memory storage
        self.vectors = {}  # doc_id -> embedding vector
        self.metadata = {}  # doc_id -> metadata dict
        self.documents = {}  # doc_id -> document text
        
        self.openai_client = None
        
        # Create directory
        os.makedirs(persist_directory, exist_ok=True)
        
    async def initialize(self) -> bool:
        """Initialize the vector storage."""
        try:
            # Initialize OpenAI client
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                self.openai_client = OpenAI(api_key=api_key)
                logger.info("OpenAI client initialized for embeddings")
            else:
                logger.warning("No OpenAI API key - using random embeddings")
            
            # Load existing data
            self._load_data()
            
            logger.info(f"Vector storage initialized with {len(self.vectors)} documents")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize vector storage: {e}")
            return False
    
    def _load_data(self):
        """Load vectors and metadata from disk."""
        try:
            if os.path.exists(self.vectors_file):
                with open(self.vectors_file, 'rb') as f:
                    data = pickle.load(f)
                    self.vectors = data.get('vectors', {})
                    self.documents = data.get('documents', {})
                logger.info(f"Loaded {len(self.vectors)} vectors from disk")
            
            if os.path.exists(self.metadata_file):
                with open(self.metadata_file, 'rb') as f:
                    self.metadata = pickle.load(f)
                logger.info(f"Loaded {len(self.metadata)} metadata entries from disk")
                    
        except Exception as e:
            logger.error(f"Error loading data: {e}")
            self.vectors = {}
            self.metadata = {}
            self.documents = {}
    
    def _save_data(self):
        """Save vectors and metadata to disk."""
        try:
            # Check size before saving
            if self._get_directory_size_gb() > self.max_size_gb:
                self._prune_old_vectors()
            
            with open(self.vectors_file, 'wb') as f:
                pickle.dump({
                    'vectors': self.vectors,
                    'documents': self.documents
                }, f)
            
            with open(self.metadata_file, 'wb') as f:
                pickle.dump(self.metadata, f)
                
        except Exception as e:
            logger.error(f"Error saving data: {e}")
    
    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenAI API or fallback."""
        if self.openai_client:
            try:
                response = self.openai_client.embeddings.create(
                    model="text-embedding-3-small",
                    input=text
                )
                return response.data[0].embedding
            except Exception as e:
                logger.warning(f"OpenAI embedding failed: {e}")
        
        # Fallback: create a simple hash-based embedding
        text_hash = hashlib.md5(text.encode()).hexdigest()
        # Convert hash to pseudo-embedding (384 dimensions)
        embedding = []
        for i in range(0, len(text_hash), 2):
            hex_pair = text_hash[i:i+2]
            embedding.append(int(hex_pair, 16) / 255.0 - 0.5)
        
        # Pad to 384 dimensions
        while len(embedding) < 384:
            embedding.append(0.0)
        
        return embedding[:384]
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        try:
            a = np.array(vec1)
            b = np.array(vec2)
            return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
        except:
            return 0.0
    
    def _get_directory_size_gb(self) -> float:
        """Calculate directory size in GB."""
        total_size = 0
        try:
            for dirpath, dirnames, filenames in os.walk(self.persist_directory):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    total_size += os.path.getsize(filepath)
            return total_size / (1024**3)
        except:
            return 0
    
    async def _prune_old_vectors(self, target_count: int = 3000):
        """Remove oldest vectors to maintain size limit."""
        try:
            if len(self.vectors) <= target_count:
                return
            
            # Sort by creation time
            items_with_time = []
            for doc_id in self.vectors.keys():
                metadata = self.metadata.get(doc_id, {})
                timestamp = metadata.get("created_at", "1970-01-01T00:00:00")
                items_with_time.append((timestamp, doc_id))
            
            items_with_time.sort()  # Oldest first
            
            # Remove oldest items
            items_to_delete = len(self.vectors) - target_count
            for _, doc_id in items_with_time[:items_to_delete]:
                self.vectors.pop(doc_id, None)
                self.metadata.pop(doc_id, None)
                self.documents.pop(doc_id, None)
            
            logger.info(f"Pruned {items_to_delete} old vectors")
            self._save_data()
            
        except Exception as e:
            logger.error(f"Failed to prune vectors: {e}")
    
    async def add_document(self, doc_id: str, content: str, metadata: Dict[str, Any] = None) -> bool:
        """Add document to vector storage."""
        try:
            # Generate embedding
            embedding = self._generate_embedding(content)
            
            # Store data
            self.vectors[doc_id] = embedding
            self.documents[doc_id] = content
            self.metadata[doc_id] = metadata or {}
            self.metadata[doc_id].update({
                "created_at": datetime.utcnow().isoformat(),
                "content_hash": hashlib.md5(content.encode()).hexdigest()
            })
            
            # Save to disk
            self._save_data()
            
            logger.info(f"Added document {doc_id} to vector storage")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add document {doc_id}: {e}")
            return False
    
    async def search_similar(self, query: str, top_k: int = 5, filter_metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Search for similar documents."""
        try:
            # Generate query embedding
            query_embedding = self._generate_embedding(query)
            
            # Calculate similarities
            similarities = []
            for doc_id, doc_embedding in self.vectors.items():
                # Apply metadata filter
                if filter_metadata:
                    doc_metadata = self.metadata.get(doc_id, {})
                    skip = False
                    for key, value in filter_metadata.items():
                        if doc_metadata.get(key) != value:
                            skip = True
                            break
                    if skip:
                        continue
                
                similarity = self._cosine_similarity(query_embedding, doc_embedding)
                similarities.append({
                    "id": doc_id,
                    "content": self.documents.get(doc_id, ""),
                    "metadata": self.metadata.get(doc_id, {}),
                    "similarity": similarity,
                    "distance": 1 - similarity
                })
            
            # Sort by similarity and return top_k
            similarities.sort(key=lambda x: x["similarity"], reverse=True)
            results = similarities[:top_k]
            
            logger.info(f"Found {len(results)} similar documents for query")
            return results
            
        except Exception as e:
            logger.error(f"Failed to search similar documents: {e}")
            return []
    
    async def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics."""
        try:
            size_gb = self._get_directory_size_gb()
            
            return {
                "document_count": len(self.vectors),
                "storage_size_gb": round(size_gb, 3),
                "max_size_gb": self.max_size_gb,
                "storage_usage_percent": round((size_gb / self.max_size_gb) * 100, 1),
                "collection_name": "simple_vectors"
            }
            
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {"error": str(e)}
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for the vector storage."""
        try:
            stats = await self.get_collection_stats()
            
            return {
                "status": "healthy",
                "stats": stats,
                "embedding_service": "available" if self.openai_client else "fallback",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

# Global instance
vector_storage = SimpleVectorStorage()