import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, Ticket, FileText, Zap } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface TicketResponse {
  success: boolean;
  ticket: {
    id: number;
    tenantTicketId?: number;
    title: string;
    description: string;
    category: string;
    complexity: string;
    status: string;
    createdAt: string;
  };
  agentInsights?: {
    category: string;
    urgency: string;
    confidence: number;
    processingTime: number;
  };
  suggestions: Array<{
    type: string;
    title: string;
    description: string;
    actions?: string[];
    steps?: string[];
  }>;
}

export default function WidgetTestPage() {
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ticketResult, setTicketResult] = useState<TicketResponse | null>(null);

  const sendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setConversation(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Send to widget chat endpoint
      const response = await fetch('/api/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 1,
          message: currentMessage,
          sessionId: `test_${Date.now()}`,
          context: {
            url: window.location.href,
            title: 'Widget Test Page'
          }
        })
      });

      const data = await response.json();

      if (data.message) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString()
        };

        setConversation(prev => [...prev, assistantMessage]);
      }

      setCurrentMessage('');
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createTicket = async () => {
    if (conversation.length === 0) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/widget/create-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: 1,
          sessionId: `test_${Date.now()}`,
          conversation: conversation,
          context: {
            url: window.location.href,
            title: 'Widget Test Page',
            userAgent: navigator.userAgent
          }
        })
      });

      const data = await response.json();
      setTicketResult(data);
    } catch (error) {
      console.error('Ticket creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Widget Chat & Ticket Creation Test</h1>
        <p className="text-muted-foreground">
          Test the complete five-agent pipeline: chat processing, LLM-generated ticket titles/descriptions, and agent insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat Interface
            </CardTitle>
            <CardDescription>
              Send messages to test the widget chat with agent insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chat Messages */}
            <div className="h-64 overflow-y-auto space-y-2 border rounded p-3 bg-muted/30">
              {conversation.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Start a conversation...</p>
              ) : (
                conversation.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-2 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <div className="text-sm font-medium mb-1 capitalize">{msg.role}</div>
                      <div className="text-sm">{msg.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={isLoading}
              />
              <Button onClick={sendMessage} disabled={isLoading || !currentMessage.trim()}>
                Send
              </Button>
            </div>

            {/* Create Ticket Button */}
            <Separator />
            <Button 
              onClick={createTicket} 
              disabled={isLoading || conversation.length === 0}
              className="w-full"
              variant="outline"
            >
              <Ticket className="h-4 w-4 mr-2" />
              Create Ticket from Conversation
            </Button>
          </CardContent>
        </Card>

        {/* Ticket Result */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ticket Creation Result
            </CardTitle>
            <CardDescription>
              LLM-generated title and description with agent analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!ticketResult ? (
              <p className="text-muted-foreground text-center py-8">
                Create a ticket to see results...
              </p>
            ) : ticketResult.success ? (
              <div className="space-y-4">
                {/* Ticket Details */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium">Ticket #{ticketResult.ticket.tenantTicketId || ticketResult.ticket.id}</h3>
                    <Badge variant="outline">{ticketResult.ticket.status}</Badge>
                  </div>
                  
                  <h4 className="font-semibold mb-2">{ticketResult.ticket.title}</h4>
                  
                  <div className="text-sm text-muted-foreground mb-3">
                    <span className="font-medium">Category:</span> {ticketResult.ticket.category} | 
                    <span className="font-medium"> Complexity:</span> {ticketResult.ticket.complexity}
                  </div>
                  
                  <div className="text-sm">
                    <div className="font-medium mb-1">Description:</div>
                    <div className="bg-muted/50 p-2 rounded text-xs whitespace-pre-wrap">
                      {ticketResult.ticket.description}
                    </div>
                  </div>
                </div>

                {/* Agent Insights */}
                {ticketResult.agentInsights && (
                  <div className="p-4 border rounded-lg bg-blue-50/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <h4 className="font-medium text-blue-900">Agent Analysis</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Category:</span> {ticketResult.agentInsights.category}
                      </div>
                      <div>
                        <span className="font-medium">Urgency:</span> {ticketResult.agentInsights.urgency}
                      </div>
                      <div>
                        <span className="font-medium">Confidence:</span> {(ticketResult.agentInsights.confidence * 100).toFixed(1)}%
                      </div>
                      <div>
                        <span className="font-medium">Processing:</span> {ticketResult.agentInsights.processingTime}ms
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {ticketResult.suggestions && ticketResult.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Suggestions</h4>
                    {ticketResult.suggestions.slice(0, 2).map((suggestion, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-green-50/50">
                        <div className="font-medium text-green-900 mb-1">{suggestion.title}</div>
                        <div className="text-sm text-green-700 mb-2">{suggestion.description}</div>
                        {suggestion.steps && (
                          <div className="text-xs">
                            <div className="font-medium mb-1">Recommended steps:</div>
                            <ul className="list-disc list-inside space-y-1">
                              {suggestion.steps.slice(0, 3).map((step, stepIdx) => (
                                <li key={stepIdx}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {suggestion.actions && (
                          <div className="text-xs">
                            <div className="font-medium mb-1">Available actions:</div>
                            <div className="flex gap-1 flex-wrap">
                              {suggestion.actions.slice(0, 3).map((action, actionIdx) => (
                                <Badge key={actionIdx} variant="secondary" className="text-xs">
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-red-600 text-center py-8">
                Failed to create ticket
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sample Messages */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Sample Test Messages</CardTitle>
          <CardDescription>Try these messages to test different scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentMessage("I can't log into my account and need help resetting my password")}
            >
              Account Issue
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentMessage("My payment was charged twice this month and I need a refund")}
            >
              Billing Problem
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentMessage("The API is returning 500 errors and my integration is broken")}
            >
              Technical Issue
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentMessage("URGENT: Our production system is down and customers can't access our service")}
            >
              Emergency Issue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}