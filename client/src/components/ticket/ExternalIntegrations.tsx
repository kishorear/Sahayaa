import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Check, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExternalIntegrationsProps {
  externalIntegrations?: Record<string, any>;
  onSyncTicket?: () => void;
  isSyncing?: boolean;
}

const ExternalIntegrations: React.FC<ExternalIntegrationsProps> = ({
  externalIntegrations,
  onSyncTicket,
  isSyncing = false
}) => {
  // If there are no external integrations, don't render the component
  if (!externalIntegrations || Object.keys(externalIntegrations).length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center justify-between">
            External Integrations
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSyncTicket} 
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Clock className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Clock className="mr-1 h-4 w-4" />
              )}
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </CardTitle>
          <CardDescription>
            This ticket has not been synchronized with any external systems.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-md flex items-center justify-between">
          External Integrations
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSyncTicket} 
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Clock className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Clock className="mr-1 h-4 w-4" />
            )}
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </CardTitle>
        <CardDescription>
          This ticket is synchronized with the following external systems.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Jira Integration */}
          {externalIntegrations.jira && (
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className="mr-2 bg-blue-500">Jira</Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Jira issue tracking system</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="font-medium mr-2">
                  {externalIntegrations.jira.key || externalIntegrations.jira.id}
                </span>
                {externalIntegrations.jira.status && (
                  <Badge variant={getJiraStatusVariant(externalIntegrations.jira.status)}>
                    {formatJiraStatus(externalIntegrations.jira.status)}
                  </Badge>
                )}
              </div>
              <a 
                href={externalIntegrations.jira.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 flex items-center"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View in Jira
              </a>
            </div>
          )}

          {/* Zendesk Integration */}
          {externalIntegrations.zendesk && (
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge className="mr-2 bg-green-500">Zendesk</Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Zendesk customer support system</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="font-medium mr-2">
                  #{externalIntegrations.zendesk.id}
                </span>
                {externalIntegrations.zendesk.status && (
                  <Badge variant={getZendeskStatusVariant(externalIntegrations.zendesk.status)}>
                    {formatZendeskStatus(externalIntegrations.zendesk.status)}
                  </Badge>
                )}
              </div>
              <a 
                href={externalIntegrations.zendesk.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-500 hover:text-green-700 flex items-center"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View in Zendesk
              </a>
            </div>
          )}

          {/* Last sync time */}
          {externalIntegrations.lastSyncTime && (
            <div className="text-sm text-gray-500 mt-2 flex items-center">
              <Check className="h-4 w-4 mr-1 text-green-500" />
              Last synchronized: {new Date(externalIntegrations.lastSyncTime).toLocaleString()}
            </div>
          )}

          {/* Sync errors */}
          {externalIntegrations.syncError && (
            <div className="text-sm text-red-500 mt-2 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              Error: {externalIntegrations.syncError}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper functions to format status badges
function getJiraStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case "to do": 
    case "open": 
    case "new": 
      return "default";
    case "in progress": 
      return "secondary";
    case "done": 
    case "resolved": 
    case "closed": 
      return "outline";
    default: 
      return "default";
  }
}

function formatJiraStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getZendeskStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case "new": 
      return "default";
    case "open": 
    case "pending": 
      return "secondary";
    case "solved": 
    case "closed": 
      return "outline";
    default: 
      return "default";
  }
}

function formatZendeskStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default ExternalIntegrations;