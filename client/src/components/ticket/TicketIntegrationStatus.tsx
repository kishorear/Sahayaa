import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface IntegrationItem {
  id: string;
  key?: string;
  url: string;
  status: string;
  created: string;
  updated: string;
}

interface ExternalIntegrations {
  jira?: IntegrationItem;
  zendesk?: IntegrationItem;
}

interface TicketIntegrationStatusProps {
  ticketId: number;
  externalIntegrations?: ExternalIntegrations;
  activeIntegrations: string[];
  hasUnsyncedChanges: boolean;
  onSyncTicket: () => Promise<void>;
}

export function TicketIntegrationStatus({
  ticketId,
  externalIntegrations = {},
  activeIntegrations = [],
  hasUnsyncedChanges = false,
  onSyncTicket
}: TicketIntegrationStatusProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncTicket();
      toast({
        title: 'Success',
        description: 'Ticket synchronized with external systems',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error syncing ticket:', error);
      toast({
        title: 'Sync Failed',
        description: error instanceof Error 
          ? error.message 
          : 'Failed to sync ticket with external systems',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    const lowercaseStatus = status.toLowerCase();
    if (lowercaseStatus.includes('open') || lowercaseStatus.includes('active') || lowercaseStatus.includes('in progress')) {
      return 'bg-blue-100 text-blue-800';
    } else if (lowercaseStatus.includes('resolved') || lowercaseStatus.includes('closed') || lowercaseStatus.includes('done')) {
      return 'bg-green-100 text-green-800';
    } else if (lowercaseStatus.includes('waiting') || lowercaseStatus.includes('pending')) {
      return 'bg-amber-100 text-amber-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper for formatting dates
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return 'Unknown';
    }
  };

  // If no integrations are active, don't display the component
  if (activeIntegrations.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">External Integrations</CardTitle>
            <CardDescription>Sync this ticket with external systems</CardDescription>
          </div>
          <Button 
            onClick={handleSync} 
            disabled={isSyncing} 
            variant={hasUnsyncedChanges ? "default" : "secondary"}
            size="sm"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-1 h-4 w-4" /> {hasUnsyncedChanges ? 'Sync Now' : 'Sync'}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeIntegrations.includes('jira') && (
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <span className="font-medium mr-2 flex items-center">
                <LinkIcon className="h-4 w-4 mr-1" /> Jira
              </span>
              {externalIntegrations.jira ? (
                <Badge variant="outline" className="ml-auto">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="ml-auto">
                  <AlertCircle className="h-3 w-3 mr-1 text-amber-500" /> Not Synced
                </Badge>
              )}
            </div>
            
            {externalIntegrations.jira && (
              <div className="text-sm bg-muted p-3 rounded-md">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Key:</span>
                  <span className="font-mono">{externalIntegrations.jira.key}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(externalIntegrations.jira.status)}>
                    {externalIntegrations.jira.status}
                  </Badge>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Updated:</span>
                  <span>{formatDate(externalIntegrations.jira.updated)}</span>
                </div>
                <div className="mt-2">
                  <a 
                    href={externalIntegrations.jira.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs flex items-center justify-center w-full text-primary hover:underline"
                  >
                    View in Jira <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeIntegrations.includes('jira') && activeIntegrations.includes('zendesk') && (
          <Separator className="my-3" />
        )}
        
        {activeIntegrations.includes('zendesk') && (
          <div>
            <div className="flex items-center mb-2">
              <span className="font-medium mr-2 flex items-center">
                <LinkIcon className="h-4 w-4 mr-1" /> Zendesk
              </span>
              {externalIntegrations.zendesk ? (
                <Badge variant="outline" className="ml-auto">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" /> Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="ml-auto">
                  <AlertCircle className="h-3 w-3 mr-1 text-amber-500" /> Not Synced
                </Badge>
              )}
            </div>
            
            {externalIntegrations.zendesk && (
              <div className="text-sm bg-muted p-3 rounded-md">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">ID:</span>
                  <span className="font-mono">{externalIntegrations.zendesk.id}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={getStatusColor(externalIntegrations.zendesk.status)}>
                    {externalIntegrations.zendesk.status}
                  </Badge>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Updated:</span>
                  <span>{formatDate(externalIntegrations.zendesk.updated)}</span>
                </div>
                <div className="mt-2">
                  <a 
                    href={externalIntegrations.zendesk.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs flex items-center justify-center w-full text-primary hover:underline"
                  >
                    View in Zendesk <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}