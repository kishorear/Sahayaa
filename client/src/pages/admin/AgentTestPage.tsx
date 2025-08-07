import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, MessageSquare, Shield, TrendingUp, Clock, CheckCircle2, AlertTriangle, Users, 
  Search, Database, FileText, Settings, RefreshCw, Play, Pause, Timer, Activity,
  Bot, Target, Zap, CheckSquare, GitBranch, Layers, Network, ArrowRight,
  Eye, Code, PlayCircle, StopCircle, Ticket, Server
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

interface InstructionResult {
  text: string;
  filename: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

interface InstructionLookupResult {
  success: boolean;
  instructions: InstructionResult[];
  searchQuery: string;
  totalFound: number;
  searchMethod: 'qdrant' | 'local_vector' | 'fallback';
  error?: string;
}

interface InstructionLookupStatus {
  name: string;
  available: boolean;
  qdrantConnected: boolean;
  googleAIConfigured: boolean;
  localVectorDocuments: number;
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

interface AgentWorkflowResult {
  success: boolean;
  ticket_id?: number;
  ticket_title: string;
  status: string;
  category: string;
  urgency: string;
  resolution_steps: string[];
  resolution_steps_count: number;
  confidence_score: number;
  processing_time_ms: number;
  created_at: string;
  workflow_steps: {
    preprocessing?: any;
    instruction_lookup?: any;
    ticket_lookup?: any;
    llm_resolution?: any;
    ticket_creation?: any;
    formatting?: any;
  };
  data_points: {
    knowledge_base_hits: number;
    similar_tickets_found: number;
    pii_instances_masked: number;
    ai_provider_used: string;
    tenant_isolation_verified: boolean;
  };
  error?: string;
}

interface ProcessingStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  data?: any;
  error?: string;
}

interface AgentSystemStatus {
  orchestrator_available: boolean;
  sub_agents: {
    chat_preprocessor: boolean;
    instruction_lookup: boolean;
    ticket_lookup: boolean;
    ticket_formatter: boolean;
  };
  external_services: {
    vector_storage: boolean;
    mcp_service: boolean;
    ai_providers: string[];
  };
  capabilities: string[];
}

interface InstructionTestResult {
  success: boolean;
  lookup_result: InstructionLookupResult;
  agent_status: InstructionLookupStatus;
  test_info: {
    message: string;
    topK: number;
    processing_time_ms: number;
    instructions_found: number;
    search_method: string;
  };
}

interface SimilarTicket {
  ticket_id: number;
  score: number;
  title?: string;
  category?: string;
  status?: string;
  resolution?: string;
  created_at?: string;
}

interface TicketLookupResult {
  success: boolean;
  similar_tickets: SimilarTicket[];
  search_query: string;
  total_found: number;
  search_method: 'fastapi_service' | 'local_fallback' | 'fallback';
  processing_time_ms: number;
  error?: string;
}

interface TicketLookupStatus {
  name: string;
  available: boolean;
  fastapi_service_connected: boolean;
  google_ai_configured: boolean;
  local_ticket_database: number;
  capabilities: string[];
}

interface TicketTestResult {
  success: boolean;
  lookup_result: TicketLookupResult;
  agent_status: TicketLookupStatus;
  test_info: {
    message: string;
    topK: number;
    processing_time_ms: number;
    tickets_found: number;
    search_method: string;
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
  const [tenantId, setTenantId] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [workflowResult, setWorkflowResult] = useState<AgentWorkflowResult | null>(null);
  const [systemStatus, setSystemStatus] = useState<AgentSystemStatus | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [activeTab, setActiveTab] = useState("workflow");
  const [isRealTimeMode, setIsRealTimeMode] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showStepDetails, setShowStepDetails] = useState(false);
  const [selectedStepDetails, setSelectedStepDetails] = useState<ProcessingStep | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load system status on component mount
    loadSystemStatus();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const loadSampleMessage = (message: string) => {
    setMessage(message);
    toast({
      title: "Sample Loaded",
      description: "Sample message loaded successfully.",
    });
  };



  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/agent/status');
      if (response.ok) {
        const status = await response.json();
        setSystemStatus(status);
      }
    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]);
  };

  const updateProcessingStep = (stepName: string, updates: Partial<ProcessingStep>) => {
    setProcessingSteps(prev => {
      const existingIndex = prev.findIndex(step => step.name === stepName);
      if (existingIndex >= 0) {
        const newSteps = [...prev];
        newSteps[existingIndex] = { ...newSteps[existingIndex], ...updates };
        return newSteps;
      } else {
        return [...prev, { name: stepName, status: 'pending', ...updates }];
      }
    });
  };

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
    setResult(null);
    addLog("Starting Chat Preprocessor Agent test...");
    
    try {
      updateProcessingStep("Chat Preprocessing", { status: 'running', startTime: Date.now() });
      
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
        updateProcessingStep("Chat Preprocessing", { 
          status: 'completed', 
          endTime: Date.now(),
          data: data.preprocessing_result
        });
        addLog(`Preprocessor test completed - Urgency: ${data.preprocessing_result.urgency}, Sentiment: ${data.preprocessing_result.sentiment}`);
        toast({
          title: "Test Completed",
          description: "Chat Preprocessor Agent test completed successfully.",
        });
      } else {
        throw new Error(data.error || 'Test failed');
      }
    } catch (error) {
      updateProcessingStep("Chat Preprocessing", { 
        status: 'failed', 
        endTime: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      addLog(`Preprocessor test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to test preprocessor",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testFullWorkflow = async () => {
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message to test the full agent workflow.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setWorkflowResult(null);
    setProcessingSteps([]);
    addLog("Starting full agent workflow test...");

    const steps = [
      "Input Processing",
      "Instruction Search",
      "Similar Tickets Search", 
      "LLM Resolution",
      "Ticket Creation",
      "Response Formatting"
    ];

    // Initialize all steps as pending
    steps.forEach(step => {
      updateProcessingStep(step, { status: 'pending' });
    });

    try {
      updateProcessingStep("Input Processing", { status: 'running', startTime: Date.now() });
      addLog("Processing user input...");

      const response = await fetch('/api/agent/workflow-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_message: message.trim(),
          session_id: sessionId,
          tenant_id: tenantId,
          user_context: {
            url: 'agent-test-page',
            title: 'Agent Test Page',
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setWorkflowResult(data);
        
        // Update all steps as completed based on workflow result
        if (data.workflow_steps) {
          Object.keys(data.workflow_steps).forEach((stepKey, index) => {
            const stepName = steps[index] || stepKey;
            updateProcessingStep(stepName, { 
              status: 'completed', 
              endTime: Date.now(),
              data: data.workflow_steps[stepKey]
            });
          });
        }

        addLog(`Full workflow completed successfully - Ticket ID: ${data.ticket_id || 'N/A'}`);
        addLog(`Processing time: ${data.processing_time_ms}ms, Confidence: ${data.confidence_score}`);
        
        toast({
          title: "Workflow Completed",
          description: `Agent workflow completed successfully in ${data.processing_time_ms}ms`,
        });
      } else {
        throw new Error(data.error || 'Workflow failed');
      }
    } catch (error) {
      // Mark current step as failed
      const currentStep = processingSteps.find(step => step.status === 'running');
      if (currentStep) {
        updateProcessingStep(currentStep.name, { 
          status: 'failed', 
          endTime: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      addLog(`Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: "Workflow Failed",
        description: error instanceof Error ? error.message : "Failed to complete agent workflow",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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

  const toggleRealTimeMode = () => {
    setIsRealTimeMode(!isRealTimeMode);
    if (!isRealTimeMode) {
      // Start real-time monitoring
      intervalRef.current = setInterval(loadSystemStatus, 5000);
      addLog("Real-time monitoring enabled");
    } else {
      // Stop real-time monitoring
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      addLog("Real-time monitoring disabled");
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-gray-500" />;
      case 'running': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const calculateStepDuration = (step: ProcessingStep) => {
    if (step.startTime && step.endTime) {
      return `${step.endTime - step.startTime}ms`;
    }
    return step.status === 'running' && step.startTime 
      ? `${Date.now() - step.startTime}ms` 
      : '-';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Enhanced Agent System Test Console</h1>
        </div>
        <p className="text-muted-foreground max-w-3xl mx-auto">
          Comprehensive testing environment for the multi-agent support system with real-time monitoring, 
          detailed step-by-step analysis, and complete data point visibility.
        </p>
        
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isRealTimeMode ? "destructive" : "outline"}
            size="sm"
            onClick={toggleRealTimeMode}
          >
            {isRealTimeMode ? (
              <>
                <StopCircle className="h-4 w-4 mr-2" />
                Stop Monitoring
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Start Real-Time Monitoring
              </>
            )}
          </Button>
          {systemStatus && (
            <Badge variant={systemStatus.orchestrator_available ? "default" : "destructive"}>
              System {systemStatus.orchestrator_available ? "Online" : "Offline"}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflow" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Full Workflow
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Individual Agents
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Monitoring
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            System Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflow" className="space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Full Agent Workflow Test
                </CardTitle>
                <CardDescription>
                  Test the complete multi-agent pipeline including preprocessing, instruction lookup, 
                  ticket search, LLM resolution, and formatting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="tenant-id">Tenant ID</Label>
                    <Input
                      id="tenant-id"
                      type="number"
                      value={tenantId}
                      onChange={(e) => setTenantId(Number(e.target.value))}
                      placeholder="1"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Support Request Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your support request here..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={testFullWorkflow} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Test Full Workflow
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={testPreprocessor} 
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Test Preprocessor Only
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Sample Test Cases</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {sampleMessages.map((sample, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => loadSampleMessage(sample.message)}
                        className="text-left justify-start h-auto p-3"
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{sample.label}</div>
                            <Badge variant="secondary" className="text-xs">
                              {sample.expectedUrgency}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {sample.message.substring(0, 80)}...
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workflow Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Agent Processing Pipeline
                </CardTitle>
                <CardDescription>
                  Real-time visualization of each agent's processing steps and data flow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {processingSteps.length > 0 ? (
                      processingSteps.map((step, index) => (
                        <div key={step.name} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStepIcon(step.status)}
                              <span className="font-medium text-sm">{step.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {calculateStepDuration(step)}
                              </Badge>
                              <Badge 
                                variant={step.status === 'completed' ? 'default' : 
                                       step.status === 'failed' ? 'destructive' : 
                                       step.status === 'running' ? 'secondary' : 'outline'}
                                className="text-xs"
                              >
                                {step.status}
                              </Badge>
                            </div>
                          </div>
                          
                          {step.status === 'running' && (
                            <Progress value={undefined} className="h-2 mb-2" />
                          )}
                          
                          {step.data && (
                            <div className="space-y-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedStepDetails(step);
                                  setShowStepDetails(true);
                                }}
                                className="text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Inspect Agent Results
                              </Button>
                              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(step.data, null, 2).substring(0, 200)}
                                  {JSON.stringify(step.data, null, 2).length > 200 && '...'}
                                </pre>
                              </div>
                            </div>
                          )}
                          
                          {step.error && (
                            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                              {step.error}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No workflow in progress. Start a test to see processing steps.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Results */}
          {workflowResult && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Complete Workflow Results
                </CardTitle>
                <CardDescription>
                  Detailed analysis and data points from the full agent processing workflow.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Summary Metrics */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Processing Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge variant={workflowResult.success ? "default" : "destructive"}>
                          {workflowResult.success ? "Success" : "Failed"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Processing Time:</span>
                        <span className="text-sm font-medium">{workflowResult.processing_time_ms}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Confidence Score:</span>
                        <span className="text-sm font-medium">{workflowResult.confidence_score}%</span>
                      </div>
                      {workflowResult.ticket_id && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Ticket ID:</span>
                          <span className="text-sm font-medium">#{workflowResult.ticket_id}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Classification Results */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Classification Results</h4>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Category</Label>
                        <Badge className="ml-2">{workflowResult.category}</Badge>
                      </div>
                      <div>
                        <Label className="text-xs">Urgency</Label>
                        <Badge 
                          className={`ml-2 ${getUrgencyColor(workflowResult.urgency)} text-white`}
                        >
                          {workflowResult.urgency}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-xs">Status</Label>
                        <Badge variant="outline" className="ml-2">{workflowResult.status}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Data Points */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Data Points Used</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Knowledge Base Hits:</span>
                        <span className="text-sm font-medium">{workflowResult.data_points?.knowledge_base_hits || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Similar Tickets:</span>
                        <span className="text-sm font-medium">{workflowResult.data_points?.similar_tickets_found || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">PII Masked:</span>
                        <span className="text-sm font-medium">{workflowResult.data_points?.pii_instances_masked || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">AI Provider:</span>
                        <span className="text-sm font-medium">{workflowResult.data_points?.ai_provider_used || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Tenant Isolation:</span>
                        <Badge variant={workflowResult.data_points?.tenant_isolation_verified ? "default" : "destructive"}>
                          {workflowResult.data_points?.tenant_isolation_verified ? "Verified" : "Failed"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Resolution Steps */}
                <div className="space-y-4">
                  <h4 className="font-medium">Generated Resolution Steps</h4>
                  <div className="space-y-2">
                    {workflowResult.resolution_steps?.map((step, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-1">{index + 1}</Badge>
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generated Ticket Display */}
                <Separator className="my-6" />
                <div className="space-y-4">
                  <h4 className="font-medium text-lg flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Generated Ticket Preview
                  </h4>
                  
                  <div className="border rounded-lg p-6 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold">
                          #{workflowResult.ticket_id || 'PENDING'}
                        </span>
                        <Badge variant="outline">{workflowResult.category}</Badge>
                        <Badge className={`${getUrgencyColor(workflowResult.urgency)} text-white`}>
                          {workflowResult.urgency}
                        </Badge>
                      </div>
                      <Badge variant={workflowResult.status === 'open' ? 'default' : 'secondary'}>
                        {workflowResult.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Title</Label>
                        <h3 className="text-lg font-medium mt-1">
                          {workflowResult.ticket_title || 'Processing...'}
                        </h3>
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Original Message</Label>
                        <div className="mt-1 p-3 bg-gray-50 rounded border">
                          <p className="text-gray-800 italic">"{message}"</p>
                        </div>
                      </div>
                      
                      {workflowResult.resolution_steps && workflowResult.resolution_steps.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">
                            AI-Generated Resolution Steps ({workflowResult.resolution_steps.length})
                          </Label>
                          <div className="mt-2 space-y-2">
                            {workflowResult.resolution_steps.map((step, index) => (
                              <div key={index} className="flex items-start gap-3 p-2 bg-green-50 rounded">
                                <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full text-xs flex items-center justify-center font-medium">
                                  {index + 1}
                                </div>
                                <span className="text-sm text-gray-800">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t text-sm">
                        <div>
                          <Label className="text-xs font-medium text-gray-500">Created</Label>
                          <p className="text-gray-700">{workflowResult.created_at ? new Date(workflowResult.created_at).toLocaleString() : 'Just now'}</p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-gray-500">AI Confidence</Label>
                          <p className="text-gray-700">{workflowResult.confidence_score}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section for Individual Agent Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Individual Agent Testing
                </CardTitle>
                <CardDescription>
                  Test specific agents individually to analyze their capabilities and outputs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="individual-session-id">Session ID</Label>
                  <Input
                    id="individual-session-id"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="test_session_123"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="individual-message">Message</Label>
                  <Textarea
                    id="individual-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={testPreprocessor} 
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? "Processing..." : "Test Preprocessor"}
                  </Button>
                  <Button 
                    onClick={() => toast({ title: "Coming Soon", description: "Instruction lookup test will be available soon." })} 
                    disabled={isLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Test Instruction Lookup
                  </Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Sample Messages</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {sampleMessages.map((sample, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => loadSampleMessage(sample.message)}
                        className="text-left justify-start h-auto p-3"
                      >
                        <div className="w-full">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm">{sample.label}</div>
                            <Badge variant="secondary" className="text-xs">
                              {sample.expectedUrgency}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {sample.message.substring(0, 50)}...
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual Agent Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Individual Agent Results
                </CardTitle>
                <CardDescription>
                  Detailed analysis output from individual agent testing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  {result ? (
                    <div className="space-y-4">
                      {/* Agent Status */}
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          Preprocessor Agent Status
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
                        <h4 className="font-medium">Processing Analysis</h4>
                        
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
                      <p>No individual agent test results yet. Run a test to see the analysis.</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Agent Capabilities Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Chat Preprocessor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Normalizes text, classifies urgency, detects sentiment, and masks PII.
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Normalization</Badge>
                  <Badge variant="outline" className="text-xs">Urgency Detection</Badge>
                  <Badge variant="outline" className="text-xs">PII Masking</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Instruction Lookup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Searches knowledge base using vector similarity for relevant instructions.
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Vector Search</Badge>
                  <Badge variant="outline" className="text-xs">Relevance Scoring</Badge>
                  <Badge variant="outline" className="text-xs">Context Building</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Ticket Lookup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Finds similar historical tickets using embedding-based similarity search.
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Historical Analysis</Badge>
                  <Badge variant="outline" className="text-xs">Similarity Matching</Badge>
                  <Badge variant="outline" className="text-xs">Pattern Recognition</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Ticket Formatter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Structures final ticket with professional formatting and resolution steps.
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-xs">Professional Format</Badge>
                  <Badge variant="outline" className="text-xs">Step Generation</Badge>
                  <Badge variant="outline" className="text-xs">Quality Assurance</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Live Activity Monitor */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Activity Monitor
                  {isRealTimeMode && (
                    <Badge variant="default" className="ml-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                      Live
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Real-time monitoring of agent system activities and processing logs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Button size="sm" onClick={clearLogs} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear Logs
                    </Button>
                    <Badge variant="outline">
                      {logs.length} entries
                    </Badge>
                  </div>
                  
                  <ScrollArea className="h-[300px] border rounded-md p-3">
                    <div className="space-y-1">
                      {logs.length > 0 ? (
                        logs.map((log, index) => (
                          <div key={index} className="text-xs font-mono text-muted-foreground">
                            {log}
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                          <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No activity logs yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>
                  Key performance indicators and processing statistics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {workflowResult?.processing_time_ms || 0}ms
                      </div>
                      <div className="text-xs text-muted-foreground">Last Processing Time</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {workflowResult?.confidence_score || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">Confidence Score</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {workflowResult?.data_points?.knowledge_base_hits || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">KB Hits</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {workflowResult?.data_points?.similar_tickets_found || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Similar Tickets</div>
                    </div>
                  </div>
                  
                  {workflowResult && (
                    <div className="space-y-2">
                      <Label className="text-xs">Agent Processing Chain</Label>
                      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
                        {['preprocessing', 'instruction_lookup', 'ticket_lookup', 'llm_resolution', 'formatting'].map((step, index) => (
                          <div key={step} className="flex items-center space-x-2 min-w-fit">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                              workflowResult.workflow_steps?.[step as keyof typeof workflowResult.workflow_steps] ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {index + 1}
                            </div>
                            {index < 4 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Status Overview
              </CardTitle>
              <CardDescription>
                Complete system health and configuration status for all agent components.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {systemStatus ? (
                <div className="space-y-6">
                  {/* Main Orchestrator Status */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Agent Orchestrator
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Orchestrator Available</span>
                        <Badge variant={systemStatus.orchestrator_available ? "default" : "destructive"}>
                          {systemStatus.orchestrator_available ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">All Sub-Agents</span>
                        <Badge variant={Object.values(systemStatus.sub_agents).every(Boolean) ? "default" : "secondary"}>
                          {Object.values(systemStatus.sub_agents).every(Boolean) ? "All Online" : "Partial"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Sub-Agents Status */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Sub-Agents Status
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(systemStatus.sub_agents).map(([agent, status]) => (
                        <div key={agent} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="text-sm capitalize">{agent.replace(/_/g, ' ')}</span>
                          <Badge variant={status ? "default" : "destructive"}>
                            {status ? "Online" : "Offline"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* External Services */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      External Services
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">Vector Storage</span>
                        <Badge variant={systemStatus.external_services.vector_storage ? "default" : "destructive"}>
                          {systemStatus.external_services.vector_storage ? "Connected" : "Disconnected"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="text-sm">MCP Service</span>
                        <Badge variant={systemStatus.external_services.mcp_service ? "default" : "destructive"}>
                          {systemStatus.external_services.mcp_service ? "Connected" : "Disconnected"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* AI Providers */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      AI Providers
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {systemStatus.external_services.ai_providers.map((provider, index) => (
                        <Badge key={index} variant="outline">
                          {provider}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* System Capabilities */}
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      System Capabilities
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {systemStatus.capabilities.map((capability, index) => (
                        <Badge key={index} variant="secondary">
                          {capability.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>


                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Loading system status...</p>
                  <Button onClick={loadSystemStatus} className="mt-4" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Agent Step Details Dialog */}
      <Dialog open={showStepDetails} onOpenChange={setShowStepDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Agent Step Details: {selectedStepDetails?.name}
            </DialogTitle>
            <DialogDescription>
              Detailed inspection of agent processing results and data analysis.
            </DialogDescription>
          </DialogHeader>
          
          {selectedStepDetails && (
            <div className="space-y-6">
              {/* Step Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-semibold flex items-center justify-center gap-2">
                    {getStepIcon(selectedStepDetails.status)}
                    {selectedStepDetails.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-muted-foreground">Status</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {calculateStepDuration(selectedStepDetails)}
                  </div>
                  <div className="text-xs text-muted-foreground">Duration</div>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <div className="text-lg font-semibold">
                    {selectedStepDetails.startTime ? new Date(selectedStepDetails.startTime).toLocaleTimeString() : 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">Started At</div>
                </div>
              </div>

              {/* Agent Output Data */}
              {selectedStepDetails.data && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    <h4 className="font-medium">Agent Processing Results</h4>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedStepDetails.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Error Details */}
              {selectedStepDetails.error && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <h4 className="font-medium text-red-700">Error Details</h4>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                    <p className="text-red-800">{selectedStepDetails.error}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}