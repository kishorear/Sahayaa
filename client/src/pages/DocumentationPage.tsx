import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Code, MessageSquare, Puzzle, Key, CloudLightning, Server, GitMerge } from "lucide-react";
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

      <Tabs defaultValue="getting-started" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="getting-started">
            <div className="flex items-center">
              <Puzzle className="mr-2 h-4 w-4" />
              Getting Started
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