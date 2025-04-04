import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import ExternalIntegrations from './ExternalIntegrations';

interface TicketIntegrationStatusProps {
  ticketId: number;
  externalIntegrations?: Record<string, any>;
}

const TicketIntegrationStatus: React.FC<TicketIntegrationStatusProps> = ({
  ticketId,
  externalIntegrations
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  // Mutation to sync ticket with external integrations
  const syncMutation = useMutation({
    mutationFn: async () => {
      setIsSyncing(true);
      // Try Jira first
      let jiraResult;
      try {
        jiraResult = await apiRequest(`/api/integrations/jira/sync/${ticketId}`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error syncing with Jira:', error);
      }

      // Then try Zendesk, regardless of Jira result
      let zendeskResult;
      try {
        zendeskResult = await apiRequest(`/api/integrations/zendesk/sync/${ticketId}`, {
          method: 'POST'
        });
      } catch (error) {
        console.error('Error syncing with Zendesk:', error);
      }

      return { jira: jiraResult, zendesk: zendeskResult };
    },
    onSuccess: () => {
      // Invalidate queries to refresh ticket data
      queryClient.invalidateQueries({ queryKey: ['/api/tickets', ticketId] });
      toast({
        title: 'Ticket synchronized',
        description: 'Ticket has been synchronized with external systems',
        variant: 'success'
      });
      setIsSyncing(false);
    },
    onError: (error) => {
      console.error('Error synchronizing ticket:', error);
      toast({
        title: 'Synchronization failed',
        description: 'Failed to synchronize ticket with external systems',
        variant: 'destructive'
      });
      setIsSyncing(false);
    }
  });

  const handleSyncTicket = () => {
    syncMutation.mutate();
  };

  return (
    <ExternalIntegrations
      externalIntegrations={externalIntegrations}
      onSyncTicket={handleSyncTicket}
      isSyncing={isSyncing}
    />
  );
};

export default TicketIntegrationStatus;