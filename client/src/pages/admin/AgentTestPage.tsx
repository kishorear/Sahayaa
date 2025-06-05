import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Brain, MessageSquare, Shield, TrendingUp, Clock, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PreprocessorResult {
  normalized_prompt: string;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: 'positive' | 'neutral' | 'negative';
  masked_pii: string[];
  original_message: string;
  session_id: string;
}

interface PreprocessorStatus {
  name: string;
  available: boolean;
  geminiConfigured: boolean;
  sessionCount: number;
  capabilities: string[];
}

interface TestResult {
  success: boolean;
  preprocessing_result: PreprocessorResult;
  preprocessor_status: PreprocessorStatus;
  test_info: {
    message: string;
    session_id: string;
    agent_available: boolean;
  };
}

const sampleMessages = [
  {
    label: "Critical Emergency",
    message: "Help! My system is completely down and I need urgent support ASAP. This is a critical emergency!",
    expectedUrgency: "CRITICAL"
  },
  {
    label: "Casual Question",
    message: "Hi there! I have a quick question about setting up my account. Nothing urgent, just when you have time.",
    expectedUrgency: "LOW"
  },
  {
    label: "PII Detection Test",
    message: "My email is john.doe@company.com and my phone number is 555-123-4567. I need help with my order #12345.",
    expectedUrgency: "LOW"
  },
  {
    label: "Medium Priority",
    message: "I'm having trouble with the billing system. It's affecting multiple customers but we have a workaround.",
    expectedUrgency: "MEDIUM"
  }
];

export default function AgentTestPage() {
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState(`test_${Date.now()}`);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const { toast } = useToast();

  const testPreprocessor = async () => {
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to test the preprocessor.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/test/preprocessor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          sessionId: sessionId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        toast({
          title: "Test Completed",
          description: "Chat Preprocessor Agent test completed successfully.",
        });
      } else {
        throw new Error(data.error || 'Test failed');
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to test preprocessor",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleMessage = (sampleMessage: string) => {
    setMessage(sampleMessage);
    setSessionId(`test_${Date.now()}`);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500';
      case 'neutral': return 'bg-blue-500';
      case 'negative': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Chat Preprocessor Agent Test</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test the Chat Preprocessor Agent's capabilities including message normalization, 
          urgency classification, sentiment analysis, and PII detection.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Input
            </CardTitle>
            <CardDescription>
              Enter a message to test the Chat Preprocessor Agent's analysis capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-id">Session ID</Label>
              <Input
                id="session-id"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                placeholder="test_session_123"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message here..."
                rows={4}
              />
            </div>

            <Button 
              onClick={testPreprocessor} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Processing..." : "Test Preprocessor"}
            </Button>

            <Separator />

            <div className="space-y-2">
              <Label>Sample Messages</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sampleMessages.map((sample, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => loadSampleMessage(sample.message)}
                    className="text-left justify-start h-auto p-3"
                  >
                    <div>
                      <div className="font-medium text-sm">{sample.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {sample.message.substring(0, 50)}...
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Analysis Results
            </CardTitle>
            <CardDescription>
              Chat Preprocessor Agent analysis output and system status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {/* Agent Status */}
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Agent Status
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Available:</span>
                      <Badge variant={result.preprocessor_status.available ? "default" : "destructive"} className="ml-2">
                        {result.preprocessor_status.available ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gemini:</span>
                      <Badge variant={result.preprocessor_status.geminiConfigured ? "default" : "secondary"} className="ml-2">
                        {result.preprocessor_status.geminiConfigured ? "Configured" : "Not Configured"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sessions:</span>
                      <span className="ml-2 font-medium">{result.preprocessor_status.sessionCount}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Analysis Results */}
                <div className="space-y-3">
                  <h4 className="font-medium">Analysis Results</h4>
                  
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Original Message</Label>
                      <div className="p-2 bg-muted rounded text-sm">
                        {result.preprocessing_result.original_message}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Normalized Prompt</Label>
                      <div className="p-2 bg-muted rounded text-sm">
                        {result.preprocessing_result.normalized_prompt}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Urgency Level</Label>
                      <Badge className={`${getUrgencyColor(result.preprocessing_result.urgency)} text-white mt-1`}>
                        {result.preprocessing_result.urgency}
                      </Badge>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Sentiment</Label>
                      <Badge className={`${getSentimentColor(result.preprocessing_result.sentiment)} text-white mt-1`}>
                        {result.preprocessing_result.sentiment}
                      </Badge>
                    </div>
                  </div>

                  {result.preprocessing_result.masked_pii.length > 0 && (
                    <div>
                      <Label className="text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        PII Detected & Masked
                      </Label>
                      <div className="space-y-1 mt-1">
                        {result.preprocessing_result.masked_pii.map((pii, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {pii}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Capabilities */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Agent Capabilities
                  </Label>
                  <div className="flex flex-wrap gap-1">
                    {result.preprocessor_status.capabilities.map((capability, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {capability.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No test results yet. Run a test to see the analysis.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Text Normalization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Converts raw user input into clean, structured text for better processing by downstream agents.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Urgency Classification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Automatically categorizes messages by urgency level (Critical, High, Medium, Low) for proper routing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              PII Protection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Detects and masks personally identifiable information (emails, phone numbers) for privacy compliance.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}