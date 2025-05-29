import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, Users, Ticket, Clock, ArrowUpRight, 
  ArrowRight, Download, MessageSquare, Settings,
  CheckCircle2, X
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Define types for the metrics data
interface SummaryMetrics {
  totalTickets: number;
  resolvedTickets: number;
  avgResponseTime: string;
  aiResolvedPercentage: string;
}

interface CategoryMetric {
  category: string;
  count: number;
  percentage: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for tracking widget download dialog
  const [showWidgetDialog, setShowWidgetDialog] = useState(false);
  const [isAuthWidget, setIsAuthWidget] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState({
    primaryColor: '6366F1', // Default indigo color
    position: 'right',
    greetingMessage: 'How can I help you today?',
    autoOpen: false,
    branding: true,
    reportData: true,
    requireAuth: true
  });
  
  // Function to handle widget download with configuration
  const handleWidgetConfigChange = (key: string, value: any) => {
    setWidgetConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Function to handle standard widget download
  const handleWidgetDownload = () => {
    // Set flag for standard widget
    setIsAuthWidget(false);
    // Show configuration dialog
    setShowWidgetDialog(true);
  };
  
  // Function to handle authentication-enabled widget download
  const handleAuthWidgetDownload = () => {
    // Set flag for auth widget
    setIsAuthWidget(true);
    // Show configuration dialog
    setShowWidgetDialog(true);
  };
  
  // Function to actually download the widget package
  const downloadWidgetPackage = () => {
    // Close dialog
    setShowWidgetDialog(false);
    
    // Show toast notification
    toast({
      title: `Downloading ${isAuthWidget ? 'authentication-enabled' : 'standard'} widget package`,
      description: "Your widget package is being prepared and will download shortly.",
    });
    
    // Construct URL with query parameters for customized widget package
    const queryParams = new URLSearchParams({
      tenantId: String(user?.tenantId || 1),
      userId: String(user?.id || 1),
      primaryColor: widgetConfig.primaryColor.replace('#', ''), // Remove # if present
      position: widgetConfig.position,
      greetingMessage: encodeURIComponent(widgetConfig.greetingMessage),
      autoOpen: widgetConfig.autoOpen.toString(),
      branding: widgetConfig.branding.toString(),
      reportData: widgetConfig.reportData.toString()
    });
    
    // Add auth parameter if it's an auth widget
    if (isAuthWidget) {
      queryParams.append('requireAuth', widgetConfig.requireAuth.toString());
      
      // Download the auth-enabled widget package
      window.location.href = `/api/widgets/download-auth?${queryParams.toString()}`;
    } else {
      // Download the standard widget package
      window.location.href = `/api/widgets/download?${queryParams.toString()}`;
    }
  };
  
  // Fetch summary metrics
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery<SummaryMetrics>({
    queryKey: ['/api/metrics/summary'],
    enabled: !!user
  });
  
  // Fetch category distribution
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery<CategoryMetric[]>({
    queryKey: ['/api/metrics/categories'],
    enabled: !!user
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Widget Configuration Dialog */}
      <Dialog open={showWidgetDialog} onOpenChange={setShowWidgetDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configure {isAuthWidget ? 'Authentication-Enabled' : 'Standard'} Chat Widget</DialogTitle>
            <DialogDescription>
              {isAuthWidget 
                ? "Customize your authentication-enabled chat widget for client website integration. This version requires users to log in before accessing support."
                : "Customize your embedded chat widget appearance and behavior before downloading."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="primaryColor" className="text-right">
                Primary Color
              </Label>
              <div className="col-span-3 flex items-center gap-3">
                <Input
                  id="primaryColor"
                  type="text"
                  placeholder="#6366F1"
                  value={widgetConfig.primaryColor}
                  onChange={(e) => handleWidgetConfigChange('primaryColor', e.target.value)}
                  className="w-full"
                />
                <div 
                  className="w-6 h-6 rounded border" 
                  style={{backgroundColor: widgetConfig.primaryColor.startsWith('#') ? widgetConfig.primaryColor : `#${widgetConfig.primaryColor}`}}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="position" className="text-right">
                Position
              </Label>
              <Select 
                value={widgetConfig.position}
                onValueChange={(value) => handleWidgetConfigChange('position', value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Right</SelectItem>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="greetingMessage" className="text-right">
                Greeting
              </Label>
              <Input
                id="greetingMessage"
                type="text"
                value={widgetConfig.greetingMessage}
                onChange={(e) => handleWidgetConfigChange('greetingMessage', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="autoOpen" className="text-right">
                Auto Open
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="autoOpen"
                  checked={widgetConfig.autoOpen}
                  onCheckedChange={(checked) => handleWidgetConfigChange('autoOpen', checked)}
                />
                <Label htmlFor="autoOpen" className="text-sm text-muted-foreground">
                  Automatically open the chat when loaded
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="branding" className="text-right">
                Show Branding
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="branding"
                  checked={widgetConfig.branding}
                  onCheckedChange={(checked) => handleWidgetConfigChange('branding', checked)}
                />
                <Label htmlFor="branding" className="text-sm text-muted-foreground">
                  Display Support AI branding on widget
                </Label>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reportData" className="text-right">
                Analytics
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Switch
                  id="reportData"
                  checked={widgetConfig.reportData}
                  onCheckedChange={(checked) => handleWidgetConfigChange('reportData', checked)}
                />
                <Label htmlFor="reportData" className="text-sm text-muted-foreground">
                  Send analytics data back to Support AI
                </Label>
              </div>
            </div>
            
            {/* Authentication options - only shown for auth widget */}
            {isAuthWidget && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-4 pt-4">
                  <h3 className="font-medium text-lg mb-2">Authentication Settings</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Configure how users authenticate with the chat widget when integrated on your client's website.
                  </p>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="requireAuth" className="text-right">
                    Require Login
                  </Label>
                  <div className="flex items-center space-x-2 col-span-3">
                    <Switch
                      id="requireAuth"
                      checked={widgetConfig.requireAuth}
                      onCheckedChange={(checked) => handleWidgetConfigChange('requireAuth', checked)}
                    />
                    <Label htmlFor="requireAuth" className="text-sm text-muted-foreground">
                      Users must log in before chatting
                    </Label>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWidgetDialog(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={downloadWidgetPackage}
              className={isAuthWidget ? "bg-purple-600 hover:bg-purple-700" : ""}
            >
              <Download className="mr-2 h-4 w-4" />
              Download {isAuthWidget ? 'Auth Widget' : 'Widget'} Package
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {user?.name || user?.username}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Here's an overview of your support system
            </p>
          </div>
          <div className="mt-4 md:mt-0 space-x-2">
            <Link href="/admin">
              <Button variant="outline" className="w-full md:w-auto mt-2 md:mt-0">
                Menu
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button variant="outline" className="w-full md:w-auto mt-2 md:mt-0">
                Settings
                <Settings className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tickets</p>
                  {isLoadingSummary ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-bold mt-1">{summaryData?.totalTickets || 0}</h3>
                  )}
                </div>
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                  <Ticket className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Resolved</p>
                  {isLoadingSummary ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-bold mt-1">{summaryData?.resolvedTickets || 0}</h3>
                  )}
                </div>
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                  <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Response</p>
                  {isLoadingSummary ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-bold mt-1">{summaryData?.avgResponseTime || '0h'}</h3>
                  )}
                </div>
                <div className="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">AI Resolved</p>
                  {isLoadingSummary ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-bold mt-1">{summaryData?.aiResolvedPercentage || '0%'}</h3>
                  )}
                </div>
                <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Module */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl">Chat Module</CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-blue-600 dark:text-blue-400"
                onClick={handleWidgetDownload}
              >
                <Download className="h-4 w-4 mr-1" />
                Download Widget
              </Button>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Chat Widget for Your Website</h3>
                </div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Embed our AI-powered chat widget into your website to provide instant support to your customers.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-900">
                    <h4 className="font-medium mb-2">Quick Installation</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Add this script to your website's HTML:
                    </p>
                    <div className="bg-gray-900 text-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                      {`<script src="${window.location.origin}/downloads/widget/universal-support-script.js?tenant=${user?.tenantId}"></script>`}
                    </div>
                    <Button 
                      variant="link" 
                      className="text-xs p-0 h-6 mt-2"
                      onClick={() => {
                        const code = `<script src="${window.location.origin}/downloads/widget/universal-support-script.js?tenant=${user?.tenantId}"></script>`;
                        navigator.clipboard.writeText(code);
                        toast({
                          title: "Copied to clipboard",
                          description: "Widget code has been copied to your clipboard"
                        });
                      }}
                    >
                      Copy Code
                    </Button>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-900">
                    <h4 className="font-medium mb-2">Customization</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Download the complete package to customize appearance and behavior.
                    </p>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={handleWidgetDownload}
                    >
                      Configure Widget
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl">Categories</CardTitle>
              <Button variant="ghost" size="sm" className="text-blue-600 dark:text-blue-400">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoadingCategories ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {categoriesData && categoriesData.length > 0 ? (
                    categoriesData.map((category, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full bg-primary mr-2 opacity-${90 - (index * 20)}`}></div>
                          <span className="text-sm font-medium">{category.category}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="text-sm font-medium">{category.count}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            ({category.percentage}%)
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No category data available
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
                <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-bold mb-2">Download Chat Widget</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Get the embeddable chat widget code for your website.
              </p>
              <div className="flex flex-col space-y-2 w-full">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAuthWidgetDownload}
                  className="border-purple-300 hover:bg-purple-50 dark:border-purple-800 dark:hover:bg-purple-950"
                >
                  Download Auth Widget
                </Button>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  For client websites with user login
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                <ArrowUpRight className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-bold mb-2">View Tickets</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Manage and respond to support tickets.
              </p>
              <Link href="/admin/tickets">
                <Button variant="outline" size="sm">Go to Tickets</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full mb-4">
                <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-bold mb-2">Configure AI</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Customize AI behavior and knowledge sources.
              </p>
              <Link href="/admin/settings">
                <Button variant="outline" size="sm">Configure</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}