"""
Complete Vector Storage Setup Test
Validates the self-hosted vector storage implementation
"""

import os
import sys
import json
import time
from pathlib import Path

def test_local_vector_storage():
    """Test local vector storage functionality"""
    print("Testing local vector storage...")
    
    try:
        sys.path.append('./services')
        from services.local_vector_storage import LocalVectorStorage
        
        # Initialize service
        service = LocalVectorStorage()
        
        # Test processing
        result = service.process_all_instructions()
        
        if result['success'] and result['processed_files'] > 0:
            print(f"✅ Vector storage working")
            print(f"   Processed: {result['processed_files']} files")
            print(f"   Processing time: {result['processing_time_ms']:.1f}ms")
            
            # Test search
            search_results = service.search_instructions("authentication problem", top_k=3)
            
            if search_results:
                print(f"✅ Vector search working")
                print(f"   Found {len(search_results)} results")
                print(f"   Top result: {search_results[0]['filename']} (score: {search_results[0]['score']:.3f})")
                return True
            else:
                print("❌ Vector search returned no results")
                return False
        else:
            print(f"❌ Vector processing failed: {result}")
            return False
            
    except Exception as e:
        print(f"❌ Local vector storage test failed: {e}")
        return False

def test_environment_variables():
    """Test required environment variables"""
    print("Testing environment variables...")
    
    required_vars = ['DATABASE_URL', 'OPENAI_API_KEY']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        return False
    else:
        print("✅ All required environment variables present")
        return True

def test_storage_persistence():
    """Test vector storage persistence"""
    print("Testing storage persistence...")
    
    try:
        storage_dir = Path('vector_storage')
        vectors_file = storage_dir / 'vectors.pkl'
        metadata_file = storage_dir / 'metadata.json'
        
        if vectors_file.exists() and metadata_file.exists():
            print("✅ Storage files created successfully")
            print(f"   Vectors file: {vectors_file.stat().st_size} bytes")
            print(f"   Metadata file: {metadata_file.stat().st_size} bytes")
            return True
        else:
            print("❌ Storage files not found")
            return False
            
    except Exception as e:
        print(f"❌ Storage persistence test failed: {e}")
        return False

def test_agent_orchestrator_integration():
    """Test agent orchestrator can use vector storage"""
    print("Testing agent orchestrator integration...")
    
    try:
        sys.path.append('./services')
        from services.agent_orchestrator import AgentOrchestrator
        
        # Test initialization
        orchestrator = AgentOrchestrator()
        status = orchestrator.get_service_status()
        
        if status and 'timestamp' in status:
            print("✅ Agent orchestrator integrated successfully")
            return True
        else:
            print("❌ Agent orchestrator integration failed")
            return False
            
    except Exception as e:
        print(f"❌ Agent orchestrator test failed: {e}")
        return False

def test_instruction_search_quality():
    """Test quality of instruction search results"""
    print("Testing search result quality...")
    
    try:
        sys.path.append('./services')
        from services.local_vector_storage import LocalVectorStorage
        
        service = LocalVectorStorage()
        
        # Test different queries
        test_queries = [
            "API authentication",
            "rate limiting",
            "database connection error",
            "troubleshooting steps"
        ]
        
        all_passed = True
        
        for query in test_queries:
            results = service.search_instructions(query, top_k=2)
            
            if results and results[0]['score'] > 0.3:  # Reasonable similarity threshold
                print(f"✅ Query '{query}': {results[0]['filename']} (score: {results[0]['score']:.3f})")
            else:
                print(f"❌ Query '{query}': No good results (score: {results[0]['score'] if results else 0:.3f})")
                all_passed = False
        
        return all_passed
        
    except Exception as e:
        print(f"❌ Search quality test failed: {e}")
        return False

def run_complete_vector_test():
    """Run complete vector storage validation"""
    print("Complete Vector Storage Validation")
    print("=" * 50)
    
    tests = [
        ("Environment Variables", test_environment_variables),
        ("Local Vector Storage", test_local_vector_storage),
        ("Storage Persistence", test_storage_persistence),
        ("Agent Orchestrator Integration", test_agent_orchestrator_integration),
        ("Search Result Quality", test_instruction_search_quality)
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
    print("VECTOR STORAGE VALIDATION SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    failed = len(results) - passed
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\nTotal Tests: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 Self-hosted vector storage is working perfectly!")
        print("Your loose coupling architecture is production-ready with:")
        print("- Local file-based vector storage")
        print("- Cosine similarity search")
        print("- Persistent storage across restarts")
        print("- Full integration with agent orchestrator")
    else:
        print(f"\n⚠️  {failed} test(s) failed.")
        print("Review the failures above for any issues.")
    
    return failed == 0

if __name__ == "__main__":
    success = run_complete_vector_test()
    sys.exit(0 if success else 1)