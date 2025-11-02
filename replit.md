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
- **AI Integration**: Supports multiple AI providers (OpenAI, Google AI, Anthropic, AWS Bedrock, Ollama/Llama) for intelligent ticket classification, routing, and automated response generation.
- **Production Monitoring**: Comprehensive health check endpoints, multi-layer caching, parallel processing, security service, circuit breaker patterns, and a real-time monitoring dashboard.
- **AI Agent System with MCP Integration**: Processes customer interactions via specialized AI agents using MCP (Model Context Protocol) for workflow orchestration.
- **Enhanced Security and RBAC System**: Enterprise-level security with Role-Based Access Control (RBAC), encryption, rate limiting, JWT authentication, and audit logging.
- **Industry-Specific Permission System**: Granular permission system with 15+ permission types mapped to industry-specific roles (healthcare, technology, finance, etc.), enforcing access control at both frontend and backend levels.
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
- **Optional AI Providers**: OpenAI, Google AI, Anthropic, AWS Bedrock, Ollama (self-hosted local LLMs).

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

## Industry-Specific Permission System

### Overview
The system implements a comprehensive industry-specific permission model that maps roles to granular permissions based on the company's industry type. This allows for specialized access control tailored to each industry's unique requirements.

### Supported Industries
- Healthcare (chief_doctor, doctor, nurse)
- Technology (cto, tech_lead, engineer)
- Finance (cfo, financial_analyst, accountant)
- Education (dean, professor, teaching_assistant)
- Retail (store_manager, sales_lead, cashier)
- Manufacturing, Legal, Government, Real Estate, Transportation, Hospitality, Media, Telecommunications, Energy, Nonprofit

### Permission Structure
Each role is mapped to 15+ granular permissions:
- **User Management**: canManageUsers, canViewUsers, canEditUsers
- **Ticket Management**: canViewAllTickets, canViewOwnTickets, canEditAllTickets, canEditOwnTickets, canAssignTickets, canDeleteTickets
- **System Access**: canAccessAISettings, canAccessIntegrations, canAccessAnalytics, canAccessSettings
- **Agent Resources**: canManageAgentResources

### Healthcare Example
- **Chief Doctor**: Full administrative access (canManageUsers, canAccessAISettings, canAccessIntegrations)
- **Doctor**: Ticket management without admin access (canViewAllTickets, canEditOwnTickets, canAssignTickets)
- **Nurse**: View-only access with comment capability (canViewOwnTickets only)

### Implementation
- **Backend**: Permission middleware (`requirePermission`, `requireAnyPermission`) protects all sensitive endpoints
- **Frontend**: React hooks (`usePermissions`, `useHasPermission`) control UI element visibility
- **Security**: All permission checks occur on both frontend and backend, with tenant isolation enforced
- **Permission-Based Access Control (PBAC)**: 
  - All critical routes (AI settings, integrations, team management) use permission-based checks instead of role-based checks
  - Routes check for specific permissions (e.g., `canAccessAISettings`, `canManageIntegrations`) rather than hardcoded role names
  - This allows any role with the appropriate permissions to access features, not just "admin" or "creator"
  - Examples: chief_doctor can create/edit AI settings because they have `canAccessAISettings: true`, doctor can manage team members because they have `canManageUsers: true`
- **Database-Driven Role System**: 
  - All roles (system + custom) stored in `custom_user_roles` table
  - System roles marked with `isDefault: true` and `industryType: 'none'` to appear across all industries
  - Custom roles use specific `industryType` values and `isDefault: false`
  - Seed script at `server/seed-default-roles.ts` populates 4 system roles (admin, support_agent, engineer, user) for all tenants
  - Healthcare-specific roles (doctor, chief_doctor) are only available for tenants with industryType='healthcare'
  - Role Management UI displays both system and custom roles with visual badges
- **API Routes**: 
  - `/api/permissions/me` - Get current user's permissions
  - `/api/permissions/available-roles?tenantId={id}` - Get all roles for a tenant (system + industry-specific)
  - `/api/custom-roles?industryType={type}` - Get roles for specific industry type
  - `/api/custom-roles` - CRUD operations for custom roles (POST/PUT/DELETE)

## Ticket Management Features

### Auto-Assignment System
The system automatically assigns new tickets to team members based on category and workload:
- **Workload-Based Routing**: Uses `assignTicketRandomlyInDepartment` function to assign tickets to the least busy eligible team member
- **Category-Based Eligibility**: Filters users by role based on ticket category (e.g., technical issues go to support_agent, engineer, doctor, chief_doctor, admin)
- **Fair Distribution**: Calculates current workload (active ticket count) and assigns to team members with fewest active tickets
- **Applies to All Ticket Creation**: Both regular ticket creation (`/api/tickets`) and widget ticket creation (`/api/widget/create-ticket`) use the same auto-assignment logic
- **Error Handling**: Assignment failures don't interrupt ticket creation - tickets remain unassigned and errors are logged for debugging

### Duplicate Detection
The system checks for similar existing tickets before creation:
- **Similarity Scoring**: Uses text comparison with >30% threshold to identify similar open tickets
- **Modal Display**: Shows up to 5 most similar tickets with similarity scores before final submission
- **Tenant Isolation**: Duplicate detection is tenant-scoped to ensure data privacy
- **User Choice**: Users can choose to create anyway or review similar tickets first

### AI Complexity Classification
The AI classification system automatically analyzes ticket descriptions to determine complexity:
- **Enhanced Equipment Detection**: AI automatically classifies tickets mentioning equipment as "not working," "broken," "down," "offline," or "failed" as high complexity
- **Manual Override**: High-level users (admin, chief_doctor, doctor, creator) can manually adjust complexity level in ticket details
- **Frontend Controls**: Complexity field shows as editable Select dropdown for authorized users, read-only badge for others
- **Backend Security**: Server enforces role-based access control - only admin, chief_doctor, doctor, and creator roles can modify complexity via API
- **Complexity Levels**: Simple, Medium, Complex

## Recent Changes

### November 2, 2025
- **Ollama Integration**: Added support for local/self-hosted Llama models via Ollama API
  - Backend provider implementation (`OllamaProvider.ts`) with full AIProviderInterface support
  - Frontend UI in AI Settings page with Llama 3.1 model selection (8B, 70B, 405B variants)
  - Endpoint URL configuration instead of API key for Ollama
  - Form validation split into separate refinements for proper error messaging
  - Supports all AI operations: chat, classification, auto-resolve, title generation, summarization

### October 25, 2025
- **Enhanced AI Classification**: Updated AI prompt to automatically detect broken/not working equipment and classify as high complexity
- **Manual Complexity Editing**: Added editable complexity field in ticket details for admin, chief_doctor, and doctor roles with frontend and backend permission enforcement
- **Backend Security**: Implemented role-based validation on PATCH /api/tickets/:id to prevent unauthorized complexity modifications
- **Bug Fix**: Corrected auto-assignment function calls in both `server/routes.ts` and `server/routes/widget-ticket-routes.ts` to use the existing `assignTicketRandomlyInDepartment` function instead of non-existent `assignTicketByCategory`
- **Improved Logging**: Enhanced log messages to clearly indicate workload-based assignment and show assigned user details
- **Dependency Update**: Updated browserslist database to latest version (caniuse-lite 1.0.30001751)