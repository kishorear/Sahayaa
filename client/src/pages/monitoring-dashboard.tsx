import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Shield, 
  Database, 
  Zap, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  TrendingUp,
  Server,
  Cpu,
  HardDrive
} from 'lucide-react';

interface SystemStatus {
  timestamp: string;
  uptime: number;
  memoryUsage: any;
  environment: any;
  caching: {
    enabled: boolean;
    stats: any;
    hitRates: any;
  };
  processing: {
    parallelExecution: boolean;
    stats: any;
    avgExecutionTimes: any;
  };
  security: {
    enabled: boolean;
    stats: any;
    recentViolations: any[];
  };
  resilience: {
    enabled: boolean;
    stats: any;
    healthSummary: any;
  };
  circuitBreakers: {
    enabled: boolean;
    stats: any;
  };
}

interface PerformanceMetrics {
  timestamp: string;
  uptime: number;
  memoryUsage: any;
  cpuUsage: any;
  cacheHitRates: any;
  processingTimes: any;
  resilienceMetrics: any;
}

const MonitoringDashboard: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: systemStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['systemStatus'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/system-status');
      if (!response.ok) {
        throw new Error('Failed to fetch system status');
      }
      return response.json() as Promise<SystemStatus>;
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchOnWindowFocus: false
  });

  const { data: performanceMetrics, isLoading: perfLoading, refetch: refetchPerf } = useQuery({
    queryKey: ['performanceMetrics'],
    queryFn: async () => {
      const response = await fetch('/api/monitoring/performance');
      if (!response.ok) {
        throw new Error('Failed to fetch performance metrics');
      }
      return response.json() as Promise<PerformanceMetrics>;
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchOnWindowFocus: false
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatMemory = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const handleRefresh = () => {
    refetchStatus();
    refetchPerf();
  };

  const clearCache = async (cacheType: string) => {
    try {
      const response = await fetch('/api/monitoring/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cacheType }),
      });
      
      if (response.ok) {
        handleRefresh();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const resetCircuitBreakers = async (action: string) => {
    try {
      const response = await fetch('/api/monitoring/reset-circuit-breakers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      
      if (response.ok) {
        handleRefresh();
      }
    } catch (error) {
      console.error('Failed to reset circuit breakers:', error);
    }
  };

  if (statusLoading || perfLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-lg">Loading system status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Monitoring Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={statusLoading || perfLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Auto-refresh On" : "Auto-refresh Off"}
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              Uptime: {systemStatus ? formatUptime(systemStatus.uptime) : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceMetrics ? formatMemory(performanceMetrics.memoryUsage.heapUsed) : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              Heap used of {performanceMetrics ? formatMemory(performanceMetrics.memoryUsage.heapTotal) : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStatus ? `${systemStatus.caching.hitRates.general.toFixed(1)}%` : 'Loading...'}
            </div>
            <p className="text-xs text-muted-foreground">
              Average across all caches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Protected</div>
            <p className="text-xs text-muted-foreground">
              {systemStatus ? `${systemStatus.security.stats.totalViolations} violations` : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="caching">Caching</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="resilience">Resilience</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {systemStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Service Dependencies</h3>
                    {Object.entries(systemStatus.dependencies || {}).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex items-center justify-between p-2 border rounded">
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <Badge variant={value.status === 'healthy' ? 'default' : 'destructive'}>
                          {getStatusIcon(value.status)}
                          <span className="ml-1">{value.status}</span>
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Environment Configuration</h3>
                    <div className="p-2 border rounded">
                      <div className="text-sm text-muted-foreground">
                        Variables: {systemStatus.environment.configured}/{systemStatus.environment.total}
                      </div>
                      <Progress 
                        value={(systemStatus.environment.configured / systemStatus.environment.total) * 100} 
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Processing Times</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>General:</span>
                        <span>{performanceMetrics.processingTimes.general.toFixed(2)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI:</span>
                        <span>{performanceMetrics.processingTimes.ai.toFixed(2)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Database:</span>
                        <span>{performanceMetrics.processingTimes.database.toFixed(2)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vector:</span>
                        <span>{performanceMetrics.processingTimes.vector.toFixed(2)}ms</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">System Resources</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Heap Used:</span>
                        <span>{formatMemory(performanceMetrics.memoryUsage.heapUsed)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Heap Total:</span>
                        <span>{formatMemory(performanceMetrics.memoryUsage.heapTotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>External:</span>
                        <span>{formatMemory(performanceMetrics.memoryUsage.external)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>RSS:</span>
                        <span>{formatMemory(performanceMetrics.memoryUsage.rss)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="caching" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cache Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              {systemStatus && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(systemStatus.caching.stats).map(([key, stats]: [string, any]) => (
                      <div key={key} className="p-3 border rounded">
                        <h4 className="font-medium capitalize">{key}</h4>
                        <div className="text-sm text-muted-foreground mt-1">
                          <div>Hit Rate: {stats.hitRate.toFixed(1)}%</div>
                          <div>Size: {stats.size}</div>
                          <div>Hits: {stats.hits}</div>
                          <div>Misses: {stats.misses}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => clearCache('all')}
                    >
                      Clear All Caches
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => clearCache('general')}
                    >
                      Clear General
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => clearCache('ai')}
                    >
                      Clear AI
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Status</CardTitle>
            </CardHeader>
            <CardContent>
              {systemStatus && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 border rounded">
                      <h4 className="font-medium">Total Violations</h4>
                      <div className="text-2xl font-bold">
                        {systemStatus.security.stats.totalViolations}
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <h4 className="font-medium">Violations by Type</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        {Object.entries(systemStatus.security.stats.violationsByType).map(([type, count]: [string, any]) => (
                          <div key={type} className="flex justify-between">
                            <span>{type}:</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <h4 className="font-medium">Violations by Severity</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        {Object.entries(systemStatus.security.stats.violationsBySeverity).map(([severity, count]: [string, any]) => (
                          <div key={severity} className="flex justify-between">
                            <span className="capitalize">{severity}:</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {systemStatus.security.stats.recentViolations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recent Violations</h4>
                      <div className="space-y-2">
                        {systemStatus.security.stats.recentViolations.map((violation: any, index: number) => (
                          <Alert key={index} variant={violation.severity === 'high' ? 'destructive' : 'default'}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              {violation.type}: {violation.message}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resilience" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resilience & Circuit Breakers</CardTitle>
            </CardHeader>
            <CardContent>
              {systemStatus && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded">
                      <h4 className="font-medium">Resilience Stats</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        <div>Success Rate: {systemStatus.resilience.healthSummary.successRate.toFixed(1)}%</div>
                        <div>Timeout Rate: {systemStatus.resilience.healthSummary.timeoutRate.toFixed(1)}%</div>
                        <div>Fallback Rate: {systemStatus.resilience.healthSummary.fallbackRate.toFixed(1)}%</div>
                        <div>Avg Retry Delay: {systemStatus.resilience.healthSummary.averageRetryDelay.toFixed(0)}ms</div>
                      </div>
                    </div>
                    <div className="p-3 border rounded">
                      <h4 className="font-medium">Circuit Breaker States</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        {Object.entries(systemStatus.circuitBreakers.stats).map(([service, stats]: [string, any]) => (
                          <div key={service} className="flex justify-between">
                            <span>{service}:</span>
                            <Badge variant={stats.state === 'CLOSED' ? 'default' : 'destructive'}>
                              {stats.state}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => resetCircuitBreakers('reset')}
                    >
                      Reset All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => resetCircuitBreakers('close')}
                    >
                      Force Close
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => resetCircuitBreakers('open')}
                    >
                      Force Open
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MonitoringDashboard;