import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Code, Terminal, Database, GitMerge, MessageSquare, SquareUser, Bot, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ApiDocsPage() {
  document.title = "API Documentation | AI Support Platform";

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-7xl">
      <div className="flex flex-col space-y-4 mb-8">
        <div className="flex items-center space-x-2">
          <Code className="h-6 w-6" />
          <h1 className="text-3xl font-bold">API Documentation</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Comprehensive API reference for integrating with the AI Support Platform
        </p>
      </div>

      <Tabs defaultValue="overview" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <div className="flex items-center">
              <Terminal className="mr-2 h-4 w-4" />
              Overview
            </div>
          </TabsTrigger>
          <TabsTrigger value="authentication">
            <div className="flex items-center">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Authentication
            </div>
          </TabsTrigger>
          <TabsTrigger value="endpoints">
            <div className="flex items-center">
              <GitMerge className="mr-2 h-4 w-4" />
              Endpoints
            </div>
          </TabsTrigger>
          <TabsTrigger value="examples">
            <div className="flex items-center">
              <Code className="mr-2 h-4 w-4" />
              Code Examples
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Overview</CardTitle>
              <CardDescription>
                Introduction to the AI Support Platform REST API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose max-w-none">
                <h3>Introduction</h3>
                <p>
                  The AI Support Platform API provides a comprehensive set of endpoints for integrating our powerful AI support capabilities into your applications. The API is organized around REST principles, uses JSON for request and response payloads, and relies on standard HTTP response codes, authentication, and verbs.
                </p>
                
                <h3>Base URL</h3>
                <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                  <code>{`https://api.aisupport.example/v1`}</code>
                </pre>
                <p>
                  All API endpoints are relative to this base URL. The API is versioned to ensure compatibility as new features are added.
                </p>
                
                <h3>Content Type</h3>
                <p>
                  All requests should use the <code>application/json</code> content type when sending data. Responses will also be in JSON format.
                </p>
                <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                  <code>{`Content-Type: application/json`}</code>
                </pre>
                
                <h3>Rate Limiting</h3>
                <p>
                  API requests are rate-limited to ensure service stability. The current limits are:
                </p>
                <ul>
                  <li>100 requests per minute for standard plans</li>
                  <li>300 requests per minute for premium plans</li>
                  <li>1000 requests per minute for enterprise plans</li>
                </ul>
                <p>
                  Rate limit headers are included in all API responses:
                </p>
                <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                  <code>{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1624567890`}</code>
                </pre>
                
                <h3>Error Handling</h3>
                <p>
                  The API uses standard HTTP status codes to indicate the success or failure of a request. In general:
                </p>
                <ul>
                  <li><code>2xx</code> - Success</li>
                  <li><code>4xx</code> - Client error (e.g., invalid request, authentication issue)</li>
                  <li><code>5xx</code> - Server error</li>
                </ul>
                <p>
                  Error responses include a JSON body with details:
                </p>
                <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                  <code>{`{
  "error": {
    "code": "invalid_request",
    "message": "The request was invalid",
    "details": "The field 'title' is required"
  }
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Methods for authenticating with the AI Support Platform API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <h3>API Key Authentication</h3>
                <p>
                  Most API endpoints require authentication via an API key. Each tenant can generate multiple API keys with different scopes from the admin dashboard.
                </p>
                <p>
                  To authenticate, include your API key in the Authorization header:
                </p>
                <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                  <code>{`Authorization: Bearer YOUR_API_KEY`}</code>
                </pre>
                
                <h3>Generating API Keys</h3>
                <ol>
                  <li>Log in to your admin dashboard</li>
                  <li>Navigate to Settings &gt; API Keys</li>
                  <li>Click "Generate New API Key"</li>
                  <li>Assign appropriate scopes to the key</li>
                  <li>Save and copy the generated key</li>
                </ol>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                  <strong>Important:</strong> API keys provide full access to your account. Never share them publicly or include them in client-side code.
                </div>
                
                <h3>Scopes</h3>
                <p>
                  API keys can be restricted to specific scopes:
                </p>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Scope</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><code>tickets:read</code></td>
                      <td>View tickets and their details</td>
                    </tr>
                    <tr>
                      <td><code>tickets:write</code></td>
                      <td>Create and update tickets</td>
                    </tr>
                    <tr>
                      <td><code>messages:read</code></td>
                      <td>View ticket messages</td>
                    </tr>
                    <tr>
                      <td><code>messages:write</code></td>
                      <td>Add messages to tickets</td>
                    </tr>
                    <tr>
                      <td><code>chatbot:access</code></td>
                      <td>Interact with the chatbot API</td>
                    </tr>
                    <tr>
                      <td><code>users:read</code></td>
                      <td>View user information</td>
                    </tr>
                    <tr>
                      <td><code>admin</code></td>
                      <td>Full administrative access</td>
                    </tr>
                  </tbody>
                </table>
                
                <h3>OAuth 2.0 (Coming Soon)</h3>
                <p>
                  Support for OAuth 2.0 authorization flow will be added in a future update, enabling more secure delegated access.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                Complete reference for all available API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tickets">
                <TabsList className="mb-4">
                  <TabsTrigger value="tickets">
                    <div className="flex items-center">
                      <Database className="mr-2 h-4 w-4" />
                      Tickets
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="messages">
                    <div className="flex items-center">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Messages
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="users">
                    <div className="flex items-center">
                      <SquareUser className="mr-2 h-4 w-4" />
                      Users
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="chatbot">
                    <div className="flex items-center">
                      <Bot className="mr-2 h-4 w-4" />
                      Chatbot
                    </div>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="tickets" className="space-y-4">
                  <div className="prose max-w-none">
                    <h3>Ticket Endpoints</h3>
                    
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md mr-2">GET</span>
                        <code>/tickets</code>
                      </div>
                      <p className="text-sm">List all tickets with optional filtering</p>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer">Query Parameters</summary>
                        <div className="pl-4 mt-2 space-y-2">
                          <div>
                            <code className="text-sm">status</code>
                            <p className="text-sm text-muted-foreground">Filter by ticket status (open, pending, resolved, closed)</p>
                          </div>
                          <div>
                            <code className="text-sm">category</code>
                            <p className="text-sm text-muted-foreground">Filter by ticket category</p>
                          </div>
                          <div>
                            <code className="text-sm">assignedTo</code>
                            <p className="text-sm text-muted-foreground">Filter by assigned user ID</p>
                          </div>
                          <div>
                            <code className="text-sm">page</code>
                            <p className="text-sm text-muted-foreground">Page number for pagination (default: 1)</p>
                          </div>
                          <div>
                            <code className="text-sm">limit</code>
                            <p className="text-sm text-muted-foreground">Number of results per page (default: 20, max: 100)</p>
                          </div>
                        </div>
                      </details>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer mt-2">Response Example</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "tickets": [
    {
      "id": 123,
      "title": "Cannot log in to account",
      "description": "I'm trying to log in but keep getting an error message",
      "status": "open",
      "category": "account",
      "priority": "high",
      "assignedTo": "user_id_1",
      "createdAt": "2023-03-15T12:00:00Z",
      "updatedAt": "2023-03-15T13:30:00Z"
    },
    // More tickets...
  ],
  "pagination": {
    "total": 243,
    "page": 1,
    "limit": 20,
    "pages": 13
  }
}`}</code>
                        </pre>
                      </details>
                    </div>
                    
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md mr-2">POST</span>
                        <code>/tickets</code>
                      </div>
                      <p className="text-sm">Create a new support ticket</p>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer">Request Body</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "title": "Unable to reset password",
  "description": "I requested a password reset but never received the email",
  "category": "account",
  "priority": "medium",
  "userEmail": "customer@example.com",
  "userName": "John Doe"
}`}</code>
                        </pre>
                      </details>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer mt-2">Response Example</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "id": 124,
  "title": "Unable to reset password",
  "description": "I requested a password reset but never received the email",
  "status": "open",
  "category": "account",
  "priority": "medium",
  "assignedTo": "user_id_2",
  "createdAt": "2023-03-16T09:45:00Z",
  "updatedAt": "2023-03-16T09:45:00Z",
  "userEmail": "customer@example.com",
  "userName": "John Doe"
}`}</code>
                        </pre>
                      </details>
                    </div>
                    
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md mr-2">GET</span>
                        <code>/tickets/{'{id}'}</code>
                      </div>
                      <p className="text-sm">Get details of a specific ticket by ID</p>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer mt-2">Response Example</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "id": 123,
  "title": "Cannot log in to account",
  "description": "I'm trying to log in but keep getting an error message",
  "status": "open",
  "category": "account",
  "priority": "high",
  "assignedTo": "user_id_1",
  "createdAt": "2023-03-15T12:00:00Z",
  "updatedAt": "2023-03-15T13:30:00Z",
  "userEmail": "jane@example.com",
  "userName": "Jane Smith",
  "metadata": {
    "browser": "Chrome 99",
    "os": "Windows 10",
    "source": "chat"
  }
}`}</code>
                        </pre>
                      </details>
                    </div>
                    
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-md mr-2">PATCH</span>
                        <code>/tickets/{'{id}'}</code>
                      </div>
                      <p className="text-sm">Update an existing ticket</p>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer">Request Body</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "status": "pending",
  "priority": "high",
  "assignedTo": "user_id_3"
}`}</code>
                        </pre>
                      </details>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer mt-2">Response Example</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "id": 123,
  "title": "Cannot log in to account",
  "description": "I'm trying to log in but keep getting an error message",
  "status": "pending",
  "category": "account",
  "priority": "high",
  "assignedTo": "user_id_3",
  "createdAt": "2023-03-15T12:00:00Z",
  "updatedAt": "2023-03-16T10:15:00Z"
}`}</code>
                        </pre>
                      </details>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="messages" className="space-y-4">
                  <div className="prose max-w-none">
                    <h3>Message Endpoints</h3>
                    
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md mr-2">GET</span>
                        <code>/tickets/{'{ticketId}'}/messages</code>
                      </div>
                      <p className="text-sm">Get all messages for a specific ticket</p>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer">Query Parameters</summary>
                        <div className="pl-4 mt-2 space-y-2">
                          <div>
                            <code className="text-sm">page</code>
                            <p className="text-sm text-muted-foreground">Page number for pagination (default: 1)</p>
                          </div>
                          <div>
                            <code className="text-sm">limit</code>
                            <p className="text-sm text-muted-foreground">Number of results per page (default: 50, max: 100)</p>
                          </div>
                        </div>
                      </details>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer mt-2">Response Example</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "messages": [
    {
      "id": 456,
      "ticketId": 123,
      "content": "I keep getting an 'invalid password' error when I try to log in",
      "sender": "customer",
      "senderName": "Jane Smith",
      "createdAt": "2023-03-15T12:00:00Z",
      "attachments": []
    },
    {
      "id": 457,
      "ticketId": 123,
      "content": "Could you please try resetting your password using the 'Forgot Password' link?",
      "sender": "agent",
      "senderName": "Support Agent",
      "createdAt": "2023-03-15T12:15:00Z",
      "attachments": []
    },
    // More messages...
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}`}</code>
                        </pre>
                      </details>
                    </div>
                    
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md mr-2">POST</span>
                        <code>/tickets/{'{ticketId}'}/messages</code>
                      </div>
                      <p className="text-sm">Add a new message to a ticket</p>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer">Request Body</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "content": "I tried resetting my password but still haven't received the email after 30 minutes",
  "sender": "customer",
  "senderName": "Jane Smith",
  "attachments": []
}`}</code>
                        </pre>
                      </details>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer mt-2">Response Example</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "id": 458,
  "ticketId": 123,
  "content": "I tried resetting my password but still haven't received the email after 30 minutes",
  "sender": "customer",
  "senderName": "Jane Smith",
  "createdAt": "2023-03-15T14:30:00Z",
  "attachments": []
}`}</code>
                        </pre>
                      </details>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                  <div className="prose max-w-none">
                    <h3>User Endpoints</h3>
                    
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md mr-2">GET</span>
                        <code>/users</code>
                      </div>
                      <p className="text-sm">List all users (requires admin scope)</p>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer">Query Parameters</summary>
                        <div className="pl-4 mt-2 space-y-2">
                          <div>
                            <code className="text-sm">role</code>
                            <p className="text-sm text-muted-foreground">Filter by user role (admin, support, engineer)</p>
                          </div>
                          <div>
                            <code className="text-sm">page</code>
                            <p className="text-sm text-muted-foreground">Page number for pagination (default: 1)</p>
                          </div>
                          <div>
                            <code className="text-sm">limit</code>
                            <p className="text-sm text-muted-foreground">Number of results per page (default: 20, max: 100)</p>
                          </div>
                        </div>
                      </details>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer mt-2">Response Example</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "users": [
    {
      "id": "user_id_1",
      "username": "john.admin",
      "name": "John Admin",
      "email": "john@example.com",
      "role": "admin",
      "createdAt": "2023-01-01T00:00:00Z"
    },
    {
      "id": "user_id_2",
      "username": "sarah.support",
      "name": "Sarah Support",
      "email": "sarah@example.com",
      "role": "support",
      "createdAt": "2023-01-15T00:00:00Z"
    },
    // More users...
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}`}</code>
                        </pre>
                      </details>
                    </div>
                    
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md mr-2">GET</span>
                        <code>/users/{'{id}'}</code>
                      </div>
                      <p className="text-sm">Get details of a specific user</p>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer mt-2">Response Example</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "id": "user_id_1",
  "username": "john.admin",
  "name": "John Admin",
  "email": "john@example.com",
  "role": "admin",
  "createdAt": "2023-01-01T00:00:00Z",
  "lastLogin": "2023-03-15T08:30:00Z"
}`}</code>
                        </pre>
                      </details>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="chatbot" className="space-y-4">
                  <div className="prose max-w-none">
                    <h3>Chatbot Endpoints</h3>
                    
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md mr-2">POST</span>
                        <code>/chatbot/message</code>
                      </div>
                      <p className="text-sm">Send a message to the AI chatbot</p>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer">Request Body</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "message": "I can't find how to change my shipping address",
  "sessionId": "chat_session_123",
  "userInfo": {
    "name": "Alex User",
    "email": "alex@example.com"
  },
  "context": {
    "previousMessages": [
      {
        "role": "user",
        "content": "Hi, I need help with my account"
      },
      {
        "role": "assistant",
        "content": "Hello! I'd be happy to help with your account. What specific issue are you having?"
      }
    ]
  }
}`}</code>
                        </pre>
                      </details>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer mt-2">Response Example</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "message": "You can change your shipping address by logging into your account, going to 'My Account' > 'Addresses', and then clicking 'Edit' next to your current address or 'Add New Address'. Would you like me to guide you through this step by step?",
  "action": null,
  "sessionId": "chat_session_123"
}`}</code>
                        </pre>
                      </details>
                    </div>
                    
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md mr-2">POST</span>
                        <code>/chatbot/ticket</code>
                      </div>
                      <p className="text-sm">Create a ticket from a chatbot conversation</p>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer">Request Body</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "sessionId": "chat_session_123",
  "userInfo": {
    "name": "Alex User",
    "email": "alex@example.com"
  },
  "summary": "User needs help finding where to change shipping address",
  "messages": [
    {
      "role": "user",
      "content": "Hi, I need help with my account"
    },
    {
      "role": "assistant",
      "content": "Hello! I'd be happy to help with your account. What specific issue are you having?"
    },
    {
      "role": "user",
      "content": "I can't find how to change my shipping address"
    },
    {
      "role": "assistant",
      "content": "You can change your shipping address by logging into your account, going to 'My Account' > 'Addresses', and then clicking 'Edit' next to your current address or 'Add New Address'. Would you like me to guide you through this step by step?"
    },
    {
      "role": "user",
      "content": "I tried that but the save button isn't working"
    }
  ]
}`}</code>
                        </pre>
                      </details>
                      <details>
                        <summary className="text-sm font-medium cursor-pointer mt-2">Response Example</summary>
                        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto mt-2">
                          <code>{`{
  "ticketId": 125,
  "status": "open",
  "category": "account",
  "priority": "medium",
  "assignedTo": "user_id_2"
}`}</code>
                        </pre>
                      </details>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Code Examples</CardTitle>
              <CardDescription>
                Sample code for common API operations in various programming languages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="javascript">
                <TabsList className="mb-4">
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                </TabsList>

                <TabsContent value="javascript" className="space-y-4">
                  <div className="prose max-w-none">
                    <h3>JavaScript/Node.js Examples</h3>
                    
                    <h4>Installing the SDK</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`npm install aisupport-api-client`}</code>
                    </pre>
                    
                    <h4>Authentication</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`const AISupportAPI = require('aisupport-api-client');

// Initialize with API key
const client = new AISupportAPI({
  apiKey: 'YOUR_API_KEY',
  baseUrl: 'https://api.aisupport.example/v1' // Optional, defaults to production
});`}</code>
                    </pre>
                    
                    <h4>Listing Tickets</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`// Using Promises
client.tickets.list({ status: 'open', limit: 10 })
  .then(response => {
    console.log(\`Found \${response.tickets.length} tickets\`);
    console.log(response.tickets);
  })
  .catch(error => {
    console.error('Error fetching tickets:', error);
  });

// Using async/await
async function getTickets() {
  try {
    const response = await client.tickets.list({ status: 'open', limit: 10 });
    console.log(\`Found \${response.tickets.length} tickets\`);
    console.log(response.tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
  }
}

getTickets();`}</code>
                    </pre>
                    
                    <h4>Creating a Ticket</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`const newTicket = {
  title: 'Payment processing failed',
  description: 'Customer reported payment failure on checkout',
  category: 'billing',
  priority: 'high',
  userEmail: 'customer@example.com',
  userName: 'Customer Name'
};

client.tickets.create(newTicket)
  .then(ticket => {
    console.log('Ticket created:', ticket);
  })
  .catch(error => {
    console.error('Error creating ticket:', error);
  });`}</code>
                    </pre>
                    
                    <h4>Interacting with the Chatbot</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`const chatMessage = {
  message: "How do I reset my password?",
  sessionId: "user_session_123",
  userInfo: {
    name: "User Name",
    email: "user@example.com"
  }
};

client.chatbot.sendMessage(chatMessage)
  .then(response => {
    console.log('Chatbot response:', response.message);
    
    if (response.action) {
      console.log('Action:', response.action);
    }
  })
  .catch(error => {
    console.error('Error sending message to chatbot:', error);
  });`}</code>
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="python" className="space-y-4">
                  <div className="prose max-w-none">
                    <h3>Python Examples</h3>
                    
                    <h4>Installing the SDK</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`pip install aisupport-api`}</code>
                    </pre>
                    
                    <h4>Authentication</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`from aisupport_api import AISupportClient

# Initialize with API key
client = AISupportClient(
    api_key='YOUR_API_KEY',
    base_url='https://api.aisupport.example/v1'  # Optional, defaults to production
)`}</code>
                    </pre>
                    
                    <h4>Listing Tickets</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`# Get all open tickets
try:
    response = client.tickets.list(status='open', limit=10)
    print(f"Found {len(response['tickets'])} tickets")
    for ticket in response['tickets']:
        print(f"{ticket['id']}: {ticket['title']} - {ticket['status']}")
except Exception as e:
    print(f"Error fetching tickets: {e}")`}</code>
                    </pre>
                    
                    <h4>Creating a Ticket</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`new_ticket = {
    'title': 'Unable to download invoice',
    'description': 'Customer cannot download their invoice from the account page',
    'category': 'billing',
    'priority': 'medium',
    'userEmail': 'customer@example.com',
    'userName': 'Customer Name'
}

try:
    ticket = client.tickets.create(new_ticket)
    print(f"Ticket created with ID: {ticket['id']}")
except Exception as e:
    print(f"Error creating ticket: {e}")`}</code>
                    </pre>
                    
                    <h4>Updating a Ticket</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`ticket_updates = {
    'status': 'resolved',
    'assignedTo': 'user_id_3'
}

try:
    updated_ticket = client.tickets.update(123, ticket_updates)
    print(f"Ticket {updated_ticket['id']} updated to status: {updated_ticket['status']}")
except Exception as e:
    print(f"Error updating ticket: {e}")`}</code>
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="curl" className="space-y-4">
                  <div className="prose max-w-none">
                    <h3>cURL Examples</h3>
                    
                    <h4>Authentication</h4>
                    <p>Add your API key to all requests with the Authorization header:</p>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.aisupport.example/v1/tickets`}</code>
                    </pre>
                    
                    <h4>Listing Tickets</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     "https://api.aisupport.example/v1/tickets?status=open&limit=10"`}</code>
                    </pre>
                    
                    <h4>Creating a Ticket</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`curl -X POST \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Website displays error on checkout",
       "description": "Customer gets a 500 error when trying to complete checkout",
       "category": "website",
       "priority": "high",
       "userEmail": "customer@example.com",
       "userName": "Customer Name"
     }' \
     https://api.aisupport.example/v1/tickets`}</code>
                    </pre>
                    
                    <h4>Updating a Ticket</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`curl -X PATCH \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "status": "resolved",
       "assignedTo": "user_id_3"
     }' \
     https://api.aisupport.example/v1/tickets/123`}</code>
                    </pre>
                    
                    <h4>Getting Ticket Messages</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`curl -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.aisupport.example/v1/tickets/123/messages`}</code>
                    </pre>
                    
                    <h4>Sending a Chatbot Message</h4>
                    <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md overflow-x-auto">
                      <code>{`curl -X POST \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "message": "How do I cancel my subscription?",
       "sessionId": "chat_session_123",
       "userInfo": {
         "name": "User Name",
         "email": "user@example.com"
       }
     }' \
     https://api.aisupport.example/v1/chatbot/message`}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-center mt-8">
        <Button className="mr-4" variant="outline" asChild>
          <a href="/docs">Return to Documentation</a>
        </Button>
        <Button asChild>
          <a href="https://github.com/yourusername/aisupport-api-examples" target="_blank" rel="noopener noreferrer">
            <GitMerge className="mr-2 h-4 w-4" />
            View Sample Projects
          </a>
        </Button>
      </div>
    </div>
  );
}