"""
Simple Validation Test Suite
Tests core functionality without external dependencies like pytest
"""

import os
import sys
import time
import json
from datetime import datetime
from typing import Dict, Any, List

def test_environment_variables():
    """Test that environment variables are properly configured."""
    print("Testing environment variable configuration...")
    
    required_vars = [
        'DATABASE_URL',
        'OPENAI_API_KEY',
        'QDRANT_URL',
        'DATA_SERVICE_URL',
        'AGENT_SERVICE_URL'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        print("Please set these variables in your .env file")
        return False
    else:
        print("✅ All required environment variables are set")
        return True

def test_logging_configuration():
    """Test structured logging setup."""
    print("Testing logging configuration...")
    
    try:
        import logging
        import json
        from datetime import datetime
        
        # Test JSON formatter
        class TestJSONFormatter(logging.Formatter):
            def format(self, record):
                log_entry = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'level': record.levelname,
                    'logger': record.name,
                    'message': record.getMessage(),
                    'service': 'test_service'
                }
                return json.dumps(log_entry)
        
        # Create test logger
        logger = logging.getLogger('test_logger')
        handler = logging.StreamHandler()
        handler.setFormatter(TestJSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        
        # Test log output
        logger.info("Test log message")
        
        print("✅ Logging configuration is working")
        return True
        
    except Exception as e:
        print(f"❌ Logging configuration failed: {e}")
        return False

def test_service_imports():
    """Test that all service modules can be imported."""
    print("Testing service imports...")
    
    try:
        # Test agent orchestrator import
        sys.path.append('./services')
        from services.agent_orchestrator import AgentOrchestrator
        print("✅ Agent orchestrator imported successfully")
        
        # Test Qdrant service import
        from services.qdrant_ingestion_service import QdrantIngestionService
        print("✅ Qdrant ingestion service imported successfully")
        
        # Test FastAPI service import
        from services.fastapi_data_service import FastAPIDataService
        print("✅ FastAPI data service imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"❌ Service import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Service import error: {e}")
        return False

def test_agent_service_initialization():
    """Test agent service can be initialized."""
    print("Testing agent service initialization...")
    
    try:
        # Import and initialize
        from services.agent_orchestrator import AgentOrchestrator
        
        orchestrator = AgentOrchestrator()
        
        # Test basic functionality without external calls
        status = orchestrator.get_service_status()
        
        if status and 'timestamp' in status:
            print("✅ Agent orchestrator initialized successfully")
            return True
        else:
            print("❌ Agent orchestrator status check failed")
            return False
            
    except Exception as e:
        print(f"❌ Agent service initialization failed: {e}")
        return False

def test_qdrant_service_initialization():
    """Test Qdrant service initialization."""
    print("Testing Qdrant service initialization...")
    
    try:
        from services.qdrant_ingestion_service import QdrantIngestionService
        
        # Initialize service
        service = QdrantIngestionService()
        
        # Test basic properties
        if hasattr(service, 'collection_name') and hasattr(service, 'dimensions'):
            print("✅ Qdrant service initialized successfully")
            print(f"   Collection: {service.collection_name}")
            print(f"   Dimensions: {service.dimensions}")
            return True
        else:
            print("❌ Qdrant service missing required properties")
            return False
            
    except Exception as e:
        print(f"❌ Qdrant service initialization failed: {e}")
        return False

def test_node_agent_service():
    """Test Node.js agent service integration."""
    print("Testing Node.js agent service integration...")
    
    try:
        # Test import
        sys.path.append('./server/ai')
        from server.ai.agent_service import AgentService
        
        service = AgentService()
        
        if hasattr(service, 'process_workflow'):
            print("✅ Node.js agent service integration working")
            return True
        else:
            print("❌ Node.js agent service missing required methods")
            return False
            
    except ImportError as e:
        print(f"❌ Node.js agent service import failed: {e}")
        print("   This is expected if the file doesn't exist yet")
        return False
    except Exception as e:
        print(f"❌ Node.js agent service error: {e}")
        return False

def test_environment_configuration_values():
    """Test environment configuration values are valid."""
    print("Testing environment configuration values...")
    
    try:
        # Test numeric values
        max_vectors = int(os.getenv('MAX_VECTOR_COUNT_BEFORE_SHARD', '1000000'))
        qdrant_timeout = int(os.getenv('QDRANT_TIMEOUT_MS', '30000'))
        vector_dim = int(os.getenv('VECTOR_DIMENSION', '384'))
        
        if max_vectors > 0 and qdrant_timeout > 0 and vector_dim > 0:
            print("✅ Environment configuration values are valid")
            print(f"   Max vectors before shard: {max_vectors:,}")
            print(f"   Qdrant timeout: {qdrant_timeout}ms")
            print(f"   Vector dimensions: {vector_dim}")
            return True
        else:
            print("❌ Invalid environment configuration values")
            return False
            
    except ValueError as e:
        print(f"❌ Environment configuration value error: {e}")
        return False

def run_validation_suite():
    """Run the complete validation suite."""
    print("Production-Ready Validation Suite")
    print("=" * 50)
    
    tests = [
        ("Environment Variables", test_environment_variables),
        ("Logging Configuration", test_logging_configuration),
        ("Service Imports", test_service_imports),
        ("Agent Service Initialization", test_agent_service_initialization),
        ("Qdrant Service Initialization", test_qdrant_service_initialization),
        ("Node.js Agent Service", test_node_agent_service),
        ("Environment Configuration Values", test_environment_configuration_values)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        print("-" * len(test_name))
        
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("VALIDATION SUMMARY")
    print("=" * 50)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal Tests: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All validation tests passed!")
        print("Your loose coupling architecture is ready for production.")
    else:
        print(f"\n⚠️  {failed} test(s) failed.")
        print("Please resolve the issues above before deploying.")
    
    return failed == 0

if __name__ == "__main__":
    success = run_validation_suite()
    sys.exit(0 if success else 1)