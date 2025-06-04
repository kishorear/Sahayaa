"""
Startup script for the MCP service.
"""

import os
import sys
import logging
from pathlib import Path

# Add the parent directory to the Python path for imports
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def check_environment():
    """Check if all required environment variables are set."""
    required_vars = ["DATABASE_URL"]
    optional_vars = {
        "OPENAI_API_KEY": "OpenAI embedding service",
        "QDRANT_URL": "Qdrant Cloud vector storage",
        "QDRANT_API_KEY": "Qdrant Cloud authentication"
    }
    
    # Check required variables
    missing_required = []
    for var in required_vars:
        if not os.getenv(var):
            missing_required.append(var)
    
    if missing_required:
        logger.error(f"Missing required environment variables: {missing_required}")
        return False
    
    # Check optional variables
    missing_optional = []
    for var, description in optional_vars.items():
        if not os.getenv(var):
            missing_optional.append(f"{var} ({description})")
    
    if missing_optional:
        logger.warning(f"Optional environment variables not set: {missing_optional}")
        logger.warning("Service will use fallback providers")
    
    return True

def main():
    """Run the MCP service."""
    logger.info("Starting MCP service...")
    
    # Check environment
    if not check_environment():
        logger.error("Environment check failed")
        sys.exit(1)
    
    # Import and run the FastAPI app
    try:
        import uvicorn
        from mcp_service.main import app
        
        # Run the service
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=int(os.getenv("MCP_PORT", "8000")),
            log_level="info"
        )
    except ImportError as e:
        logger.error(f"Import error: {e}")
        logger.error("Make sure all dependencies are installed")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error starting service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()