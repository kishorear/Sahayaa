       """
Instruction Lookup Agent using ChromaDB
Replaces Qdrant-based instruction lookup with ChromaDB and Gemini embeddings
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import traceback

try:
    from services.chroma_vector_service import get_chroma_service
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

logger = logging.getLogger(__name__)

class ChromaInstructionLookupAgent:
    """Agent for looking up relevant instructions using ChromaDB vector similarity."""
    
    def __init__(self):
        self.agent_name = "ChromaInstructionLookupAgent"
        self.workflow_trace = []
        
        if not CHROMA_AVAILABLE:
            logger.warning("ChromaDB not available, using fallback mode")
            self.chroma_service = None
        else:
            try:
                self.chroma_service = get_chroma_service()
                # Load instructions if collection is empty
                self._initialize_instructions()
            except Exception as e:
                logger.error(f"Failed to initialize ChromaDB service: {e}")
                self.chroma_service = None
    
    def _initialize_instructions(self):
        """Initialize instructions in ChromaDB if not already loaded."""
        try:
            stats = self.chroma_service.get_collection_stats()
            instruction_count = stats.get("instruction_texts", {}).get("count", 0)
            
            if instruction_count == 0:
                # Load instructions from directories
                count = 0
                for directory in ["instructions", "attached_assets", "uploads"]:
                    loaded = self.chroma_service.load_instructions_from_directory(directory)
                    count += loaded
                
                # Create sample instructions if none found
                if count == 0:
                    self._create_sample_instructions()
                    
                logger.info(f"Initialized {count} instructions in ChromaDB")
        except Exception as e:
            logger.error(f"Failed to initialize instructions: {e}")
    
    def _create_sample_instructions(self):
        """Create sample instructions for testing."""
        sample_instructions = [
            {
                "filename": "password_reset.txt",
                "text": """Password Reset Instructions
                
To reset your password:
1. Go to the login page
2. Click 'Forgot Password'
3. Enter your email address
4. Check your email for reset link
5. Follow the link and create new password
6. Log in with new password

If you continue having issues, contact support."""
            },
            {
                "filename": "account_access.txt", 
                "text": """Account Access Troubleshooting

Common login issues and solutions:
- Incorrect password: Use password reset
- Account locked: Wait 15 minutes or contact support
- Email not verified: Check spam folder for verification email
- Browser issues: Clear cache and cookies
- Two-factor authentication: Ensure correct code from authenticator app"""
            },
            {
                "filename": "billing_support.txt",
                "text": """Billing and Payment Support

For billing inquiries:
- View invoices in account settings
- Update payment methods in billing section
- Download receipts from payment history
- Contact billing team for refunds or disputes
- Subscription changes take effect next billing cycle"""
            }
        ]
        
        for instruction in sample_instructions:
            self.chroma_service.upsert_instruction(
                filename=instruction["filename"],
                text=instruction["text"],
                metadata={"source": "sample_data", "created_by": "system"}
            )
    
    def _add_trace_step(self, step: str, input_data: str, resource: str, output_data: str, duration_ms: float, success: bool):
        """Add a step to the workflow trace."""
        self.workflow_trace.append({
            "step": step,
            "agent": self.agent_name,
            "input": input_data,
            "resource": resource,
            "output": output_data,
            "duration_ms": round(duration_ms, 2),
            "success": success,
            "timestamp": datetime.now().isoformat()
        })
    
    async def run(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Main execution method for instruction lookup.
        
        Args:
            query: Search query for instructions
            context: Optional context (tenant_id, user_type, etc.)
            
        Returns:
            Dict containing found instructions and metadata
        """
        start_time = datetime.now()
        self.workflow_trace = []  # Reset trace
        
        try:
            # Step 1: Process query
            processed_query = query.strip()
            tenant_id = context.get("tenant_id", 1) if context else 1
            top_k = context.get("top_k", 3) if context else 3
            
            self._add_trace_step(
                step="1a",
                input_data=f"Query: {query[:50]}...",
                resource="Query Processing",
                output_data=f"Processed query: {processed_query[:50]}...",
                duration_ms=5.0,
                success=True
            )
            
            # Step 2: Vector search
            if self.chroma_service:
                search_start = datetime.now()
                results = self.chroma_service.search_instructions(processed_query, top_k)
                search_duration = (datetime.now() - search_start).total_seconds() * 1000
                
                self._add_trace_step(
                    step="1b",
                    input_data=f"Vector search for: {processed_query[:30]}...",
                    resource="ChromaDB + Gemini Embeddings",
                    output_data=f"Found {len(results)} relevant instructions",
                    duration_ms=search_duration,
                    success=True
                )
                
                # Step 3: Format results
                instructions = []
                for result in results:
                    instruction = {
                        "id": result["id"],
                        "title": result["metadata"].get("filename", "Unknown"),
                        "content": result["document"][:500] + "..." if len(result["document"]) > 500 else result["document"],
                        "similarity_score": result["similarity"],
                        "metadata": result["metadata"]
                    }
                    instructions.append(instruction)
                
                confidence_score = max([r["similarity"] for r in results]) if results else 0.0
                
            else:
                # Fallback mode
                self._add_trace_step(
                    step="1b",
                    input_data=f"Fallback search for: {processed_query[:30]}...",
                    resource="Local Fallback",
                    output_data="Using fallback instructions",
                    duration_ms=10.0,
                    success=True
                )
                
                instructions = [{
                    "id": "fallback_1",
                    "title": "General Support",
                    "content": "Please contact our support team for assistance with your inquiry.",
                    "similarity_score": 0.5,
                    "metadata": {"source": "fallback"}
                }]
                confidence_score = 0.5
            
            total_duration = (datetime.now() - start_time).total_seconds() * 1000
            
            self._add_trace_step(
                step="1c",
                input_data=f"Format {len(instructions)} results",
                resource="Result Formatting",
                output_data=f"Formatted instructions with confidence: {confidence_score:.3f}",
                duration_ms=5.0,
                success=True
            )
            
            result = {
                "success": True,
                "instructions": instructions,
                "confidence_score": confidence_score,
                "query": query,
                "total_results": len(instructions),
                "processing_time_ms": round(total_duration, 2),
                "storage_type": "chromadb" if self.chroma_service else "fallback",
                "workflow_trace": self.workflow_trace
            }
            
            logger.info(f"InstructionLookup completed: {len(instructions)} results, confidence: {confidence_score:.3f}")
            return result
            
        except Exception as e:
            error_duration = (datetime.now() - start_time).total_seconds() * 1000
            
            self._add_trace_step(
                step="1_error",
                input_data=query[:50] + "...",
                resource="Error Handling",
                output_data=f"Error: {str(e)[:100]}...",
                duration_ms=error_duration,
                success=False
            )
            
            logger.error(f"InstructionLookup failed: {e}")
            logger.debug(traceback.format_exc())
            
            return {
                "success": False,
                "error": str(e),
                "instructions": [],
                "confidence_score": 0.0,
                "query": query,
                "processing_time_ms": round(error_duration, 2),
                "workflow_trace": self.workflow_trace
            }
    
    def get_workflow_trace(self) -> List[Dict[str, Any]]:
        """Get the current workflow trace."""
        return self.workflow_trace
    
    def get_stats(self) -> Dict[str, Any]:
        """Get agent statistics."""
        if self.chroma_service:
            return self.chroma_service.get_collection_stats()
        else:
            return {"status": "fallback_mode", "chroma_available": False}