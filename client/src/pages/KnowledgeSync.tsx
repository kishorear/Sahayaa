import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Database, FileText, Clock, CheckCircle, XCircle, Info } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface SyncStatus {
  last_sync: string | null;
  sync_count: number;
  uploads_directory: {
    path: string;
    file_count: number;
    files: string[];
  };
  backup_directory: {
    path: string;
    backup_count: number;
  };
  vector_storage: {
    total_files: number;
    total_vectors: number;
    openai_available: boolean;
    files: string[];
  };
}

interface SyncResult {
  success: boolean;
  sync_timestamp: string;
  sync_duration_ms: number;
  changes_detected: {
    new_files: any[];
    modified_files: any[];
    deleted_files: any[];
    unchanged_files: any[];
  };
  final_state: {
    total_files: number;
    files: string[];
    sync_count: number;
  };
}

export default function KnowledgeSync() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const { toast } = useToast();

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/knowledge/status');
      const result = await response.json();
      // Handle both direct data and wrapped response formats
      setStatus(result.data || result);
    } catch (error) {
      console.error('Failed to fetch knowledge sync status:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sync status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performSync = async () => {
    try {
      setSyncing(true);
      setSyncProgress(10);
      
      toast({
        title: "Sync Started",
        description: "Knowledge repository synchronization in progress..."
      });

      setSyncProgress(30);
      const response = await fetch('/api/knowledge/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setSyncProgress(90);
      
      if (data.success) {
        setLastSyncResult(data.data);
        setSyncProgress(100);
        
        toast({
          title: "Sync Complete",
          description: `Knowledge repository synchronized successfully in ${data.data.sync_duration_ms}ms`
        });

        // Refresh status after successful sync
        setTimeout(() => {
          fetchStatus();
          setSyncProgress(0);
        }, 1000);
      } else {
        throw new Error(data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncProgress(0);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync knowledge repository",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const cleanupBackups = async () => {
    try {
      const response = await fetch('/api/knowledge/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keepDays: 7 })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: "Cleanup Complete",
          description: `Deleted ${data.data.deleted_count} old backup files`
        });
        fetchStatus();
      }
    } catch (error) {
      toast({
        title: "Cleanup Failed",
        description: "Failed to cleanup old backups",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getSyncStatusBadge = () => {
    if (!status) return null;
    
    if (status.vector_storage?.openai_available) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Ready</Badge>;
    } else {
      return <Badge variant="destructive">OpenAI Unavailable</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Repository Sync</h1>
          <p className="text-muted-foreground">Manage and synchronize your knowledge base files</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={performSync}
            disabled={isSyncing || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            One-Click Sync
          </Button>
        </div>
      </div>

      {isSyncing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Synchronization Progress</span>
                <span className="text-sm text-muted-foreground">{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            {getSyncStatusBadge()}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Last Sync</span>
                <span className="text-sm font-mono">
                  {status ? formatDate(status.last_sync) : 'Loading...'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Syncs</span>
                <span className="text-sm font-mono">
                  {status?.sync_count || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">OpenAI Status</span>
                <span className="text-sm">
                  {status?.vector_storage?.openai_available ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Files Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Files</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Upload Directory</span>
                <span className="text-sm font-mono">
                  {status?.uploads_directory?.file_count || 0} files
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Vector Storage</span>
                <span className="text-sm font-mono">
                  {status?.vector_storage?.total_vectors || 0} vectors
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Backups</span>
                <span className="text-sm font-mono">
                  {status?.backup_directory?.backup_count || 0} files
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={cleanupBackups}
              className="w-full"
            >
              <Clock className="h-4 w-4 mr-2" />
              Cleanup Old Backups
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* File Lists */}
      {status && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Directory Files</CardTitle>
              <CardDescription>
                Files available for processing ({status?.uploads_directory?.file_count || 0} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {status?.uploads_directory?.files?.length > 0 ? (
                  status.uploads_directory.files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{file}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2" />
                    <p>No files in upload directory</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vector Storage Files</CardTitle>
              <CardDescription>
                Files processed with embeddings ({status?.vector_storage?.total_files || 0} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {status?.vector_storage?.files?.length > 0 ? (
                  status.vector_storage.files.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-mono">{file}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2" />
                    <p>No files processed yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Last Sync Result */}
      {lastSyncResult && (
        <Card>
          <CardHeader>
            <CardTitle>Last Sync Result</CardTitle>
            <CardDescription>
              Completed {formatDate(lastSyncResult.sync_timestamp)} in {lastSyncResult.sync_duration_ms}ms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {lastSyncResult.changes_detected.new_files.length}
                </div>
                <div className="text-sm text-muted-foreground">New Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {lastSyncResult.changes_detected.modified_files.length}
                </div>
                <div className="text-sm text-muted-foreground">Modified</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {lastSyncResult.changes_detected.deleted_files.length}
                </div>
                <div className="text-sm text-muted-foreground">Deleted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {lastSyncResult.changes_detected.unchanged_files.length}
                </div>
                <div className="text-sm text-muted-foreground">Unchanged</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}