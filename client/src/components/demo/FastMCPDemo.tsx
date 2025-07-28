import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Search, Database, FileText, Zap, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface SearchResult {
  id: string;
  content: string;
  metadata: {
    category: string;
    type: string;
    created_at: string;
  };
  similarity: number;
}

interface SearchResponse {
  success: boolean;
  query: string;
  result: {
    results: SearchResult[];
    count: number;
    processing_time_seconds: number;
  };
}

interface AgentResponse {
  success: boolean;
  agent_type: string;
  query: string;
  result: {
    agent: string;
    instructions_found?: number;
    top_instructions?: any[];
    confidence?: number;
  };
}

export default function FastMCPDemo() {
  const [activeTab, setActiveTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [agentQuery, setAgentQuery] = useState("");
  const [agentType, setAgentType] = useState("instruction_lookup");
  const [agentResults, setAgentResults] = useState<AgentResponse | null>(null);
  const [agentLoading, setAgentLoading] = useState(false);
  
  const [ingestContent, setIngestContent] = useState("");
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingestCategory, setIngestCategory] = useState("general");
  const [ingestResults, setIngestResults] = useState<any>(null);
  const [ingestLoading, setIngestLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      const response = await fetch('/api/fastmcp/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          top_k: 5
        }),
      });
      
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAgentQuery = async () => {
    if (!agentQuery.trim()) return;
    
    setAgentLoading(true);
    try {
      const response = await fetch(`/api/fastmcp/agents/${agentType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: agentQuery,
          context: {
            tenant_id: 1,
            user_id: 1
          }
        }),
      });
      
      const data = await response.json();
      setAgentResults(data);
    } catch (error) {
      console.error('Agent query failed:', error);
    } finally {
      setAgentLoading(false);
    }
  };

  const handleIngest = async () => {
    if (!ingestContent.trim() || !ingestTitle.trim()) return;
    
    setIngestLoading(true);
    try {
      const response = await fetch('/api/fastmcp/documents/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: [{
            id: `demo_${Date.now()}`,
            title: ingestTitle,
            content: ingestContent,
            metadata: {
              category: ingestCategory,
              type: "demo_document"
            }
          }]
        }),
      });
      
      const data = await response.json();
      setIngestResults(data);
      setIngestContent("");
      setIngestTitle("");
    } catch (error) {
      console.error('Document ingestion failed:', error);
    } finally {
      setIngestLoading(false);
    }
  };

  const sampleQueries = [
    "network connection troubleshooting",
    "database performance issues",
    "authentication problems",
    "API integration help"
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">FastMCP Vector Search & RAG Demo</h2>
        <p className="text-gray-600">
          Experience our advanced vector search, document ingestion, and agent processing capabilities
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Vector Search
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Agent Processing
          </TabsTrigger>
          <TabsTrigger value="ingest" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Document Ingestion
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Vector Similarity Search
              </CardTitle>
              <CardDescription>
                Search through our knowledge base using semantic similarity matching with OpenAI embeddings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your search query..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searchLoading}>
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Try these:</span>
                {sampleQueries.map((query) => (
                  <Button
                    key={query}
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery(query)}
                  >
                    {query}
                  </Button>
                ))}
              </div>

              {searchResults && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Found {searchResults.result.count} results in {searchResults.result.processing_time_seconds.toFixed(2)}s
                  </div>
                  
                  {searchResults.result.results.map((result, index) => (
                    <Card key={result.id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{result.metadata.category}</Badge>
                            <Badge variant="outline">{result.metadata.type}</Badge>
                          </div>
                          <div className="text-sm text-gray-500">
                            {(result.similarity * 100).toFixed(1)}% match
                          </div>
                        </div>
                        <p className="text-sm text-gray-700">{result.content}</p>
                        <div className="text-xs text-gray-500 mt-2">
                          ID: {result.id} • Created: {new Date(result.metadata.created_at).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI Agent Processing
              </CardTitle>
              <CardDescription>
                Test our specialized AI agents for instruction lookup, ticket processing, and chat analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <select 
                  value={agentType} 
                  onChange={(e) => setAgentType(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="instruction_lookup">Instruction Lookup Agent</option>
                  <option value="ticket_lookup">Ticket Lookup Agent</option>
                  <option value="chat_processor">Chat Processor Agent</option>
                </select>
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Enter your query for the agent..."
                  value={agentQuery}
                  onChange={(e) => setAgentQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAgentQuery()}
                />
                <Button onClick={handleAgentQuery} disabled={agentLoading}>
                  {agentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Process
                </Button>
              </div>

              {agentResults && (
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge>{agentResults.agent_type}</Badge>
                      <Badge variant="outline">
                        {agentResults.result.confidence ? `${(agentResults.result.confidence * 100).toFixed(1)}% confidence` : 'Processed'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <p><strong>Agent:</strong> {agentResults.result.agent}</p>
                      {agentResults.result.instructions_found !== undefined && (
                        <p><strong>Instructions Found:</strong> {agentResults.result.instructions_found}</p>
                      )}
                      <p><strong>Query:</strong> {agentResults.query}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingest" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Ingestion
              </CardTitle>
              <CardDescription>
                Add new documents to the vector database with automatic embedding generation and PII masking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Document title..."
                  value={ingestTitle}
                  onChange={(e) => setIngestTitle(e.target.value)}
                />
                <select 
                  value={ingestCategory} 
                  onChange={(e) => setIngestCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="general">General</option>
                  <option value="technical">Technical</option>
                  <option value="troubleshooting">Troubleshooting</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>
              
              <Textarea
                placeholder="Enter document content..."
                value={ingestContent}
                onChange={(e) => setIngestContent(e.target.value)}
                rows={6}
              />
              
              <Button onClick={handleIngest} disabled={ingestLoading || !ingestTitle || !ingestContent}>
                {ingestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Ingest Document
              </Button>

              {ingestResults && (
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="font-medium">Document Ingested Successfully</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><strong>Documents Processed:</strong> {ingestResults.documents_count}</p>
                      <p><strong>Processing Time:</strong> {ingestResults.result?.processing_time_seconds?.toFixed(2)}s</p>
                      <p><strong>PII Cleaned:</strong> {ingestResults.result?.results?.[0]?.pii_cleaned ? 'Yes' : 'No'}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}