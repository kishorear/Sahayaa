"""
Unified Knowledge Service
Centralizes knowledge management for RAG, MCP, and agent services using the uploads folder.
"""

import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import openai
import numpy as np
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UnifiedKnowledgeService:
    """
    Unified service for managing knowledge across RAG, MCP, and agent systems.
    Uses uploads folder as the central repository.
    """
    
    def __init__(self, uploads_dir: str = "uploads"):
        self.uploads_dir = Path(uploads_dir)
        self.uploads_dir.mkdir(exist_ok=True)
        
        # Vector storage
        self.vector_storage_dir = Path("vector_storage")
        self.vector_storage_dir.mkdir(exist_ok=True)
        
        self.vectors_file = self.vector_storage_dir / "unified_vectors.pkl"
        self.metadata_file = self.vector_storage_dir / "unified_metadata.json"
        
        # Initialize OpenAI client
        self.openai_client = self._init_openai()
        
        # Load existing data
        self.vectors = self._load_vectors()
        self.metadata = self._load_metadata()
        
        logger.info(f"Unified knowledge service initialized with {len(self.vectors)} vectors")
    
    def _init_openai(self):
        """Initialize OpenAI client for embeddings."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("No OpenAI API key found - embeddings will be unavailable")
            return None
        
        try:
            client = openai.OpenAI(api_key=api_key)
            # Test the client
            client.models.list()
            logger.info("OpenAI client initialized successfully")
            return client
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
            return None
    
    def _load_vectors(self):
        """Load vectors from storage."""
        if self.vectors_file.exists():
            try:
                import pickle
                with open(self.vectors_file, 'rb') as f:
                    vectors = pickle.load(f)
                logger.info(f"Loaded {len(vectors)} vectors from storage")
                return vectors
            except Exception as e:
                logger.error(f"Failed to load vectors: {e}")
                return []
        return []
    
    def _load_metadata(self):
        """Load metadata from storage."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                logger.info(f"Loaded metadata for {len(metadata)} items")
                return metadata
            except Exception as e:
                logger.error(f"Failed to load metadata: {e}")
                return []
        return []
    
    def _save_vectors(self):
        """Save vectors to storage."""
        try:
            import pickle
            with open(self.vectors_file, 'wb') as f:
                pickle.dump(self.vectors, f)
        except Exception as e:
            logger.error(f"Failed to save vectors: {e}")
    
    def _save_metadata(self):
        """Save metadata to storage."""
        try:
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")
    
    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding for text using OpenAI."""
        if not self.openai_client:
            return None
        
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
                dimensions=384
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None
    
    def process_uploads_folder(self) -> Dict[str, Any]:
        """Process all files in the uploads folder and create embeddings."""
        start_time = datetime.now()
        processed_files = []
        failed_files = []
        
        # Find all text files in uploads
        text_files = list(self.uploads_dir.glob("*.txt"))
        
        logger.info(f"Processing {len(text_files)} files from uploads folder")
        
        for file_path in text_files:
            try:
                # Read file content
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Generate embedding
                embedding = self.generate_embedding(content)
                
                if embedding:
                    # Check if file already exists in metadata
                    existing_index = None
                    for i, meta in enumerate(self.metadata):
                        if meta.get('filename') == file_path.name:
                            existing_index = i
                            break
                    
                    # Create or update metadata
                    file_metadata = {
                        'filename': file_path.name,
                        'file_path': str(file_path),
                        'content_length': len(content),
                        'processed_at': datetime.now().isoformat(),
                        'content_preview': content[:200] + "..." if len(content) > 200 else content
                    }
                    
                    if existing_index is not None:
                        # Update existing
                        self.vectors[existing_index] = embedding
                        self.metadata[existing_index] = file_metadata
                        logger.info(f"Updated: {file_path.name}")
                    else:
                        # Add new
                        self.vectors.append(embedding)
                        self.metadata.append(file_metadata)
                        logger.info(f"Added: {file_path.name}")
                    
                    processed_files.append(file_path.name)
                else:
                    logger.warning(f"Failed to generate embedding for {file_path.name}")
                    failed_files.append(file_path.name)
                    
            except Exception as e:
                logger.error(f"Failed to process {file_path.name}: {e}")
                failed_files.append(file_path.name)
        
        # Save updated data
        self._save_vectors()
        self._save_metadata()
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        result = {
            'success': True,
            'processed_files': len(processed_files),
            'failed_files': len(failed_files),
            'total_vectors': len(self.vectors),
            'processing_time_ms': processing_time,
            'processed_file_names': processed_files,
            'failed_file_names': failed_files
        }
        
        logger.info(f"Processing completed in {processing_time:.1f}ms")
        return result
    
    def search_knowledge(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Search for relevant knowledge using semantic similarity."""
        if not self.vectors or not self.openai_client:
            return []
        
        start_time = datetime.now()
        
        # Generate query embedding
        query_embedding = self.generate_embedding(query)
        if not query_embedding:
            return []
        
        # Calculate similarities
        similarities = []
        query_vector = np.array(query_embedding)
        
        for i, doc_vector in enumerate(self.vectors):
            doc_array = np.array(doc_vector)
            similarity = np.dot(query_vector, doc_array) / (
                np.linalg.norm(query_vector) * np.linalg.norm(doc_array)
            )
            similarities.append((i, similarity))
        
        # Sort by similarity and get top results
        similarities.sort(key=lambda x: x[1], reverse=True)
        top_results = similarities[:top_k]
        
        # Format results
        results = []
        for idx, score in top_results:
            if idx < len(self.metadata):
                result = {
                    'filename': self.metadata[idx]['filename'],
                    'score': float(score),
                    'content_preview': self.metadata[idx].get('content_preview', ''),
                    'content_length': self.metadata[idx].get('content_length', 0)
                }
                results.append(result)
        
        search_time = (datetime.now() - start_time).total_seconds() * 1000
        logger.info(f"Knowledge search completed in {search_time:.1f}ms, found {len(results)} results")
        
        return results
    
    def get_file_content(self, filename: str) -> Optional[str]:
        """Get full content of a specific file."""
        file_path = self.uploads_dir / filename
        
        if file_path.exists():
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Failed to read {filename}: {e}")
        
        return None
    
    def get_knowledge_context(self, query: str, top_k: int = 3) -> str:
        """Get formatted knowledge context for AI responses."""
        results = self.search_knowledge(query, top_k)
        
        if not results:
            return ""
        
        context_parts = ["Relevant knowledge from knowledge base:"]
        
        for i, result in enumerate(results, 1):
            if result['score'] > 0.3:  # Only include relevant results
                # Get full content for high-scoring results
                full_content = self.get_file_content(result['filename'])
                if full_content:
                    # Use first 500 characters for context
                    content_excerpt = full_content[:500] + "..." if len(full_content) > 500 else full_content
                    context_parts.append(f"\n{i}. From {result['filename']} (relevance: {result['score']:.3f}):\n{content_excerpt}")
                else:
                    context_parts.append(f"\n{i}. From {result['filename']} (relevance: {result['score']:.3f}):\n{result['content_preview']}")
        
        return "\n".join(context_parts) if len(context_parts) > 1 else ""
    
    def get_stats(self) -> Dict[str, Any]:
        """Get knowledge base statistics."""
        return {
            'total_files': len(self.metadata),
            'total_vectors': len(self.vectors),
            'uploads_dir': str(self.uploads_dir),
            'vector_storage_dir': str(self.vector_storage_dir),
            'openai_available': self.openai_client is not None,
            'files': [meta['filename'] for meta in self.metadata]
        }

# Global instance
_unified_knowledge_service = None

def get_unified_knowledge_service() -> UnifiedKnowledgeService:
    """Get the global unified knowledge service instance."""
    global _unified_knowledge_service
    if _unified_knowledge_service is None:
        _unified_knowledge_service = UnifiedKnowledgeService()
    return _unified_knowledge_service