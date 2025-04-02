import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";

// This is a test page for the Model Context Protocol
export default function MCPTestPage() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const testMCP = async () => {
    if (!query) {
      toast({
        title: "Query required",
        description: "Please enter a query to test",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mcp-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      setResponse(data.response);
    } catch (err) {
      console.error("Error testing MCP:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Model Context Protocol Test</h1>
      <p className="text-muted-foreground mb-8">
        This page allows you to test the Model Context Protocol by sending queries that should
        match with documents in our knowledge base.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Test Query</CardTitle>
            <CardDescription>
              Enter a query to test the Model Context Protocol. Try queries with specific error codes
              or keywords that match our documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Example Queries:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>I'm getting a 404 error, can you help?</li>
                  <li>My application can't connect to the database</li>
                  <li>How do I fix error code DB_CONN_FAILURE?</li>
                </ul>
              </div>
              <Textarea
                placeholder="Enter your query here..."
                className="min-h-[100px]"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={testMCP} 
              disabled={loading || !query}
              className="w-full"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Query
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Response</CardTitle>
            <CardDescription>
              The AI response will show how the Model Context Protocol enhances answers using document context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {response ? (
              <div className="whitespace-pre-wrap bg-muted p-4 rounded-md min-h-[200px]">
                {response}
              </div>
            ) : (
              <div className="text-center text-muted-foreground min-h-[200px] flex items-center justify-center">
                {loading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  "Response will appear here"
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <div className="bg-muted p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">How It Works</h2>
        <p className="mb-4">
          The Model Context Protocol (MCP) retrieves relevant document content from our knowledge base
          based on your query and enhances the AI's response with this context. This enables the AI
          to provide more accurate, specific answers based on your organization's documented knowledge.
        </p>
        <h3 className="text-lg font-semibold mb-2">Key Components:</h3>
        <ul className="list-disc list-inside space-y-2">
          <li>Document retrieval based on query similarity</li>
          <li>Extraction of error codes and keywords for better matching</li>
          <li>Dynamic context injection into AI prompts</li>
          <li>Unified protocol that works across all AI providers</li>
        </ul>
      </div>
    </div>
  );
}