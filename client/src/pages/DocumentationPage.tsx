import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { BookOpen, Code, MessageSquare, Puzzle, Key, CloudLightning, Server, GitMerge, HelpCircle, Download, FileText } from "lucide-react";
import { Link } from "wouter";
import jsPDF from 'jspdf';

export default function DocumentationPage() {
  document.title = "Documentation | Sahayaa AI Support Platform";

  const downloadPDF = async () => {
    try {
      // Create a simplified text-based PDF instead of using html2canvas
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 190;
      const pageHeight = 270;
      let currentY = 20;
      
      // Add title
      pdf.setFontSize(24);
      pdf.text('Sahayaa AI Documentation', 20, currentY);
      currentY += 15;
      
      // Add sections
      const sections = [
        {
          title: 'What is Sahayaa AI?',
          content: 'Sahayaa AI is an advanced multi-agent support ticket management system powered by artificial intelligence. Built with a microservices architecture, it employs Model Context Protocol (MCP) integration, vector-based similarity search, and intelligent AI orchestration to provide comprehensive customer support automation.'
        },
        {
          title: 'Microservices Architecture',
          content: 'Node.js Main Application (Port 5000) - Frontend, authentication, session management, and API gateway\nAgent Orchestrator Service (Port 8001) - Python FastAPI service for AI workflow coordination\nData Service (Port 8000) - PostgreSQL database operations and JSON API responses\nVector Storage Service - ChromaDB with Google AI embeddings for RAG and similarity search'
        },
        {
          title: 'Multi-Agent MCP Processing',
          content: 'Chat Processor Agent - Analyzes and preprocesses user messages\nInstruction Lookup Agent - Searches knowledge base using vector embeddings\nTicket Lookup Agent - Finds similar historical tickets using MCP-powered similarity search\nTicket Formatter Agent - Structures responses and automates ticket creation\nSupport Team Orchestrator - Master coordinator managing all sub-agents'
        },
        {
          title: 'Key Features',
          content: 'Multi-Agent AI Chat System with MCP integration\nEnterprise Multi-Tenancy with complete isolation\nMicroservices Integration with real-time monitoring\nComprehensive third-party system integrations'
        }
      ];

      pdf.setFontSize(12);
      
      sections.forEach(section => {
        // Check if we need a new page
        if (currentY > pageHeight - 30) {
          pdf.addPage();
          currentY = 20;
        }
        
        // Add section title
        pdf.setFontSize(16);
        pdf.text(section.title, 20, currentY);
        currentY += 10;
        
        // Add section content
        pdf.setFontSize(12);
        const lines = pdf.splitTextToSize(section.content, pageWidth);
        lines.forEach((line: string) => {
          if (currentY > pageHeight - 10) {
            pdf.addPage();
            currentY = 20;
          }
          pdf.text(line, 20, currentY);
          currentY += 7;
        });
        
        currentY += 5; // Add space between sections
      });

      pdf.save('Sahayaa-AI-Documentation.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-7xl">
      <div id="documentation-content">
      <div className="flex flex-col space-y-4 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Documentation</h1>
          </div>
          <Button onClick={downloadPDF} variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </Button>
        </div>
        <p className="text-muted-foreground text-lg">
          Comprehensive guides and documentation for the Sahayaa AI Support Platform
        </p>
      </div>

      <Tabs defaultValue="how-it-works" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="getting-started">
            <div className="flex items-center">
              <Puzzle className="mr-2 h-4 w-4" />
              Getting Started
            </div>
          </TabsTrigger>
          <TabsTrigger value="how-it-works">
            <div className="flex items-center">
              <HelpCircle className="mr-2 h-4 w-4" />
              How It Works
            </div>
          </TabsTrigger>
          <TabsTrigger value="features">
            <div className="flex items-center">
              <CloudLightning className="mr-2 h-4 w-4" />
              Features
            </div>
          </TabsTrigger>
          <TabsTrigger value="integration">
            <div className="flex items-center">
              <GitMerge className="mr-2 h-4 w-4" />
              Integration Guide
            </div>
          </TabsTrigger>
          <TabsTrigger value="api">
            <div className="flex items-center">
              <Code className="mr-2 h-4 w-4" />
              API Reference
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="getting-started" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Introduction to AI Support Platform</CardTitle>
              <CardDescription>
                Learn about what the AI Support Platform is and how it can help your business.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
                <h3>What is Sahayaa AI?</h3>
                <p>
                  Sahayaa AI is an advanced multi-agent support ticket management system powered by artificial intelligence. Built with a microservices architecture, it employs Model Context Protocol (MCP) integration, vector-based similarity search, and intelligent AI orchestration to provide comprehensive customer support automation.
                </p>
                
                <h3>Key Benefits</h3>
                <ul>
                  <li><strong>Multi-Agent AI Orchestration</strong> - Specialized AI agents (Chat Processor, Instruction Lookup, Ticket Lookup, Ticket Formatter) work together for comprehensive ticket processing.</li>
                  <li><strong>Vector-Based Similarity Search</strong> - ChromaDB integration provides intelligent similarity matching for historical tickets and knowledge base articles.</li>
                  <li><strong>Multi-Tenant Architecture</strong> - Complete data isolation and tenant-specific customization with enterprise-grade security.</li>
                  <li><strong>Multiple AI Provider Support</strong> - Integrated support for OpenAI, Google AI, Anthropic, and AWS Bedrock with automatic failover.</li>
                  <li><strong>Microservices Architecture</strong> - Loosely coupled services including Node.js main application, Python Agent Orchestrator, Data Service, and Vector Storage.</li>
                  <li><strong>Real-Time Monitoring</strong> - Comprehensive health checks, circuit breaker patterns, and performance monitoring.</li>
                </ul>

                <h3>Quick Start Guide</h3>
                <ol>
                  <li><strong>Sign Up</strong> - Create an account on the platform.</li>
                  <li><strong>Configure Your Workspace</strong> - Set up your company profile and support categories.</li>
                  <li><strong>Add Knowledge Base</strong> - Upload support articles to help the AI provide accurate responses.</li>
                  <li><strong>Customize Chat Widget</strong> - Configure and integrate the chat widget into your website.</li>
                  <li><strong>Train Your Team</strong> - Get your support team familiar with the dashboard and tools.</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="how-it-works" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How the AI Support Platform Works</CardTitle>
              <CardDescription>
                A comprehensive guide to understanding the core functionality and technical architecture of the AI Support Platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
                <h3>Microservices Architecture Overview</h3>
                <p>
                  Sahayaa AI is built on a sophisticated microservices architecture with MCP (Model Context Protocol) integration, designed for scalability, reliability, and intelligent multi-agent processing:
                </p>
                <ul>
                  <li><strong>Node.js Main Application (Port 5000)</strong> - Frontend, authentication, session management, and API gateway</li>
                  <li><strong>Agent Orchestrator Service (Port 8001)</strong> - Python FastAPI service for AI workflow coordination and LLM integration</li>
                  <li><strong>Data Service (Port 8000)</strong> - PostgreSQL database operations and JSON API responses</li>
                  <li><strong>Vector Storage Service</strong> - ChromaDB with Google AI embeddings for RAG and similarity search</li>
                  <li><strong>Chat Widget Package</strong> - Embeddable JavaScript component with multi-agent workflow visualization</li>
                </ul>

                <h3>Multi-Agent MCP Processing System</h3>
                <p>
                  The platform employs a sophisticated Model Context Protocol (MCP) integration with specialized AI agents working in coordination:
                </p>
                <ul>
                  <li><strong>Chat Processor Agent</strong> - Analyzes and preprocesses user messages for intent and category classification</li>
                  <li><strong>Instruction Lookup Agent</strong> - Searches knowledge base using vector embeddings for relevant instructions</li>
                  <li><strong>Ticket Lookup Agent</strong> - Finds similar historical tickets using MCP-powered similarity search</li>
                  <li><strong>Ticket Formatter Agent</strong> - Structures responses and automates ticket creation with AI-enhanced context</li>
                  <li><strong>Support Team Orchestrator</strong> - Master coordinator managing all sub-agents for optimal workflow</li>
                </ul>
                
                <h3>Multi-AI Provider Integration</h3>
                <p>
                  Enterprise-grade AI provider support with tenant-specific configurations:
                </p>
                <ul>
                  <li><strong>Primary Providers</strong> - OpenAI, Google AI (Gemini), Anthropic (Claude), AWS Bedrock</li>
                  <li><strong>Tenant Isolation</strong> - Each tenant can configure different AI providers with strict data isolation</li>
                  <li><strong>Automatic Failover</strong> - Circuit breaker patterns with graceful degradation</li>
                  <li><strong>Operation-Specific Routing</strong> - Different AI providers for embeddings, chat, and ticket processing</li>
                </ul>

                <h3>MCP-Powered Agent Workflow</h3>
                <p>
                  When a customer interacts with the support system, the following MCP-coordinated multi-agent process occurs:
                </p>
                
                <h4>1. Ticket Creation & Initial Processing</h4>
                <p>
                  Customer message triggers the agent orchestration pipeline:
                </p>
                <ul>
                  <li><strong>Chat Widget Integration</strong> - Real-time message capture with session management</li>
                  <li><strong>Multi-Agent Orchestration</strong> - Support Team Agent coordinates specialized sub-agents</li>
                  <li><strong>Context Enrichment</strong> - Page context, user agent, and metadata collection</li>
                  <li><strong>Tenant Isolation</strong> - All processing respects multi-tenant data boundaries</li>
                </ul>

                <h4>2. MCP Multi-Agent Processing</h4>
                <p>
                  Specialized agents work in sequence using Model Context Protocol:
                </p>
                <ul>
                  <li><strong>Chat Processor</strong> - Analyzes message intent, extracts entities, determines category and urgency</li>
                  <li><strong>Instruction Lookup</strong> - Vector search through knowledge base using ChromaDB embeddings</li>
                  <li><strong>Ticket Lookup</strong> - MCP-powered similarity search through historical tickets</li>
                  <li><strong>LLM Processing</strong> - Context-aware response generation with relevant knowledge integration</li>
                  <li><strong>Ticket Formatter</strong> - Structures final response and creates database entries</li>
                </ul>

                <h4>3. Intelligent Resolution & Response</h4>
                <p>
                  The MCP orchestrator determines optimal resolution strategy:
                </p>
                <ul>
                  <li><strong>Automatic Resolution</strong> - High-confidence solutions delivered instantly with step-by-step instructions</li>
                  <li><strong>Knowledge-Enhanced Responses</strong> - Vector-searched knowledge base articles integrated into personalized responses</li>
                  <li><strong>Human Escalation</strong> - Complex issues routed to agents with full AI-generated context and suggested solutions</li>
                  <li><strong>Confidence Scoring</strong> - Each response includes confidence metrics and processing transparency</li>
                </ul>

                <h4>4. Integration & Persistence</h4>
                <p>
                  All interactions are automatically processed through the microservices architecture:
                </p>
                <ul>
                  <li><strong>Database Persistence</strong> - Tickets, messages, and interactions stored in PostgreSQL with full audit trail</li>
                  <li><strong>Vector Storage</strong> - ChromaDB stores embeddings for future similarity search and learning</li>
                  <li><strong>Third-Party Integration</strong> - Automatic synchronization with Jira, Zendesk, and custom systems</li>
                  <li><strong>Real-Time Monitoring</strong> - Circuit breaker patterns and health checks ensure system reliability</li>
                </ul>

                <h4>5. Analytics & Continuous Learning</h4>
                <p>
                  The platform continuously learns and improves through comprehensive monitoring:
                </p>
                <ul>
                  <li><strong>Agent Performance Metrics</strong> - Tracks processing times, confidence scores, and resolution success rates</li>
                  <li><strong>Multi-Tenant Analytics</strong> - Isolated reporting and insights for each tenant organization</li>
                  <li><strong>Vector Search Optimization</strong> - Embeddings and similarity search improve with usage patterns</li>
                  <li><strong>MCP Workflow Analytics</strong> - Detailed breakdown of agent coordination and efficiency metrics</li>
                </ul>

                <h3>Security & Compliance Features</h3>
                <p>
                  The platform incorporates enterprise-grade security measures:
                </p>
                <ul>
                  <li><strong>Data Isolation</strong> - Complete separation between tenant data</li>
                  <li><strong>Role-Based Access</strong> - Granular permissions for different user types</li>
                  <li><strong>Authentication Options</strong> - MFA and SSO integration</li>
                  <li><strong>Audit Logging</strong> - Comprehensive logging of all system activities</li>
                  <li><strong>Data Encryption</strong> - Both at rest and in transit</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Core Features</CardTitle>
              <CardDescription>
                Explore the powerful features that make AI Support Platform the ideal solution for modern customer support.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Multi-Agent AI Chat System</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sophisticated MCP-powered multi-agent system with transparent workflow visualization and intelligent processing.
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside ml-4 text-muted-foreground">
                    <li>Behind-the-scenes agent visualization</li>
                    <li>Confidence scoring and processing transparency</li>
                    <li>Multi-provider AI integration (OpenAI, Google, Anthropic, Bedrock)</li>
                    <li>Real-time agent coordination and workflow</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Server className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">MCP Agent Orchestration</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Model Context Protocol integration with specialized agents for comprehensive ticket processing and resolution.
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside ml-4 text-muted-foreground">
                    <li>Chat Processor Agent for intent analysis</li>
                    <li>Instruction Lookup Agent with vector search</li>
                    <li>Ticket Lookup Agent for similarity matching</li>
                    <li>Support Team Orchestrator coordination</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Key className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Enterprise Multi-Tenancy</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Complete tenant isolation with enterprise-grade security and tenant-specific AI agent resources.
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside ml-4 text-muted-foreground">
                    <li>Tenant-isolated agent resources and knowledge bases</li>
                    <li>Per-tenant AI provider configurations</li>
                    <li>RBAC with SSO and MFA support</li>
                    <li>Tenant-specific vector storage isolation</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <GitMerge className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Microservices Integration</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Loosely coupled microservices architecture with comprehensive third-party system integrations.
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside ml-4 text-muted-foreground">
                    <li>Agent Orchestrator Service (Python FastAPI)</li>
                    <li>Data Service with PostgreSQL persistence</li>
                    <li>Vector Storage Service with ChromaDB</li>
                    <li>Real-time monitoring and circuit breaker patterns</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Features</CardTitle>
              <CardDescription>
                Enterprise-grade capabilities for scaling your support operations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <h3>Authentication & Security</h3>
                <p>
                  Enterprise-grade security features to protect your customer data:
                </p>
                <ul>
                  <li><strong>Multi-factor Authentication (MFA)</strong> - Add an extra layer of security for user accounts.</li>
                  <li><strong>Single Sign-On (SSO)</strong> - Integrate with Google, Microsoft, and custom SAML providers.</li>
                  <li><strong>Role-Based Access Control</strong> - Granular permissions for different user roles.</li>
                  <li><strong>API Key Authentication</strong> - Secure access for machine-to-machine integrations.</li>
                </ul>

                <h3>Analytics & Reporting</h3>
                <p>
                  Comprehensive dashboards and reports to monitor support performance:
                </p>
                <ul>
                  <li><strong>Ticket Volume Analysis</strong> - Track ticket volumes by category, time, and source.</li>
                  <li><strong>Resolution Time Metrics</strong> - Measure how quickly issues are resolved.</li>
                  <li><strong>AI Efficiency</strong> - Monitor automation rates and AI resolution success.</li>
                  <li><strong>Agent Performance</strong> - Track individual and team performance metrics.</li>
                  <li><strong>Chat Widget Analytics</strong> - Monitor usage, interactions, and effectiveness of deployed chat widgets.</li>
                </ul>

                <h3>Knowledge Management</h3>
                <p>
                  Tools to build and maintain your knowledge base:
                </p>
                <ul>
                  <li><strong>Custom Data Sources</strong> - Add URLs, documents, and structured knowledge.</li>
                  <li><strong>Automatic Knowledge Extraction</strong> - AI identifies important information from past tickets.</li>
                  <li><strong>Content Recommendations</strong> - AI suggests knowledge base updates based on customer queries.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integration Guide</CardTitle>
              <CardDescription>
                Learn how to integrate AI Support Platform with your website, application, or existing systems.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
                <h3>Chat Widget Integration</h3>
                <p>
                  Easily add the AI Support chatbot to your website with a simple code snippet:
                </p>
                <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                  <code>{`<script>
  (function(w,d,s,o,f,js,fjs){
    w['AISupportWidget']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','aisp','https://widget.aisupport.example/loader.js'));
  
  aisp('init', { 
    tenantId: 'YOUR_TENANT_ID',
    apiKey: 'YOUR_API_KEY',
    theme: 'light'
  });
</script>`}</code>
                </pre>
                <p>
                  For a complete list of customization options, visit the <Link href="/api" className="text-primary underline">API Reference</Link>.
                </p>

                <h3>Chat Widget Analytics</h3>
                <p>
                  The chat widget includes built-in analytics tracking to help you monitor usage and effectiveness:
                </p>
                <ul>
                  <li><strong>Usage Metrics</strong> - Track interactions, messages received, and tickets created</li>
                  <li><strong>User Data</strong> - Gather information about client websites, user agents, and geographic regions</li>
                  <li><strong>Performance Tracking</strong> - Monitor response times and resolution rates</li>
                </ul>
                <p>
                  To enable analytics tracking, include the <code>reportData</code> parameter in your widget configuration:
                </p>
                <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                  <code>{`aisp('init', { 
  tenantId: 'YOUR_TENANT_ID',
  apiKey: 'YOUR_API_KEY',
  theme: 'light',
  reportData: true,  // Enable analytics tracking
  adminId: YOUR_ADMIN_ID  // Associate data with your admin account
});`}</code>
                </pre>
                <p>
                  View your widget analytics in the admin dashboard under <strong>Chat Widget → Widget Analytics</strong>. 
                  The dashboard provides detailed charts and tables showing widget performance across all your deployments.
                </p>
                
                <h3>Email Integration</h3>
                <p>
                  Connect your support email address to automatically create tickets from incoming messages:
                </p>
                <ol>
                  <li>Go to Settings &gt; Email Configuration in your admin dashboard</li>
                  <li>Add your SMTP and IMAP server details</li>
                  <li>Configure email templates and notification settings</li>
                  <li>Test the connection to ensure proper functionality</li>
                </ol>
                <p>
                  The platform will now monitor your support email inbox and create tickets automatically.
                </p>
                
                <h3>Third-Party Ticketing Systems</h3>
                <p>
                  Integrate with existing ticketing systems like Zendesk and Jira:
                </p>
                <ol>
                  <li>Go to Integrations &gt; Ticketing Systems in your admin dashboard</li>
                  <li>Select the system you want to connect (Zendesk, Jira)</li>
                  <li>Enter the required credentials and connection details</li>
                  <li>Configure synchronization settings</li>
                  <li>Test the connection to verify successful integration</li>
                </ol>
                <p>
                  Once integrated, tickets will be automatically synchronized between systems, allowing you to leverage AI features while maintaining your existing workflows.
                </p>
                
                <h3>Custom API Integration</h3>
                <p>
                  For advanced use cases, leverage our RESTful API for custom integrations:
                </p>
                <ul>
                  <li>Generate API keys in your admin dashboard under Settings &gt; API Keys</li>
                  <li>Use the API documentation to understand available endpoints</li>
                  <li>Implement custom logic for your specific business requirements</li>
                </ul>
                <p>
                  For detailed API documentation, see the <Link href="/api" className="text-primary underline">API Reference</Link> section.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Quick Reference</CardTitle>
              <CardDescription>
                Basic information about the API. For complete documentation, visit the API reference page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p>
                  The AI Support Platform provides a comprehensive RESTful API for integrating with your applications and services. For full API documentation, visit the <Link href="/api" className="text-primary underline">API Reference</Link> page.
                </p>
                
                <h3>Authentication</h3>
                <p>
                  All API requests require authentication using an API key. Add your API key to the request headers:
                </p>
                <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                  <code>{`Authorization: Bearer YOUR_API_KEY`}</code>
                </pre>
                
                <h3>Base URL</h3>
                <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                  <code>{`https://api.aisupport.example/v1`}</code>
                </pre>
                
                <h3>Common Endpoints</h3>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Method</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>/tickets</code></td>
                      <td>GET</td>
                      <td>List all tickets</td>
                    </tr>
                    <tr>
                      <td><code>/tickets</code></td>
                      <td>POST</td>
                      <td>Create a new ticket</td>
                    </tr>
                    <tr>
                      <td><code>/tickets/{'{id}'}</code></td>
                      <td>GET</td>
                      <td>Get a specific ticket</td>
                    </tr>
                    <tr>
                      <td><code>/tickets/{'{id}'}</code></td>
                      <td>PATCH</td>
                      <td>Update a ticket</td>
                    </tr>
                    <tr>
                      <td><code>/tickets/{'{id}'}/messages</code></td>
                      <td>GET</td>
                      <td>Get messages for a ticket</td>
                    </tr>
                    <tr>
                      <td><code>/tickets/{'{id}'}/messages</code></td>
                      <td>POST</td>
                      <td>Add a message to a ticket</td>
                    </tr>
                    <tr>
                      <td><code>/chatbot/message</code></td>
                      <td>POST</td>
                      <td>Send a message to the chatbot</td>
                    </tr>
                    <tr>
                      <td><code>/widget-analytics/{'{apiKey}'}</code></td>
                      <td>GET</td>
                      <td>Get analytics for a specific widget</td>
                    </tr>
                    <tr>
                      <td><code>/widget-analytics/{'{apiKey}'}</code></td>
                      <td>POST</td>
                      <td>Update analytics for a widget instance</td>
                    </tr>
                    <tr>
                      <td><code>/admin/widget-analytics</code></td>
                      <td>GET</td>
                      <td>Get all widget analytics for an admin</td>
                    </tr>
                  </tbody>
                </table>
                
                <div className="mt-4">
                  <Link href="/api" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                    View Full API Documentation
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}