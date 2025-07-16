"""
Microservices Container Orchestrator with Scaling and Deployment
Manages containerized microservices with health monitoring, backups, and fallback behavior
"""

import os
import asyncio
import logging
import json
import docker
import aiohttp
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import subprocess
import shutil
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ServiceConfig:
    """Configuration for a microservice"""
    
    def __init__(self, name: str, port: int, dockerfile_path: str, 
                 environment: Dict[str, str] = None, health_endpoint: str = "/health"):
        self.name = name
        self.port = port
        self.dockerfile_path = dockerfile_path
        self.environment = environment or {}
        self.health_endpoint = health_endpoint
        self.container_id = None
        self.image_tag = f"{name}:latest"

class ContainerOrchestrator:
    """Docker container orchestrator for microservices"""
    
    def __init__(self):
        self.docker_client = None
        self.services: Dict[str, ServiceConfig] = {}
        self.health_check_interval = 30  # seconds
        self.max_restart_attempts = 3
        
    async def initialize(self):
        """Initialize Docker client"""
        try:
            self.docker_client = docker.from_env()
            logger.info("Docker client initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            return False
    
    def register_service(self, config: ServiceConfig):
        """Register a microservice configuration"""
        self.services[config.name] = config
        logger.info(f"Registered service: {config.name}")
    
    async def build_service_image(self, service_name: str) -> bool:
        """Build Docker image for a service"""
        try:
            config = self.services[service_name]
            
            # Build Docker image
            image, logs = self.docker_client.images.build(
                path=config.dockerfile_path,
                tag=config.image_tag,
                rm=True
            )
            
            logger.info(f"Built image for {service_name}: {config.image_tag}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to build image for {service_name}: {e}")
            return False
    
    async def start_service(self, service_name: str, scale: int = 1) -> bool:
        """Start a service with optional scaling"""
        try:
            config = self.services[service_name]
            
            # Remove existing containers
            await self.stop_service(service_name)
            
            # Start containers for scaling
            containers = []
            for i in range(scale):
                container_name = f"{service_name}-{i+1}" if scale > 1 else service_name
                port_mapping = {f"{config.port}/tcp": config.port + i}
                
                container = self.docker_client.containers.run(
                    config.image_tag,
                    name=container_name,
                    ports=port_mapping,
                    environment=config.environment,
                    detach=True,
                    restart_policy={"Name": "unless-stopped"}
                )
                
                containers.append(container.id)
                
            config.container_id = containers[0] if len(containers) == 1 else containers
            logger.info(f"Started {scale} instance(s) of {service_name}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start service {service_name}: {e}")
            return False
    
    async def stop_service(self, service_name: str):
        """Stop a service and remove containers"""
        try:
            # Find and stop containers
            containers = self.docker_client.containers.list(
                filters={"name": service_name}
            )
            
            for container in containers:
                container.stop()
                container.remove()
                
            logger.info(f"Stopped service: {service_name}")
            
        except Exception as e:
            logger.error(f"Failed to stop service {service_name}: {e}")
    
    async def health_check_service(self, service_name: str) -> Dict[str, Any]:
        """Perform health check on a service"""
        try:
            config = self.services[service_name]
            
            async with aiohttp.ClientSession() as session:
                url = f"http://localhost:{config.port}{config.health_endpoint}"
                async with session.get(url, timeout=10) as response:
                    if response.status == 200:
                        health_data = await response.json()
                        return {
                            "service": service_name,
                            "status": "healthy",
                            "response_time_ms": response.headers.get("X-Response-Time", "unknown"),
                            "details": health_data
                        }
                    else:
                        return {
                            "service": service_name,
                            "status": "unhealthy",
                            "error": f"HTTP {response.status}"
                        }
                        
        except Exception as e:
            return {
                "service": service_name,
                "status": "unhealthy",
                "error": str(e)
            }
    
    async def auto_heal_services(self):
        """Automatic healing for failed services"""
        while True:
            try:
                for service_name in self.services:
                    health = await self.health_check_service(service_name)
                    
                    if health["status"] == "unhealthy":
                        logger.warning(f"Service {service_name} is unhealthy, attempting restart")
                        
                        # Restart service
                        success = await self.start_service(service_name)
                        if success:
                            logger.info(f"Successfully restarted {service_name}")
                        else:
                            logger.error(f"Failed to restart {service_name}")
                
                await asyncio.sleep(self.health_check_interval)
                
            except Exception as e:
                logger.error(f"Auto-heal error: {e}")
                await asyncio.sleep(self.health_check_interval)

class BackupManager:
    """Automated backup and restore manager"""
    
    def __init__(self, backup_dir: str = "./backups"):
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)
        self.retention_days = 7
        
    async def backup_database(self) -> str:
        """Create database backup"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = self.backup_dir / f"database_backup_{timestamp}.sql"
            
            # Use pg_dump for PostgreSQL backup
            database_url = os.getenv("DATABASE_URL")
            if not database_url:
                raise ValueError("DATABASE_URL not set")
            
            cmd = [
                "pg_dump",
                database_url,
                "--no-password",
                "--verbose",
                "--file", str(backup_file)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Database backup created: {backup_file}")
                return str(backup_file)
            else:
                raise Exception(f"pg_dump failed: {result.stderr}")
                
        except Exception as e:
            logger.error(f"Database backup failed: {e}")
            return None
    
    async def backup_vector_storage(self) -> str:
        """Create vector storage backup"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = self.backup_dir / f"vector_storage_{timestamp}.tar.gz"
            
            # Compress vector storage directory
            vector_dir = "./chroma_db"
            if os.path.exists(vector_dir):
                shutil.make_archive(
                    str(backup_file).replace(".tar.gz", ""),
                    "gztar",
                    vector_dir
                )
                
                logger.info(f"Vector storage backup created: {backup_file}")
                return str(backup_file)
            else:
                logger.warning("Vector storage directory not found")
                return None
                
        except Exception as e:
            logger.error(f"Vector storage backup failed: {e}")
            return None
    
    async def scheduled_backup(self):
        """Perform scheduled backups"""
        while True:
            try:
                # Daily backup at 2 AM
                now = datetime.now()
                if now.hour == 2 and now.minute == 0:
                    logger.info("Starting scheduled backup")
                    
                    # Backup database
                    db_backup = await self.backup_database()
                    
                    # Backup vector storage
                    vector_backup = await self.backup_vector_storage()
                    
                    # Cleanup old backups
                    await self.cleanup_old_backups()
                    
                    logger.info("Scheduled backup completed")
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Scheduled backup error: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error
    
    async def cleanup_old_backups(self):
        """Remove backups older than retention period"""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.retention_days)
            
            for backup_file in self.backup_dir.glob("*"):
                if backup_file.is_file():
                    file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)
                    if file_time < cutoff_date:
                        backup_file.unlink()
                        logger.info(f"Removed old backup: {backup_file}")
                        
        except Exception as e:
            logger.error(f"Backup cleanup error: {e}")

class LoadBalancer:
    """Simple load balancer for scaled services"""
    
    def __init__(self):
        self.service_endpoints = {}
        self.current_index = {}
        
    def register_service_endpoints(self, service_name: str, endpoints: List[str]):
        """Register multiple endpoints for a service"""
        self.service_endpoints[service_name] = endpoints
        self.current_index[service_name] = 0
        
    def get_next_endpoint(self, service_name: str) -> str:
        """Get next endpoint using round-robin"""
        if service_name not in self.service_endpoints:
            return None
            
        endpoints = self.service_endpoints[service_name]
        if not endpoints:
            return None
            
        current = self.current_index[service_name]
        endpoint = endpoints[current]
        
        # Update index for round-robin
        self.current_index[service_name] = (current + 1) % len(endpoints)
        
        return endpoint

class FallbackManager:
    """Manages fallback behavior for service outages"""
    
    def __init__(self):
        self.fallback_strategies = {}
        
    def register_fallback(self, service_name: str, fallback_fn):
        """Register fallback function for a service"""
        self.fallback_strategies[service_name] = fallback_fn
        
    async def execute_with_fallback(self, service_name: str, primary_fn, *args, **kwargs):
        """Execute function with fallback on failure"""
        try:
            # Try primary function
            return await primary_fn(*args, **kwargs)
            
        except Exception as e:
            logger.warning(f"Primary function failed for {service_name}: {e}")
            
            # Try fallback if available
            if service_name in self.fallback_strategies:
                try:
                    logger.info(f"Executing fallback for {service_name}")
                    return await self.fallback_strategies[service_name](*args, **kwargs)
                except Exception as fallback_error:
                    logger.error(f"Fallback also failed for {service_name}: {fallback_error}")
                    raise fallback_error
            else:
                logger.error(f"No fallback strategy for {service_name}")
                raise e

# Global instances
orchestrator = ContainerOrchestrator()
backup_manager = BackupManager()
load_balancer = LoadBalancer()
fallback_manager = FallbackManager()

async def setup_microservices():
    """Setup all microservices with proper configuration"""
    try:
        # Initialize orchestrator
        await orchestrator.initialize()
        
        # Register services
        orchestrator.register_service(ServiceConfig(
            name="main-app",
            port=5000,
            dockerfile_path="./dockerfiles/main-app",
            environment={
                "NODE_ENV": "production",
                "DATABASE_URL": os.getenv("DATABASE_URL"),
                "PORT": "5000"
            }
        ))
        
        orchestrator.register_service(ServiceConfig(
            name="data-service",
            port=8000,
            dockerfile_path="./dockerfiles/data-service",
            environment={
                "DATABASE_URL": os.getenv("DATABASE_URL"),
                "PORT": "8000"
            }
        ))
        
        orchestrator.register_service(ServiceConfig(
            name="agent-service",
            port=8001,
            dockerfile_path="./dockerfiles/agent-service",
            environment={
                "DATABASE_URL": os.getenv("DATABASE_URL"),
                "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
                "PORT": "8001"
            }
        ))
        
        # Start background tasks
        asyncio.create_task(orchestrator.auto_heal_services())
        asyncio.create_task(backup_manager.scheduled_backup())
        
        logger.info("Microservices orchestrator setup complete")
        return True
        
    except Exception as e:
        logger.error(f"Failed to setup microservices: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(setup_microservices())