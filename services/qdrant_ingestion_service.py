"""
Qdrant Ingestion Service - Document processing and vector storage
Single responsibility: Scan instructions/, convert to Markdown via MarkItDown, 
generate 384-dim vectors, upsert to Qdrant with payload {filename, text}
"""

import os
import logging
import json
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
logger = logging.getLogger(__name__)

class QdrantIngestionService:
    """
    Pure document processing and vector storage service.
    No business logic - only file conversion and Qdrant operations.
    """
    
    def __init__(self, instructions_dir: str = "instructions"):
        self.instructions_dir = Path(instructions_dir)
        self.supported_formats = {'.txt', '.pdf', '.docx', '.pptx', '.xlsx'}
        self.embedding_model = "text-embedding-3-small"
        self.dimensions = 384
        self.collection_name = "instruction_texts"
        
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
        try:
            # Generate embedding for query
            query_embedding = self._generate_embedding(query)
            
            # Search in Qdrant
            search_results = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                limit=top_k,
                with_payload=True
            )
            
            # Format results
            results = []
            for result in search_results:
                results.append({
                    "filename": result.payload["filename"],
                    "text": result.payload["text"],
                    "score": float(result.score)
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error searching instructions: {e}")
            return []
    
    def get_collection_info(self) -> Dict[str, Any]:
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