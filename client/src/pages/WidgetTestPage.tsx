import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";

export default function WidgetTestPage() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [chatMessage, setChatMessage] = useState("");
  
  // Function to inject and initialize the widget
  useEffect(() => {
    // Remove any existing widget script
    const existingScript = document.getElementById("support-widget-script");
    if (existingScript) {
      existingScript.remove();
    }
    
    // Create widget configuration
    const config = {
      tenantId: user?.tenantId || 1,
      apiKey: `test_key_${user?.id || 1}`,
      primaryColor: "82AEEB",
      position: "right",
      greetingMessage: "Hello! This is a test of the universal widget. Try navigating between pages!",
      autoOpen: false,
      branding: true,
      reportData: true,
      adminId: user?.id || 1
    };
    
    // Add configuration to window
    (window as any).supportAiConfig = config;
    
    // Create and add the script
    const script = document.createElement('script');
    script.id = "support-widget-script";
    script.src = "/downloads/widget/universal-support-script.js";
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      // Clean up on unmount
      if (document.getElementById("support-widget-script")) {
        document.getElementById("support-widget-script")?.remove();
      }
    };
  }, [user]);
  
  // Page content based on current page number
  const getPageContent = () => {
    switch(currentPage) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Universal Widget Test - Page 1</h3>
            <p>This is the first page of the test. Open the chat widget and send a message.</p>
            <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-md">
              <h4 className="font-medium">Testing Instructions:</h4>
              <ol className="list-decimal pl-5 space-y-2 mt-2">
                <li>Click the chat icon in the bottom right corner</li>
                <li>Send a test message in the chat window</li>
                <li>Navigate to another page using the tabs above</li>
                <li>Verify that the chat remains open with your message intact</li>
              </ol>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Universal Widget Test - Page 2</h3>
            <p>This is the second page of the test. The chat widget should maintain its state from Page 1.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Session Storage</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>The widget uses sessionStorage instead of localStorage to maintain state during the current browsing session.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Shadow DOM</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>The widget uses Shadow DOM for style isolation to ensure consistent appearance across websites.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Universal Widget Test - Page 3</h3>
            <p>This is the third page of the test. If your chat widget is still active with your messages, the test has been successful!</p>
            <div className="bg-green-100 dark:bg-green-900 p-4 rounded-md">
              <h4 className="font-medium text-green-800 dark:text-green-200">✓ Test Complete</h4>
              <p className="mt-2">The widget has successfully maintained its state across all test pages.</p>
              <p>Key improvements:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Replaced localStorage with sessionStorage for better persistence</li>
                <li>Removed draggable functionality to improve reliability</li>
                <li>Updated logo with thin stroke instead of solid fill</li>
                <li>Increased logo dimensions by 2 points</li>
                <li>Removed Grammarly-like monitoring functionality</li>
                <li>Added page navigation awareness for seamless experience</li>
              </ul>
            </div>
          </div>
        );
      default:
        return <div>Unknown page</div>;
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Universal Widget Test</h1>
      
      <Tabs 
        defaultValue="page1" 
        onValueChange={(value) => {
          switch(value) {
            case "page1": setCurrentPage(1); break;
            case "page2": setCurrentPage(2); break;
            case "page3": setCurrentPage(3); break;
          }
        }}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="page1">Page 1</TabsTrigger>
          <TabsTrigger value="page2">Page 2</TabsTrigger>
          <TabsTrigger value="page3">Page 3</TabsTrigger>
        </TabsList>
        <TabsContent value="page1">
          {getPageContent()}
        </TabsContent>
        <TabsContent value="page2">
          {getPageContent()}
        </TabsContent>
        <TabsContent value="page3">
          {getPageContent()}
        </TabsContent>
      </Tabs>
      
      <div className="mt-8">
        <Button variant="outline" onClick={() => window.history.back()}>
          Return to Previous Page
        </Button>
      </div>
    </div>
  );
}