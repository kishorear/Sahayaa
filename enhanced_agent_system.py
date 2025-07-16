"""
Enhanced Agent System with MCP Integration and Vector Search
Replaces data-service fallbacks with MCP queries and adds RBAC security
"""

import os
import asyncio
import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib
import jwt
from functools import wraps
import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential

# Import our custom MCP and vector search services
from mcp_config import get_mcp_client, get_database_fallback
from vector_search_service import get_vector_search_service

# Configure logging with structured format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SecurityManager:
    """Role-Based Access Control for agent operations"""
    
    ROLE_PERMISSIONS = {
        'creator': ['*'],  # Full access
        'administrator': ['read_tickets', 'write_tickets', 'read_instructions', 'write_instructions', 'agent_upload'],
        'support_engineer': ['read_tickets', 'write_tickets', 'read_instructions', 'agent_upload'],
        'engineer': ['read_tickets', 'read_instructions'],
        'user': ['read_tickets_own', 'read_instructions']
    }
    
    def __init__(self, jwt_secret: str = None):
        self.jwt_secret = jwt_secret or os.getenv('JWT_SECRET', 'default-secret-change-in-production')
    
    def check_permission(self, user_role: str, action: str, resource_owner: str = None, user_id: str = None) -> bool:
        """Check if user has permission for action"""
        if user_role not in self.ROLE_PERMISSIONS:
            return False
        
        permissions = self.ROLE_PERMISSIONS[user_role]
        
        # Creator has full access
        if '*' in permissions:
            return True
        
        # Check specific permissions
        if action in permissions:
            return True
        
        # Check ownership-based permissions
        if action == 'read_tickets_own' and resource_owner == user_id:
            return True
        
        return False
    
    def require_permission(self, action: str):
        """Decorator to enforce permissions"""
        def decorator(func):
            @wraps(func)
            async def wrapper(self, *args, **kwargs):
                # Extract user context from kwargs or args
                user_context = kwargs.get('user_context') or (args[0] if args else {})
                user_role = user_context.get('role', 'user')
                user_id = user_context.get('user_id')
                
                if not self.security_manager.check_permission(user_role, action, user_id=user_id):
                    raise PermissionError(f"Insufficient permissions for action: {action}")
                
                return await func(self, *args, **kwargs)
            return wrapper
        return decorator

class EnhancedInstructionLookupAgent:
    """Enhanced instruction lookup with vector search and MCP integration"""
    
    def __init__(self):
        self.security_manager = SecurityManager()
        self.vector_service = None
        self.mcp_client = None
        self.cache = {}
        self.cache_ttl = 300  # 5 minutes
        
    async def initialize(self):
        """Initialize services"""
        try:
            self.vector_service = await get_vector_search_service()
            self.mcp_client = await get_mcp_client()
            logger.info("Enhanced InstructionLookupAgent initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize InstructionLookupAgent: {e}")
            return False
    
    def _generate_cache_key(self, query: str, tenant_id: int) -> str:
        """Generate cache key for query"""
        content = f"{query}:{tenant_id}"
        return hashlib.md5(content.encode()).hexdigest()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_instructions(self, query: str, tenant_id: int = 1, 
                                user_context: Dict[str, Any] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search instructions using vector similarity and MCP fallback"""
        try:
            # Check permissions
            if not self.security_manager.check_permission(
                user_context.get('role', 'user'), 'read_instructions'
            ):
                raise PermissionError("Insufficient permissions to read instructions")
            
            # Check cache
            cache_key = self._generate_cache_key(query, tenant_id)
            if cache_key in self.cache:
                cached_result, timestamp = self.cache[cache_key]
                if (datetime.now().timestamp() - timestamp) < self.cache_ttl:
                    logger.info(f"Returning cached instruction results for query: {query[:50]}...")
                    return cached_result
            
            # Try vector search first (primary method)
            try:
                if not self.vector_service:
                    await self.initialize()
                
                vector_results = await self.vector_service.search_similar_instructions(
                    query, top_k, min_similarity=0.7
                )
                
                if vector_results:
                    # Cache results
                    self.cache[cache_key] = (vector_results, datetime.now().timestamp())
                    logger.info(f"Vector search found {len(vector_results)} instruction results")
                    return vector_results
                    
            except Exception as e:
                logger.warning(f"Vector search failed, falling back to MCP: {e}")
            
            # Fallback to MCP search
            try:
                if not self.mcp_client:
                    await self.initialize()
                
                mcp_results = await self.mcp_client.query_instructions(query, top_k, tenant_id)
                
                # Transform MCP results to match vector search format
                formatted_results = []
                for result in mcp_results:
                    formatted_results.append({
                        'instruction_id': str(result['id']),
                        'title': result['title'],
                        'content': result['content'],
                        'similarity_score': 0.8,  # Default high score for MCP results
                        'metadata': {
                            'category': result.get('category'),
                            'created_at': result.get('created_at'),
                            'view_count': result.get('view_count', 0)
                        }
                    })
                
                # Cache results
                self.cache[cache_key] = (formatted_results, datetime.now().timestamp())
                logger.info(f"MCP search found {len(formatted_results)} instruction results")
                return formatted_results
                
            except Exception as e:
                logger.error(f"MCP instruction search failed: {e}")
            
            # Final fallback to database
            try:
                db_fallback = await get_database_fallback()
                db_results = await db_fallback.query_instructions_fallback(query, top_k)
                
                formatted_results = []
                for result in db_results:
                    formatted_results.append({
                        'instruction_id': str(result['id']),
                        'title': result['title'],
                        'content': result['content'],
                        'similarity_score': 0.6,  # Lower score for basic search
                        'metadata': result
                    })
                
                logger.info(f"Database fallback found {len(formatted_results)} instruction results")
                return formatted_results
                
            except Exception as e:
                logger.error(f"All instruction search methods failed: {e}")
                return []
            
        except PermissionError:
            raise
        except Exception as e:
            logger.error(f"Instruction search error: {e}")
            return []

class EnhancedTicketLookupAgent:
    """Enhanced ticket lookup with vector search and MCP integration"""
    
    def __init__(self):
        self.security_manager = SecurityManager()
        self.vector_service = None
        self.mcp_client = None
        self.cache = {}
        self.cache_ttl = 180  # 3 minutes (shorter for tickets)
        
    async def initialize(self):
        """Initialize services"""
        try:
            self.vector_service = await get_vector_search_service()
            self.mcp_client = await get_mcp_client()
            logger.info("Enhanced TicketLookupAgent initialized")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize TicketLookupAgent: {e}")
            return False
    
    def _generate_cache_key(self, query: str, tenant_id: int) -> str:
        """Generate cache key for query"""
        content = f"{query}:{tenant_id}"
        return hashlib.md5(content.encode()).hexdigest()
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def search_similar_tickets(self, query: str, tenant_id: int = 1, 
                                   user_context: Dict[str, Any] = None, top_k: int = 10) -> List[Dict[str, Any]]:
        """Search similar tickets using vector similarity and MCP fallback"""
        try:
            # Check permissions
            user_role = user_context.get('role', 'user')
            user_id = user_context.get('user_id')
            
            if not self.security_manager.check_permission(user_role, 'read_tickets') and \
               not self.security_manager.check_permission(user_role, 'read_tickets_own', user_id=user_id):
                raise PermissionError("Insufficient permissions to read tickets")
            
            # Check cache
            cache_key = self._generate_cache_key(query, tenant_id)
            if cache_key in self.cache:
                cached_result, timestamp = self.cache[cache_key]
                if (datetime.now().timestamp() - timestamp) < self.cache_ttl:
                    logger.info(f"Returning cached ticket results for query: {query[:50]}...")
                    return cached_result
            
            # Try vector search first (primary method)
            try:
                if not self.vector_service:
                    await self.initialize()
                
                vector_results = await self.vector_service.search_similar_tickets(
                    query, top_k, min_similarity=0.6
                )
                
                if vector_results:
                    # Cache results
                    self.cache[cache_key] = (vector_results, datetime.now().timestamp())
                    logger.info(f"Vector search found {len(vector_results)} ticket results")
                    return vector_results
                    
            except Exception as e:
                logger.warning(f"Vector search failed, falling back to MCP: {e}")
            
            # Fallback to MCP search
            try:
                if not self.mcp_client:
                    await self.initialize()
                
                mcp_results = await self.mcp_client.query_tickets(query, top_k, tenant_id)
                
                # Transform MCP results to match vector search format
                formatted_results = []
                for result in mcp_results:
                    formatted_results.append({
                        'ticket_id': str(result['id']),
                        'title': result['title'],
                        'content': f"Description: {result.get('description', '')}\nResolution: {result.get('resolution_summary', '')}",
                        'similarity_score': 0.8,  # Default high score for MCP results
                        'metadata': {
                            'status': result.get('status'),
                            'category': result.get('category'),
                            'urgency': result.get('urgency'),
                            'created_at': result.get('created_at'),
                            'resolution_steps': result.get('resolution_steps')
                        }
                    })
                
                # Cache results
                self.cache[cache_key] = (formatted_results, datetime.now().timestamp())
                logger.info(f"MCP search found {len(formatted_results)} ticket results")
                return formatted_results
                
            except Exception as e:
                logger.error(f"MCP ticket search failed: {e}")
            
            # Final fallback to database
            try:
                db_fallback = await get_database_fallback()
                db_results = await db_fallback.query_tickets_fallback(query, top_k)
                
                formatted_results = []
                for result in db_results:
                    formatted_results.append({
                        'ticket_id': str(result['id']),
                        'title': result['title'],
                        'content': f"Description: {result.get('description', '')}\nLatest Message: {result.get('latest_message', '')}",
                        'similarity_score': 0.6,  # Lower score for basic search
                        'metadata': result
                    })
                
                logger.info(f"Database fallback found {len(formatted_results)} ticket results")
                return formatted_results
                
            except Exception as e:
                logger.error(f"All ticket search methods failed: {e}")
                return []
            
        except PermissionError:
            raise
        except Exception as e:
            logger.error(f"Ticket search error: {e}")
            return []
    
    @retry(stop=stop_after_attempt(2), wait=wait_exponential(multiplier=1, min=2, max=8))
    async def get_ticket_context(self, ticket_id: int, tenant_id: int = 1, 
                                user_context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get complete ticket context using MCP"""
        try:
            # Check permissions
            if not self.security_manager.check_permission(
                user_context.get('role', 'user'), 'read_tickets'
            ):
                raise PermissionError("Insufficient permissions to read ticket details")
            
            if not self.mcp_client:
                await self.initialize()
            
            context = await self.mcp_client.get_ticket_context(ticket_id, tenant_id)
            logger.info(f"Retrieved context for ticket {ticket_id}")
            return context
            
        except PermissionError:
            raise
        except Exception as e:
            logger.error(f"Failed to get ticket context: {e}")
            return {}

class SecureUploadManager:
    """Secure file upload manager with agent-specific RBAC"""
    
    def __init__(self):
        self.security_manager = SecurityManager()
        self.allowed_extensions = {
            'documents': ['.txt', '.pdf', '.docx', '.md'],
            'images': ['.jpg', '.jpeg', '.png', '.gif'],
            'data': ['.json', '.csv', '.xlsx']
        }
        self.max_file_size = 10 * 1024 * 1024  # 10MB
    
    def validate_file(self, filename: str, file_content: bytes, upload_type: str) -> bool:
        """Validate uploaded file"""
        try:
            # Check file size
            if len(file_content) > self.max_file_size:
                raise ValueError(f"File too large: {len(file_content)} bytes")
            
            # Check file extension
            file_ext = os.path.splitext(filename)[1].lower()
            if upload_type not in self.allowed_extensions:
                raise ValueError(f"Invalid upload type: {upload_type}")
            
            if file_ext not in self.allowed_extensions[upload_type]:
                raise ValueError(f"File extension {file_ext} not allowed for {upload_type}")
            
            # Basic content validation
            if file_ext == '.txt' and not file_content.decode('utf-8', errors='ignore').isprintable():
                raise ValueError("Text file contains invalid characters")
            
            return True
            
        except Exception as e:
            logger.error(f"File validation failed: {e}")
            return False
    
    async def secure_upload(self, filename: str, file_content: bytes, upload_type: str,
                          user_context: Dict[str, Any]) -> Dict[str, Any]:
        """Secure file upload with RBAC"""
        try:
            # Check permissions
            if not self.security_manager.check_permission(
                user_context.get('role', 'user'), 'agent_upload'
            ):
                raise PermissionError("Insufficient permissions for agent file uploads")
            
            # Validate file
            if not self.validate_file(filename, file_content, upload_type):
                raise ValueError("File validation failed")
            
            # Generate secure filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_filename = f"{timestamp}_{filename}"
            
            # Save file securely
            upload_dir = f"./agent_uploads/{upload_type}"
            os.makedirs(upload_dir, exist_ok=True)
            
            file_path = os.path.join(upload_dir, safe_filename)
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            # Log upload
            logger.info(f"Secure upload completed: {safe_filename} by user {user_context.get('user_id')}")
            
            return {
                'success': True,
                'filename': safe_filename,
                'path': file_path,
                'size': len(file_content),
                'upload_type': upload_type,
                'uploaded_by': user_context.get('user_id'),
                'uploaded_at': datetime.now().isoformat()
            }
            
        except PermissionError:
            raise
        except Exception as e:
            logger.error(f"Secure upload failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

class HealthMonitoringService:
    """Health monitoring and logging service"""
    
    def __init__(self):
        self.start_time = datetime.now()
        self.request_count = 0
        self.error_count = 0
        
    async def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check"""
        try:
            health_status = {
                'timestamp': datetime.now().isoformat(),
                'uptime_seconds': (datetime.now() - self.start_time).total_seconds(),
                'request_count': self.request_count,
                'error_count': self.error_count,
                'services': {}
            }
            
            # Check MCP client
            try:
                mcp_client = await get_mcp_client()
                mcp_health = await mcp_client.health_check()
                health_status['services']['mcp'] = mcp_health
            except Exception as e:
                health_status['services']['mcp'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
            
            # Check vector search service
            try:
                vector_service = await get_vector_search_service()
                vector_health = await vector_service.health_check()
                health_status['services']['vector_search'] = vector_health
            except Exception as e:
                health_status['services']['vector_search'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
            
            # Determine overall status
            all_healthy = all(
                service.get('status') == 'healthy' 
                for service in health_status['services'].values()
            )
            health_status['overall_status'] = 'healthy' if all_healthy else 'degraded'
            
            return health_status
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                'timestamp': datetime.now().isoformat(),
                'overall_status': 'unhealthy',
                'error': str(e)
            }
    
    def log_request(self, endpoint: str, user_id: str, success: bool, duration_ms: float):
        """Log request metrics"""
        self.request_count += 1
        if not success:
            self.error_count += 1
        
        logger.info(json.dumps({
            'type': 'request_metric',
            'endpoint': endpoint,
            'user_id': user_id,
            'success': success,
            'duration_ms': duration_ms,
            'timestamp': datetime.now().isoformat()
        }))

# Global service instances
enhanced_instruction_agent = EnhancedInstructionLookupAgent()
enhanced_ticket_agent = EnhancedTicketLookupAgent()
secure_upload_manager = SecureUploadManager()
health_monitor = HealthMonitoringService()

async def initialize_enhanced_agents():
    """Initialize all enhanced agents"""
    try:
        await enhanced_instruction_agent.initialize()
        await enhanced_ticket_agent.initialize()
        logger.info("Enhanced agent system initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize enhanced agents: {e}")
        return False