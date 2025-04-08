import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, Users, Ticket, Clock, ArrowUpRight, 
  ArrowRight, Download, MessageSquare, Settings
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

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
  
  // Function to handle widget download
  const handleWidgetDownload = () => {
    // Show toast notification
    toast({
      title: "Downloading widget package",
      description: "Your widget package is being prepared and will download shortly.",
    });
    
    // Construct URL with query parameters for customized widget package
    const queryParams = new URLSearchParams({
      tenantId: String(user?.tenantId || 1),
      userId: String(user?.id || 1),
      primaryColor: '6366F1', // Default primary color
      position: 'right',
      greetingMessage: encodeURIComponent('How can I help you today?'),
      autoOpen: 'false',
      branding: 'true',
      reportData: 'true'
    });
    
    // Download the widget package
    window.location.href = `/api/widgets/download?${queryParams.toString()}`;
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
                Go to Admin
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
                      {`<script src="https://supportai.com/widget.js?tenant=${user?.tenantId}"></script>`}
                    </div>
                    <Button variant="link" className="text-xs p-0 h-6 mt-2">
                      Copy Code
                    </Button>
                  </div>
                  <div className="border border-gray-200 dark:border-gray-700 rounded p-4 bg-gray-50 dark:bg-gray-900">
                    <h4 className="font-medium mb-2">Customization</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Download the complete package to customize appearance and behavior.
                    </p>
                    <Link href="/admin/settings">
                      <Button size="sm" className="w-full">
                        Configure Widget
                      </Button>
                    </Link>
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
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleWidgetDownload}
              >
                Download Now
              </Button>
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