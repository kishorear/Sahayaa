import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminLayout from "@/components/admin/AdminLayout";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import EnhancedTicketList from "@/components/admin/EnhancedTicketList";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="flex flex-col gap-y-8">
        <Tabs defaultValue="analytics" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold tracking-tight">Support Dashboard</h1>
            <TabsList>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="analytics" className="mt-0">
            <AnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="tickets" className="mt-0">
            <EnhancedTicketList />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
