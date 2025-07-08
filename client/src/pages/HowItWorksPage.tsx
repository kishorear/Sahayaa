import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HowItWorksPage() {
  document.title = "How It Works | AI Support Platform";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <img src="/logo.svg" alt="Sahayaa AI Logo" className="w-8 h-8" />
                <span className="ml-2 text-xl font-bold">Sahayaa AI</span>
              </div>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/pricing">
                <span className="hover:text-primary transition-colors cursor-pointer">Pricing</span>
              </Link>
              <Link href="/docs">
                <span className="hover:text-primary transition-colors cursor-pointer">Documentation</span>
              </Link>
              <Link href="/api">
                <span className="hover:text-primary transition-colors cursor-pointer">API</span>
              </Link>
              <Link href="/how-it-works">
                <span className="text-primary font-medium">How It Works</span>
              </Link>
              <Link href="/auth">
                <Button size="sm">Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto py-12 px-4 md:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col space-y-4 mb-8">
          <h1 className="text-4xl font-bold">How It Works</h1>
          <p className="text-muted-foreground text-xl">
            A comprehensive guide to understanding the AI Support Platform
          </p>
        </div>

        <div className="space-y-12">
          <Card>
            <CardHeader>
              <CardTitle>Platform Architecture Overview</CardTitle>
              <CardDescription>
                The core components that power our support platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Multi-AI Provider System</CardTitle>
              <CardDescription>
                Leverage multiple AI technologies simultaneously
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
                <p>
                  The platform uses a sophisticated multi-AI provider architecture that enables organizations to leverage different AI technologies simultaneously:
                </p>
                <ul>
                  <li><strong>Primary Provider Selection</strong> - Configure one primary AI provider (OpenAI, Anthropic, Google Gemini, or AWS Bedrock)</li>
                  <li><strong>Provider Failover</strong> - Automatic fallback to secondary providers if the primary is unavailable</li>
                  <li><strong>Operation-Specific Routing</strong> - Different operations (chat, ticket classification, auto-resolution) can use different AI providers</li>
                  <li><strong>Custom Provider Integration</strong> - Support for custom AI providers through standardized REST API interface</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Agent-Driven Workflow System</CardTitle>
              <CardDescription>
                How specialized AI agents process each customer inquiry
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose max-w-none">
                <p>
                  Every customer interaction is processed through our intelligent AI agent system. Each workflow stage is handled by specialized AI agents working together:
                </p>
                
                <h4>1. Initial Contact & Processing</h4>
                <p>
                  Customer initiates contact through multiple channels, immediately processed by AI agents:
                </p>
                <ul>
                  <li><strong>Chat Widget</strong> - Embedded in your website with real-time AI agent responses</li>
                  <li><strong>Email</strong> - Automatically processed by AI agents for instant classification</li>
                  <li><strong>API</strong> - Direct integration with AI agent workflow endpoints</li>
                </ul>

                <h4>2. Multi-Agent MCP Processing Pipeline</h4>
                <p>
                  Each inquiry is processed by specialized AI agents using MCP (Model Context Protocol) features:
                </p>
                <ul>
                  <li><strong>Chat Processor Agent</strong> - Analyzes and extracts key information from customer messages</li>
                  <li><strong>Instruction Lookup Agent</strong> - Uses MCP to search through knowledge base and find relevant solutions</li>
                  <li><strong>Ticket Lookup Agent</strong> - Leverages MCP to find similar historical tickets with successful resolutions</li>
                  <li><strong>Ticket Formatter Agent</strong> - Structures MCP-sourced solution suggestions into actionable steps</li>
                  <li><strong>Support Team Agent</strong> - Orchestrates the MCP workflow and coordinates all other agents</li>
                </ul>

                <h4>3. MCP-Powered Solution Pathways</h4>
                <p>
                  Based on AI agent analysis, tickets follow intelligent resolution paths:
                </p>
                <ul>
                  <li><strong>Path A: MCP Solution Suggestions</strong> - For known issues, agents provide step-by-step solutions based on previous successful resolutions</li>
                  <li><strong>Path B: Knowledge Base Integration</strong> - Agents search and suggest relevant documentation with contextual matching</li>
                  <li><strong>Path C: Enhanced Human Handoff</strong> - For complex or new issues, agents prepare comprehensive context for human agents</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration Actions</CardTitle>
              <CardDescription>
                How tickets are handled across multiple systems
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
                <p>
                  For tickets requiring human attention, the platform automatically:
                </p>
                <ul>
                  <li><strong>Creates Tickets</strong> - In both the platform database and any connected third-party systems (e.g., Jira, Zendesk)</li>
                  <li><strong>Synchronizes Updates</strong> - Changes made in either system are reflected in both places</li>
                  <li><strong>Attaches Context</strong> - AI-generated notes and relevant knowledge are included</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analytics & Learning</CardTitle>
              <CardDescription>
                Continuous improvement through data analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
                <p>
                  Throughout the process, the system:
                </p>
                <ul>
                  <li><strong>Collects Performance Data</strong> - Tracks resolution times, customer satisfaction, and AI accuracy</li>
                  <li><strong>Generates Reports</strong> - Creates actionable insights for continuous improvement</li>
                  <li><strong>Suggests Knowledge Base Updates</strong> - Identifies gaps in documentation based on customer inquiries</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security & Compliance Features</CardTitle>
              <CardDescription>
                Enterprise-grade security measures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
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
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button size="lg" className="bg-primary text-white hover:bg-primary/90">
                Create an Account
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline">
                Read Documentation
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-900 mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center">
              <img src="/logo.svg" alt="Support AI Logo" className="w-6 h-6" />
              <span className="ml-2 text-lg font-bold">Support AI</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Support AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}