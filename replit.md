# Support Ticket Management System

## Overview

This is a comprehensive AI-powered support ticket management system built with a loosely coupled microservices architecture. The system provides multi-tenant support with intelligent ticket processing, automated responses, and vector-based similarity search capabilities.

## System Architecture

### Microservices Architecture
The system is built using a loosely coupled microservices pattern with the following core services:

1. **Node.js Main Application** (Port 5000)
   - Frontend web interface
   - Authentication and session management
   - API gateway for client requests
   - Fallback mechanisms for service unavailability

2. **Agent Orchestrator Service** (Port 8001)
   - Python FastAPI service for AI workflow coordination
   - Multi-agent coordination for ticket processing
   - LLM integration for intelligent responses
   - Business logic orchestration

3. **Data Service** (Port 8000)
   - Pure data storage and JSON API responses
   - PostgreSQL database operations
   - CRUD operations for tickets, messages, and instructions
   - No business logic or external dependencies

4. **Vector Storage Service**
   - Local file-based vector storage with OpenAI embeddings
   - 384-dimensional embeddings for similarity search
   - Instruction document processing and search
   - Fallback from Qdrant to local storage

## Key Components

### Frontend Architecture
- React-based web interface with TypeScript
- Tailwind CSS for styling with Radix UI components
- Vite for build tooling and development server
- Multi-tenant support with tenant isolation

### Backend Architecture
- Node.js with Express.js for REST API
- Drizzle ORM for database operations
- PostgreSQL for primary data storage
- Session-based authentication with role-based access control

### AI Integration
- Multi-provider AI support (OpenAI, Google AI, Anthropic, AWS Bedrock)
- Intelligent ticket classification and routing
- Automated response generation
- Confidence scoring and fallback mechanisms

### Agent System
- **Chat Processor Agent**: Processes incoming messages and extracts metadata
- **Instruction Lookup Agent**: Searches for relevant instructions using vector similarity
- **Ticket Lookup Agent**: Finds similar historical tickets
- **Ticket Formatter Agent**: Formats and structures ticket responses
- **Support Team Agent**: Coordinates the overall support workflow

## Data Flow

1. **Ticket Creation**: User submits support request through web interface or API
2. **Agent Processing**: Request is processed by the agent orchestrator
3. **Similarity Search**: Vector search finds relevant instructions and similar tickets
4. **AI Response**: LLM generates intelligent response based on context
5. **Ticket Management**: Ticket is created, updated, and tracked in the system
6. **Multi-tenant Isolation**: All data is properly isolated by tenant

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database for all structured data
- **OpenAI API**: For embeddings and AI response generation
- **Optional Services**: Google AI, Anthropic, AWS Bedrock for additional AI providers

### Self-Hosted Components
- **Vector Storage**: Local file-based storage replacing external Qdrant
- **Document Processing**: Built-in support for .txt, .pdf, .docx, .pptx, .xlsx files
- **Instruction Management**: Local processing and storage of instruction documents

## Deployment Strategy

### Local Development
1. Start PostgreSQL database
2. Set up environment variables from `.env.example`
3. Run `npm run dev` for the main application
4. Optionally start agent service with `python agents.py`
5. Process instruction documents with the ingestion service

### Production Deployment
- **Replit Deployment**: Configured for autoscale deployment
- **Environment Variables**: All secrets managed through environment configuration
- **Process Management**: Multiple services with graceful degradation
- **Health Monitoring**: Comprehensive health checks and service monitoring

### Fallback Mechanisms
- **Service Unavailability**: Automatic fallback to local processing
- **AI Provider Failures**: Multi-provider fallback system
- **Vector Storage**: Local storage backup when external services are down

## Changelog

- June 14, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.