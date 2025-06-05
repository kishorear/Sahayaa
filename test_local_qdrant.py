"""
Local Qdrant Test and Validation Script
Tests local Docker Qdrant instance and ingestion workflow
"""

import os
import sys
import requests
import json
import time
from pathlib import Path
from typing import Dict, Any, List

def test_qdrant_health():
    """Test if local Qdrant instance is running"""
    print("Testing local Qdrant health...")
    
    try:
        qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
        response = requests.get(f"{qdrant_url}/health", timeout=10)
        
        if response.status_code == 200:
            print(f"✅ Local Qdrant is healthy at {qdrant_url}")
            return True
        else:
            print(f"❌ Qdrant health check failed: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Qdrant. Is Docker container running?")
        print("   Run: ./setup-local-qdrant.sh")
        return False
    except Exception as e:
        print(f"❌ Qdrant health check error: {e}")
        return False

def test_qdrant_collections():
    """Test Qdrant collections endpoint"""
    print("Testing Qdrant collections...")
    
    try:
        qdrant_url = os.getenv('QDRANT_URL', 'http://localhost:6333')
        response = requests.get(f"{qdrant_url}/collections", timeout=10)
        
        if response.status_code == 200:
            collections = response.json()
            print(f"✅ Collections endpoint accessible")
            print(f"   Found {len(collections.get('result', {}).get('collections', []))} collections")
            return True
        else:
            print(f"❌ Collections endpoint failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Collections test error: {e}")
        return False

def test_qdrant_ingestion_service():
    """Test the Qdrant ingestion service"""
    print("Testing Qdrant ingestion service...")
    
    try:
        # Import the service
        sys.path.append('./services')
        from services.qdrant_ingestion_service import QdrantIngestionService
        
        # Initialize service
        service = QdrantIngestionService()
        
        # Test collection info
        info = service.get_collection_info()
        
        if 'error' not in info:
            print("✅ Qdrant ingestion service working")
            print(f"   Collection: {info.get('collection_name')}")
            print(f"   Vector count: {info.get('vectors_count', 0)}")
            return True
        else:
            print(f"❌ Qdrant service error: {info.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Qdrant service test failed: {e}")
        return False

def test_instruction_ingestion():
    """Test instruction file ingestion"""
    print("Testing instruction file ingestion...")
    
    try:
        # Check if instruction files exist
        instructions_dir = Path('instructions')
        if not instructions_dir.exists():
            print("Creating sample instruction files...")
            instructions_dir.mkdir(exist_ok=True)
            
            # Create sample instruction file
            sample_file = instructions_dir / "api_test.txt"
            sample_file.write_text("""
# API Testing Guide

## Authentication
Use Bearer tokens for API authentication.

## Rate Limits
- 100 requests per minute for free tier
- 1000 requests per minute for premium tier

## Error Handling
Always check response status codes:
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 429: Rate Limited
            """)
        
        # Import and test service
        sys.path.append('./services')
        from services.qdrant_ingestion_service import QdrantIngestionService
        
        service = QdrantIngestionService()
        
        # Process all instruction files
        result = service.process_all_instructions()
        
        if result['success']:
            print(f"✅ Ingestion successful")
            print(f"   Processed: {result['processed_files']}")
            print(f"   Failed: {result['failed_files']}")
            return True
        else:
            print(f"❌ Ingestion failed: {result.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Instruction ingestion test failed: {e}")
        return False

def test_similarity_search():
    """Test similarity search functionality"""
    print("Testing similarity search...")
    
    try:
        sys.path.append('./services')
        from services.qdrant_ingestion_service import QdrantIngestionService
        
        service = QdrantIngestionService()
        
        # Test search query
        query = "How do I authenticate with the API?"
        results = service.search_instructions(query, top_k=3)
        
        if results:
            print(f"✅ Similarity search working")
            print(f"   Query: {query}")
            print(f"   Results: {len(results)}")
            for i, result in enumerate(results[:2]):
                print(f"   [{i+1}] Score: {result['score']:.3f} | File: {result['filename']}")
            return True
        else:
            print("❌ No search results returned")
            return False
            
    except Exception as e:
        print(f"❌ Similarity search test failed: {e}")
        return False

def test_collection_monitoring():
    """Test collection size monitoring"""
    print("Testing collection monitoring...")
    
    try:
        sys.path.append('./services')
        from services.qdrant_ingestion_service import QdrantIngestionService
        
        service = QdrantIngestionService()
        info = service.get_collection_info()
        
        if 'error' not in info:
            print("✅ Collection monitoring working")
            print(f"   Vectors: {info.get('vectors_count', 0):,}")
            print(f"   Needs sharding: {info.get('needs_sharding', False)}")
            print(f"   Status: {info.get('status', 'unknown')}")
            return True
        else:
            print(f"❌ Collection monitoring failed: {info.get('error')}")
            return False
            
    except Exception as e:
        print(f"❌ Collection monitoring test failed: {e}")
        return False

def run_local_qdrant_validation():
    """Run complete local Qdrant validation suite"""
    print("Local Qdrant Validation Suite")
    print("=" * 50)
    
    tests = [
        ("Qdrant Health Check", test_qdrant_health),
        ("Qdrant Collections", test_qdrant_collections),
        ("Qdrant Ingestion Service", test_qdrant_ingestion_service),
        ("Instruction Ingestion", test_instruction_ingestion),
        ("Similarity Search", test_similarity_search),
        ("Collection Monitoring", test_collection_monitoring)
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
    print("LOCAL QDRANT VALIDATION SUMMARY")
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
        print("\n🎉 Local Qdrant setup is working perfectly!")
        print("Your loose coupling architecture is ready for production.")
    else:
        print(f"\n⚠️  {failed} test(s) failed.")
        
        if failed == len(results):
            print("\nQuick setup steps:")
            print("1. Run: ./setup-local-qdrant.sh")
            print("2. Set QDRANT_URL=http://localhost:6333 in .env")
            print("3. Run this test again")
    
    return failed == 0

if __name__ == "__main__":
    success = run_local_qdrant_validation()
    sys.exit(0 if success else 1)