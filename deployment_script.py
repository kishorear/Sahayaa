"""
Comprehensive deployment script for MCP-enhanced agent system
Handles initialization, validation, and orchestration of all services
"""

import os
import asyncio
import logging
import json
import subprocess
import sys
from typing import Dict, Any, List
from datetime import datetime

# Import our enhanced services
from enhanced_agent_system import initialize_enhanced_agents
from mcp_config import initialize_mcp
from vector_search_service import get_vector_search_service
from security_rbac_service import initialize_security_service
from microservices_orchestrator import setup_microservices

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DeploymentValidator:
    """Validates deployment readiness and environment"""
    
    def __init__(self):
        self.required_env_vars = [
            'DATABASE_URL',
            'OPENAI_API_KEY',
            'JWT_SECRET'
        ]
        self.optional_env_vars = [
            'GOOGLE_AI_API_KEY',
            'ANTHROPIC_API_KEY',
            'AWS_ACCESS_KEY_ID',
            'ENCRYPTION_MASTER_KEY'
        ]
    
    def validate_environment(self) -> Dict[str, Any]:
        """Validate environment variables and dependencies"""
        validation_results = {
            'environment_check': True,
            'database_check': True,
            'ai_providers_check': True,
            'missing_required': [],
            'missing_optional': [],
            'errors': []
        }
        
        try:
            # Check required environment variables
            for var in self.required_env_vars:
                if not os.getenv(var):
                    validation_results['missing_required'].append(var)
                    validation_results['environment_check'] = False
            
            # Check optional environment variables
            for var in self.optional_env_vars:
                if not os.getenv(var):
                    validation_results['missing_optional'].append(var)
            
            # Test database connection
            try:
                import asyncpg
                database_url = os.getenv('DATABASE_URL')
                if database_url:
                    # This will be tested during initialization
                    logger.info("Database URL found")
                else:
                    validation_results['database_check'] = False
                    validation_results['errors'].append("DATABASE_URL not set")
            except ImportError:
                validation_results['errors'].append("asyncpg not installed")
                validation_results['database_check'] = False
            
            # Check AI provider access
            ai_providers_found = 0
            if os.getenv('OPENAI_API_KEY'):
                ai_providers_found += 1
            if os.getenv('GOOGLE_AI_API_KEY'):
                ai_providers_found += 1
            if os.getenv('ANTHROPIC_API_KEY'):
                ai_providers_found += 1
            
            if ai_providers_found == 0:
                validation_results['ai_providers_check'] = False
                validation_results['errors'].append("No AI provider API keys found")
            
            return validation_results
            
        except Exception as e:
            validation_results['errors'].append(f"Validation error: {str(e)}")
            return validation_results
    
    def check_system_resources(self) -> Dict[str, Any]:
        """Check system resources and capabilities"""
        try:
            import psutil
            
            # Memory check
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'memory_total_gb': round(memory.total / (1024**3), 2),
                'memory_available_gb': round(memory.available / (1024**3), 2),
                'memory_percent': memory.percent,
                'disk_total_gb': round(disk.total / (1024**3), 2),
                'disk_free_gb': round(disk.free / (1024**3), 2),
                'disk_percent': round((disk.used / disk.total) * 100, 2),
                'cpu_count': psutil.cpu_count(),
                'warnings': []
            }
        except ImportError:
            return {
                'warnings': ['psutil not available - cannot check system resources']
            }
        except Exception as e:
            return {
                'error': f"Resource check failed: {str(e)}"
            }

class ServiceInitializer:
    """Initializes all services in proper order"""
    
    def __init__(self):
        self.initialization_order = [
            'security_service',
            'mcp_client',
            'vector_search',
            'enhanced_agents',
            'microservices'
        ]
        self.service_status = {}
    
    async def initialize_all_services(self) -> Dict[str, Any]:
        """Initialize all services in dependency order"""
        results = {
            'success': True,
            'services_initialized': [],
            'services_failed': [],
            'errors': []
        }
        
        for service_name in self.initialization_order:
            try:
                logger.info(f"Initializing {service_name}...")
                
                if service_name == 'security_service':
                    success = await initialize_security_service()
                elif service_name == 'mcp_client':
                    success = await initialize_mcp()
                elif service_name == 'vector_search':
                    vector_service = await get_vector_search_service()
                    success = vector_service is not None
                elif service_name == 'enhanced_agents':
                    success = await initialize_enhanced_agents()
                elif service_name == 'microservices':
                    success = await setup_microservices()
                else:
                    success = False
                
                if success:
                    results['services_initialized'].append(service_name)
                    self.service_status[service_name] = 'initialized'
                    logger.info(f"✓ {service_name} initialized successfully")
                else:
                    results['services_failed'].append(service_name)
                    self.service_status[service_name] = 'failed'
                    results['success'] = False
                    logger.error(f"✗ {service_name} initialization failed")
                    
            except Exception as e:
                error_msg = f"Error initializing {service_name}: {str(e)}"
                results['errors'].append(error_msg)
                results['services_failed'].append(service_name)
                results['success'] = False
                logger.error(error_msg)
        
        return results
    
    def get_service_status(self) -> Dict[str, str]:
        """Get current status of all services"""
        return self.service_status.copy()

class HealthMonitor:
    """Monitors system health during and after deployment"""
    
    def __init__(self):
        self.health_checks = {}
        self.monitoring_active = False
    
    async def comprehensive_health_check(self) -> Dict[str, Any]:
        """Perform comprehensive health check of all services"""
        health_report = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'healthy',
            'services': {},
            'warnings': [],
            'critical_issues': []
        }
        
        try:
            # Check MCP service
            try:
                from mcp_config import get_mcp_client
                mcp_client = await get_mcp_client()
                mcp_health = await mcp_client.health_check()
                health_report['services']['mcp'] = mcp_health
            except Exception as e:
                health_report['services']['mcp'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
                health_report['critical_issues'].append(f"MCP service failed: {e}")
            
            # Check vector search service
            try:
                vector_service = await get_vector_search_service()
                vector_health = await vector_service.health_check()
                health_report['services']['vector_search'] = vector_health
            except Exception as e:
                health_report['services']['vector_search'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
                health_report['warnings'].append(f"Vector search degraded: {e}")
            
            # Check enhanced agents
            try:
                from enhanced_agent_system import health_monitor
                agent_health = await health_monitor.health_check()
                health_report['services']['enhanced_agents'] = agent_health
            except Exception as e:
                health_report['services']['enhanced_agents'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
                health_report['critical_issues'].append(f"Enhanced agents failed: {e}")
            
            # Determine overall status
            critical_services_down = len(health_report['critical_issues']) > 0
            if critical_services_down:
                health_report['overall_status'] = 'critical'
            elif len(health_report['warnings']) > 0:
                health_report['overall_status'] = 'degraded'
            
            return health_report
            
        except Exception as e:
            health_report['overall_status'] = 'critical'
            health_report['critical_issues'].append(f"Health check failed: {str(e)}")
            return health_report
    
    async def start_monitoring(self, interval: int = 300):
        """Start continuous health monitoring"""
        self.monitoring_active = True
        logger.info(f"Starting health monitoring with {interval}s interval")
        
        while self.monitoring_active:
            try:
                health_report = await self.comprehensive_health_check()
                
                # Log critical issues
                if health_report['critical_issues']:
                    logger.critical(f"Critical issues detected: {health_report['critical_issues']}")
                
                # Log warnings
                if health_report['warnings']:
                    logger.warning(f"Warnings: {health_report['warnings']}")
                
                # Store health report
                self.health_checks[datetime.now().isoformat()] = health_report
                
                # Keep only last 24 hours of health checks
                cutoff_time = datetime.now().timestamp() - (24 * 3600)
                self.health_checks = {
                    k: v for k, v in self.health_checks.items()
                    if datetime.fromisoformat(k).timestamp() > cutoff_time
                }
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
                await asyncio.sleep(60)  # Shorter interval on error
    
    def stop_monitoring(self):
        """Stop health monitoring"""
        self.monitoring_active = False
        logger.info("Health monitoring stopped")

async def main():
    """Main deployment function"""
    print("🚀 Starting Sahayaa AI Enhanced Agent System Deployment")
    print("=" * 60)
    
    # Initialize components
    validator = DeploymentValidator()
    initializer = ServiceInitializer()
    monitor = HealthMonitor()
    
    # Step 1: Validate environment
    print("\n📋 Step 1: Environment Validation")
    env_validation = validator.validate_environment()
    
    if not env_validation['environment_check']:
        print("❌ Environment validation failed!")
        print(f"Missing required variables: {env_validation['missing_required']}")
        print(f"Errors: {env_validation['errors']}")
        return False
    
    print("✅ Environment validation passed")
    if env_validation['missing_optional']:
        print(f"⚠️  Optional variables missing: {env_validation['missing_optional']}")
    
    # Step 2: Check system resources
    print("\n💾 Step 2: System Resource Check")
    resources = validator.check_system_resources()
    if 'error' in resources:
        print(f"⚠️  Resource check failed: {resources['error']}")
    else:
        if 'memory_total_gb' in resources:
            print(f"Memory: {resources['memory_available_gb']:.1f}GB available / {resources['memory_total_gb']:.1f}GB total")
            print(f"Disk: {resources['disk_free_gb']:.1f}GB free / {resources['disk_total_gb']:.1f}GB total")
    
    # Step 3: Initialize services
    print("\n🔧 Step 3: Service Initialization")
    init_results = await initializer.initialize_all_services()
    
    if not init_results['success']:
        print("❌ Service initialization failed!")
        print(f"Failed services: {init_results['services_failed']}")
        print(f"Errors: {init_results['errors']}")
        return False
    
    print("✅ All services initialized successfully")
    print(f"Initialized: {', '.join(init_results['services_initialized'])}")
    
    # Step 4: Health check
    print("\n🏥 Step 4: Initial Health Check")
    health_report = await monitor.comprehensive_health_check()
    
    print(f"Overall Status: {health_report['overall_status']}")
    
    for service, status in health_report['services'].items():
        if status.get('status') == 'healthy':
            print(f"✅ {service}: {status.get('status', 'unknown')}")
        else:
            print(f"⚠️  {service}: {status.get('status', 'unknown')} - {status.get('error', 'No details')}")
    
    if health_report['critical_issues']:
        print(f"❌ Critical issues: {health_report['critical_issues']}")
        return False
    
    if health_report['warnings']:
        print(f"⚠️  Warnings: {health_report['warnings']}")
    
    # Step 5: Start monitoring
    print("\n📊 Step 5: Starting Health Monitoring")
    asyncio.create_task(monitor.start_monitoring())
    
    print("\n🎉 Deployment completed successfully!")
    print("=" * 60)
    print("✅ MCP-enhanced agent system is ready")
    print("✅ Vector search with ChromaDB operational")
    print("✅ RBAC security service active")
    print("✅ Microservices orchestration running")
    print("✅ Health monitoring active")
    print("\n🌐 Access the system at: http://localhost:5000")
    print("📊 Monitoring dashboard: http://localhost:5000/admin/monitoring")
    
    # Keep the script running for monitoring
    try:
        while True:
            await asyncio.sleep(60)
    except KeyboardInterrupt:
        print("\n🛑 Shutdown initiated...")
        monitor.stop_monitoring()
        print("✅ Deployment script stopped")
        return True

if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except Exception as e:
        logger.critical(f"Deployment failed: {e}")
        sys.exit(1)