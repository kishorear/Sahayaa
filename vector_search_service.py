"""
Advanced Vector Search Service
Implements Chroma/Milvus + embeddings + cosine similarity for InstructionLookup and TicketLookup
"""

import os
import asyncio
import logging
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import json
from datetime import datetime
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating and managing embeddings"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.dimension = 384  # Default for all-MiniLM-L6-v2
        
    async def initialize(self):
        """Initialize the embedding model"""
        try:
            self.model = SentenceTransformer(self.model_name)
            self.dimension = self.model.get_sentence_embedding_dimension()
            logger.info(f"Embedding model {self.model_name} initialized with dimension {self.dimension}")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize embedding model: {e}")
            return False
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding for text"""
        if not self.model:
            raise RuntimeError("Embedding model not initialized")
        
        # Clean and normalize text
        cleaned_text = text.strip().replace('\n', ' ').replace('\r', '')
        if not cleaned_text:
            return np.zeros(self.dimension)
        
        # Generate embedding
        embedding = self.model.encode(cleaned_text, normalize_embeddings=True)
        return embedding
    
    def cosine_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine similarity between two embeddings"""
        # Normalize embeddings
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        # Calculate cosine similarity
        similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)
        return float(similarity)

class ChromaVectorStore:
    """ChromaDB vector store implementation"""
    
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        self.client = None
        self.collections = {}
        
    async def initialize(self):
        """Initialize ChromaDB client"""
        try:
            # Create persist directory if it doesn't exist
            os.makedirs(self.persist_directory, exist_ok=True)
            
            # Initialize ChromaDB client
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Create collections for instructions and tickets
            await self._create_collections()
            
            logger.info("ChromaDB initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            return False
    
    async def _create_collections(self):
        """Create or get collections for different data types"""
        try:
            # Instructions collection
            self.collections['instructions'] = self.client.get_or_create_collection(
                name="instructions",
                metadata={"description": "Knowledge base instructions and documentation"}
            )
            
            # Tickets collection
            self.collections['tickets'] = self.client.get_or_create_collection(
                name="tickets",
                metadata={"description": "Support tickets and resolutions"}
            )
            
            # Conversations collection
            self.collections['conversations'] = self.client.get_or_create_collection(
                name="conversations",
                metadata={"description": "Chat conversations and messages"}
            )
            
            logger.info("ChromaDB collections created/retrieved successfully")
            
        except Exception as e:
            logger.error(f"Failed to create ChromaDB collections: {e}")
            raise
    
    async def add_instruction(self, instruction_id: str, title: str, content: str, 
                            embedding: np.ndarray, metadata: Dict[str, Any] = None):
        """Add instruction to vector store"""
        try:
            collection = self.collections['instructions']
            
            # Prepare document data
            document_text = f"{title}\n\n{content}"
            doc_metadata = {
                "instruction_id": instruction_id,
                "title": title,
                "type": "instruction",
                "created_at": datetime.now().isoformat(),
                **(metadata or {})
            }
            
            # Add to collection
            collection.add(
                embeddings=[embedding.tolist()],
                documents=[document_text],
                metadatas=[doc_metadata],
                ids=[f"instruction_{instruction_id}"]
            )
            
            logger.info(f"Added instruction {instruction_id} to vector store")
            
        except Exception as e:
            logger.error(f"Failed to add instruction to vector store: {e}")
            raise
    
    async def add_ticket(self, ticket_id: str, title: str, description: str, 
                        resolution: str, embedding: np.ndarray, metadata: Dict[str, Any] = None):
        """Add ticket to vector store"""
        try:
            collection = self.collections['tickets']
            
            # Prepare document data
            document_text = f"{title}\n\nDescription: {description}\n\nResolution: {resolution}"
            doc_metadata = {
                "ticket_id": ticket_id,
                "title": title,
                "type": "ticket",
                "created_at": datetime.now().isoformat(),
                **(metadata or {})
            }
            
            # Add to collection
            collection.add(
                embeddings=[embedding.tolist()],
                documents=[document_text],
                metadatas=[doc_metadata],
                ids=[f"ticket_{ticket_id}"]
            )
            
            logger.info(f"Added ticket {ticket_id} to vector store")
            
        except Exception as e:
            logger.error(f"Failed to add ticket to vector store: {e}")
            raise
    
    async def search_instructions(self, query_embedding: np.ndarray, 
                                 top_k: int = 5, min_similarity: float = 0.7) -> List[Dict[str, Any]]:
        """Search for similar instructions"""
        try:
            collection = self.collections['instructions']
            
            # Perform similarity search
            results = collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=top_k,
                include=['documents', 'metadatas', 'distances']
            )
            
            # Process results
            processed_results = []
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            )):
                # Convert distance to similarity score
                similarity = 1 - distance  # ChromaDB uses cosine distance
                
                if similarity >= min_similarity:
                    processed_results.append({
                        'instruction_id': metadata.get('instruction_id'),
                        'title': metadata.get('title'),
                        'content': doc,
                        'similarity_score': similarity,
                        'metadata': metadata
                    })
            
            logger.info(f"Found {len(processed_results)} instructions with similarity >= {min_similarity}")
            return processed_results
            
        except Exception as e:
            logger.error(f"Failed to search instructions: {e}")
            return []
    
    async def search_tickets(self, query_embedding: np.ndarray, 
                           top_k: int = 10, min_similarity: float = 0.6) -> List[Dict[str, Any]]:
        """Search for similar tickets"""
        try:
            collection = self.collections['tickets']
            
            # Perform similarity search
            results = collection.query(
                query_embeddings=[query_embedding.tolist()],
                n_results=top_k,
                include=['documents', 'metadatas', 'distances']
            )
            
            # Process results
            processed_results = []
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            )):
                # Convert distance to similarity score
                similarity = 1 - distance  # ChromaDB uses cosine distance
                
                if similarity >= min_similarity:
                    processed_results.append({
                        'ticket_id': metadata.get('ticket_id'),
                        'title': metadata.get('title'),
                        'content': doc,
                        'similarity_score': similarity,
                        'metadata': metadata
                    })
            
            logger.info(f"Found {len(processed_results)} tickets with similarity >= {min_similarity}")
            return processed_results
            
        except Exception as e:
            logger.error(f"Failed to search tickets: {e}")
            return []
    
    async def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about collections"""
        try:
            stats = {}
            for name, collection in self.collections.items():
                count = collection.count()
                stats[name] = {
                    'count': count,
                    'name': name
                }
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get collection stats: {e}")
            return {}

class VectorSearchService:
    """Main vector search service coordinating embeddings and vector store"""
    
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.vector_store = ChromaVectorStore()
        self.initialized = False
    
    async def initialize(self):
        """Initialize all services"""
        try:
            # Initialize embedding service
            embedding_success = await self.embedding_service.initialize()
            if not embedding_success:
                return False
            
            # Initialize vector store
            vector_success = await self.vector_store.initialize()
            if not vector_success:
                return False
            
            self.initialized = True
            logger.info("Vector search service initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize vector search service: {e}")
            return False
    
    async def index_instruction(self, instruction_id: str, title: str, content: str, 
                               metadata: Dict[str, Any] = None):
        """Index an instruction for vector search"""
        if not self.initialized:
            await self.initialize()
        
        try:
            # Generate embedding
            text_to_embed = f"{title}\n\n{content}"
            embedding = self.embedding_service.generate_embedding(text_to_embed)
            
            # Add to vector store
            await self.vector_store.add_instruction(
                instruction_id, title, content, embedding, metadata
            )
            
            logger.info(f"Indexed instruction {instruction_id}")
            
        except Exception as e:
            logger.error(f"Failed to index instruction {instruction_id}: {e}")
            raise
    
    async def index_ticket(self, ticket_id: str, title: str, description: str, 
                          resolution: str, metadata: Dict[str, Any] = None):
        """Index a ticket for vector search"""
        if not self.initialized:
            await self.initialize()
        
        try:
            # Generate embedding
            text_to_embed = f"{title}\n\nDescription: {description}\n\nResolution: {resolution}"
            embedding = self.embedding_service.generate_embedding(text_to_embed)
            
            # Add to vector store
            await self.vector_store.add_ticket(
                ticket_id, title, description, resolution, embedding, metadata
            )
            
            logger.info(f"Indexed ticket {ticket_id}")
            
        except Exception as e:
            logger.error(f"Failed to index ticket {ticket_id}: {e}")
            raise
    
    async def search_similar_instructions(self, query: str, top_k: int = 5, 
                                        min_similarity: float = 0.7) -> List[Dict[str, Any]]:
        """Search for similar instructions"""
        if not self.initialized:
            await self.initialize()
        
        try:
            # Generate query embedding
            query_embedding = self.embedding_service.generate_embedding(query)
            
            # Search vector store
            results = await self.vector_store.search_instructions(
                query_embedding, top_k, min_similarity
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to search similar instructions: {e}")
            return []
    
    async def search_similar_tickets(self, query: str, top_k: int = 10, 
                                   min_similarity: float = 0.6) -> List[Dict[str, Any]]:
        """Search for similar tickets"""
        if not self.initialized:
            await self.initialize()
        
        try:
            # Generate query embedding
            query_embedding = self.embedding_service.generate_embedding(query)
            
            # Search vector store
            results = await self.vector_store.search_tickets(
                query_embedding, top_k, min_similarity
            )
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to search similar tickets: {e}")
            return []
    
    async def health_check(self) -> Dict[str, Any]:
        """Check vector search service health"""
        try:
            stats = await self.vector_store.get_collection_stats()
            
            return {
                "status": "healthy" if self.initialized else "unhealthy",
                "embedding_model": self.embedding_service.model_name,
                "embedding_dimension": self.embedding_service.dimension,
                "collections": stats,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Vector search health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

# Global vector search service instance
vector_search_service: Optional[VectorSearchService] = None

async def get_vector_search_service() -> VectorSearchService:
    """Get initialized vector search service"""
    global vector_search_service
    if not vector_search_service:
        vector_search_service = VectorSearchService()
        await vector_search_service.initialize()
    return vector_search_service