# Sahayaa AI Ticket Management System

## Overview
Sahayaa AI is a comprehensive, AI-powered support ticket management system designed with a loosely coupled microservices architecture. Its main purpose is to provide multi-tenant support with intelligent ticket processing, automated responses, and vector-based similarity search capabilities. The system aims to streamline customer support, enhance operational efficiency, and provide intelligent solutions, leading to improved customer satisfaction and reduced support costs.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes
- **August 5, 2025**: Successfully implemented comprehensive attachment functionality for both JIRA and Zendesk integrations
  - **COMPLETE ZENDESK ATTACHMENT IMPLEMENTATION**: Fully implemented attachment upload capabilities for Zendesk integration
    - Added comprehensive attachment upload methods to ZendeskService (addAttachment, addMultipleAttachments, uploadFile)  
    - Implemented Zendesk-specific two-step upload process: file upload → upload token → ticket attachment
    - Added proper FormData handling and MIME type detection for Zendesk API compatibility
    - Created dedicated API routes for Zendesk attachment uploads (/api/integrations/zendesk/upload-attachment/:ticketId)
    - Added Zendesk ticket attachment sync functionality (/api/integrations/zendesk/sync-attachments/:ticketId)
    - Enhanced ticket sync process to automatically upload attachments when creating Zendesk tickets
    - Implemented secure file cleanup and error handling for Zendesk attachment operations
    - Added tenant-specific isolation for all Zendesk attachment operations ensuring security
    - Created comprehensive test script verifying all Zendesk attachment functionality components
  - **PRODUCTION-READY DUAL INTEGRATION SYSTEM**: Complete attachment synchronization for both platforms
    - JIRA: Direct file attachment to issues using FormData multipart uploads
    - Zendesk: Two-step process with upload tokens for secure file handling  
    - Both systems support 15+ file formats with accurate MIME type detection
    - Automatic attachment sync during ticket creation with proper error recovery
    - Secure tenant-specific file path generation and cleanup processes
    - Comprehensive logging and error tracking for all attachment operations
- **August 5, 2025**: Successfully implemented comprehensive JIRA attachment functionality
  - **COMPLETE JIRA ATTACHMENT IMPLEMENTATION**: Fully implemented attachment upload capabilities for JIRA integration
    - Added comprehensive attachment upload methods to JiraService (addAttachment, addMultipleAttachments)
    - Implemented proper file handling with FormData for JIRA API compatibility
    - Added MIME type detection for 15+ common file formats (PDF, Office docs, images, archives)
    - Created dedicated API routes for attachment uploads (/api/integrations/jira/upload-attachment/:issueKey)
    - Added ticket attachment sync functionality (/api/integrations/jira/sync-attachments/:ticketId)
    - Enhanced ticket sync process to automatically upload attachments when creating JIRA issues
    - Implemented proper file cleanup and error handling for attachment operations
    - Added tenant-specific isolation for all attachment operations ensuring security
    - Created comprehensive test script verifying all attachment functionality components
  - **PRODUCTION-READY ATTACHMENT SYSTEM**: Full JIRA attachment synchronization capabilities
    - File upload handling with 10MB size limits and temporary storage management
    - Automatic attachment sync during ticket creation with proper error recovery
    - Support for multiple file formats with accurate MIME type detection
    - Secure file path generation and cleanup processes
    - Comprehensive logging and error tracking for attachment operations
- **August 5, 2025**: Successfully implemented persistent database storage for integration settings
  - **CRITICAL ACHIEVEMENT - Integration Settings Persistence**: Resolved the major issue where JIRA and Zendesk integration configurations were lost on server restart or user login
    - Implemented dedicated IntegrationSettingsService with PostgreSQL database persistence
    - Created integration_settings table with proper tenant isolation (tenantId, serviceType unique constraint)
    - Modified integration routes to save and load configurations from database instead of in-memory storage
    - Added comprehensive error handling and tenant-specific configuration management
    - Verified functionality with test endpoints showing perfect tenant isolation (tenant 1: Zendesk, tenant 2: JIRA)
    - Integration configurations now persist across server restarts and user sessions as required
    - Successfully implemented tenant-specific integration service manager with perfect isolation
    - Each tenant gets their own IntegrationService instance with automatic database loading
    - Verified multi-tenant functionality: Tenant 1 (Zendesk), Tenant 2 (Real JIRA), Tenant 3 (Both services)
    - Integration services automatically initialize when tenants access their settings
- **August 5, 2025**: Successfully implemented complete tenant isolation for agent resources
  - **CRITICAL SECURITY ACHIEVEMENT - Agent Resources Tenant Isolation**: Resolved agent resource cross-tenant data leakage risk
    - Implemented proper database operations in DatabaseStorage class for agent resources
    - Added tenant_id filtering to all agent resource database queries (getAgentResources, createAgentResource, deleteAgentResource, getAgentResource)
    - Fixed missing file_path column in agent_resources table schema
    - Verified tenant isolation with test data: Tenant 1 (1 resource), Tenant 2 (2 resources) - completely separate
    - Agent resource storage methods now use proper database operations instead of placeholder implementations
    - Each tenant's agent resources are completely isolated with tenant-specific file paths and database filtering
  - **Enhanced Agent Resources Database Integration**: Replaced in-memory storage with persistent database operations
    - Updated DatabaseStorage class with proper Drizzle ORM database queries
    - Added comprehensive error handling and logging for agent resource operations
    - Implemented tenant-specific file path generation for secure file isolation
    - Added proper TypeScript type safety for all agent resource database operations
  - **Database Integration Architecture**: Established loosely coupled integration service layer
    - Created IntegrationSettingsService as dedicated service layer for database operations
    - Modified IntegrationService to load configurations from database per tenant
    - Updated integration routes to use persistent storage while maintaining backwards compatibility
    - Implemented automatic integration service initialization when users access settings
  - **Enhanced Security and Tenant Isolation**: Improved integration security and multi-tenant support
    - API tokens and sensitive configuration data properly masked in all API responses
    - Perfect tenant isolation verified - tenants can only access their own integration settings
    - Added proper error handling for database operations with fallback mechanisms
- **August 5, 2025**: Successfully resolved critical duplicate ticket creation bug and console errors
  - **CRITICAL FIX - Eliminated Duplicate Ticket Creation**: Resolved issue where single user action created two tickets
    - Root cause: AI agent service was automatically creating tickets for every message analysis
    - Modified agent service to provide analysis only without creating tickets in database
    - Tickets now only created through explicit user actions via widget ticket routes
    - Eliminated garbage tickets (like #129) with raw user input as titles
    - Preserved quality ticket creation with proper AI-enhanced titles and descriptions
  - **Fixed React Query AbortError**: Resolved "signal is aborted without reason" console errors
    - Added global error handlers to suppress expected navigation abort errors
    - Fixed deprecated mediaSource property in screen capture API
    - Enhanced React Query configuration to handle navigation gracefully
  - **Enhanced Attachment Display UI**: Improved attachment box layout for better user experience
    - Separated file information (icon, filename, type, size) from action buttons
    - Moved View/Download buttons to bottom with proper spacing and border separator
    - Expanded attachment box to prevent cramped display and button overlapping
  - **Fixed Ticket ID Sequence Error**: Resolved "NaN" parsing issue in agent service and widget routes
    - Enhanced agent service to validate user IDs before parseInt() to prevent NaN values
    - Updated widget routes to pass proper user ID instead of session strings
    - Confirmed tickets now create with proper sequential tenant IDs (#24, #25, #26, #27 for tenant 2)
  - **Fixed Chat Ticket Creation Tenant Context**: Updated to use logged-in user's actual tenant ID
    - Added user query to ChatbotInterface to get current user's tenant context
    - Changed widget ticket creation from hardcoded tenant 1 to user's actual tenant (user?.tenantId || 1)
    - Tickets now appear in the correct tenant's ticket list instead of wrong tenant
- **August 3, 2025**: Fixed critical security breach and enhanced ticket assignment system
  - **CRITICAL SECURITY FIX**: Resolved global ticket ID counter issue that caused cross-tenant data leakage
    - Removed global `ticketIdCounter` that was generating sequential IDs across all tenants (53, 54, 55... jumping to 98+)
    - Implemented proper tenant-isolated ID generation ensuring data privacy between companies
    - Fixed potential data breach where companies could see sequential ticket numbers from other tenants
  - **Enhanced Auto-Assignment System**: Improved ticket assignment with smart department-based distribution
    - Enhanced `assignTicketToLeastBusyMember` with random selection among equally busy team members
    - Added `assignTicketRandomlyInDepartment` for proper department-based random assignment
    - Implemented role-based assignment logic (technical issues → support engineers, billing → administrators)
    - Added comprehensive fallback system: team-based → department-based → AI classification
  - **System Architecture Improvement**: Strengthened multi-tenant isolation and assignment reliability
- **August 3, 2025**: Successfully enhanced attachment system with comprehensive display functionality
  - Fixed critical frontend gap where attachments were stored but not visible to users
  - Enhanced TicketDetails component with attachment preview, view, and download capabilities
  - Improved ChatbotInterface to support multiple file types (images, videos, documents, PDFs)
  - Added proper TypeScript type safety for all attachment operations
  - Verified functionality with ticket #105 containing PNG image attachment
- **August 3, 2025**: Completed comprehensive attachment system isolation from AI processing
  - **Fixed Ticket ID Display**: Confirmed tenant isolation working correctly (ticket 109 displays as #16 to users)
  - **Enhanced AI Processing Separation**: Implemented robust attachment exclusion from AI analysis
    - Updated title generation in server/ai.ts to filter out [ATTACHMENT] messages
    - Modified widget ticket creation route to exclude attachment content from AI processing
    - Enhanced ChatbotInterface to mark attachment messages with [ATTACHMENT] prefix for filtering
  - **Verified Attachment Storage**: Successfully added test attachment to ticket 109, confirmed proper database storage
  - **Tested Title Generation**: Verified AI title generation ("Login System: Page Not Loading") excludes attachment content
- **August 3, 2025**: Fixed quality gap between sample tickets and chat-generated tickets
  - **Root Cause**: Chat tickets were using old `/api/tickets` endpoint without AI title generation
  - **Solution**: Enhanced both chat flows to use proper AI title generation
    - Modified `handleAIAction` in ChatbotInterface to use widget ticket creation (with AI processing)
    - Added AI title enhancement to `/api/tickets` route for backward compatibility
    - Implemented quality detection: if description is longer than title, generate AI title
  - **Result**: All ticket creation paths now generate professional titles like "Login System Access Issues" instead of raw user messages

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