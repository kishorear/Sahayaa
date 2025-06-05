"""
Local Vector Storage Service
File-based vector storage that mimics Qdrant functionality
Provides vector similarity search without external dependencies
"""

import os
import sys
import json
import pickle
import logging
import time
import openai
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from sklearn.metrics.pairwise import cosine_similarity

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent))

# Environment configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
LOG_FORMAT = os.getenv('LOG_FORMAT', 'json')

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'service': 'local_vector_storage'
        }
        if hasattr(record, 'extra_data'):
            log_entry.update(record.extra_data)
        return json.dumps(log_entry)

logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
if LOG_FORMAT == 'json':
    handler.setFormatter(JSONFormatter())
else:
    handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)
logger.setLevel(getattr(logging, LOG_LEVEL))

# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
VECTOR_DIMENSION = int(os.getenv('VECTOR_DIMENSION', '384'))
STORAGE_DIR = Path(os.getenv('VECTOR_STORAGE_DIR', 'vector_storage'))

class LocalVectorStorage:
    """
    Local file-based vector storage service.
    Provides same interface as Qdrant for seamless replacement.
    """
    
    def __init__(self, instructions_dir: str = "uploads"):
        self.instructions_dir = Path(instructions_dir)
        self.supported_formats = {'.txt', '.pdf', '.docx', '.pptx', '.xlsx'}
        self.embedding_model = "text-embedding-3-small"
        self.dimensions = VECTOR_DIMENSION
        self.storage_dir = STORAGE_DIR
        
        # Initialize storage directory
        self.storage_dir.mkdir(exist_ok=True)
        
        # Storage files
        self.vectors_file = self.storage_dir / "vectors.pkl"
        self.metadata_file = self.storage_dir / "metadata.json"
        
        # Initialize OpenAI client
        self.openai_client = self._init_openai()
        
        # Load existing data
        self.vectors = self._load_vectors()
        self.metadata = self._load_metadata()
    
    def _init_openai(self):
        """Initialize OpenAI client for embeddings"""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable required")
        
        return openai.OpenAI(api_key=api_key)
    
    def _load_vectors(self) -> Dict[str, np.ndarray]:
        """Load vectors from storage file"""
        try:
            if self.vectors_file.exists():
                with open(self.vectors_file, 'rb') as f:
                    vectors = pickle.load(f)
                logger.info(f"Loaded {len(vectors)} vectors from storage")
                return vectors
        except Exception as e:
            logger.warning(f"Failed to load vectors: {e}")
        
        return {}
    
    def _load_metadata(self) -> Dict[str, Dict[str, Any]]:
        """Load metadata from storage file"""
        try:
            if self.metadata_file.exists():
                with open(self.metadata_file, 'r') as f:
                    metadata = json.load(f)
                logger.info(f"Loaded metadata for {len(metadata)} items")
                return metadata
        except Exception as e:
            logger.warning(f"Failed to load metadata: {e}")
        
        return {}
    
    def _save_vectors(self):
        """Save vectors to storage file"""
        try:
            with open(self.vectors_file, 'wb') as f:
                pickle.dump(self.vectors, f)
        except Exception as e:
            logger.error(f"Failed to save vectors: {e}")
    
    def _save_metadata(self):
        """Save metadata to storage file"""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self.metadata, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")
    
    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenAI API"""
        try:
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text,
                dimensions=self.dimensions
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise
    
    def upsert_instruction(self, filename: str, content: str) -> bool:
        """
        Store or update instruction with embedding.
        Returns True if successful.
        """
        try:
            # Generate embedding
            embedding = self._generate_embedding(content)
            embedding_array = np.array(embedding)
            
            # Store vector and metadata
            self.vectors[filename] = embedding_array
            self.metadata[filename] = {
                'content': content,
                'created_at': datetime.utcnow().isoformat(),
                'vector_dimension': len(embedding)
            }
            
            # Save to disk
            self._save_vectors()
            self._save_metadata()
            
            logger.info(f"Upserted instruction: {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert instruction {filename}: {e}")
            return False
    
    def search_instructions(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Search for similar instructions using vector similarity.
        Returns list of {filename, text, score} dictionaries.
        """
        search_start_time = time.time()
        
        logger.info("Starting instruction search", extra={'extra_data': {
            'query_preview': query[:50],
            'top_k': top_k,
            'total_vectors': len(self.vectors)
        }})
        
        try:
            if not self.vectors:
                logger.info("No vectors available for search")
                return []
            
            # Generate query embedding
            embedding_start = time.time()
            query_embedding = self._generate_embedding(query)
            query_array = np.array(query_embedding).reshape(1, -1)
            embedding_time = (time.time() - embedding_start) * 1000
            
            # Calculate similarities
            search_start = time.time()
            similarities = []
            
            for filename, vector in self.vectors.items():
                vector_array = vector.reshape(1, -1)
                similarity = cosine_similarity(query_array, vector_array)[0][0]
                similarities.append((filename, similarity))
            
            # Sort by similarity (highest first)
            similarities.sort(key=lambda x: x[1], reverse=True)
            search_time = (time.time() - search_start) * 1000
            
            # Format results
            results = []
            for filename, similarity in similarities[:top_k]:
                if filename in self.metadata:
                    results.append({
                        "filename": filename,
                        "text": self.metadata[filename]['content'],
                        "score": float(similarity)
                    })
            
            total_search_time = (time.time() - search_start_time) * 1000
            
            logger.info("Instruction search completed", extra={'extra_data': {
                'results_count': len(results),
                'embedding_time_ms': embedding_time,
                'search_time_ms': search_time,
                'total_search_time_ms': total_search_time,
                'top_score': results[0]['score'] if results else 0
            }})
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching instructions: {e}")
            return []
    
    def get_collection_info(self) -> Dict[str, Any]:
        """
        Get information about stored vectors for monitoring.
        """
        try:
            # Calculate storage size
            storage_size = 0
            if self.vectors_file.exists():
                storage_size += self.vectors_file.stat().st_size
            if self.metadata_file.exists():
                storage_size += self.metadata_file.stat().st_size
            
            info = {
                'collection_name': 'local_instruction_vectors',
                'vectors_count': len(self.vectors),
                'vector_size': self.dimensions,
                'distance': 'cosine',
                'storage_size_bytes': storage_size,
                'storage_directory': str(self.storage_dir),
                'status': 'ready',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            logger.info("Collection info retrieved", extra={'extra_data': info})
            return info
            
        except Exception as e:
            logger.error(f"Error getting collection info: {e}")
            return {
                'collection_name': 'local_instruction_vectors',
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def _convert_to_markdown(self, file_path: Path) -> str:
        """Convert document to text (fallback to simple text reading)"""
        try:
            if file_path.suffix.lower() == '.txt':
                return file_path.read_text(encoding='utf-8')
            else:
                # For production, implement proper document conversion
                logger.warning(f"Unsupported file format: {file_path.suffix}")
                return f"Content from {file_path.name}"
                
        except Exception as e:
            logger.error(f"Failed to convert {file_path}: {e}")
            return ""
    
    def process_instruction_file(self, file_path: Path) -> bool:
        """
        Process a single instruction file.
        Returns True if successful.
        """
        try:
            # Convert to text
            content = self._convert_to_markdown(file_path)
            if not content:
                return False
            
            # Store with embedding
            success = self.upsert_instruction(file_path.name, content)
            return success
            
        except Exception as e:
            logger.error(f"Failed to process {file_path}: {e}")
            return False
    
    def process_all_instructions(self) -> Dict[str, Any]:
        """
        Process all instruction files in the instructions directory.
        Returns processing results.
        """
        processing_start = time.time()
        
        if not self.instructions_dir.exists():
            self.instructions_dir.mkdir(exist_ok=True)
            logger.info(f"Created instructions directory: {self.instructions_dir}")
        
        # Find all supported files
        files = []
        for pattern in ['*.txt', '*.pdf', '*.docx', '*.pptx', '*.xlsx']:
            files.extend(self.instructions_dir.glob(pattern))
        
        if not files:
            logger.info("No instruction files found")
            return {
                'success': True,
                'processed_files': 0,
                'failed_files': 0,
                'processing_time_ms': 0
            }
        
        logger.info(f"Processing {len(files)} instruction files")
        
        processed = 0
        failed = 0
        
        for file_path in files:
            try:
                if self.process_instruction_file(file_path):
                    processed += 1
                else:
                    failed += 1
            except Exception as e:
                logger.error(f"Failed to process {file_path}: {e}")
                failed += 1
        
        processing_time = (time.time() - processing_start) * 1000
        
        result = {
            'success': True,
            'processed_files': processed,
            'failed_files': failed,
            'processing_time_ms': processing_time
        }
        
        logger.info("Instruction processing completed", extra={'extra_data': result})
        
        return result

# CLI interface for testing
def main():
    """Main function for testing the service"""
    service = LocalVectorStorage()
    
    # Process instruction files
    result = service.process_all_instructions()
    print(f"Processing result: {result}")
    
    # Test search
    if result['processed_files'] > 0:
        search_results = service.search_instructions("API authentication", top_k=3)
        print(f"Search results: {len(search_results)}")
        for i, result in enumerate(search_results):
            print(f"  {i+1}. {result['filename']} (score: {result['score']:.3f})")
    
    # Get collection info
    info = service.get_collection_info()
    print(f"Collection info: {info}")

if __name__ == "__main__":
    main()