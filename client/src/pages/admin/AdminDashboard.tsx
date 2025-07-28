import AdminLayout from "@/components/admin/AdminLayout";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import { ContextualHelp } from "@/components/tour/ContextualHelp";
import { Button } from "@/components/ui/button";
import { useTour } from "@/components/tour/TourProvider";
import { HelpCircle } from "lucide-react";

export default function AdminDashboard() {
  const { startTour, completedTours } = useTour();
  
  const showWelcomeTour = !completedTours.includes('first-time-user');

  return (
    <AdminLayout>
      <div className="flex flex-col gap-y-8">
        <div className="flex justify-between items-center mb-4" data-tour="dashboard-header">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Support Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your AI-powered support system performance</p>
          </div>
          
          <div className="flex items-center gap-3">
            <ContextualHelp 
              context="dashboard" 
              suggestions={[
                { tourId: 'first-time-user', title: 'Welcome Tour', description: 'Get started with the basics' },
                { tourId: 'analytics-dashboard', title: 'Analytics Tour', description: 'Master your metrics' }
              ]}
              tips={[
                "Use the overview cards to quickly assess system health",
                "Check ticket trends to identify peak support times",
                "Monitor AI resolution rates to optimize performance",
                "Click on metrics to drill down into detailed analytics"
              ]}
            />
            
            {showWelcomeTour && (
              <Button 
                onClick={() => startTour('first-time-user')}
                className="flex items-center gap-2"
              >
                <HelpCircle className="w-4 h-4" />
                Take Welcome Tour
              </Button>
            )}
          </div>
        </div>
        
        <div data-tour="metrics-overview">
          <AnalyticsDashboard />
        </div>
      </div>
    </AdminLayout>
  );
}
