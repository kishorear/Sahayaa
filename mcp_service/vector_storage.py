"""
Vector storage service for Qdrant integration.
Handles embedding storage and similarity search for ticket resolutions.
"""

import os
import logging
from typing import List, Optional, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from .models import SimilarTicketResult

logger = logging.getLogger(__name__)

class QdrantVectorStorage:
    """Qdrant vector storage for ticket embeddings."""
    
    def __init__(self):
        self.client: Optional[QdrantClient] = None
        self.collection_name = "ticket_rag"
        self.vector_size = 384
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Qdrant client with cloud or local configuration."""
        # Try Qdrant Cloud first
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        if qdrant_url and qdrant_api_key:
            try:
                self.client = QdrantClient(
                    url=qdrant_url,
                    api_key=qdrant_api_key,
                )
                logger.info("Initialized Qdrant Cloud client")
                self._ensure_collection_exists()
                return
            except Exception as e:
                logger.error(f"Failed to connect to Qdrant Cloud: {e}")
        
        # Try local Qdrant
        try:
            self.client = QdrantClient("localhost", port=6333)
            logger.info("Initialized local Qdrant client")
            self._ensure_collection_exists()
            return
        except Exception as e:
            logger.warning(f"Failed to connect to local Qdrant: {e}")
        
        # No Qdrant available
        logger.warning("No Qdrant instance available - similarity search will be disabled")
        self.client = None
    
    def _ensure_collection_exists(self):
        """Ensure the ticket_rag collection exists."""
        if not self.client:
            return
        
        try:
            # Check if collection exists
            collections = self.client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name not in collection_names:
                # Create collection
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.vector_size,
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created Qdrant collection: {self.collection_name}")
            else:
                logger.info(f"Qdrant collection already exists: {self.collection_name}")
        except Exception as e:
            logger.error(f"Error ensuring collection exists: {e}")
            raise
    
    def is_available(self) -> bool:
        """Check if Qdrant is available."""
        return self.client is not None
    
    def store_ticket_embedding(self, ticket_id: int, embedding: List[float], metadata: Dict[str, Any]):
        """Store a ticket embedding in Qdrant."""
        if not self.client:
            logger.warning("Qdrant not available - skipping embedding storage")
            return False
        
        try:
            point = PointStruct(
                id=ticket_id,
                vector=embedding,
                payload=metadata
            )
            
            self.client.upsert(
                collection_name=self.collection_name,
                points=[point]
            )
            logger.debug(f"Stored embedding for ticket {ticket_id}")
            return True
        except Exception as e:
            logger.error(f"Error storing embedding for ticket {ticket_id}: {e}")
            return False
    
    def search_similar_tickets(
        self, 
        query_embedding: List[float], 
        top_k: int = 5, 
        min_score: float = 0.5,
        tenant_id: Optional[int] = None
    ) -> List[SimilarTicketResult]:
        """Search for similar tickets using vector similarity."""
        if not self.client:
            logger.warning("Qdrant not available - returning empty results")
            return []
        
        try:
            # Build filter for tenant if specified
            filter_conditions = None
            if tenant_id is not None:
                filter_conditions = models.Filter(
                    must=[
                        models.FieldCondition(
                            key="tenant_id",
                            match=models.MatchValue(value=tenant_id)
                        )
                    ]
                )
            
            # Perform similarity search
            search_result = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=top_k,
                score_threshold=min_score,
                query_filter=filter_conditions
            )
            
            # Convert results to SimilarTicketResult objects
            results = []
            for hit in search_result:
                if hit.payload:
                    result = SimilarTicketResult(
                        ticket_id=int(hit.id),
                        score=float(hit.score),
                        title=hit.payload.get("title", ""),
                        description=hit.payload.get("description", ""),
                        resolution=hit.payload.get("resolution"),
                        category=hit.payload.get("category", ""),
                        status=hit.payload.get("status", "")
                    )
                    results.append(result)
            
            logger.debug(f"Found {len(results)} similar tickets")
            return results
            
        except Exception as e:
            logger.error(f"Error searching similar tickets: {e}")
            return []
    
    def delete_ticket_embedding(self, ticket_id: int) -> bool:
        """Delete a ticket embedding from Qdrant."""
        if not self.client:
            return False
        
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=models.PointIdsList(
                    points=[ticket_id]
                )
            )
            logger.debug(f"Deleted embedding for ticket {ticket_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting embedding for ticket {ticket_id}: {e}")
            return False
    
    def get_collection_info(self) -> Dict[str, Any]:
        """Get information about the collection."""
        if not self.client:
            return {"available": False, "error": "Qdrant not available"}
        
        try:
            info = self.client.get_collection(self.collection_name)
            return {
                "available": True,
                "name": self.collection_name,
                "vectors_count": info.vectors_count,
                "indexed_vectors_count": info.indexed_vectors_count,
                "points_count": info.points_count,
                "status": info.status
            }
        except Exception as e:
            return {"available": False, "error": str(e)}

# Global vector storage instance
vector_storage = QdrantVectorStorage()