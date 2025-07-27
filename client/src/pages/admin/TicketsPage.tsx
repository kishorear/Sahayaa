import AdminLayout from "@/components/admin/AdminLayout";
import EnhancedTicketList from "@/components/admin/EnhancedTicketList";

export default function TicketsPage() {
  return (
    <AdminLayout>
      <EnhancedTicketList />
    </AdminLayout>
  );
}
