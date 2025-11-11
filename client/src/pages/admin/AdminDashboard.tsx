import AdminLayout from "@/components/admin/AdminLayout";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AdminDashboard() {
  const { user } = useAuth();
  const tenant = (user as any)?.tenant;
  
  return (
    <AdminLayout>
      <div className="flex flex-col gap-y-8">
        {tenant?.isTrial && (
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" data-testid="alert-trial-status">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              {tenant.name} (Trial)
            </AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              {tenant.ticketLimit && tenant.ticketsCreated !== undefined ? (
                <>
                  You have <strong>{tenant.ticketLimit - tenant.ticketsCreated}</strong> of <strong>{tenant.ticketLimit}</strong> tickets remaining.
                </>
              ) : (
                "Trial account active"
              )}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Support Dashboard</h1>
        </div>
        
        <AnalyticsDashboard />
      </div>
    </AdminLayout>
  );
}
