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
    return `<!-- SupportAI Chat Widget -->
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
<script src="https://supportai.com/widget.js" async></script>`;
  };
  
  // Generate NPM package installation instructions
  const getNpmInstallCode = () => {
    return `# Using npm
npm install supportai-widget

# Using yarn
yarn add supportai-widget`;
  };
  
  // Generate React component usage example
  const getReactUsageCode = () => {
    return `import { SupportAIChat } from 'supportai-widget';

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
    
    // Map the download type to the appropriate file
    let downloadPath = '';
    
    switch(type) {
      case "documentation":
        downloadPath = '/downloads/widget/documentation.md';
        break;
      case "sample code":
        downloadPath = '/downloads/widget/sample-implementation.html';
        break;
      case "API documentation":
        downloadPath = '/downloads/widget/api-documentation.md';
        break;
      case "full widget package":
      case "widget package":
        downloadPath = '/downloads/supportai-widget-package.zip';
        break;
      default:
        downloadPath = '/downloads/supportai-widget-package.zip';
    }
    
    // Create a temporary anchor element to trigger the download
    const link = document.createElement('a');
    link.href = downloadPath;
    link.download = downloadPath.split('/').pop() || 'supportai-widget-download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Chat Widget</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Customize and embed the SupportAI chat widget in your application
            </p>
          </div>
          <Button onClick={() => handleDownload("widget package")}>
            <Download className="mr-2 h-4 w-4" />
            Download Package
          </Button>
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
                  Include "Powered by SupportAI" branding
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="code">HTML Embed</TabsTrigger>
                  <TabsTrigger value="npm">NPM Package</TabsTrigger>
                  <TabsTrigger value="react">React Component</TabsTrigger>
                </TabsList>
                <TabsContent value="code" className="p-4 border rounded-md mt-4 bg-gray-50 dark:bg-gray-900">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">HTML Script Tag</h3>
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
{`import { initSupportAI } from 'supportai-widget';

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
                    Use the SupportAI dashboard to monitor chat interactions and adjust your widget
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