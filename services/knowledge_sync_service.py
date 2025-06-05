"""
One-Click Knowledge Repository Sync and Update Tool
Automatically processes, updates, and synchronizes knowledge files with vector storage.
"""

import os
import json
import logging
import hashlib
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import shutil
from .unified_knowledge_service import get_unified_knowledge_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KnowledgeSyncService:
    """
    One-click service for syncing and updating the knowledge repository.
    Handles file monitoring, change detection, and automatic updates.
    """
    
    def __init__(self, uploads_dir: str = "uploads", backup_dir: str = "knowledge_backups"):
        self.uploads_dir = Path(uploads_dir)
        self.backup_dir = Path(backup_dir)
        self.sync_state_file = Path("knowledge_sync_state.json")
        
        # Create directories
        self.uploads_dir.mkdir(exist_ok=True)
        self.backup_dir.mkdir(exist_ok=True)
        
        # Get unified knowledge service
        self.knowledge_service = get_unified_knowledge_service()
        
        # Load previous sync state
        self.previous_state = self._load_sync_state()
        
        logger.info(f"Knowledge sync service initialized")
    
    def _load_sync_state(self) -> Dict[str, Any]:
        """Load previous sync state from file."""
        if self.sync_state_file.exists():
            try:
                with open(self.sync_state_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load sync state: {e}")
        return {
            "last_sync": None,
            "file_hashes": {},
            "processed_files": [],
            "sync_count": 0
        }
    
    def _save_sync_state(self, state: Dict[str, Any]):
        """Save current sync state to file."""
        try:
            with open(self.sync_state_file, 'w', encoding='utf-8') as f:
                json.dump(state, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save sync state: {e}")
    
    def _calculate_file_hash(self, file_path: Path) -> str:
        """Calculate SHA256 hash of file content."""
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
                return hashlib.sha256(content).hexdigest()
        except Exception as e:
            logger.error(f"Failed to calculate hash for {file_path}: {e}")
            return ""
    
    def _get_file_info(self, file_path: Path) -> Dict[str, Any]:
        """Get comprehensive file information."""
        try:
            stat = file_path.stat()
            return {
                "name": file_path.name,
                "path": str(file_path),
                "size": stat.st_size,
                "modified_time": stat.st_mtime,
                "hash": self._calculate_file_hash(file_path),
                "extension": file_path.suffix.lower()
            }
        except Exception as e:
            logger.error(f"Failed to get file info for {file_path}: {e}")
            return {}
    
    def _backup_file(self, file_path: Path) -> bool:
        """Create backup of file before processing."""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"{file_path.stem}_{timestamp}{file_path.suffix}"
            backup_path = self.backup_dir / backup_filename
            
            shutil.copy2(file_path, backup_path)
            logger.info(f"Backup created: {backup_filename}")
            return True
        except Exception as e:
            logger.error(f"Failed to backup {file_path}: {e}")
            return False
    
    def scan_for_changes(self) -> Dict[str, List[Dict[str, Any]]]:
        """Scan uploads directory for file changes."""
        current_files = {}
        changes = {
            "new_files": [],
            "modified_files": [],
            "deleted_files": [],
            "unchanged_files": []
        }
        
        # Scan current files
        supported_extensions = {'.txt', '.pdf', '.docx', '.pptx', '.xlsx', '.md'}
        
        for file_path in self.uploads_dir.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
                file_info = self._get_file_info(file_path)
                if file_info:
                    current_files[file_path.name] = file_info
        
        # Compare with previous state
        previous_hashes = self.previous_state.get("file_hashes", {})
        
        for filename, file_info in current_files.items():
            if filename not in previous_hashes:
                changes["new_files"].append(file_info)
            elif previous_hashes[filename] != file_info["hash"]:
                changes["modified_files"].append(file_info)
            else:
                changes["unchanged_files"].append(file_info)
        
        # Check for deleted files
        for filename in previous_hashes:
            if filename not in current_files:
                changes["deleted_files"].append({"name": filename})
        
        return changes
    
    def process_file_changes(self, changes: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Process detected file changes."""
        results = {
            "processed_new": [],
            "processed_modified": [],
            "processed_deleted": [],
            "failed_files": [],
            "backup_created": False
        }
        
        # Create backup if there are changes
        if any(changes[key] for key in ["new_files", "modified_files", "deleted_files"]):
            backup_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_state_file = self.backup_dir / f"sync_state_{backup_timestamp}.json"
            
            try:
                shutil.copy2(self.sync_state_file, backup_state_file)
                results["backup_created"] = True
                logger.info(f"Sync state backup created: {backup_state_file.name}")
            except Exception as e:
                logger.warning(f"Failed to backup sync state: {e}")
        
        # Process new files
        for file_info in changes["new_files"]:
            try:
                file_path = Path(file_info["path"])
                if self._backup_file(file_path):
                    results["processed_new"].append(file_info["name"])
                    logger.info(f"New file detected and backed up: {file_info['name']}")
            except Exception as e:
                logger.error(f"Failed to process new file {file_info['name']}: {e}")
                results["failed_files"].append(file_info["name"])
        
        # Process modified files
        for file_info in changes["modified_files"]:
            try:
                file_path = Path(file_info["path"])
                if self._backup_file(file_path):
                    results["processed_modified"].append(file_info["name"])
                    logger.info(f"Modified file detected and backed up: {file_info['name']}")
            except Exception as e:
                logger.error(f"Failed to process modified file {file_info['name']}: {e}")
                results["failed_files"].append(file_info["name"])
        
        # Process deleted files
        for file_info in changes["deleted_files"]:
            results["processed_deleted"].append(file_info["name"])
            logger.info(f"Deleted file detected: {file_info['name']}")
        
        return results
    
    def sync_vector_storage(self) -> Dict[str, Any]:
        """Synchronize vector storage with current files."""
        try:
            # Process all files in uploads folder
            processing_result = self.knowledge_service.process_uploads_folder()
            
            # Get updated stats
            stats = self.knowledge_service.get_stats()
            
            return {
                "success": True,
                "processing_result": processing_result,
                "current_stats": stats,
                "vector_sync_time": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Vector storage sync failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "vector_sync_time": datetime.now().isoformat()
            }
    
    def perform_one_click_sync(self) -> Dict[str, Any]:
        """Perform complete one-click knowledge repository sync."""
        sync_start_time = datetime.now()
        
        logger.info("Starting one-click knowledge repository sync")
        
        try:
            # Step 1: Scan for changes
            changes = self.scan_for_changes()
            
            # Step 2: Process file changes
            change_results = self.process_file_changes(changes)
            
            # Step 3: Sync vector storage
            vector_results = self.sync_vector_storage()
            
            # Step 4: Update sync state
            current_files = {}
            for file_path in self.uploads_dir.iterdir():
                if file_path.is_file() and file_path.suffix.lower() in {'.txt', '.pdf', '.docx', '.pptx', '.xlsx', '.md'}:
                    file_info = self._get_file_info(file_path)
                    if file_info:
                        current_files[file_path.name] = file_info["hash"]
            
            new_state = {
                "last_sync": sync_start_time.isoformat(),
                "file_hashes": current_files,
                "processed_files": list(current_files.keys()),
                "sync_count": self.previous_state.get("sync_count", 0) + 1
            }
            
            self._save_sync_state(new_state)
            
            # Calculate sync duration
            sync_duration = (datetime.now() - sync_start_time).total_seconds() * 1000
            
            # Prepare final result
            result = {
                "success": True,
                "sync_timestamp": sync_start_time.isoformat(),
                "sync_duration_ms": sync_duration,
                "changes_detected": changes,
                "change_processing": change_results,
                "vector_storage": vector_results,
                "final_state": {
                    "total_files": len(current_files),
                    "files": list(current_files.keys()),
                    "sync_count": new_state["sync_count"]
                }
            }
            
            logger.info(f"One-click sync completed successfully in {sync_duration:.1f}ms")
            return result
            
        except Exception as e:
            logger.error(f"One-click sync failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "sync_timestamp": sync_start_time.isoformat(),
                "sync_duration_ms": (datetime.now() - sync_start_time).total_seconds() * 1000
            }
    
    def get_sync_status(self) -> Dict[str, Any]:
        """Get current sync status and statistics."""
        try:
            # Get current file count
            current_files = [f for f in self.uploads_dir.iterdir() 
                           if f.is_file() and f.suffix.lower() in {'.txt', '.pdf', '.docx', '.pptx', '.xlsx', '.md'}]
            
            # Get knowledge service stats
            knowledge_stats = self.knowledge_service.get_stats()
            
            # Get backup count
            backup_files = [f for f in self.backup_dir.iterdir() if f.is_file()]
            
            return {
                "last_sync": self.previous_state.get("last_sync"),
                "sync_count": self.previous_state.get("sync_count", 0),
                "uploads_directory": {
                    "path": str(self.uploads_dir),
                    "file_count": len(current_files),
                    "files": [f.name for f in current_files]
                },
                "backup_directory": {
                    "path": str(self.backup_dir),
                    "backup_count": len(backup_files)
                },
                "vector_storage": knowledge_stats,
                "sync_state_file": str(self.sync_state_file)
            }
        except Exception as e:
            logger.error(f"Failed to get sync status: {e}")
            return {"error": str(e)}
    
    def cleanup_old_backups(self, keep_days: int = 7) -> Dict[str, Any]:
        """Clean up old backup files."""
        try:
            cutoff_time = datetime.now().timestamp() - (keep_days * 24 * 3600)
            deleted_files = []
            
            for backup_file in self.backup_dir.iterdir():
                if backup_file.is_file() and backup_file.stat().st_mtime < cutoff_time:
                    try:
                        backup_file.unlink()
                        deleted_files.append(backup_file.name)
                        logger.info(f"Deleted old backup: {backup_file.name}")
                    except Exception as e:
                        logger.warning(f"Failed to delete backup {backup_file.name}: {e}")
            
            return {
                "success": True,
                "deleted_count": len(deleted_files),
                "deleted_files": deleted_files,
                "keep_days": keep_days
            }
        except Exception as e:
            logger.error(f"Backup cleanup failed: {e}")
            return {"success": False, "error": str(e)}

# Global instance
_knowledge_sync_service = None

def get_knowledge_sync_service() -> KnowledgeSyncService:
    """Get the global knowledge sync service instance."""
    global _knowledge_sync_service
    if _knowledge_sync_service is None:
        _knowledge_sync_service = KnowledgeSyncService()
    return _knowledge_sync_service