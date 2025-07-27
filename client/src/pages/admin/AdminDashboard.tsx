import AdminLayout from "@/components/admin/AdminLayout";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-y-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Support Dashboard</h1>
        </div>
        
        <AnalyticsDashboard />
      </div>
    </AdminLayout>
  );
}
