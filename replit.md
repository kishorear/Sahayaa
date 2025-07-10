# Sahayaa AI Ticket Management System

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
   - ChromaDB with Google AI embeddings for production RAG
   - High-quality similarity search with cosine similarity
   - Instruction document processing and ticket lookup
   - 25+ instruction documents and ticket history indexed

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

### AI Agent System with MCP Integration - Core Workflow Engine
Every customer interaction is processed through our intelligent AI agent system using MCP (Model Context Protocol) features. Each workflow stage is handled by specialized AI agents working together:

- **Chat Processor Agent**: Analyzes and extracts key information from customer messages
- **Instruction Lookup Agent**: Uses MCP to search through knowledge base and find relevant solutions
- **Ticket Lookup Agent**: Leverages MCP to find similar historical tickets with successful resolutions
- **Ticket Formatter Agent**: Structures MCP-sourced solution suggestions into actionable steps
- **Support Team Agent**: Orchestrates the MCP workflow and coordinates all other agents

**Key Benefits:**
- MCP-powered solution suggestions based on previously resolved similar issues
- Multi-agent coordination ensures comprehensive analysis and contextual matching
- Real-time processing with immediate ticket creation and solution suggestions
- Intelligent routing with MCP-enhanced context for complex or new issues

## MCP-Enhanced AI Agent Data Flow

1. **Ticket Creation**: User submits support request through web interface or API
2. **AI Agent Orchestration**: Support Team Agent coordinates the complete MCP workflow
3. **Multi-Agent MCP Processing**: 
   - Chat Processor Agent analyzes the user message
   - Instruction Lookup Agent uses MCP to search knowledge base for relevant solutions
   - Ticket Lookup Agent leverages MCP to find similar historical tickets with successful resolutions
   - Ticket Formatter Agent structures MCP-sourced solution suggestions into actionable steps
4. **MCP-Powered Response**: System provides solution suggestions based on previous successful resolutions
5. **Automated Ticket Management**: Ticket is created, classified, and enhanced with MCP context
6. **Multi-tenant Isolation**: All data and MCP agent processing is properly isolated by tenant

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

- July 10, 2025: Critical bug fixes for AI ticket generation functionality
  - Fixed widget ticket title generation to use sophisticated AI service with MCP integration instead of basic fallback
  - Resolved analytics dashboard time period filtering to use filtered tickets for accurate AI resolution rate calculations
  - Fixed production deployment gap by rebuilding and syncing latest development features
  - Updated widget ticket creation endpoint to properly handle latestUserMessage variable scope
  - Verified MCP-enhanced title generation produces descriptive titles like "Login System: Invalid Credentials After Password Reset"
- July 8, 2025: Updated documentation to reflect MCP-based solution suggestions
  - Clarified that AI agents provide solution suggestions using MCP (Model Context Protocol) rather than automatic resolution
  - Updated landing page features to emphasize MCP-powered solution suggestions based on previous resolutions
  - Modified "How It Works" documentation to highlight MCP integration for finding similar historical tickets
  - Enhanced replit.md with MCP-enhanced AI agent system descriptions and workflow
  - Updated data flow documentation to show MCP-powered solution suggestion process
  - All documentation now accurately reflects that system suggests solutions rather than automatically resolving tickets
- July 8, 2025: Enhanced AI agent workflow documentation
  - Updated landing page to emphasize AI agent-powered workflows in hero section and key features
  - Modified "How It Works" documentation to highlight multi-agent processing pipeline
  - Enhanced replit.md with detailed AI agent system descriptions and benefits
  - Updated data flow documentation to show AI agent orchestration process
  - All user-facing documentation now clearly shows AI agents handle each workflow step
- June 30, 2025: Deployment module format issues resolved
  - Converted CommonJS agent-service.js to ES module format
  - Consolidated duplicate agent service files (removed redundant CommonJS version)
  - Updated all import statements to use unified TypeScript agent service
  - Fixed esbuild compatibility issues for production deployment
  - Verified application functionality and module resolution
- June 28, 2025: Complete rebranding from "Support AI" to "Sahayaa AI"
  - Updated all UI components, pages, and user-facing text
  - Modified widget documentation and sample files
  - Updated page titles, navigation bars, and footer text
  - Changed branding references throughout the application
- June 26, 2025: Role-based access control refined
  - Agent Test tab now restricted to creator role users only
  - Chat box made resizable with proper constraints (300x400px min, 600x800px max)
  - Maintained default dimensions while adding resize functionality
- June 22, 2025: AI chat behavior optimized for QA/testing workflow
  - Updated all AI providers to focus on quality analysts and software testers
  - Changed system prompts to assume users are reporting legitimate issues
  - Eliminated technical code solutions in favor of practical workarounds
  - Enhanced ticket creation focus over complex troubleshooting attempts
  - Improved response formatting with bullet points and structured guidance
  - Modified chat interface to prioritize information gathering for tickets
- June 17, 2025: Chat widget package updated with complete agent workflow integration
  - Enhanced support-widget-auth.js with agent orchestrator endpoint integration
  - Updated support-widget.js to include agent workflow with graceful fallbacks
  - Added comprehensive agent workflow integration guide documentation
  - Updated API documentation with new /api/agents/process endpoint specifications
  - Enhanced widget generators to include agent workflow configuration options
  - Implemented automatic ticket creation and resolution steps display in widgets
  - Added confidence scoring and processing time tracking for widget responses
  - Updated README files with agent workflow capabilities and features
- June 14, 2025: ChromaDB agent workflow integration completed successfully
  - Fixed SupportTeamOrchestrator interface mismatches with agent methods
  - Resolved response format handling between ChatPreprocessorAgent and orchestrator
  - Corrected method signatures for InstructionLookupAgent and TicketLookupAgent
  - Agent Test Page shows operational status with integrated fallback systems
  - ChromaDB achieving 0.831 confidence scores with 25+ instruction documents indexed
- June 14, 2025: ChromaDB implementation completed successfully
  - ChromaDB installed and configured with Google AI embeddings
  - Agent workflow system fully operational with detailed tracing
  - 25+ instruction documents and ticket history indexed
  - High-quality similarity search achieving 0.831 confidence scores
  - Agent Test Page integrated with real-time workflow verification
- June 14, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.