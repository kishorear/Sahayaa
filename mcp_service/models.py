"""
Database models for the MCP (Model Context Protocol) service.
Handles ticket storage, instruction templates, and vector embeddings.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

Base = declarative_base()

class Ticket(Base):
    """Ticket model for storing support tickets with their resolutions."""
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, default=1)
    team_id = Column(Integer, nullable=True)
    created_by = Column(Integer, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="new")
    category = Column(String, nullable=False)
    complexity = Column(String, default="medium")
    assigned_to = Column(String, nullable=True)
    source = Column(String, default="chat")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    ai_resolved = Column(Boolean, default=False)
    ai_notes = Column(Text, nullable=True)
    external_integrations = Column(JSON, nullable=True)
    client_metadata = Column(JSON, nullable=True)

class Message(Base):
    """Message model for storing ticket conversations and resolutions."""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, nullable=False)
    sender = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Instruction(Base):
    """Instruction model for storing named text templates."""
    __tablename__ = "instructions"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, nullable=False, default=1)
    name = Column(String, nullable=False, unique=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)  # List of tags for better organization
    active = Column(Boolean, default=True)
    priority = Column(Integer, default=10)  # Lower values = higher priority
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class TicketEmbedding(Base):
    """Storage for ticket embeddings for vector similarity search."""
    __tablename__ = "ticket_embeddings"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, nullable=False, unique=True)
    embedding_vector = Column(JSON, nullable=False)  # 384-dim vector stored as JSON
    embedding_model = Column(String, default="all-MiniLM-L6-v2")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# Pydantic models for API requests/responses

class InstructionCreate(BaseModel):
    name: str
    title: str
    content: str
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    active: bool = True
    priority: int = 10
    tenant_id: int = 1

class InstructionResponse(BaseModel):
    id: int
    tenant_id: int
    name: str
    title: str
    content: str
    category: Optional[str]
    tags: Optional[List[str]]
    active: bool
    priority: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TicketCreate(BaseModel):
    tenant_id: int = 1
    team_id: Optional[int] = None
    created_by: Optional[int] = None
    title: str
    description: str
    status: str = "new"
    category: str
    complexity: str = "medium"
    assigned_to: Optional[str] = None
    source: str = "chat"
    ai_resolved: bool = False
    ai_notes: Optional[str] = None
    external_integrations: Optional[Dict[str, Any]] = None
    client_metadata: Optional[Dict[str, Any]] = None

class TicketResponse(BaseModel):
    id: int
    tenant_id: int
    team_id: Optional[int]
    created_by: Optional[int]
    title: str
    description: str
    status: str
    category: str
    complexity: str
    assigned_to: Optional[str]
    source: str
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    ai_resolved: bool
    ai_notes: Optional[str]
    external_integrations: Optional[Dict[str, Any]]
    client_metadata: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True

class TicketWithResolution(TicketResponse):
    """Extended ticket response that includes resolution from messages."""
    resolution: Optional[str] = None
    messages: Optional[List[Dict[str, Any]]] = None

class MessageCreate(BaseModel):
    ticket_id: int
    sender: str
    content: str
    metadata: Optional[Dict[str, Any]] = None

class MessageResponse(BaseModel):
    id: int
    ticket_id: int
    sender: str
    content: str
    metadata: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SimilarTicketResult(BaseModel):
    """Result from vector similarity search."""
    ticket_id: int
    score: float
    title: str
    description: str
    resolution: Optional[str] = None
    category: str
    status: str

class SimilaritySearchRequest(BaseModel):
    query: str
    top_k: int = 5
    tenant_id: Optional[int] = None
    min_score: float = 0.5