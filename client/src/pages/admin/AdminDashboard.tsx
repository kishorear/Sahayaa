import AdminLayout from "@/components/admin/AdminLayout";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-y-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Support Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your AI-powered support system performance</p>
          </div>
        </div>
        
        <AnalyticsDashboard />
      </div>
    </AdminLayout>
  );
}
