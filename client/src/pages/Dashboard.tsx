import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  MessageSquare, 
  Users, 
  Settings, 
  Download, 
  ChevronUp,
  ChevronDown,
  Clock,
  ArrowUpRight,
  ArrowRight,
  FileText,
  CheckCircle2,
  BarChart,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import LineAreaChart from '@/components/charts/LineAreaChart';
import DonutChart from '@/components/charts/DonutChart';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Get tickets for dashboard
function useTickets() {
  return useQuery({
    queryKey: ['/api/tickets'],
  });
}

// Get widget analytics (summary)
function useWidgetAnalytics() {
  return useQuery({
    queryKey: ['/api/analytics/widget/summary'],
  });
}

// Get widget analytics (summary) with time period
function useWidgetAnalyticsWithTimePeriod(timePeriod: string) {
  return useQuery({
    queryKey: ['/api/analytics/widget/summary', timePeriod],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/widget/summary?timePeriod=${timePeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch widget analytics');
      }
      return response.json();
    },
  });
}

// Get ticket categories for dashboard
function useTicketCategories() {
  return useQuery({
    queryKey: ['/api/tickets/categories'],
  });
}

// Get ticket metrics
function useTicketMetrics(timePeriod: string) {
  return useQuery({
    queryKey: ['/api/tickets/metrics', timePeriod],
    queryFn: async () => {
      const response = await fetch(`/api/tickets/metrics?timePeriod=${timePeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ticket metrics');
      }
      return response.json();
    },
  });
}

// Ticket interface
interface Ticket {
  id: number;
  status: 'new' | 'in_progress' | 'resolved';
  title: string;
  description: string;
  createdAt: string;
  [key: string]: any;
}

// Category interface
interface Category {
  category: string;
  count: number;
  percentage: number;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState('weekly');
  
  const { data: ticketsData, isLoading: isLoadingTickets } = useTickets();
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useWidgetAnalyticsWithTimePeriod(timePeriod);
  const { data: categoriesData, isLoading: isLoadingCategories } = useTicketCategories();
  const { data: metricsData, isLoading: isLoadingMetrics } = useTicketMetrics(timePeriod);

  const ticketStatusCounts = useMemo(() => {
    const tickets = ticketsData as Ticket[] || [];
    
    const counts = {
      new: 0,
      in_progress: 0,
      resolved: 0,
      total: tickets.length
    };
    
    tickets.forEach((ticket: Ticket) => {
      if (ticket.status in counts) {
        counts[ticket.status as keyof typeof counts] += 1;
      }
    });
    
    return counts;
  }, [ticketsData]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Welcome back, {user?.name || user?.username || 'User'}
        </p>
      </div>
      
      <div className="space-y-8">
        {/* Overview Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {isLoadingAnalytics ? (
                  <Skeleton className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="text-2xl font-bold">{analyticsData?.totalConversations || 0}</div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Total Conversations</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isLoadingAnalytics ? (
                    <Skeleton className="h-4 w-20" />
                  ) : (
                    `${analyticsData?.conversationChange || 0}% from last ${timePeriod.replace('ly', '')}`
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-full">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                {isLoadingAnalytics ? (
                  <Skeleton className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="text-2xl font-bold">{analyticsData?.aiResolvedPercentage || 0}%</div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">AI Resolved Rate</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isLoadingAnalytics ? (
                    <Skeleton className="h-4 w-20" />
                  ) : (
                    `${analyticsData?.aiResolvedChange || 0}% from last ${timePeriod.replace('ly', '')}`
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                {isLoadingTickets ? (
                  <Skeleton className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="text-2xl font-bold">{ticketStatusCounts.total}</div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Total Tickets</p>
                <div className="flex space-x-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                    <span>New: {ticketStatusCounts.new}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                    <span>In Progress: {ticketStatusCounts.in_progress}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-full">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                {isLoadingMetrics ? (
                  <Skeleton className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="text-2xl font-bold">{metricsData?.averageResponseTime || '0h'}</div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Avg. Response Time</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isLoadingMetrics ? (
                    <Skeleton className="h-4 w-20" />
                  ) : (
                    `${metricsData?.responseTimeChange || 0}% from last ${timePeriod.replace('ly', '')}`
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Filter Time Period */}
        <div className="flex justify-end">
          <Select
            value={timePeriod}
            onValueChange={(value) => setTimePeriod(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Charts & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Volume</CardTitle>
              <CardDescription>Conversations over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalytics ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <LineAreaChart 
                  data={analyticsData?.volumeData || []}
                  dataKeys={['conversations']}
                  height={300}
                  colors={['#6366F1']}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Response Time</CardTitle>
              <CardDescription>Average response time in hours</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMetrics ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <LineAreaChart 
                  data={metricsData?.responseTimeData || []}
                  dataKeys={['hours']}
                  height={300}
                  colors={['#EC4899']}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Module */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl">Chat Module</CardTitle>
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-blue-600 dark:text-blue-400"
                  onClick={() => {
                    // Toggle dropdown
                    const dropdown = document.getElementById("download-dropdown");
                    dropdown?.classList.toggle("hidden");
                  }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download Widget
                </Button>
                
                {/* Dropdown menu for download options */}
                <div 
                  id="download-dropdown" 
                  className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-700 hidden z-50"
                >
                  <div className="py-1">
                    <a 
                      href="/downloads/supportai-widget-package.zip" 
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        toast({
                          title: "Downloading standard package",
                          description: "Your widget package download has started."
                        });
                      }}
                    >
                      Standard Widget Package
                    </a>
                    <a 
                      href="/downloads/SupportAIWidget_Windows_Installer.zip" 
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        toast({
                          title: "Downloading Windows Installer",
                          description: "Windows installer download has started. Extract the ZIP file and run the Setup.bat file."
                        });
                      }}
                    >
                      Windows Installer (Windows 10/11)
                    </a>
                    <a 
                      href="/downloads/extension/supportai-widget-extension.zip" 
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        toast({
                          title: "Downloading Browser Extension",
                          description: "Your Browser Extension download has started."
                        });
                      }}
                    >
                      Browser Extension
                    </a>
                  </div>
                </div>
              </div>
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
                    <Button 
                      variant="link" 
                      className="text-xs p-0 h-6 mt-2"
                      onClick={() => {
                        navigator.clipboard.writeText(`<script src="https://supportai.com/widget.js?tenant=${user?.tenantId}"></script>`);
                        toast({
                          title: "Copied to clipboard",
                          description: "Widget code has been copied to your clipboard."
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
                  {(categoriesData as Category[] || []).length > 0 ? (
                    (categoriesData as Category[]).map((category, index) => (
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
              <div className="relative">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Toggle dropdown
                    const dropdown = document.getElementById("download-dropdown-quick");
                    dropdown?.classList.toggle("hidden");
                  }}
                >
                  Download Now
                </Button>
                
                {/* Dropdown menu for download options */}
                <div 
                  id="download-dropdown-quick" 
                  className="absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-700 hidden z-50"
                >
                  <div className="py-1">
                    <a 
                      href="/downloads/supportai-widget-package.zip" 
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        toast({
                          title: "Downloading standard package",
                          description: "Your widget package download has started."
                        });
                      }}
                    >
                      Standard Widget Package
                    </a>
                    <a 
                      href="/downloads/SupportAIWidget_Windows_Installer.zip" 
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        toast({
                          title: "Downloading Windows Installer",
                          description: "Windows installer download has started. Extract the ZIP file and run the Setup.bat file."
                        });
                      }}
                    >
                      Windows Installer (Windows 10/11)
                    </a>
                    <a 
                      href="/downloads/extension/supportai-widget-extension.zip" 
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                        toast({
                          title: "Downloading Browser Extension",
                          description: "Your Browser Extension download has started."
                        });
                      }}
                    >
                      Browser Extension
                    </a>
                  </div>
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
