"""
Document Ingestion Scheduler
Schedules and manages document vectorization with automatic pruning.
"""

import os
import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
import schedule
import time
import threading
from pathlib import Path

try:
    from .simple_vector_storage import vector_storage
    from .pii_handler import PIIHandler
    from .metrics_collector import MetricsCollector
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from simple_vector_storage import vector_storage
    from pii_handler import PIIHandler
    from metrics_collector import MetricsCollector

logger = logging.getLogger(__name__)

class IngestionScheduler:
    """Manages scheduled document ingestion and vector maintenance."""
    
    def __init__(self, 
                 watch_directory: str = "./documents",
                 check_interval_minutes: int = 30,
                 max_docs_per_batch: int = 100):
        
        self.watch_directory = Path(watch_directory)
        self.check_interval_minutes = check_interval_minutes
        self.max_docs_per_batch = max_docs_per_batch
        self.pii_handler = PIIHandler()
        self.metrics = MetricsCollector()
        self.running = False
        self.scheduler_thread = None
        
        # Ensure watch directory exists
        self.watch_directory.mkdir(parents=True, exist_ok=True)
        
        # Track processed files
        self.processed_files = set()
        self.load_processed_files_list()
    
    def load_processed_files_list(self):
        """Load list of already processed files."""
        processed_file = self.watch_directory / ".processed_files"
        if processed_file.exists():
            try:
                with open(processed_file, 'r') as f:
                    self.processed_files = set(line.strip() for line in f)
                logger.info(f"Loaded {len(self.processed_files)} processed files")
            except Exception as e:
                logger.error(f"Failed to load processed files list: {e}")
    
    def save_processed_files_list(self):
        """Save list of processed files."""
        processed_file = self.watch_directory / ".processed_files"
        try:
            with open(processed_file, 'w') as f:
                for file_path in self.processed_files:
                    f.write(f"{file_path}\n")
        except Exception as e:
            logger.error(f"Failed to save processed files list: {e}")
    
    def get_supported_files(self) -> List[Path]:
        """Get list of supported document files."""
        supported_extensions = {'.txt', '.md', '.json', '.yaml', '.yml'}
        
        files = []
        for ext in supported_extensions:
            files.extend(self.watch_directory.glob(f"**/*{ext}"))
        
        # Filter out already processed files
        new_files = [f for f in files if str(f) not in self.processed_files]
        
        return new_files[:self.max_docs_per_batch]
    
    async def process_document(self, file_path: Path) -> bool:
        """Process a single document file."""
        try:
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            if not content.strip():
                logger.warning(f"Empty file: {file_path}")
                return False
            
            # Clean PII
            cleaned_content = self.pii_handler.clean_pii(content)
            
            # Create document metadata
            metadata = {
                "type": "document",
                "source_file": str(file_path),
                "file_size": len(content),
                "processed_at": datetime.utcnow().isoformat(),
                "tenant_id": 1  # Default tenant
            }
            
            # Generate unique document ID
            doc_id = f"doc_{file_path.stem}_{int(time.time())}"
            
            # Add to vector storage
            success = await vector_storage.add_document(
                doc_id=doc_id,
                content=cleaned_content,
                metadata=metadata
            )
            
            if success:
                self.processed_files.add(str(file_path))
                logger.info(f"Successfully processed: {file_path}")
                return True
            else:
                logger.error(f"Failed to process: {file_path}")
                return False
                
        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
            return False
    
    async def run_ingestion_batch(self):
        """Run a batch of document ingestion."""
        try:
            start_time = datetime.utcnow()
            
            # Get new files to process
            files_to_process = self.get_supported_files()
            
            if not files_to_process:
                logger.debug("No new files to process")
                return
            
            logger.info(f"Processing {len(files_to_process)} new documents")
            
            # Process files
            success_count = 0
            for file_path in files_to_process:
                if await self.process_document(file_path):
                    success_count += 1
            
            # Save processed files list
            self.save_processed_files_list()
            
            # Record metrics
            processing_time = (datetime.utcnow() - start_time).total_seconds()
            self.metrics.record_ingestion(success_count, processing_time)
            
            logger.info(f"Batch complete: {success_count}/{len(files_to_process)} files processed in {processing_time:.2f}s")
            
            # Check if pruning is needed
            await self._check_storage_limits()
            
        except Exception as e:
            logger.error(f"Error in ingestion batch: {e}")
            self.metrics.record_error("ingestion_batch", str(e))
    
    async def _check_storage_limits(self):
        """Check storage limits and prune if necessary."""
        try:
            stats = await vector_storage.get_collection_stats()
            
            if stats.get("storage_usage_percent", 0) > 80:
                logger.info("Storage usage > 80%, initiating pruning")
                await vector_storage._prune_old_vectors(target_count=3000)
                
                # Update metrics
                self.metrics.record_error("storage_pruning", "Automatic pruning executed")
                
        except Exception as e:
            logger.error(f"Error checking storage limits: {e}")
    
    def schedule_jobs(self):
        """Schedule recurring ingestion jobs."""
        # Schedule ingestion every N minutes
        schedule.every(self.check_interval_minutes).minutes.do(
            lambda: asyncio.create_task(self.run_ingestion_batch())
        )
        
        # Schedule daily cleanup at 2 AM
        schedule.every().day.at("02:00").do(
            lambda: asyncio.create_task(self._daily_maintenance())
        )
        
        logger.info(f"Scheduled ingestion every {self.check_interval_minutes} minutes")
    
    async def _daily_maintenance(self):
        """Daily maintenance tasks."""
        try:
            logger.info("Running daily maintenance")
            
            # Prune old vectors
            await vector_storage._prune_old_vectors(target_count=4000)
            
            # Clean up old processed files list (remove files that no longer exist)
            existing_files = set()
            for file_path in self.processed_files:
                if Path(file_path).exists():
                    existing_files.add(file_path)
            
            removed_count = len(self.processed_files) - len(existing_files)
            self.processed_files = existing_files
            self.save_processed_files_list()
            
            logger.info(f"Daily maintenance complete. Removed {removed_count} stale file references")
            
        except Exception as e:
            logger.error(f"Error in daily maintenance: {e}")
    
    def start(self):
        """Start the ingestion scheduler."""
        if self.running:
            logger.warning("Scheduler already running")
            return
        
        self.running = True
        self.schedule_jobs()
        
        def scheduler_loop():
            while self.running:
                schedule.run_pending()
                time.sleep(30)  # Check every 30 seconds
        
        self.scheduler_thread = threading.Thread(target=scheduler_loop, daemon=True)
        self.scheduler_thread.start()
        
        logger.info("Ingestion scheduler started")
    
    def stop(self):
        """Stop the ingestion scheduler."""
        self.running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        
        logger.info("Ingestion scheduler stopped")
    
    def get_status(self) -> Dict[str, Any]:
        """Get scheduler status."""
        return {
            "running": self.running,
            "watch_directory": str(self.watch_directory),
            "check_interval_minutes": self.check_interval_minutes,
            "processed_files_count": len(self.processed_files),
            "pending_files": len(self.get_supported_files()),
            "next_run": schedule.next_run() if schedule.jobs else None
        }

# Global instance
ingestion_scheduler = IngestionScheduler()