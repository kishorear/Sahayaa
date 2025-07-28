"""
Lightweight Vector Storage for Local Embeddings
Handles embeddings and vector similarity search with size management.
"""

import os
import logging
import asyncio
import pickle
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from openai import OpenAI
import hashlib
import json

logger = logging.getLogger(__name__)

class ChromaVectorStorage:
    """Local Chroma vector storage with size management and pruning."""
    
    def __init__(self, 
                 persist_directory: str = "./chroma_data",
                 max_size_gb: float = 0.8,  # Stay under 1GB
                 collection_name: str = "support_vectors"):
        
        self.persist_directory = persist_directory
        self.max_size_gb = max_size_gb
        self.collection_name = collection_name
        self.client = None
        self.collection = None
        self.openai_client = None
        
        # Create directory if it doesn't exist
        os.makedirs(persist_directory, exist_ok=True)
        
    async def initialize(self) -> bool:
        """Initialize Chroma client and collection."""
        try:
            # Initialize Chroma client in local file mode
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Create or get collection
            try:
                self.collection = self.client.get_collection(self.collection_name)
                logger.info(f"Loaded existing collection: {self.collection_name}")
            except ValueError:
                # Collection doesn't exist, create it
                self.collection = self.client.create_collection(
                    name=self.collection_name,
                    metadata={"hnsw:space": "cosine"}
                )
                logger.info(f"Created new collection: {self.collection_name}")
            
            # Initialize OpenAI client for embeddings
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                self.openai_client = OpenAI(api_key=api_key)
                logger.info("OpenAI client initialized for embeddings")
            else:
                logger.warning("No OpenAI API key found - embeddings will fail")
                
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Chroma storage: {e}")
            return False
    
    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenAI API."""
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")
        
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise
    
    def _get_directory_size_gb(self) -> float:
        """Calculate directory size in GB."""
        total_size = 0
        try:
            for dirpath, dirnames, filenames in os.walk(self.persist_directory):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    total_size += os.path.getsize(filepath)
            return total_size / (1024**3)  # Convert to GB
        except Exception as e:
            logger.error(f"Error calculating directory size: {e}")
            return 0
    
    async def _prune_old_vectors(self, target_count: int = 5000):
        """Remove oldest vectors to maintain size limit."""
        try:
            # Get all items with metadata
            result = self.collection.get(include=["metadatas"])
            
            if len(result["ids"]) <= target_count:
                return  # No pruning needed
            
            # Sort by timestamp (oldest first)
            items_with_time = []
            for i, item_id in enumerate(result["ids"]):
                metadata = result["metadatas"][i] or {}
                timestamp = metadata.get("created_at", "1970-01-01T00:00:00")
                items_with_time.append((timestamp, item_id))
            
            items_with_time.sort()  # Sort by timestamp
            
            # Delete oldest items
            items_to_delete = len(result["ids"]) - target_count
            delete_ids = [item[1] for item in items_with_time[:items_to_delete]]
            
            if delete_ids:
                self.collection.delete(ids=delete_ids)
                logger.info(f"Pruned {len(delete_ids)} old vectors")
                
        except Exception as e:
            logger.error(f"Failed to prune vectors: {e}")
    
    async def add_document(self, 
                          doc_id: str,
                          content: str,
                          metadata: Dict[str, Any] = None) -> bool:
        """Add document to vector storage."""
        try:
            # Check size limit before adding
            current_size = self._get_directory_size_gb()
            if current_size > self.max_size_gb:
                await self._prune_old_vectors()
            
            # Generate embedding
            embedding = self._generate_embedding(content)
            
            # Prepare metadata
            doc_metadata = metadata or {}
            doc_metadata.update({
                "created_at": datetime.utcnow().isoformat(),
                "content_hash": hashlib.md5(content.encode()).hexdigest()
            })
            
            # Add to collection
            self.collection.add(
                embeddings=[embedding],
                documents=[content],
                metadatas=[doc_metadata],
                ids=[doc_id]
            )
            
            logger.info(f"Added document {doc_id} to vector storage")
            return True
            
        except Exception as e:
            logger.error(f"Failed to add document {doc_id}: {e}")
            return False
    
    async def search_similar(self, 
                           query: str,
                           top_k: int = 5,
                           filter_metadata: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Search for similar documents."""
        try:
            # Generate query embedding
            query_embedding = self._generate_embedding(query)
            
            # Build where clause for filtering
            where_clause = filter_metadata or {}
            
            # Search collection
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_clause if where_clause else None,
                include=["documents", "metadatas", "distances"]
            )
            
            # Format results
            formatted_results = []
            for i in range(len(results["ids"][0])):
                formatted_results.append({
                    "id": results["ids"][0][i],
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "similarity": 1 - results["distances"][0][i],  # Convert distance to similarity
                    "distance": results["distances"][0][i]
                })
            
            logger.info(f"Found {len(formatted_results)} similar documents for query")
            return formatted_results
            
        except Exception as e:
            logger.error(f"Failed to search similar documents: {e}")
            return []
    
    async def get_collection_stats(self) -> Dict[str, Any]:
        """Get collection statistics."""
        try:
            count = self.collection.count()
            size_gb = self._get_directory_size_gb()
            
            return {
                "document_count": count,
                "storage_size_gb": round(size_gb, 3),
                "max_size_gb": self.max_size_gb,
                "storage_usage_percent": round((size_gb / self.max_size_gb) * 100, 1),
                "collection_name": self.collection_name
            }
            
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {"error": str(e)}
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for the vector storage."""
        try:
            stats = await self.get_collection_stats()
            
            # Check if we can perform operations
            test_embedding = self._generate_embedding("test")
            
            return {
                "status": "healthy",
                "stats": stats,
                "embedding_service": "available" if self.openai_client else "unavailable",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

# Global instance
vector_storage = ChromaVectorStorage()