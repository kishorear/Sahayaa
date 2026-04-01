# Sahayaa AI Ticket Management System

## Overview
Sahayaa AI is an AI-powered, microservices-based support ticket management system. It provides multi-tenant support with intelligent ticket processing, automated responses, and vector-based similarity search. The system aims to streamline customer support, enhance operational efficiency, and provide intelligent solutions, leading to improved customer satisfaction and reduced support costs. Key capabilities include AI-powered classification, auto-assignment, duplicate detection, and robust security features with industry-specific role-based access control.

## Recent Changes
- **Email Verification for Trial Users (November 24, 2025)**:
  - Implemented email verification system for trial users to prevent fake emails and duplicates
  - Verification codes are 6 digits, expire after 10 minutes, and sent from Resend integration
  - Trial registration now sends verification email instead of auto-login
  - Unverified trial users are blocked from logging in with helpful error message
  - Frontend verification page with auto-submit, countdown timer, and resend functionality (60s cooldown)
  - Rate limiting: Users can resend verification code once per minute
  - Database schema updated with emailVerified, emailVerificationCode, and emailVerificationExpiry fields
  - Resend connector integration used for reliable email delivery (replaced SendGrid)

- **Trial Tenant OpenAI Default & Ticket Limits (November 21, 2025)**:
  - Configured trial accounts to use OpenAI ChatGPT (GPT-4o) as default AI provider instead of Google Gemini
  - Implemented strict 10-ticket limit enforcement for trial tenants shared across all users within that tenant
  - Added `checkTrialTicketLimit` and `incrementTrialTicketCounter` helper functions that only affect trial tenants (isTrial: true)
  - Ticket limit enforcement applied to all three ticket creation endpoints: widget, main, and agent workflow fallback
  - Returns 403 error with clear messaging when trial tenants reach ticket limit
  - Regular/paid clients completely unaffected - no limits, no counter increments, no behavior changes
  - Users can change AI providers through the existing AI Settings page (/admin/ai-settings)
  
- **Tenant Isolation Security Fixes (November 11, 2025)**: 
  - Removed all `tenantId || 1` fallbacks from chatbot endpoints to prevent data leakage
  - Created `resolveTenantContext` helper function for safe tenant context resolution
  - Fixed user cache invalidation to use consistent numeric ID keys
  - Added dedicated `userByUsernameCache` to MemStorage for efficient lookups
  - Enforced required tenantId in createUser to prevent cross-tenant user creation

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Microservices Architecture
The system utilizes a loosely coupled microservices architecture:
- **Node.js Main Application**: Handles the frontend, authentication, session management, and acts as an API gateway.
- **Agent Orchestrator Service (Python FastAPI)**: Coordinates AI workflows, multi-agent orchestration, and LLM integration.
- **Data Service**: Manages PostgreSQL database operations and provides JSON API responses for tickets, messages, and instructions.
- **Vector Storage Service**: Employs ChromaDB with Google AI embeddings for RAG and similarity search.

### Key Components
- **Frontend**: React with TypeScript, Tailwind CSS, Radix UI, and Vite for multi-tenant support and a real-time monitoring dashboard.
- **Backend**: Node.js with Express.js, Drizzle ORM, PostgreSQL, session-based authentication with RBAC, and health monitoring.
- **AI Integration**: Supports multiple AI providers (OpenAI, Google AI, Anthropic, AWS Bedrock, Ollama/Llama) for intelligent ticket classification, routing, and automated response generation.
- **AI Agent System with MCP Integration**: Processes customer interactions via specialized AI agents using Model Context Protocol (MCP) for workflow orchestration.
- **Enhanced Security and RBAC System**: Enterprise-level security with Role-Based Access Control (RBAC), encryption, rate limiting, JWT authentication, and audit logging.
- **Industry-Specific Permission System**: Granular permission system with 15+ permission types mapped to industry-specific roles (e.g., healthcare, technology, finance) for fine-grained access control.
- **Vector Search and MCP Integration**: Leverages ChromaDB/Milvus for vector storage, integrates with MCP for enhanced AI responses, supports embedding generation, and ensures multi-tenant isolation.
- **Attachment Functionality**: Comprehensive attachment upload capabilities for various file formats, with MIME type detection and secure tenant-specific storage.
- **Integration Settings Persistence**: Integration configurations are stored persistently in a PostgreSQL database with tenant isolation.
- **Agent Resources Tenant Isolation**: Agent resources are fully isolated per tenant through database filtering and tenant-specific file paths.

### AI Agent Data Flow
1. User creates a ticket.
2. Support Team Agent orchestrates AI agents.
3. Multi-Agent MCP Processing: Specialized agents (Chat Processor, Instruction Lookup, Ticket Lookup, Ticket Formatter) analyze and process information using MCP.
4. MCP-Powered Response provides solution suggestions.
5. Automated Ticket Management: Ticket is created, classified, and enhanced with MCP context.
6. Multi-tenant Isolation ensures data and agent processing are isolated per tenant.

### Ticket Management Features
- **Auto-Assignment System**: Automatically assigns new tickets to eligible team members based on category and workload, ensuring fair distribution.
- **Duplicate Detection**: Identifies and flags similar existing tickets (>30% similarity) before creation, allowing users to review or proceed.
- **AI Complexity Classification**: Automatically classifies ticket complexity (Simple, Medium, Complex) based on description, with manual override for authorized users.

### Trial Registration System
- Provides a public self-service trial registration with a 10-ticket limit per tenant.
- First user of a trial tenant automatically receives admin privileges.
- Enforces global email/username uniqueness and tenant-level quota.
- Requires email verification before login (6-digit codes, 10-minute expiry).
- Uses Resend integration for reliable transactional email delivery.

## External Dependencies

### Required Services
- **PostgreSQL**: Primary relational database.
- **Optional AI Providers**: OpenAI, Google AI, Anthropic, AWS Bedrock, Ollama (for self-hosted local LLMs).

### Self-Hosted Components
- **Vector Storage**: Local file-based storage (ChromaDB/Milvus).
- **Document Processing**: Built-in support for .txt, .pdf, .docx, .pptx, .xlsx files.
- **Instruction Management**: Local processing and storage of instruction documents.

### Email Integration
- **Resend**: Primary email service for verification codes and transactional emails (connector integration).
- **SMTP/IMAP**: Traditional email protocol support (currently using Nodemailer).
- **SendGrid**: API-based email service integration (available but not actively used).
- **Outlook**: Manual SMTP setup available for Outlook integration (app passwords required).