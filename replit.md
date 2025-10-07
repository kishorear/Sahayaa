# Sahayaa AI Ticket Management System

## Overview
Sahayaa AI is an AI-powered support ticket management system designed with a microservices architecture. Its purpose is to provide multi-tenant support with intelligent ticket processing, automated responses, and vector-based similarity search. The system aims to streamline customer support, enhance operational efficiency, and provide intelligent solutions, leading to improved customer satisfaction and reduced support costs.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Microservices Architecture
The system employs a loosely coupled microservices pattern:
- **Node.js Main Application** (Port 5000): Handles the frontend, authentication, session management, and acts as an API gateway.
- **Agent Orchestrator Service** (Port 8001): A Python FastAPI service for AI workflow coordination, multi-agent orchestration, and LLM integration.
- **Data Service** (Port 8000): Manages PostgreSQL database operations and JSON API responses for tickets, messages, and instructions.
- **Vector Storage Service**: Utilizes ChromaDB with Google AI embeddings for RAG and similarity search.

### Key Components
- **Frontend**: React with TypeScript, Tailwind CSS, Radix UI components, and Vite for multi-tenant support and a real-time monitoring dashboard.
- **Backend**: Node.js with Express.js, Drizzle ORM, PostgreSQL, session-based authentication with RBAC, and robust health monitoring.
- **AI Integration**: Supports multiple AI providers (OpenAI, Google AI, Anthropic, AWS Bedrock) for intelligent ticket classification, routing, and automated response generation.
- **Production Monitoring**: Comprehensive health check endpoints, multi-layer caching, parallel processing, security service, circuit breaker patterns, and a real-time monitoring dashboard.
- **AI Agent System with MCP Integration**: Processes customer interactions via specialized AI agents using MCP (Model Context Protocol) for workflow orchestration.
- **Enhanced Security and RBAC System**: Enterprise-level security with Role-Based Access Control (RBAC), encryption, rate limiting, JWT authentication, and audit logging.
- **Vector Search and MCP Integration**: Leverages ChromaDB/Milvus for vector storage, integrates with MCP for enhanced AI responses, supports embedding generation, and ensures multi-tenant isolation.
- **Attachment Functionality**: Comprehensive attachment upload capabilities for integrations like JIRA and Zendesk, supporting various file formats with MIME type detection and secure tenant-specific storage.
- **Integration Settings Persistence**: Integration configurations are stored persistently in a PostgreSQL database with tenant isolation, loading automatically per tenant.
- **Agent Resources Tenant Isolation**: Agent resources are fully isolated per tenant through database filtering and tenant-specific file paths.

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
- **Vector Storage**: Local file-based storage (ChromaDB/Milvus).
- **Document Processing**: Built-in support for .txt, .pdf, .docx, .pptx, .xlsx files.
- **Instruction Management**: Local processing and storage of instruction documents.

## Email Integration

### Supported Email Providers
1. **SMTP/IMAP** (Traditional): Currently implemented with nodemailer
2. **SendGrid** (API-based): Blueprint installed, integration in progress
3. **Outlook** (Manual): User dismissed Replit connector; manual SMTP setup available

### Integration Notes
- **Outlook Connector**: The Replit Outlook connector (connector:ccfg_outlook_01K4BBCKRJKP82N3PYQPZQ6DAK) was dismissed by the user. For Outlook integration, users should configure it manually using SMTP settings (smtp-mail.outlook.com:587 with app passwords).
- **SendGrid**: Blueprint integration (blueprint:javascript_sendgrid) installed successfully. Requires SENDGRID_API_KEY environment variable.
- **Email Providers Table**: Database table created to support multiple email provider configurations per tenant.