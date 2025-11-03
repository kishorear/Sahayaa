import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Ticket, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Tenant {
  id: number;
  name: string;
  isTrial: boolean;
  ticketLimit: number | null;
  ticketsCreated: number;
}

interface TicketCounterProps {
  variant?: "badge" | "alert" | "inline";
  showWarning?: boolean;
}

export function TrialTicketCounter({ variant = "badge", showWarning = true }: TicketCounterProps) {
  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/auth/me"],
    select: (data: any) => data?.tenant,
  });

  // Don't show anything if loading or not a trial account
  if (isLoading || !tenant || !tenant.isTrial || !tenant.ticketLimit) {
    return null;
  }

  const ticketsUsed = tenant.ticketsCreated || 0;
  const ticketLimit = tenant.ticketLimit;
  const remaining = ticketLimit - ticketsUsed;
  const percentageUsed = (ticketsUsed / ticketLimit) * 100;

  // Determine color based on usage
  const getVariantColor = () => {
    if (percentageUsed >= 90) return "destructive";
    if (percentageUsed >= 70) return "default";
    return "secondary";
  };

  // Badge variant (compact, for navbar)
  if (variant === "badge") {
    return (
      <Badge variant={getVariantColor()} className="flex items-center gap-1" data-testid="trial-badge-counter">
        <Ticket className="w-3 h-3" />
        {ticketsUsed} / {ticketLimit}
      </Badge>
    );
  }

  // Inline variant (for forms/dialogs)
  if (variant === "inline") {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2" data-testid="trial-inline-counter">
        <Ticket className="w-4 h-4" />
        <span>
          Trial: <strong>{remaining}</strong> tickets remaining ({ticketsUsed}/{ticketLimit} used)
        </span>
      </div>
    );
  }

  // Alert variant (for warnings)
  if (variant === "alert" && showWarning && percentageUsed >= 70) {
    return (
      <Alert variant={percentageUsed >= 90 ? "destructive" : "default"} data-testid="trial-alert-counter">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {percentageUsed >= 90 ? (
            <>
              <strong>Almost out of trial tickets!</strong> Only {remaining} of {ticketLimit} tickets remaining.
            </>
          ) : (
            <>
              You've used {ticketsUsed} of {ticketLimit} trial tickets. {remaining} remaining.
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
