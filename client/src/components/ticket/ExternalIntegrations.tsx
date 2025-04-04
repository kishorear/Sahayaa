import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { TicketIntegrationStatus } from './TicketIntegrationStatus';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ExternalIntegrationsProps {
  ticketId: number;
}

// Sync status response type
interface SyncStatusResponse {
  ticket: {
    id: number;
    title: string;
    status: string;
  };
  activeIntegrations: string[];
  externalIntegrations: Record<string, any>;
  hasUnsyncedChanges: boolean;
}

export function ExternalIntegrations({ ticketId }: ExternalIntegrationsProps) {
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Query to get the integration status
  const syncStatusQuery = useQuery({
    queryKey: ['/api/tickets', ticketId, 'sync-status'],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/tickets/${ticketId}/sync-status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to get integration status: ${response.statusText}`);
        }
        
        const data = await response.json();
        setError(null);
        return data as SyncStatusResponse;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to get integration status');
        throw error;
      }
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Mutation to sync the ticket
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/tickets/${ticketId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync ticket: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', ticketId, 'sync-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', ticketId] });
      setError(null);
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : 'Failed to sync ticket');
    }
  });
  
  // Handle sync ticket action
  const handleSyncTicket = async () => {
    await syncMutation.mutateAsync();
  };
  
  if (syncStatusQuery.isPending) {
    return (
      <div className="p-4 border rounded-md bg-background animate-pulse">
        <div className="h-4 w-1/3 bg-muted rounded mb-3"></div>
        <div className="h-10 bg-muted rounded mb-3"></div>
        <div className="h-20 bg-muted rounded"></div>
      </div>
    );
  }
  
  // If there are no active integrations, don't display anything
  if (
    !syncStatusQuery.data ||
    !syncStatusQuery.data.activeIntegrations ||
    syncStatusQuery.data.activeIntegrations.length === 0
  ) {
    return null;
  }
  
  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => syncStatusQuery.refetch()}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <TicketIntegrationStatus
        ticketId={ticketId}
        externalIntegrations={syncStatusQuery.data?.externalIntegrations}
        activeIntegrations={syncStatusQuery.data?.activeIntegrations || []}
        hasUnsyncedChanges={syncStatusQuery.data?.hasUnsyncedChanges || false}
        onSyncTicket={handleSyncTicket}
      />
    </div>
  );
}