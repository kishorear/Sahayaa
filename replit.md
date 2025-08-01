# Sahayaa AI Ticket Management System

## Overview
Sahayaa AI is a comprehensive, AI-powered support ticket management system designed with a loosely coupled microservices architecture. It provides multi-tenant support, intelligent ticket processing, automated responses, and vector-based similarity search capabilities. The system aims to streamline customer support operations through advanced AI integration, offering intelligent ticket classification, routing, and automated response generation. It features a robust security framework and production-ready monitoring.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Architecture
The system is built on a loosely coupled microservices pattern:
- **Node.js Main Application** (Port 5000): Frontend web interface, authentication, API gateway.
- **FastMCP Service** (Port 8001): Python FastAPI service for Model Context Protocol (MCP), local vector storage, PII masking, prompt validation, and multi-agent coordination.
- **Data Service** (Port 8000): Pure data storage with JSON API responses, PostgreSQL database operations, and CRUD operations.
- **Vector Storage Service**: Local file-based vector storage with OpenAI embeddings, cosine similarity search, and PII masking.

### Frontend Architecture
- React-based web interface with TypeScript.
- Tailwind CSS for styling with Radix UI components.
- Vite for build tooling.
- Multi-tenant support with tenant isolation.
- Comprehensive monitoring dashboard.

### Backend Architecture
- Node.js with Express.js for REST API.
- Drizzle ORM for database operations.
- PostgreSQL for primary data storage.
- Session-based authentication with role-based access control (RBAC).

### AI Agent System with MCP Integration
Every customer interaction is processed through an intelligent AI agent system using MCP features. Key agents include:
- **Chat Processor Agent**: Extracts information from messages.
- **Instruction Lookup Agent**: Searches knowledge base via MCP.
- **Ticket Lookup Agent**: Finds similar historical tickets via MCP.
- **Ticket Formatter Agent**: Structures MCP-sourced solutions.
- **Support Team Agent**: Orchestrates the MCP workflow.

### Security and RBAC System
- **Role-Based Access Control (RBAC)**: Granular permissions for various user roles.
- **Encryption Service**: For sensitive data.
- **Rate Limiting**: For API endpoints.
- **Security Violation Tracking**: Monitoring and response to threats.
- **JWT Authentication**: Secure token-based authentication.
- **Audit Logging**: For compliance and monitoring.
- **Agent Upload Security**: Secure file upload validation.

### Production-Ready Monitoring
- Comprehensive health check endpoints.
- Multi-layer caching system.
- Parallel processing capabilities.
- Circuit breaker patterns for resilience.
- Real-time monitoring dashboard with metrics.

### UI/UX Decisions
- Consistent branding with "Sahayaa AI".
- Professional contact form with formal confirmation messages.
- Interactive demo with "behind-the-scenes" agent workflow visualization.
- Resizable chat box with constraints.

## External Dependencies

- **PostgreSQL**: Primary database.
- **OpenAI API**: For embeddings and AI response generation (with fallback).
- **Optional AI Providers**: Google AI, Anthropic, AWS Bedrock.
- **ChromaDB/Milvus**: For high-performance vector storage.