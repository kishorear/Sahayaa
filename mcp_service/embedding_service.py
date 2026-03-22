"""
Embedding service for generating 384-dimensional vectors from text.
Supports multiple embedding providers with fallback options.
"""

import os
import json
import numpy as np
from typing import List, Optional
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class EmbeddingProvider(ABC):
    """Abstract base class for embedding providers."""
    
    @abstractmethod
    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        pass
    
    @abstractmethod
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        pass

class OpenAIEmbeddingProvider(EmbeddingProvider):
    """OpenAI embedding provider using text-embedding-3-small (384 dims)."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        try:
            import openai
            self.client = openai.OpenAI(api_key=self.api_key)
            self.model = "text-embedding-3-small"
            self.dimensions = 384
        except ImportError:
            raise ImportError("openai package is required for OpenAI embedding provider")
    
    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=text,
                dimensions=self.dimensions
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"OpenAI embedding error: {e}")
            raise
    
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        try:
            response = self.client.embeddings.create(
                model=self.model,
                input=texts,
                dimensions=self.dimensions
            )
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.error(f"OpenAI batch embedding error: {e}")
            raise

class LocalEmbeddingProvider(EmbeddingProvider):
    """Local embedding provider using sentence-transformers."""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(model_name)
            logger.info(f"Loaded local embedding model: {model_name}")
        except ImportError:
            raise ImportError("sentence-transformers package is required for local embedding provider")
        except Exception as e:
            logger.error(f"Failed to load local embedding model: {e}")
            raise
    
    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        try:
            embedding = self.model.encode(text)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Local embedding error: {e}")
            raise
    
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        try:
            embeddings = self.model.encode(texts)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Local batch embedding error: {e}")
            raise

class MockEmbeddingProvider(EmbeddingProvider):
    """Mock embedding provider for testing purposes."""
    
    def __init__(self, dimensions: int = 384):
        self.dimensions = dimensions
        logger.warning("Using mock embedding provider - not suitable for production")
    
    def embed_text(self, text: str) -> List[float]:
        """Generate a mock embedding based on text hash."""
        # Create a deterministic embedding based on text content
        hash_val = hash(text)
        np.random.seed(abs(hash_val) % (2**32))
        embedding = np.random.normal(0, 1, self.dimensions)
        # Normalize to unit vector
        embedding = embedding / np.linalg.norm(embedding)
        return embedding.tolist()
    
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate mock embeddings for multiple texts."""
        return [self.embed_text(text) for text in texts]

class EmbeddingService:
    """Main embedding service that manages providers and fallbacks."""
    
    def __init__(self):
        self.provider: Optional[EmbeddingProvider] = None
        self.provider_name = "none"
        self._initialize_provider()
    
    def _initialize_provider(self):
        """Initialize the best available embedding provider."""
        # Try OpenAI first if API key is available
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            try:
                self.provider = OpenAIEmbeddingProvider(openai_key)
                self.provider_name = "openai"
                logger.info("Initialized OpenAI embedding provider")
                return
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI provider: {e}")
        
        # Try local sentence-transformers
        try:
            self.provider = LocalEmbeddingProvider()
            self.provider_name = "local"
            logger.info("Initialized local embedding provider")
            return
        except Exception as e:
            logger.warning(f"Failed to initialize local provider: {e}")
        
        # Fallback to mock provider
        self.provider = MockEmbeddingProvider()
        self.provider_name = "mock"
        logger.warning("Using mock embedding provider - consider setting up OpenAI API key or installing sentence-transformers")
    
    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for text."""
        if not self.provider:
            raise RuntimeError("No embedding provider available")
        
        # Preprocess text
        text = self._preprocess_text(text)
        return self.provider.embed_text(text)
    
    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        if not self.provider:
            raise RuntimeError("No embedding provider available")
        
        # Preprocess texts
        texts = [self._preprocess_text(text) for text in texts]
        return self.provider.embed_batch(texts)
    
    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for embedding."""
        if not text or not text.strip():
            return "empty"
        
        # Basic cleaning
        text = text.strip()
        # Limit length to avoid token limits
        if len(text) > 8000:
            text = text[:8000] + "..."
        
        return text
    
    def get_provider_info(self) -> dict:
        """Get information about the current provider."""
        return {
            "provider": self.provider_name,
            "available": self.provider is not None,
            "dimensions": 384
        }

# Global embedding service instance
embedding_service = EmbeddingService()