"""
Simple test for the MCP service using existing database.
"""

import os
import psycopg2
import psycopg2.extras
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_connection():
    """Test connection to existing database."""
    try:
        DATABASE_URL = os.getenv("DATABASE_URL")
        if not DATABASE_URL:
            logger.error("DATABASE_URL not found in environment")
            return False
        
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        cursor = conn.cursor()
        
        # Test basic connection
        cursor.execute("SELECT version()")
        version = cursor.fetchone()
        logger.info(f"Connected to PostgreSQL: {version['version'][:50]}...")
        
        # Check existing tables
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('tickets', 'messages', 'users', 'tenants')
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        logger.info(f"Found tables: {[t['table_name'] for t in tables]}")
        
        # Check ticket count
        cursor.execute("SELECT COUNT(*) as count FROM tickets")
        ticket_count = cursor.fetchone()
        logger.info(f"Total tickets: {ticket_count['count']}")
        
        # Check recent tickets
        cursor.execute("""
            SELECT id, title, status, category, created_at 
            FROM tickets 
            ORDER BY created_at DESC 
            LIMIT 3
        """)
        recent_tickets = cursor.fetchall()
        logger.info("Recent tickets:")
        for ticket in recent_tickets:
            logger.info(f"  ID: {ticket['id']}, Title: {ticket['title'][:50]}...")
        
        cursor.close()
        conn.close()
        
        logger.info("Database connection test PASSED")
        return True
        
    except Exception as e:
        logger.error(f"Database connection test FAILED: {e}")
        return False

def test_embedding_service():
    """Test embedding service initialization."""
    try:
        # Check if OpenAI API key is available
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            logger.info("OpenAI API key found - embedding service should work")
        else:
            logger.warning("No OpenAI API key - will use mock embeddings")
        
        # Test import
        try:
            import sys
            sys.path.append('/home/runner/workspace')
            from mcp_service.embedding_service import embedding_service
            
            # Test embedding generation
            test_text = "User cannot log into their account"
            embedding = embedding_service.embed_text(test_text)
            
            logger.info(f"Embedding generated: {len(embedding)} dimensions")
            logger.info(f"Provider: {embedding_service.get_provider_info()}")
            
            return True
        except Exception as e:
            logger.error(f"Embedding service error: {e}")
            return False
            
    except Exception as e:
        logger.error(f"Embedding test failed: {e}")
        return False

def test_vector_storage():
    """Test vector storage connectivity."""
    try:
        import sys
        sys.path.append('/home/runner/workspace')
        from mcp_service.vector_storage import vector_storage
        
        is_available = vector_storage.is_available()
        collection_info = vector_storage.get_collection_info()
        
        logger.info(f"Vector storage available: {is_available}")
        logger.info(f"Collection info: {collection_info}")
        
        return True
    except Exception as e:
        logger.error(f"Vector storage test failed: {e}")
        return False

def main():
    """Run all tests."""
    logger.info("Starting MCP Service Tests...")
    
    tests = [
        ("Database Connection", test_database_connection),
        ("Embedding Service", test_embedding_service),
        ("Vector Storage", test_vector_storage)
    ]
    
    results = []
    for test_name, test_func in tests:
        logger.info(f"\n--- Running {test_name} Test ---")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"{test_name} test failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    logger.info("\n" + "="*50)
    logger.info("TEST SUMMARY")
    logger.info("="*50)
    
    passed = 0
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"\nTotal: {len(results)}, Passed: {passed}, Failed: {len(results) - passed}")
    
    return passed == len(results)

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)