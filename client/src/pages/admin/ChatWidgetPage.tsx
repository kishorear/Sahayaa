import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import WidgetAnalyticsComponent from "@/components/admin/WidgetAnalytics";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, ClipboardCopy, Download, Code, BarChart } from "lucide-react";

export default function ChatWidgetPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("code");
  const [primaryColor, setPrimaryColor] = useState("#6366F1");
  const [widgetPosition, setWidgetPosition] = useState("right");
  const [greetingMessage, setGreetingMessage] = useState("How can I help you today?");
  const [autoOpen, setAutoOpen] = useState(false);
  const [includeBranding, setIncludeBranding] = useState(true);
  
  // Generate the embed code based on the selected options
  const getEmbedCode = () => {
    return `<!-- Support AI Chat Widget -->
<script>
  window.supportAiConfig = {
    tenantId: ${user?.tenantId || 'YOUR_TENANT_ID'},
    apiKey: "${user?.id || 'YOUR_API_KEY'}_${user?.tenantId || 'TENANT'}_${new Date().getTime()}",
    primaryColor: "${primaryColor}",
    position: "${widgetPosition}",
    greetingMessage: "${greetingMessage}",
    autoOpen: ${autoOpen},
    branding: ${includeBranding},
    reportData: true,
    adminId: ${user?.id || 'YOUR_ADMIN_ID'}
  };
</script>
<script src="https://support.ai/widget.js" async></script>`;
  };
  
  // Generate NPM package installation instructions
  const getNpmInstallCode = () => {
    return `# Using npm
npm install support-ai-widget

# Using yarn
yarn add support-ai-widget`;
  };
  
  // Generate React component usage example
  const getReactUsageCode = () => {
    return `import { SupportAIChat } from 'support-ai-widget';

function App() {
  return (
    <div className="your-app">
      {/* Your application content */}
      
      <SupportAIChat
        tenantId="${user?.tenantId || 'YOUR_TENANT_ID'}"
        apiKey="${user?.id || 'YOUR_API_KEY'}_${user?.tenantId || 'TENANT'}_${new Date().getTime()}"
        primaryColor="${primaryColor}"
        position="${widgetPosition}"
        greetingMessage="${greetingMessage}"
        autoOpen={${autoOpen}}
        branding={${includeBranding}}
        reportData={true}
        adminId={${user?.id || 'YOUR_ADMIN_ID'}}
      />
    </div>
  );
}`;
  };

  // Copy code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied to clipboard",
      description: "You can now paste the code into your application.",
    });
  };

  // Download function
  const handleDownload = (type: string) => {
    toast({
      title: `Downloading ${type}`,
      description: `Your ${type} download has started.`,
    });
    
    // Map the download type to the appropriate file or API endpoint
    let downloadPath = '';
    
    switch(type) {
      case "documentation":
        window.location.href = '/downloads/widget/documentation.md';
        break;
      case "sample code":
        window.location.href = '/downloads/widget/sample-implementation.html';
        break;
      case "API documentation":
        window.location.href = '/downloads/widget/api-documentation.md';
        break;
      case "auth widget package":
        // Construct URL with query parameters for authenticated widget package
        const authQueryParams = new URLSearchParams({
          tenantId: String(user?.tenantId || 1),
          userId: String(user?.id || 1),
          primaryColor: primaryColor.replace('#', ''),
          position: widgetPosition,
          greetingMessage: encodeURIComponent(greetingMessage),
          autoOpen: String(autoOpen),
          branding: String(includeBranding),
          reportData: 'true',
          authWidget: 'true' // Flag to indicate this is the authenticated widget
        });
        
        // Use the dynamic widget download API
        window.location.href = `/api/widgets/download?${authQueryParams.toString()}`;
        break;
      case "full widget package":
      case "widget package":
        // Construct URL with query parameters for customized widget package
        const queryParams = new URLSearchParams({
          tenantId: String(user?.tenantId || 1),
          userId: String(user?.id || 1),
          primaryColor: primaryColor.replace('#', ''),
          position: widgetPosition,
          greetingMessage: encodeURIComponent(greetingMessage),
          autoOpen: String(autoOpen),
          branding: String(includeBranding),
          reportData: 'true'
        });
        
        // Use the dynamic widget download API
        window.location.href = `/api/widgets/download?${queryParams.toString()}`;
        break;
      default:
        // Use the dynamic widget download API
        const defaultParams = new URLSearchParams({
          tenantId: String(user?.tenantId || 1),
          userId: String(user?.id || 1)
        });
        window.location.href = `/api/widgets/download?${defaultParams.toString()}`;
    }
  };

  // Generate authenticated widget code
  const getAuthEmbedCode = () => {
    return `<!-- Support AI Authenticated Chat Widget -->
<script>
  window.supportAiConfig = {
    tenantId: ${user?.tenantId || 'YOUR_TENANT_ID'},
    apiKey: "${user?.id || 'YOUR_API_KEY'}_${user?.tenantId || 'TENANT'}_${new Date().getTime()}",
    primaryColor: "${primaryColor}",
    position: "${widgetPosition}",
    apiEndpoint: "https://${window.location.hostname}/api",
    authEndpoint: "https://${window.location.hostname}/api/auth",
    requireAuth: true,
    greetingMessage: "${greetingMessage}",
    autoOpen: ${autoOpen},
    branding: ${includeBranding},
    reportData: true,
    adminId: ${user?.id || 'YOUR_ADMIN_ID'}
  };
</script>
<script src="supportai-auth-widget.js" async></script>`;
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Chat Widget</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Customize and embed the Support AI chat widget in your application
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleDownload("widget package")} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Basic Widget
            </Button>
            <Button onClick={() => handleDownload("auth widget package")}>
              <Download className="mr-2 h-4 w-4" />
              Auth Widget
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Widget Configuration</CardTitle>
              <CardDescription>
                Customize how the chat widget appears and behaves
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Widget Position</Label>
                <Select value={widgetPosition} onValueChange={setWidgetPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Bottom Left</SelectItem>
                    <SelectItem value="right">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="greeting">Greeting Message</Label>
                <Input
                  id="greeting"
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoOpen" className="cursor-pointer">Auto-open on page load</Label>
                <Switch
                  id="autoOpen"
                  checked={autoOpen}
                  onCheckedChange={setAutoOpen}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="branding"
                  checked={includeBranding}
                  onCheckedChange={(checked) => setIncludeBranding(!!checked)}
                />
                <Label htmlFor="branding" className="cursor-pointer">
                  Include "Powered by Support AI" branding
                </Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => toast({ title: "Settings saved", description: "Your widget configuration has been updated." })}>
                Save Configuration
              </Button>
            </CardFooter>
          </Card>

          {/* Preview and Code Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Widget Integration</CardTitle>
              <CardDescription>
                Preview the widget and get the code to integrate it into your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="code">Basic Embed</TabsTrigger>
                  <TabsTrigger value="auth">Auth Embed</TabsTrigger>
                  <TabsTrigger value="npm">NPM Package</TabsTrigger>
                  <TabsTrigger value="react">React Component</TabsTrigger>
                </TabsList>
                <TabsContent value="code" className="p-4 border rounded-md mt-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Basic HTML Embed</h3>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getEmbedCode())}>
                      <ClipboardCopy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-x-auto">
                    {getEmbedCode()}
                  </pre>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    Add this code to your website's HTML, preferably right before the closing <code>&lt;/body&gt;</code> tag.
                  </p>
                </TabsContent>
                
                <TabsContent value="auth" className="p-4 border rounded-md mt-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Authenticated HTML Embed</h3>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getAuthEmbedCode())}>
                      <ClipboardCopy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-x-auto">
                    {getAuthEmbedCode()}
                  </pre>
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-md mt-4">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Enhanced Widget with Authentication</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This version of the widget includes user authentication and connects to your configured AI provider. Users will need to log in before chatting.
                    </p>
                    <div className="flex mt-3">
                      <Button variant="outline" size="sm" onClick={() => handleDownload("auth widget package")}>
                        <Download className="h-4 w-4 mr-1" />
                        Download Auth Widget Package
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="npm" className="p-4 border rounded-md mt-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">NPM Installation</h3>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getNpmInstallCode())}>
                      <ClipboardCopy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-x-auto">
                    {getNpmInstallCode()}
                  </pre>
                  <h3 className="text-sm font-medium mt-4 mb-2">Initialize the widget</h3>
                  <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-x-auto">
{`import { initSupportAI } from 'support-ai-widget';

// Initialize the widget
initSupportAI({
  tenantId: ${user?.tenantId || 'YOUR_TENANT_ID'},
  apiKey: "${user?.id || 'YOUR_API_KEY'}_${user?.tenantId || 'TENANT'}_${new Date().getTime()}",
  primaryColor: "${primaryColor}",
  position: "${widgetPosition}",
  greetingMessage: "${greetingMessage}",
  autoOpen: ${autoOpen},
  branding: ${includeBranding},
  reportData: true,
  adminId: ${user?.id || 'YOUR_ADMIN_ID'}
});`}
                  </pre>
                </TabsContent>
                <TabsContent value="react" className="p-4 border rounded-md mt-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">React Component</h3>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(getReactUsageCode())}>
                      <ClipboardCopy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded text-sm overflow-x-auto">
                    {getReactUsageCode()}
                  </pre>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                    The component will automatically render the chat widget in your React application.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                <h3 className="text-sm font-medium mb-2">Additional Resources</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center">
                    <span className="text-sm">Chat Widget Documentation</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDownload("documentation")}
                    >
                      Download
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-sm">Sample Implementation Code</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload("sample code")}
                    >
                      Download
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-sm">API Documentation</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload("API documentation")}
                    >
                      Download
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </li>
                </ul>
              </div>
              <Button variant="default" className="w-full" onClick={() => handleDownload("full widget package")}>
                <Code className="mr-2 h-4 w-4" />
                Download Complete Widget Package
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Implementation Guide */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Implementation Guide</CardTitle>
            <CardDescription>
              Follow these steps to implement the chat widget in your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex">
                <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <h3 className="font-bold">Choose your integration method</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Select the integration method that best suits your application: HTML script tag, NPM package, or React component.
                  </p>
                </div>
              </div>

              <div className="flex">
                <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-bold">Configure the widget</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Use the configuration panel to customize the appearance and behavior of the chat widget
                    to match your brand and requirements.
                  </p>
                </div>
              </div>

              <div className="flex">
                <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <h3 className="font-bold">Copy and integrate the code</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Copy the generated code and add it to your application. For HTML websites, add the script 
                    tag before the closing <code>&lt;/body&gt;</code> tag.
                  </p>
                </div>
              </div>

              <div className="flex">
                <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-primary font-bold">4</span>
                </div>
                <div>
                  <h3 className="font-bold">Test the integration</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Once integrated, visit your website and ensure the chat widget appears as expected.
                    Test the functionality by sending test messages.
                  </p>
                </div>
              </div>

              <div className="flex">
                <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-primary font-bold">5</span>
                </div>
                <div>
                  <h3 className="font-bold">Monitor and adjust</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Use the Support AI dashboard to monitor chat interactions and adjust your widget
                    configuration as needed based on user feedback.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Widget Analytics */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart className="h-6 w-6 mr-2" />
              Widget Analytics
            </CardTitle>
            <CardDescription>
              Track usage and performance of your chat widget deployments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WidgetAnalyticsComponent />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}