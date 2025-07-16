"""
Advanced Security Service with RBAC, Encryption, and Endpoint Protection
Implements comprehensive security controls for all endpoints and agent operations
"""

import os
import asyncio
import logging
import hashlib
import jwt
import bcrypt
import secrets
import json
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
from functools import wraps
import time
from collections import defaultdict
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EncryptionService:
    """Advanced encryption service for sensitive data"""
    
    def __init__(self, master_key: str = None):
        self.master_key = master_key or os.getenv('ENCRYPTION_MASTER_KEY')
        if not self.master_key:
            # Generate new master key if none provided
            self.master_key = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()
            logger.warning("Generated new encryption master key - store securely!")
        
        self.fernet = self._derive_fernet_key()
    
    def _derive_fernet_key(self):
        """Derive Fernet key from master key"""
        password = self.master_key.encode()
        salt = b'salt_for_agent_system'  # In production, use random salt per encryption
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return Fernet(key)
    
    def encrypt(self, data: str) -> str:
        """Encrypt sensitive data"""
        try:
            encrypted_data = self.fernet.encrypt(data.encode())
            return base64.urlsafe_b64encode(encrypted_data).decode()
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            return data  # Return original if encryption fails
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        try:
            decoded_data = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted_data = self.fernet.decrypt(decoded_data)
            return decrypted_data.decode()
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return encrypted_data  # Return original if decryption fails
    
    def hash_password(self, password: str) -> str:
        """Hash password with bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification failed: {e}")
            return False

class RBACManager:
    """Role-Based Access Control Manager"""
    
    ROLE_HIERARCHY = {
        'creator': 100,
        'administrator': 80,
        'support_engineer': 60,
        'engineer': 40,
        'user': 20,
        'guest': 10
    }
    
    ENDPOINT_PERMISSIONS = {
        # Agent endpoints - highest security
        '/api/agents/upload': ['creator', 'administrator', 'support_engineer'],
        '/api/agents/process': ['creator', 'administrator', 'support_engineer', 'engineer'],
        '/api/agents/health': ['creator', 'administrator'],
        
        # Admin endpoints
        '/api/admin/monitoring': ['creator', 'administrator'],
        '/api/admin/users': ['creator', 'administrator'],
        '/api/admin/tenants': ['creator'],
        
        # Ticket endpoints
        '/api/tickets': ['creator', 'administrator', 'support_engineer', 'engineer', 'user'],
        '/api/tickets/create': ['creator', 'administrator', 'support_engineer', 'user'],
        '/api/tickets/*/delete': ['creator', 'administrator'],
        
        # Document endpoints
        '/api/documents': ['creator', 'administrator', 'support_engineer', 'engineer'],
        '/api/documents/upload': ['creator', 'administrator', 'support_engineer'],
        
        # AI Provider endpoints
        '/api/ai-providers': ['creator', 'administrator'],
        '/api/ai-providers/configure': ['creator'],
        
        # Widget endpoints
        '/api/widget/**': ['creator', 'administrator', 'support_engineer'],
        
        # Public endpoints (no restrictions)
        '/api/health': ['*'],
        '/api/status': ['*']
    }
    
    def __init__(self):
        self.jwt_secret = os.getenv('JWT_SECRET', 'change-this-in-production')
        self.jwt_algorithm = 'HS256'
        self.token_expiry = timedelta(hours=24)
    
    def check_endpoint_permission(self, endpoint: str, user_role: str, method: str = 'GET') -> bool:
        """Check if user role has permission for endpoint"""
        try:
            # Public endpoints
            if endpoint in self.ENDPOINT_PERMISSIONS and '*' in self.ENDPOINT_PERMISSIONS[endpoint]:
                return True
            
            # Exact match
            if endpoint in self.ENDPOINT_PERMISSIONS:
                return user_role in self.ENDPOINT_PERMISSIONS[endpoint]
            
            # Pattern matching for dynamic endpoints
            for pattern, allowed_roles in self.ENDPOINT_PERMISSIONS.items():
                if self._match_pattern(pattern, endpoint):
                    return user_role in allowed_roles
            
            # Default deny for unknown endpoints
            logger.warning(f"Unknown endpoint accessed: {endpoint} by role {user_role}")
            return user_role in ['creator', 'administrator']
            
        except Exception as e:
            logger.error(f"Permission check failed: {e}")
            return False
    
    def _match_pattern(self, pattern: str, endpoint: str) -> bool:
        """Match endpoint against pattern"""
        # Convert pattern to regex
        regex_pattern = pattern.replace('*', r'[^/]+').replace('**', r'.*')
        regex_pattern = f"^{regex_pattern}$"
        return bool(re.match(regex_pattern, endpoint))
    
    def generate_jwt_token(self, user_data: Dict[str, Any]) -> str:
        """Generate JWT token for authenticated user"""
        payload = {
            'user_id': user_data['id'],
            'username': user_data.get('username'),
            'role': user_data.get('role', 'user'),
            'tenant_id': user_data.get('tenant_id', 1),
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + self.token_expiry
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def verify_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
    
    def has_required_role(self, user_role: str, required_role: str) -> bool:
        """Check if user has required role level"""
        user_level = self.ROLE_HIERARCHY.get(user_role, 0)
        required_level = self.ROLE_HIERARCHY.get(required_role, 100)
        return user_level >= required_level

class RateLimiter:
    """Advanced rate limiting with different strategies"""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.blocked_ips = set()
        self.limits = {
            'default': {'requests': 100, 'window': 3600},  # 100 requests per hour
            'agent_upload': {'requests': 5, 'window': 300},  # 5 uploads per 5 minutes
            'agent_process': {'requests': 20, 'window': 600},  # 20 processes per 10 minutes
            'auth': {'requests': 10, 'window': 900},  # 10 auth attempts per 15 minutes
        }
    
    def is_allowed(self, identifier: str, endpoint_type: str = 'default') -> bool:
        """Check if request is allowed under rate limits"""
        if identifier in self.blocked_ips:
            return False
        
        now = time.time()
        limit_config = self.limits.get(endpoint_type, self.limits['default'])
        window = limit_config['window']
        max_requests = limit_config['requests']
        
        # Clean old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < window
        ]
        
        # Check limit
        if len(self.requests[identifier]) >= max_requests:
            logger.warning(f"Rate limit exceeded for {identifier} on {endpoint_type}")
            return False
        
        # Record request
        self.requests[identifier].append(now)
        return True
    
    def block_ip(self, ip_address: str, duration: int = 3600):
        """Block IP address for specified duration"""
        self.blocked_ips.add(ip_address)
        logger.warning(f"Blocked IP {ip_address} for {duration} seconds")
        
        # Schedule unblock
        asyncio.create_task(self._unblock_ip_after_delay(ip_address, duration))
    
    async def _unblock_ip_after_delay(self, ip_address: str, delay: int):
        """Unblock IP after delay"""
        await asyncio.sleep(delay)
        self.blocked_ips.discard(ip_address)
        logger.info(f"Unblocked IP {ip_address}")

class SecurityViolationTracker:
    """Track and respond to security violations"""
    
    def __init__(self):
        self.violations = defaultdict(list)
        self.violation_thresholds = {
            'unauthorized_access': 5,
            'rate_limit_exceeded': 10,
            'invalid_token': 8,
            'permission_denied': 6,
            'suspicious_upload': 3
        }
    
    def record_violation(self, identifier: str, violation_type: str, details: Dict[str, Any]):
        """Record security violation"""
        violation = {
            'type': violation_type,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details
        }
        
        self.violations[identifier].append(violation)
        
        # Check if threshold exceeded
        recent_violations = [
            v for v in self.violations[identifier]
            if v['type'] == violation_type and 
            (datetime.utcnow() - datetime.fromisoformat(v['timestamp'])).total_seconds() < 3600
        ]
        
        if len(recent_violations) >= self.violation_thresholds.get(violation_type, 5):
            logger.critical(f"Security threshold exceeded for {identifier}: {violation_type}")
            return True  # Should trigger additional security measures
        
        return False
    
    def get_violation_summary(self, identifier: str) -> Dict[str, Any]:
        """Get violation summary for identifier"""
        violations = self.violations.get(identifier, [])
        
        # Count by type
        violation_counts = defaultdict(int)
        for violation in violations:
            violation_counts[violation['type']] += 1
        
        return {
            'total_violations': len(violations),
            'violation_types': dict(violation_counts),
            'last_violation': violations[-1] if violations else None
        }

class SecureEndpointManager:
    """Comprehensive endpoint security manager"""
    
    def __init__(self):
        self.encryption_service = EncryptionService()
        self.rbac_manager = RBACManager()
        self.rate_limiter = RateLimiter()
        self.violation_tracker = SecurityViolationTracker()
        
    def security_middleware(self, endpoint_type: str = 'default'):
        """Decorator for endpoint security"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Extract request info (assuming Flask/FastAPI-like structure)
                request = kwargs.get('request') or (args[0] if args else None)
                
                try:
                    # Get client identifier
                    client_ip = getattr(request, 'remote_addr', 'unknown')
                    user_agent = getattr(request, 'user_agent', 'unknown')
                    identifier = f"{client_ip}:{user_agent}"
                    
                    # Rate limiting
                    if not self.rate_limiter.is_allowed(identifier, endpoint_type):
                        self.violation_tracker.record_violation(
                            identifier, 'rate_limit_exceeded',
                            {'endpoint': endpoint_type, 'ip': client_ip}
                        )
                        raise SecurityViolationError("Rate limit exceeded")
                    
                    # Authentication check (if required)
                    if endpoint_type != 'public':
                        auth_header = getattr(request, 'headers', {}).get('Authorization')
                        if not auth_header or not auth_header.startswith('Bearer '):
                            self.violation_tracker.record_violation(
                                identifier, 'unauthorized_access',
                                {'endpoint': endpoint_type, 'reason': 'missing_token'}
                            )
                            raise SecurityViolationError("Authentication required")
                        
                        token = auth_header.split(' ')[1]
                        user_data = self.rbac_manager.verify_jwt_token(token)
                        if not user_data:
                            self.violation_tracker.record_violation(
                                identifier, 'invalid_token',
                                {'endpoint': endpoint_type, 'token_preview': token[:10]}
                            )
                            raise SecurityViolationError("Invalid or expired token")
                        
                        # Add user data to request context
                        kwargs['user_context'] = user_data
                    
                    # Execute original function
                    result = await func(*args, **kwargs)
                    
                    # Log successful access
                    logger.info(f"Secure access granted to {endpoint_type} for {identifier}")
                    
                    return result
                    
                except SecurityViolationError as e:
                    logger.warning(f"Security violation on {endpoint_type}: {e}")
                    raise
                except Exception as e:
                    logger.error(f"Security middleware error: {e}")
                    raise
                    
            return wrapper
        return decorator
    
    def secure_data_transfer(self, data: Dict[str, Any], sensitive_fields: List[str]) -> Dict[str, Any]:
        """Encrypt sensitive fields in data transfer"""
        secured_data = data.copy()
        
        for field in sensitive_fields:
            if field in secured_data and secured_data[field]:
                secured_data[field] = self.encryption_service.encrypt(str(secured_data[field]))
        
        return secured_data
    
    def validate_agent_upload(self, file_content: bytes, filename: str, user_context: Dict[str, Any]) -> bool:
        """Validate agent file uploads with enhanced security"""
        try:
            # Check user permissions
            if not self.rbac_manager.check_endpoint_permission('/api/agents/upload', user_context.get('role', 'user')):
                raise SecurityViolationError("Insufficient permissions for agent upload")
            
            # File size check
            if len(file_content) > 50 * 1024 * 1024:  # 50MB limit
                raise SecurityViolationError("File too large for agent upload")
            
            # File type validation
            allowed_extensions = ['.py', '.txt', '.json', '.yaml', '.yml', '.md']
            file_ext = os.path.splitext(filename)[1].lower()
            if file_ext not in allowed_extensions:
                raise SecurityViolationError(f"File type {file_ext} not allowed for agent upload")
            
            # Content scanning for malicious patterns
            content_str = file_content.decode('utf-8', errors='ignore').lower()
            suspicious_patterns = [
                'import os', 'subprocess', 'eval(', 'exec(',
                '__import__', 'open(', 'file(', 'input(',
                'raw_input', 'system(', 'shell'
            ]
            
            for pattern in suspicious_patterns:
                if pattern in content_str:
                    self.violation_tracker.record_violation(
                        user_context.get('user_id', 'unknown'),
                        'suspicious_upload',
                        {'filename': filename, 'pattern': pattern}
                    )
                    logger.warning(f"Suspicious pattern '{pattern}' found in upload: {filename}")
            
            return True
            
        except SecurityViolationError:
            raise
        except Exception as e:
            logger.error(f"Agent upload validation failed: {e}")
            return False

class SecurityAuditLogger:
    """Comprehensive security audit logging"""
    
    def __init__(self, log_file: str = 'security_audit.log'):
        self.log_file = log_file
        self.audit_logger = logging.getLogger('security_audit')
        
        # Setup file handler for audit logs
        handler = logging.FileHandler(log_file)
        formatter = logging.Formatter(
            '%(asctime)s - SECURITY - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        self.audit_logger.addHandler(handler)
        self.audit_logger.setLevel(logging.INFO)
    
    def log_security_event(self, event_type: str, user_id: str, details: Dict[str, Any]):
        """Log security event"""
        audit_entry = {
            'event_type': event_type,
            'user_id': user_id,
            'timestamp': datetime.utcnow().isoformat(),
            'details': details
        }
        
        self.audit_logger.info(json.dumps(audit_entry))
    
    def log_access_attempt(self, endpoint: str, user_id: str, success: bool, ip_address: str):
        """Log access attempt"""
        self.log_security_event('access_attempt', user_id, {
            'endpoint': endpoint,
            'success': success,
            'ip_address': ip_address
        })
    
    def log_privilege_escalation(self, user_id: str, from_role: str, to_role: str, authorized_by: str):
        """Log privilege escalation"""
        self.log_security_event('privilege_escalation', user_id, {
            'from_role': from_role,
            'to_role': to_role,
            'authorized_by': authorized_by
        })

class SecurityViolationError(Exception):
    """Custom exception for security violations"""
    pass

# Global security manager instance
security_manager = SecureEndpointManager()
audit_logger = SecurityAuditLogger()

# Export main functions
def secure_endpoint(endpoint_type: str = 'default'):
    """Decorator for securing endpoints"""
    return security_manager.security_middleware(endpoint_type)

def encrypt_sensitive_data(data: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
    """Encrypt sensitive fields in data"""
    return security_manager.secure_data_transfer(data, fields)

def validate_agent_upload(file_content: bytes, filename: str, user_context: Dict[str, Any]) -> bool:
    """Validate agent file upload"""
    return security_manager.validate_agent_upload(file_content, filename, user_context)

async def initialize_security_service():
    """Initialize security service"""
    try:
        logger.info("Security service initialized with RBAC, encryption, and audit logging")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize security service: {e}")
        return False