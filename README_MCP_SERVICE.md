# MCP (Model Context Protocol) Service

A FastAPI-based service for multi-agent customer support ticket management and similarity search with vector embeddings.

## Overview

This service provides:

1. **FastAPI MCP Service** - Complete ticket CRUD operations compatible with your existing PostgreSQL schema
2. **Instruction Document Processor** - Converts .txt, .pdf, .docx, .pptx, .xlsx files to embeddings for similarity search
3. **Vector Storage** - Local file-based storage with OpenAI embeddings for semantic search
4. **Schema Compatibility** - Works directly with your existing camelCase database columns

## Components

### 1. FastAPI MCP Service (`mcp_service/schema_compatible_main.py`)

**Features:**
- Ticket CRUD operations using existing schema (`createdAt`, `tenantId`, etc.)
- Message management with metadata support
- Instruction template storage and retrieval
- Text-based similarity search for tickets
- Semantic search for instruction documents
- System statistics and health monitoring

**API Endpoints:**

```
GET  /health                    - Health check with service status
GET  /docs                      - Interactive API documentation

# Tickets
POST /tickets/                  - Create new ticket
GET  /tickets/{id}              - Get ticket with messages
GET  /tickets/                  - List tickets with filtering
PUT  /tickets/{id}/resolve      - Resolve ticket with resolution
GET  /tickets/similar/          - Search similar tickets

# Messages  
POST /messages/                 - Add message to ticket
GET  /tickets/{id}/messages     - Get all ticket messages

# Instructions
POST /instructions/             - Create instruction template
GET  /instructions/             - List instruction templates
GET  /instructions/by-name/{name} - Get instruction by name
GET  /instructions/search/      - Semantic search in instruction documents

# System
GET  /stats/                    - System statistics
```

### 2. Instruction Document Processor (`instruction_processor_local.py`)

**Features:**
- Scans `instructions/` folder for supported file formats
- Converts documents to Markdown using format-specific parsers
- Generates 384-dimensional embeddings via OpenAI API
- Stores embeddings in local file-based vector storage
- Provides semantic similarity search functionality

**Supported Formats:**
- `.txt` - Plain text files
- `.pdf` - PDF documents (via PyPDF2)
- `.docx` - Word documents (via python-docx)
- `.pptx` - PowerPoint presentations (via python-pptx)
- `.xlsx` - Excel spreadsheets (via openpyxl)

**Usage:**
```python
from instruction_processor_local import InstructionProcessor

processor = InstructionProcessor()

# Process all files in instructions/ directory
results = processor.scan_and_process_all()

# Search for relevant instructions
results = processor.search_instructions("How to fix login problems?", top_k=3)
```

## Setup and Configuration

### 1. Environment Variables

Required:
```bash
DATABASE_URL=postgresql://username:password@host:port/database
OPENAI_API_KEY=your_openai_api_key_here
```

Optional (for Qdrant Cloud):
```bash
QDRANT_URL=https://your-cluster-url.qdrant.tech:6333
QDRANT_API_KEY=your_qdrant_api_key_here
```

### 2. Installation

The required Python dependencies are already installed:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `psycopg2-binary` - PostgreSQL adapter
- `openai` - OpenAI API client
- `python-docx` - Word document processing
- `openpyxl` - Excel file processing
- `PyPDF2` - PDF processing
- `python-pptx` - PowerPoint processing

### 3. Running the Services

**Start FastAPI MCP Service:**
```bash
cd /home/runner/workspace
python -c "
import uvicorn
from mcp_service.schema_compatible_main import app
uvicorn.run(app, host='0.0.0.0', port=8000)
"
```

**Process Instruction Documents:**
```bash
cd /home/runner/workspace
python instruction_processor_local.py
```

## Testing

### Test Database Connection and Schema
```bash
python test_schema_compatibility.py
```

### Test Instruction Processing
```bash
python instruction_processor_local.py
```

### Test MCP Service
Access the interactive API documentation at: `http://localhost:8000/docs`

## Database Schema Compatibility

The service works with your existing PostgreSQL schema:

**Tickets Table:**
- Uses camelCase column names (`createdAt`, `tenantId`, `ticketId`)
- Supports all existing fields and data types
- Maintains referential integrity with related tables

**Messages Table:**
- Compatible with existing `ticketId` foreign key
- Supports JSON metadata storage
- Preserves message ordering and timestamps

**Instructions Table:**
- Creates new table if not exists
- Uses camelCase naming for consistency
- Supports tags as JSONB for efficient querying

## API Examples

### Create a Ticket
```bash
curl -X POST "http://localhost:8000/tickets/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User cannot log in",
    "description": "User reports authentication failure",
    "category": "authentication",
    "tenantId": 1
  }'
```

### Search Similar Tickets
```bash
curl "http://localhost:8000/tickets/similar/?query=login%20problem&top_k=3"
```

### Search Instructions
```bash
curl "http://localhost:8000/instructions/search/?query=authentication%20issues"
```

### Resolve a Ticket
```bash
curl -X PUT "http://localhost:8000/tickets/1/resolve" \
  -H "Content-Type: application/json" \
  -d '{
    "resolution": "Password reset resolved the issue",
    "resolved_by": "support"
  }'
```

## Architecture

```
┌─────────────────────┐    ┌──────────────────────┐
│   FastAPI Service   │    │  Instruction Files   │
│                     │    │   (.txt, .pdf,       │
│ • Ticket CRUD       │    │    .docx, .pptx,     │
│ • Message handling  │    │    .xlsx)            │
│ • Instruction API   │    └──────────┬───────────┘
│ • Search endpoints  │               │
└──────────┬──────────┘               │
           │                          │
           │                          ▼
           │               ┌──────────────────────┐
           │               │ Document Processor   │
           │               │                      │
           │               │ • Format conversion  │
           │               │ • Markdown output    │
           │               │ • OpenAI embeddings  │
           │               └──────────┬───────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐    ┌──────────────────────┐
│   PostgreSQL DB     │    │  Local Vector Store  │
│                     │    │                      │
│ • Tickets           │    │ • Embeddings (pkl)   │
│ • Messages          │    │ • Document index     │
│ • Instructions      │    │ • Cosine similarity  │
│ • Existing schema   │    │ • Search results     │
└─────────────────────┘    └──────────────────────┘
```

## Features Delivered

✅ **FastAPI MCP Service** with complete ticket CRUD operations
✅ **Document Processing** for multiple file formats with Markdown conversion  
✅ **OpenAI Embeddings** for 384-dimensional vector representations
✅ **Local Vector Storage** with cosine similarity search
✅ **Schema Compatibility** with existing camelCase PostgreSQL columns
✅ **Instruction Search** using semantic similarity matching
✅ **API Documentation** with interactive Swagger UI
✅ **Error Handling** with comprehensive logging and validation
✅ **Health Monitoring** with service status endpoints

## Integration with Multi-Agent System

This MCP service provides the foundation for your multi-agent customer support system:

1. **Ticket Lookup Agent** - Uses `/tickets/similar/` for finding related cases
2. **Instruction Agent** - Uses `/instructions/search/` for relevant documentation  
3. **Chat Agent** - Uses ticket CRUD for conversation management
4. **Formatting Agent** - Uses message API for structured responses

The service exposes RESTful endpoints that can be consumed by any agent framework or orchestration system, providing consistent data access patterns and maintaining referential integrity with your existing database.