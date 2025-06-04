"""
Qdrant Ingestion Service - Document processing and vector storage
Single responsibility: Scan instructions/, convert to Markdown via MarkItDown, 
generate 384-dim vectors, upsert to Qdrant with payload {filename, text}
"""

import os
import logging
import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import openai
from dotenv import load_dotenv

# Document processing imports
try:
    from docx import Document
    from openpyxl import load_workbook
    from PyPDF2 import PdfReader
    from pptx import Presentation
    OFFICE_SUPPORT = True
except ImportError as e:
    logging.warning(f"Office document support limited: {e}")
    OFFICE_SUPPORT = False

# Vector storage imports
try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False
    logging.warning("Qdrant client not available - using local file storage")

load_dotenv()

# Configure structured logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
LOG_FORMAT = os.getenv('LOG_FORMAT', 'json')

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'service': 'qdrant_ingestion'
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

# Environment configuration
QDRANT_URL = os.getenv('QDRANT_URL', 'http://localhost:6333')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
VECTOR_DIMENSION = int(os.getenv('VECTOR_DIMENSION', '384'))
VECTOR_COLLECTION_NAME = os.getenv('VECTOR_COLLECTION_NAME', 'instruction_texts')
MAX_VECTOR_COUNT_BEFORE_SHARD = int(os.getenv('MAX_VECTOR_COUNT_BEFORE_SHARD', '1000000'))
QDRANT_TIMEOUT_MS = int(os.getenv('QDRANT_TIMEOUT_MS', '30000'))

class QdrantIngestionService:
    """
    Pure document processing and vector storage service.
    No business logic - only file conversion and Qdrant operations.
    """
    
    def __init__(self, instructions_dir: str = "instructions"):
        self.instructions_dir = Path(instructions_dir)
        self.supported_formats = {'.txt', '.pdf', '.docx', '.pptx', '.xlsx'}
        self.embedding_model = "text-embedding-3-small"
        self.dimensions = VECTOR_DIMENSION
        self.collection_name = VECTOR_COLLECTION_NAME
        
        # Initialize services
        self.openai_client = self._init_openai()
        self.qdrant_client = self._init_qdrant()
        
        # Ensure collection exists
        self._ensure_collection()
    
    def _init_openai(self):
        """Initialize OpenAI client for embeddings"""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable required")
        
        return openai.OpenAI(api_key=api_key)
    
    def _init_qdrant(self):
        """Initialize Qdrant client"""
        try:
            from qdrant_client import QdrantClient
            
            qdrant_url = os.getenv("QDRANT_URL")
            qdrant_api_key = os.getenv("QDRANT_API_KEY")
            
            if qdrant_url and qdrant_api_key:
                # Use Qdrant Cloud
                return QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
            else:
                # Use local Qdrant if available
                return QdrantClient(host="localhost", port=6333)
                
        except ImportError:
            logger.error("qdrant-client not installed. Install with: pip install qdrant-client")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize Qdrant client: {e}")
            raise
    
    def _ensure_collection(self):
        """Ensure instruction_texts collection exists with correct configuration"""
        try:
            from qdrant_client.models import Distance, VectorParams
            
            collections = self.qdrant_client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name not in collection_names:
                self.qdrant_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.dimensions,
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created collection: {self.collection_name}")
            else:
                logger.info(f"Collection exists: {self.collection_name}")
                
        except Exception as e:
            logger.error(f"Failed to ensure collection: {e}")
            raise
    
    def scan_and_process_all(self) -> Dict[str, Any]:
        """
        Scan instructions directory and process all supported files.
        Returns processing statistics only.
        """
        if not self.instructions_dir.exists():
            logger.warning(f"Instructions directory not found: {self.instructions_dir}")
            return {"processed": 0, "failed": 0, "skipped": 0}
        
        results = {"processed": 0, "failed": 0, "skipped": 0}
        
        # Find all supported files
        supported_files = []
        for extension in self.supported_formats:
            supported_files.extend(self.instructions_dir.glob(f"*{extension}"))
        
        logger.info(f"Found {len(supported_files)} files to process")
        
        for file_path in supported_files:
            try:
                self.process_single_file(file_path)
                results["processed"] += 1
                logger.info(f"Successfully processed: {file_path.name}")
                
            except Exception as e:
                logger.error(f"Failed to process {file_path.name}: {e}")
                results["failed"] += 1
        
        return results
    
    def process_single_file(self, file_path: Path) -> bool:
        """
        Process a single file: convert to Markdown, generate embedding, upsert to Qdrant.
        Returns True if successful.
        """
        # Step 1: Convert to Markdown using MarkItDown
        markdown_text = self._convert_to_markdown(file_path)
        if not markdown_text:
            raise ValueError(f"Failed to convert {file_path.name} to markdown")
        
        # Step 2: Generate 384-dimensional embedding
        embedding = self._generate_embedding(markdown_text)
        if not embedding:
            raise ValueError(f"Failed to generate embedding for {file_path.name}")
        
        # Step 3: Upsert to Qdrant with payload {filename, text}
        success = self._upsert_to_qdrant(file_path.name, markdown_text, embedding)
        if not success:
            raise ValueError(f"Failed to upsert {file_path.name} to Qdrant")
        
        return True
    
    def _convert_to_markdown(self, file_path: Path) -> str:
        """Convert document to Markdown using MarkItDown"""
        try:
            # Import MarkItDown
            from markitdown import MarkItDown
            
            md = MarkItDown()
            result = md.convert(str(file_path))
            
            if result and result.text_content:
                return result.text_content
            else:
                # Fallback to simple text reading for .txt files
                if file_path.suffix.lower() == '.txt':
                    return file_path.read_text(encoding='utf-8')
                else:
                    raise ValueError("MarkItDown returned empty content")
                    
        except ImportError:
            logger.error("MarkItDown not installed. Install with: pip install markitdown")
            raise
        except Exception as e:
            logger.error(f"Error converting {file_path.name} with MarkItDown: {e}")
            raise
    
    def _generate_embedding(self, text: str) -> List[float]:
        """Generate 384-dimensional embedding using OpenAI"""
        try:
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text,
                dimensions=self.dimensions
            )
            
            return response.data[0].embedding
            
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
    
    def _upsert_to_qdrant(self, filename: str, text: str, embedding: List[float]) -> bool:
        """Upsert document to Qdrant with exact payload format {filename, text}"""
        try:
            from qdrant_client.models import PointStruct
            import hashlib
            
            # Generate consistent point ID from filename
            point_id = hashlib.md5(filename.encode()).hexdigest()
            
            # Create point with exact payload specification
            point = PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "filename": filename,
                    "text": text
                }
            )
            
            # Upsert to collection
            self.qdrant_client.upsert(
                collection_name=self.collection_name,
                points=[point]
            )
            
            logger.info(f"Upserted {filename} to Qdrant collection {self.collection_name}")
            return True
            
        except Exception as e:
            logger.error(f"Error upserting to Qdrant: {e}")
            return False
    
    def search_instructions(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Search for similar instructions in Qdrant.
        Returns list of {filename, text, score} dictionaries.
        """
        search_start_time = time.time()
        
        logger.info("Starting instruction search", extra={'extra_data': {
            'query_preview': query[:50],
            'top_k': top_k,
            'collection': self.collection_name
        }})
        
        try:
            # Generate embedding for query
            embedding_start = time.time()
            query_embedding = self._generate_embedding(query)
            embedding_time = (time.time() - embedding_start) * 1000
            
            # Search in Qdrant
            qdrant_start = time.time()
            search_results = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=top_k,
                with_payload=True
            )
            qdrant_time = (time.time() - qdrant_start) * 1000
            
            # Format results
            results = []
            for result in search_results:
                results.append({
                    "filename": result.payload["filename"],
                    "text": result.payload["text"],
                    "score": float(result.score)
                })
            
            total_search_time = (time.time() - search_start_time) * 1000
            
            logger.info("Instruction search completed", extra={'extra_data': {
                'results_count': len(results),
                'embedding_time_ms': embedding_time,
                'qdrant_search_time_ms': qdrant_time,
                'total_search_time_ms': total_search_time,
                'top_score': results[0]['score'] if results else 0
            }})
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching instructions: {e}")
            return []
    
    def get_collection_info(self) -> Dict[str, Any]:
        """
        Get collection information including vector count for monitoring.
        Returns collection stats with sharding recommendations.
        """
        try:
            collection_info = self.qdrant_client.get_collection(self.collection_name)
            
            vectors_count = collection_info.vectors_count
            needs_sharding = vectors_count > MAX_VECTOR_COUNT_BEFORE_SHARD
            
            info = {
                'collection_name': self.collection_name,
                'vectors_count': vectors_count,
                'vector_size': collection_info.config.params.vectors.size,
                'distance': collection_info.config.params.vectors.distance.name,
                'needs_sharding': needs_sharding,
                'shard_threshold': MAX_VECTOR_COUNT_BEFORE_SHARD,
                'status': collection_info.status.value,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            if needs_sharding:
                logger.warning("Vector collection requires sharding", extra={'extra_data': {
                    'current_count': vectors_count,
                    'threshold': MAX_VECTOR_COUNT_BEFORE_SHARD,
                    'recommendation': 'implement_sharding_or_upgrade_storage'
                }})
            
            logger.info("Collection info retrieved", extra={'extra_data': info})
            
            return info
            
        except Exception as e:
            logger.error(f"Error getting collection info: {e}")
            return {
                'collection_name': self.collection_name,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }
    
    def ingest_documents(self, documents: List[Dict[str, Any]]) -> int:
        """
        Ingest multiple documents for testing purposes.
        Returns count of successfully ingested documents.
        """
        ingestion_start = time.time()
        success_count = 0
        
        logger.info("Starting document ingestion", extra={'extra_data': {
            'document_count': len(documents),
            'collection': self.collection_name
        }})
        
        for doc in documents:
            try:
                doc_id = doc.get('id', f"doc_{int(time.time())}")
                content = doc.get('content', '')
                metadata = doc.get('metadata', {})
                
                # Generate embedding
                embedding = self._generate_embedding(content)
                
                # Create filename from metadata or use ID
                filename = metadata.get('filename', f"{doc_id}.txt")
                
                # Upsert to Qdrant
                if self._upsert_to_qdrant(filename, content, embedding):
                    success_count += 1
                    
            except Exception as e:
                logger.error(f"Failed to ingest document {doc.get('id', 'unknown')}: {e}")
        
        ingestion_time = (time.time() - ingestion_start) * 1000
        
        logger.info("Document ingestion completed", extra={'extra_data': {
            'total_documents': len(documents),
            'successful_ingestions': success_count,
            'failed_ingestions': len(documents) - success_count,
            'ingestion_time_ms': ingestion_time
        }})
        
        return success_count
        """Get information about the instruction_texts collection"""
        try:
            info = self.qdrant_client.get_collection(self.collection_name)
            return {
                "collection_name": self.collection_name,
                "vectors_count": info.vectors_count,
                "points_count": info.points_count,
                "status": info.status.value if hasattr(info.status, 'value') else str(info.status)
            }
        except Exception as e:
            logger.error(f"Error getting collection info: {e}")
            return {"error": str(e)}

def run_ingestion():
    """Standalone function to run the ingestion process"""
    try:
        service = QdrantIngestionService()
        
        logger.info("Starting Qdrant ingestion service...")
        results = service.scan_and_process_all()
        
        logger.info(f"Ingestion completed: {results}")
        
        # Get collection info
        info = service.get_collection_info()
        logger.info(f"Collection info: {info}")
        
        return results
        
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_ingestion()