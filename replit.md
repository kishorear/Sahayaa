# Sahayaa AI Ticket Management System

## Overview
Sahayaa AI is a comprehensive, AI-powered support ticket management system designed with a loosely coupled microservices architecture. Its main purpose is to provide multi-tenant support with intelligent ticket processing, automated responses, and vector-based similarity search capabilities. The system aims to streamline customer support, enhance operational efficiency, and provide intelligent solutions, leading to improved customer satisfaction and reduced support costs.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes
- **August 3, 2025**: Successfully enhanced attachment system with comprehensive display functionality
  - Fixed critical frontend gap where attachments were stored but not visible to users
  - Enhanced TicketDetails component with attachment preview, view, and download capabilities
  - Improved ChatbotInterface to support multiple file types (images, videos, documents, PDFs)
  - Added proper TypeScript type safety for all attachment operations
  - Verified functionality with ticket #105 containing PNG image attachment

## System Architecture

### Microservices Architecture
The system is built using a loosely coupled microservices pattern:
- **Node.js Main Application** (Port 5000): Handles the frontend web interface, authentication, session management, and acts as an API gateway.
- **Agent Orchestrator Service** (Port 8001): A Python FastAPI service for AI workflow coordination, multi-agent orchestration, and LLM integration.
- **Data Service** (Port 8000): Pure data storage and JSON API responses, handling PostgreSQL database operations and CRUD for tickets, messages, and instructions.
- **Vector Storage Service**: Utilizes ChromaDB with Google AI embeddings for production RAG and high-quality similarity search.

### Key Components
- **Frontend**: React with TypeScript, Tailwind CSS, Radix UI components, and Vite for multi-tenant support and a real-time monitoring dashboard.
- **Backend**: Node.js with Express.js, Drizzle ORM, PostgreSQL, session-based authentication with RBAC, and robust health monitoring.
- **AI Integration**: Supports multiple AI providers (OpenAI, Google AI, Anthropic, AWS Bedrock) for intelligent ticket classification, routing, and automated response generation.
- **Production Monitoring**: Comprehensive health check endpoints, multi-layer caching, parallel processing, security service, circuit breaker patterns, and a real-time monitoring dashboard.
- **AI Agent System with MCP Integration**: Processes customer interactions via specialized AI agents using MCP (Model Context Protocol). Agents include: Chat Processor, Instruction Lookup, Ticket Lookup, Ticket Formatter, and Support Team Agent for workflow orchestration.
- **Enhanced Security and RBAC System**: Enterprise-level security with Role-Based Access Control (RBAC), encryption, rate limiting, security violation tracking, JWT authentication, audit logging, and secure agent upload.
- **Vector Search and MCP Integration**: Leverages ChromaDB/Milvus for vector storage, integrates with MCP for enhanced AI responses, supports embedding generation, and ensures multi-tenant isolation.

### AI Agent Data Flow
1. Ticket Creation by user.
2. AI Agent Orchestration by Support Team Agent.
3. Multi-Agent MCP Processing: Chat Processor analyzes messages, Instruction Lookup and Ticket Lookup agents search knowledge bases and historical tickets using MCP, and Ticket Formatter structures solutions.
4. MCP-Powered Response provides solution suggestions.
5. Automated Ticket Management: Ticket is created, classified, and enhanced with MCP context.
6. Multi-tenant Isolation ensures data and agent processing are isolated per tenant.

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database.
- **OpenAI API**: For embeddings and AI response generation.
- **Optional AI Providers**: Google AI, Anthropic, AWS Bedrock.

### Self-Hosted Components
- **Vector Storage**: Local file-based storage.
- **Document Processing**: Built-in support for .txt, .pdf, .docx, .pptx, .xlsx files.
- **Instruction Management**: Local processing and storage of instruction documents.