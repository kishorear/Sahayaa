import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Code, MessageSquare, Puzzle, Key, CloudLightning, Server, GitMerge, HelpCircle } from "lucide-react";
import { Link } from "wouter";

export default function DocumentationPage() {
  document.title = "Documentation | AI Support Platform";

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-7xl">
      <div className="flex flex-col space-y-4 mb-8">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Documentation</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Comprehensive guides and documentation for the AI Support Platform
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
                <h3>What is AI Support Platform?</h3>
                <p>
                  AI Support Platform is an advanced support ticket management system powered by artificial intelligence. It leverages cutting-edge technology to automate and enhance customer support workflows, reducing resolution times and improving customer satisfaction.
                </p>
                
                <h3>Key Benefits</h3>
                <ul>
                  <li><strong>Automated Ticket Classification</strong> - AI automatically categorizes support tickets based on content, ensuring they are routed to the right department.</li>
                  <li><strong>Instant Resolutions</strong> - Simple issues are resolved automatically without human intervention.</li>
                  <li><strong>Context Enrichment</strong> - Complex tickets are enhanced with relevant information before reaching human agents.</li>
                  <li><strong>Reduced Response Time</strong> - AI-powered responses and suggestions help agents respond faster.</li>
                  <li><strong>Multi-Channel Support</strong> - Handle support tickets from chat, email, and other channels in one place.</li>
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
                <h3>Platform Architecture Overview</h3>
                <p>
                  The AI Support Platform is built on a modern, scalable architecture designed to handle enterprise support operations efficiently. It consists of several interconnected components working together:
                </p>
                <ul>
                  <li><strong>Multi-Tenant Database</strong> - Securely stores data for multiple organizations with complete isolation</li>
                  <li><strong>AI Processing Pipeline</strong> - Analyzes and processes customer inquiries using multiple AI providers</li>
                  <li><strong>Integration Layer</strong> - Connects with third-party systems like Jira and Zendesk</li>
                  <li><strong>Web Application</strong> - Provides administrative interface and dashboards</li>
                  <li><strong>Embeddable Chat Widget</strong> - Customer-facing component that can be integrated into any website</li>
                </ul>

                <h3>Multi-AI Provider System</h3>
                <p>
                  The platform uses a sophisticated multi-AI provider architecture that enables organizations to leverage different AI technologies simultaneously:
                </p>
                <ul>
                  <li><strong>Primary Provider Selection</strong> - Configure one primary AI provider (OpenAI, Anthropic, Google Gemini, or AWS Bedrock)</li>
                  <li><strong>Provider Failover</strong> - Automatic fallback to secondary providers if the primary is unavailable</li>
                  <li><strong>Operation-Specific Routing</strong> - Different operations (chat, ticket classification, auto-resolution) can use different AI providers</li>
                  <li><strong>Custom Provider Integration</strong> - Support for custom AI providers through standardized REST API interface</li>
                </ul>

                <h3>End-to-End Support Workflow</h3>
                <p>
                  When a customer interacts with the support system, the following process takes place:
                </p>
                
                <h4>1. Initial Contact</h4>
                <p>
                  Customer initiates contact through one of several channels:
                </p>
                <ul>
                  <li><strong>Chat Widget</strong> - Embedded in your website or application</li>
                  <li><strong>Email</strong> - Sent to your configured support email address</li>
                  <li><strong>API</strong> - Via direct API call from your other systems</li>
                </ul>

                <h4>2. AI Analysis & Classification</h4>
                <p>
                  The system processes the inquiry using AI capabilities:
                </p>
                <ul>
                  <li><strong>NLP Processing</strong> - Natural language processing extracts key details</li>
                  <li><strong>Knowledge Base Lookup</strong> - Relevant documentation is retrieved from your knowledge base</li>
                  <li><strong>Classification</strong> - Ticket is categorized and assigned complexity level</li>
                  <li><strong>Auto-Resolution Assessment</strong> - System determines if the issue can be automatically resolved</li>
                </ul>

                <h4>3. Resolution Pathways</h4>
                <p>
                  Based on the analysis, the ticket follows one of these paths:
                </p>
                <ul>
                  <li><strong>Path A: Automatic Resolution</strong> - Simple issues are resolved by the AI without human intervention</li>
                  <li><strong>Path B: Guided Self-Service</strong> - AI suggests knowledge base articles that may resolve the issue</li>
                  <li><strong>Path C: Human Agent</strong> - Complex issues are routed to appropriate human agents with AI-enhanced context</li>
                </ul>

                <h4>4. Integration Actions</h4>
                <p>
                  For tickets requiring human attention, the platform automatically:
                </p>
                <ul>
                  <li><strong>Creates Tickets</strong> - In both the platform database and any connected third-party systems (e.g., Jira, Zendesk)</li>
                  <li><strong>Synchronizes Updates</strong> - Changes made in either system are reflected in both places</li>
                  <li><strong>Attaches Context</strong> - AI-generated notes and relevant knowledge are included</li>
                </ul>

                <h4>5. Analytics & Learning</h4>
                <p>
                  Throughout the process, the system:
                </p>
                <ul>
                  <li><strong>Collects Performance Data</strong> - Tracks resolution times, customer satisfaction, and AI accuracy</li>
                  <li><strong>Generates Reports</strong> - Creates actionable insights for continuous improvement</li>
                  <li><strong>Suggests Knowledge Base Updates</strong> - Identifies gaps in documentation based on customer inquiries</li>
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
                    <h3 className="font-medium">AI-Powered Chatbot</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Intelligent chatbot interface that handles customer inquiries and collects information for ticket creation.
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside ml-4 text-muted-foreground">
                    <li>Natural language understanding</li>
                    <li>Context-aware responses</li>
                    <li>Multilingual support</li>
                    <li>Seamless human handoff</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Server className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Smart Ticket Management</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Automated classification, prioritization, and routing of support tickets.
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside ml-4 text-muted-foreground">
                    <li>AI-based categorization</li>
                    <li>Complexity assessment</li>
                    <li>Automated resolution for simple issues</li>
                    <li>Intelligent assignment to agents</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Key className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Multi-Tenancy</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Secure isolation of data and customization for different tenants on a single platform.
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside ml-4 text-muted-foreground">
                    <li>Per-tenant customization</li>
                    <li>Custom branding</li>
                    <li>Role-based access control</li>
                    <li>Tenant-specific knowledge bases</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <GitMerge className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Third-Party Integrations</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Seamless connections with popular ticketing systems and services.
                  </p>
                  <ul className="text-sm space-y-1 list-disc list-inside ml-4 text-muted-foreground">
                    <li>Zendesk integration</li>
                    <li>Jira integration</li>
                    <li>Email service connector</li>
                    <li>Custom webhook support</li>
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
  );
}