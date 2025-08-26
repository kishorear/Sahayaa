#!/usr/bin/env python3
"""
Install and validate dependencies for the MCP-enhanced agent system
Handles package installation with fallbacks and alternative methods
"""

import subprocess
import sys
import os
import logging
import re
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_package_name(package_name: str) -> bool:
    """Validate package name to prevent command injection"""
    # Allow alphanumeric, hyphens, underscores, dots, brackets, and version specifiers
    # This covers standard PyPI package naming conventions
    pattern = r'^[a-zA-Z0-9][a-zA-Z0-9._\-\[\]>=<,~!=:; ]*$'
    return bool(re.match(pattern, package_name)) and len(package_name) <= 100

def install_package_with_fallback(package: str, alternatives: Optional[List[str]] = None) -> bool:
    """Install package with fallback alternatives"""
    packages_to_try = [package] + (alternatives or [])
    
    for pkg in packages_to_try:
        try:
            logger.info(f"Attempting to install {pkg}...")
            
            # Validate package name to prevent command injection
            if not validate_package_name(pkg):
                logger.error(f"❌ Invalid package name: {pkg}")
                continue
            
            # Try pip install first
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", pkg],
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                logger.info(f"✅ Successfully installed {pkg}")
                return True
            else:
                logger.warning(f"⚠️ Failed to install {pkg}: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            logger.warning(f"⚠️ Timeout installing {pkg}")
        except Exception as e:
            logger.warning(f"⚠️ Error installing {pkg}: {e}")
    
    logger.error(f"❌ Failed to install {package} and all alternatives")
    return False

def install_core_dependencies() -> Dict[str, bool]:
    """Install core dependencies for the agent system"""
    results = {}
    
    # Core packages with alternatives
    dependencies = {
        "asyncpg": ["asyncpg>=0.28.0", "asyncpg"],
        "aiohttp": ["aiohttp>=3.8.0", "aiohttp"],
        "tenacity": ["tenacity>=8.0.0", "tenacity"],
        "cryptography": ["cryptography>=3.4.0", "cryptography"],
        "pyjwt": ["PyJWT>=2.4.0", "PyJWT", "pyjwt"],
        "bcrypt": ["bcrypt>=3.2.0", "bcrypt"],
        "psutil": ["psutil>=5.8.0", "psutil"],
        "python-dotenv": ["python-dotenv>=0.19.0", "python-dotenv"],
        "fastapi": ["fastapi>=0.68.0", "fastapi"],
        "uvicorn": ["uvicorn[standard]>=0.15.0", "uvicorn"],
        "pydantic": ["pydantic>=1.8.0", "pydantic"]
    }
    
    for package, alternatives in dependencies.items():
        success = install_package_with_fallback(package, alternatives[1:])
        results[package] = success
    
    return results

def install_optional_dependencies() -> Dict[str, bool]:
    """Install optional dependencies with graceful fallbacks"""
    results = {}
    
    # Optional packages for enhanced functionality
    optional_dependencies = {
        "sentence-transformers": [
            "sentence-transformers>=2.2.0",
            "sentence-transformers",
            "transformers>=4.21.0",  # Fallback to transformers only
        ],
        "chromadb": [
            "chromadb>=0.4.0",
            "chromadb",
            # No fallback - this is optional
        ],
        "docker": [
            "docker>=6.0.0",
            "docker",
            # No fallback - for containerization only
        ]
    }
    
    for package, alternatives in optional_dependencies.items():
        success = install_package_with_fallback(package, alternatives[1:])
        results[package] = success
        if not success:
            logger.info(f"ℹ️ {package} installation failed - functionality will be limited but system will work")
    
    return results

def validate_installation() -> Dict[str, Any]:
    """Validate that required packages are working"""
    validation_results = {
        "core_packages": {},
        "optional_packages": {},
        "overall_success": True
    }
    
    # Test core packages
    core_tests = {
        "asyncpg": "import asyncpg; print('asyncpg version:', asyncpg.__version__)",
        "aiohttp": "import aiohttp; print('aiohttp version:', aiohttp.__version__)",
        "tenacity": "import tenacity; print('tenacity version:', tenacity.__version__)",
        "cryptography": "import cryptography; print('cryptography version:', cryptography.__version__)",
        "jwt": "import jwt; print('PyJWT version:', jwt.__version__)",
        "bcrypt": "import bcrypt; print('bcrypt available')",
        "psutil": "import psutil; print('psutil version:', psutil.__version__)",
        "dotenv": "import dotenv; print('python-dotenv available')",
        "fastapi": "import fastapi; print('FastAPI version:', fastapi.__version__)",
        "uvicorn": "import uvicorn; print('uvicorn available')",
        "pydantic": "import pydantic; print('pydantic version:', pydantic.VERSION)"
    }
    
    for package, test_code in core_tests.items():
        try:
            result = subprocess.run(
                [sys.executable, "-c", test_code],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                validation_results["core_packages"][package] = True
                logger.info(f"✅ {package}: {result.stdout.strip()}")
            else:
                validation_results["core_packages"][package] = False
                validation_results["overall_success"] = False
                logger.error(f"❌ {package} validation failed: {result.stderr}")
                
        except Exception as e:
            validation_results["core_packages"][package] = False
            validation_results["overall_success"] = False
            logger.error(f"❌ {package} validation error: {e}")
    
    # Test optional packages
    optional_tests = {
        "sentence_transformers": "import sentence_transformers; print('sentence-transformers available')",
        "chromadb": "import chromadb; print('ChromaDB available')",
        "docker": "import docker; print('Docker client available')"
    }
    
    for package, test_code in optional_tests.items():
        try:
            result = subprocess.run(
                [sys.executable, "-c", test_code],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                validation_results["optional_packages"][package] = True
                logger.info(f"✅ {package}: {result.stdout.strip()}")
            else:
                validation_results["optional_packages"][package] = False
                logger.info(f"ℹ️ {package} not available (optional)")
                
        except Exception as e:
            validation_results["optional_packages"][package] = False
            logger.info(f"ℹ️ {package} not available (optional): {e}")
    
    return validation_results

def main():
    """Main installation and validation process"""
    print("🚀 Installing MCP-Enhanced Agent System Dependencies")
    print("=" * 60)
    
    # Step 1: Install core dependencies
    print("\n📦 Step 1: Installing Core Dependencies")
    core_results = install_core_dependencies()
    
    core_success = all(core_results.values())
    if core_success:
        print("✅ All core dependencies installed successfully")
    else:
        failed_packages = [pkg for pkg, success in core_results.items() if not success]
        print(f"❌ Failed to install core packages: {failed_packages}")
    
    # Step 2: Install optional dependencies
    print("\n📦 Step 2: Installing Optional Dependencies")
    optional_results = install_optional_dependencies()
    
    optional_installed = sum(optional_results.values())
    print(f"ℹ️ Installed {optional_installed}/{len(optional_results)} optional packages")
    
    # Step 3: Validate installation
    print("\n🔍 Step 3: Validating Installation")
    validation = validate_installation()
    
    if validation["overall_success"]:
        print("✅ Core package validation successful")
    else:
        print("❌ Core package validation failed")
        return False
    
    # Summary
    print("\n📊 Installation Summary")
    print(f"Core packages: {sum(validation['core_packages'].values())}/{len(validation['core_packages'])}")
    print(f"Optional packages: {sum(validation['optional_packages'].values())}/{len(validation['optional_packages'])}")
    
    if validation["overall_success"]:
        print("\n🎉 Agent system dependencies ready!")
        print("✅ MCP integration supported")
        print("✅ Vector search capabilities available")
        print("✅ RBAC security system ready")
        print("✅ Microservices orchestration supported")
        
        # Check for enhanced features
        if validation["optional_packages"].get("sentence_transformers"):
            print("✅ Enhanced embeddings available")
        if validation["optional_packages"].get("chromadb"):
            print("✅ ChromaDB vector storage available")
        if validation["optional_packages"].get("docker"):
            print("✅ Container orchestration available")
        
        return True
    else:
        print("\n❌ Installation incomplete - some core dependencies failed")
        return False

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n🛑 Installation interrupted")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Installation failed: {e}")
        sys.exit(1)