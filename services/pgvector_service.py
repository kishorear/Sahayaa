"""
PostgreSQL Vector Service
Provides vector storage and similarity search using pgvector extension
Replaces external Qdrant dependency with database-native solution
"""

import os
import sys
import json
import logging
import time
import asyncpg
import openai
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

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
            'service': 'pgvector_service'
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
DATABASE_URL = os.getenv('DATABASE_URL')
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
VECTOR_DIMENSION = int(os.getenv('VECTOR_DIMENSION', '384'))

class PgVectorService:
    """
    PostgreSQL-based vector storage service using pgvector extension.
    Provides same interface as Qdrant for seamless replacement.
    """
    
    def __init__(self, instructions_dir: str = "instructions"):
        self.instructions_dir = Path(instructions_dir)
        self.supported_formats = {'.txt', '.pdf', '.docx', '.pptx', '.xlsx'}
        self.embedding_model = "text-embedding-3-small"
        self.dimensions = VECTOR_DIMENSION
        
        # Initialize services
        self.openai_client = self._init_openai()
        self.db_pool = None
    
    async def initialize(self):
        """Initialize database connection pool"""
        try:
            self.db_pool = await asyncpg.create_pool(DATABASE_URL)
            logger.info("PostgreSQL connection pool initialized")
            
            # Test vector extension
            async with self.db_pool.acquire() as conn:
                result = await conn.fetchval("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
                if result:
                    logger.info("pgvector extension is available")
                else:
                    logger.error("pgvector extension not found")
                    raise RuntimeError("pgvector extension required")
                    
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            raise
    
    def _init_openai(self):
        """Initialize OpenAI client for embeddings"""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable required")
        
        return openai.OpenAI(api_key=api_key)
    
    async def close(self):
        """Close database connection pool"""
        if self.db_pool:
            await self.db_pool.close()
    
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
    
    async def upsert_instruction(self, filename: str, content: str) -> bool:
        """
        Store or update instruction with embedding in PostgreSQL.
        Returns True if successful.
        """
        try:
            # Generate embedding
            embedding = self._generate_embedding(content)
            
            # Store in database (convert embedding list to string format for vector type)
            async with self.db_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO instruction_vectors (filename, content, embedding, updated_at)
                    VALUES ($1, $2, $3::vector, CURRENT_TIMESTAMP)
                    ON CONFLICT (filename)
                    DO UPDATE SET 
                        content = EXCLUDED.content,
                        embedding = EXCLUDED.embedding,
                        updated_at = CURRENT_TIMESTAMP
                """, filename, content, str(embedding))
            
            logger.info(f"Upserted instruction: {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to upsert instruction {filename}: {e}")
            return False
    
    async def search_instructions(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Search for similar instructions using vector similarity.
        Returns list of {filename, text, score} dictionaries.
        """
        search_start_time = time.time()
        
        logger.info("Starting instruction search", extra={'extra_data': {
            'query_preview': query[:50],
            'top_k': top_k
        }})
        
        try:
            # Generate query embedding
            embedding_start = time.time()
            query_embedding = self._generate_embedding(query)
            embedding_time = (time.time() - embedding_start) * 1000
            
            # Search in PostgreSQL (convert embedding to string format)
            search_start = time.time()
            async with self.db_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT filename, content, 
                           1 - (embedding <=> $1::vector) as similarity_score
                    FROM instruction_vectors
                    WHERE embedding IS NOT NULL
                    ORDER BY embedding <=> $1::vector
                    LIMIT $2
                """, str(query_embedding), top_k)
            
            search_time = (time.time() - search_start) * 1000
            
            # Format results
            results = []
            for row in rows:
                results.append({
                    "filename": row['filename'],
                    "text": row['content'],
                    "score": float(row['similarity_score'])
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
    
    async def get_collection_info(self) -> Dict[str, Any]:
        """
        Get information about instruction vectors for monitoring.
        """
        try:
            async with self.db_pool.acquire() as conn:
                # Get vector count
                vector_count = await conn.fetchval(
                    "SELECT COUNT(*) FROM instruction_vectors WHERE embedding IS NOT NULL"
                )
                
                # Get table size
                table_size = await conn.fetchval("""
                    SELECT pg_total_relation_size('instruction_vectors')
                """)
                
                info = {
                    'collection_name': 'instruction_vectors',
                    'vectors_count': vector_count,
                    'vector_size': self.dimensions,
                    'distance': 'cosine',
                    'table_size_bytes': table_size,
                    'status': 'ready',
                    'timestamp': datetime.utcnow().isoformat()
                }
                
                logger.info("Collection info retrieved", extra={'extra_data': info})
                return info
                
        except Exception as e:
            logger.error(f"Error getting collection info: {e}")
            return {
                'collection_name': 'instruction_vectors',
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
    
    async def process_instruction_file(self, file_path: Path) -> bool:
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
            success = await self.upsert_instruction(file_path.name, content)
            return success
            
        except Exception as e:
            logger.error(f"Failed to process {file_path}: {e}")
            return False
    
    async def process_all_instructions(self) -> Dict[str, Any]:
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
                if await self.process_instruction_file(file_path):
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

# Async context manager for easy usage
class PgVectorServiceManager:
    def __init__(self, instructions_dir: str = "instructions"):
        self.service = PgVectorService(instructions_dir)
    
    async def __aenter__(self):
        await self.service.initialize()
        return self.service
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.service.close()

# CLI interface for testing
async def main():
    """Main function for testing the service"""
    async with PgVectorServiceManager() as service:
        # Process instruction files
        result = await service.process_all_instructions()
        print(f"Processing result: {result}")
        
        # Test search
        if result['processed_files'] > 0:
            search_results = await service.search_instructions("API authentication", top_k=3)
            print(f"Search results: {len(search_results)}")
            for i, result in enumerate(search_results):
                print(f"  {i+1}. {result['filename']} (score: {result['score']:.3f})")
        
        # Get collection info
        info = await service.get_collection_info()
        print(f"Collection info: {info}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())