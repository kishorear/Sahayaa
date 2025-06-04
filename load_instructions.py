"""
Python script to load .txt instruction files into Qdrant and PostgreSQL.
This script processes instruction files and stores them with embeddings for similarity search.
"""

import os
import sys
import logging
from pathlib import Path
from typing import List, Dict, Any
import asyncio
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add mcp_service to path
sys.path.append(str(Path(__file__).parent))

from mcp_service.database import get_db, init_database
from mcp_service.models import Instruction
from mcp_service.embedding_service import embedding_service
from mcp_service.vector_storage import vector_storage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class InstructionLoader:
    """Loads .txt instruction files into the database and vector storage."""
    
    def __init__(self, instructions_dir: str = "instructions"):
        self.instructions_dir = Path(instructions_dir)
        self.processed_files = []
        self.failed_files = []
    
    def find_instruction_files(self) -> List[Path]:
        """Find all .txt files in the instructions directory."""
        if not self.instructions_dir.exists():
            logger.warning(f"Instructions directory not found: {self.instructions_dir}")
            return []
        
        txt_files = list(self.instructions_dir.glob("**/*.txt"))
        logger.info(f"Found {len(txt_files)} .txt files")
        return txt_files
    
    def parse_instruction_file(self, file_path: Path) -> Dict[str, Any]:
        """Parse an instruction file and extract metadata."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
            
            if not content:
                raise ValueError("Empty file")
            
            # Extract title from first line or filename
            lines = content.split('\n')
            title = lines[0].strip() if lines else file_path.stem
            
            # Remove title from content if it's a header
            if title and content.startswith(title):
                content = '\n'.join(lines[1:]).strip()
            
            # Extract category from directory structure
            relative_path = file_path.relative_to(self.instructions_dir)
            category = str(relative_path.parent) if relative_path.parent != Path('.') else "general"
            
            # Extract tags from filename patterns
            tags = []
            filename = file_path.stem.lower()
            
            # Common tag patterns
            if 'auth' in filename or 'login' in filename:
                tags.append('authentication')
            if 'billing' in filename or 'payment' in filename:
                tags.append('billing')
            if 'api' in filename:
                tags.append('api')
            if 'troubleshoot' in filename or 'error' in filename:
                tags.append('troubleshooting')
            if 'setup' in filename or 'install' in filename:
                tags.append('setup')
            
            return {
                'name': file_path.stem,
                'title': title or file_path.stem,
                'content': content,
                'category': category,
                'tags': tags,
                'file_path': str(file_path)
            }
            
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            raise
    
    def load_instructions(self, tenant_id: int = 1, overwrite: bool = False):
        """Load all instruction files into the database."""
        files = self.find_instruction_files()
        if not files:
            logger.warning("No instruction files found")
            return
        
        # Get database session
        db_gen = get_db()
        db = next(db_gen)
        
        try:
            total_processed = 0
            total_created = 0
            total_updated = 0
            
            for file_path in files:
                try:
                    # Parse file
                    instruction_data = self.parse_instruction_file(file_path)
                    instruction_data['tenant_id'] = tenant_id
                    
                    # Check if instruction already exists
                    existing = db.query(Instruction).filter(
                        Instruction.name == instruction_data['name'],
                        Instruction.tenant_id == tenant_id
                    ).first()
                    
                    if existing and not overwrite:
                        logger.info(f"Skipping existing instruction: {instruction_data['name']}")
                        continue
                    
                    if existing and overwrite:
                        # Update existing instruction
                        for key, value in instruction_data.items():
                            if key != 'tenant_id':  # Don't update tenant_id
                                setattr(existing, key, value)
                        db.commit()
                        logger.info(f"Updated instruction: {instruction_data['name']}")
                        total_updated += 1
                    else:
                        # Create new instruction
                        instruction = Instruction(**instruction_data)
                        db.add(instruction)
                        db.commit()
                        db.refresh(instruction)
                        logger.info(f"Created instruction: {instruction_data['name']}")
                        total_created += 1
                    
                    # Generate and store embedding
                    await self.store_instruction_embedding(instruction_data)
                    
                    self.processed_files.append(file_path)
                    total_processed += 1
                    
                except Exception as e:
                    logger.error(f"Failed to process {file_path}: {e}")
                    self.failed_files.append((file_path, str(e)))
                    db.rollback()
            
            logger.info(f"Processing complete:")
            logger.info(f"  Total processed: {total_processed}")
            logger.info(f"  Created: {total_created}")
            logger.info(f"  Updated: {total_updated}")
            logger.info(f"  Failed: {len(self.failed_files)}")
            
        finally:
            db.close()
    
    async def store_instruction_embedding(self, instruction_data: Dict[str, Any]):
        """Generate and store embedding for an instruction."""
        try:
            # Combine title and content for embedding
            text_for_embedding = f"{instruction_data['title']}\n{instruction_data['content']}"
            
            # Generate embedding
            embedding = embedding_service.embed_text(text_for_embedding)
            
            # Prepare metadata for vector storage
            metadata = {
                "type": "instruction",
                "tenant_id": instruction_data['tenant_id'],
                "name": instruction_data['name'],
                "title": instruction_data['title'],
                "category": instruction_data['category'],
                "tags": instruction_data['tags']
            }
            
            # Store in vector storage (use name hash as ID for instructions)
            instruction_id = abs(hash(instruction_data['name'])) % (10**9)
            
            if vector_storage.is_available():
                vector_storage.store_ticket_embedding(instruction_id, embedding, metadata)
                logger.debug(f"Stored embedding for instruction: {instruction_data['name']}")
            else:
                logger.warning("Vector storage not available - skipping embedding storage")
            
        except Exception as e:
            logger.error(f"Error storing embedding for {instruction_data['name']}: {e}")

def create_sample_instructions():
    """Create sample instruction files for testing."""
    instructions_dir = Path("instructions")
    instructions_dir.mkdir(exist_ok=True)
    
    sample_instructions = [
        {
            "path": "authentication/login_issues.txt",
            "content": """Login Authentication Issues
If users are experiencing login problems, follow these steps:

1. Verify username and password are correct
2. Check if account is locked or suspended
3. Ensure two-factor authentication is working
4. Clear browser cache and cookies
5. Try incognito/private browsing mode
6. Check for service outages

Common error codes:
- AUTH001: Invalid credentials
- AUTH002: Account locked
- AUTH003: 2FA verification failed"""
        },
        {
            "path": "billing/payment_processing.txt",
            "content": """Payment Processing Guidelines
For payment-related issues:

1. Verify payment method is valid and current
2. Check for sufficient funds or credit limit
3. Confirm billing address matches payment method
4. Review transaction history for duplicates
5. Check for declined transactions

Error codes:
- PAY001: Card declined
- PAY002: Insufficient funds
- PAY003: Invalid payment method"""
        },
        {
            "path": "api/rate_limiting.txt",
            "content": """API Rate Limiting Information
When customers hit API rate limits:

1. Explain current rate limit tier
2. Show usage statistics
3. Suggest optimization strategies
4. Offer upgrade options if needed
5. Provide retry-after headers information

Rate limit tiers:
- Basic: 100 requests/hour
- Pro: 1000 requests/hour
- Enterprise: 10000 requests/hour"""
        }
    ]
    
    for instruction in sample_instructions:
        file_path = instructions_dir / instruction["path"]
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(instruction["content"])
    
    logger.info(f"Created {len(sample_instructions)} sample instruction files")

async def main():
    """Main function to load instructions."""
    # Check if instructions directory exists, create samples if not
    if not Path("instructions").exists():
        logger.info("Instructions directory not found, creating sample files...")
        create_sample_instructions()
    
    # Initialize database
    init_database()
    
    # Check services
    embedding_info = embedding_service.get_provider_info()
    vector_info = vector_storage.get_collection_info()
    
    logger.info(f"Embedding service: {embedding_info['provider']} (available: {embedding_info['available']})")
    logger.info(f"Vector storage available: {vector_info.get('available', False)}")
    
    # Load instructions
    loader = InstructionLoader()
    loader.load_instructions(tenant_id=1, overwrite=True)
    
    # Report results
    if loader.failed_files:
        logger.error("Failed files:")
        for file_path, error in loader.failed_files:
            logger.error(f"  {file_path}: {error}")

if __name__ == "__main__":
    asyncio.run(main())