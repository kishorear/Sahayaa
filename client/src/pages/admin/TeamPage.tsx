import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function TeamPage() {
  // Sample team data - in a real application, this would come from an API
  const team = [
    {
      id: 1,
      name: "Jane Smith",
      role: "Support Manager",
      email: "jane.smith@example.com",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      activeTickets: 5,
      department: "Support",
    },
    {
      id: 2,
      name: "Michael Johnson",
      role: "Support Specialist",
      email: "michael.johnson@example.com",
      avatar: "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      activeTickets: 8,
      department: "Support",
    },
    {
      id: 3,
      name: "Emily Chen",
      role: "Senior Developer",
      email: "emily.chen@example.com",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      activeTickets: 3,
      department: "Engineering",
    },
    {
      id: 4,
      name: "David Wilson",
      role: "Lead Engineer",
      email: "david.wilson@example.com",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      activeTickets: 2,
      department: "Engineering",
    },
    {
      id: 5,
      name: "Sarah Martinez",
      role: "Product Specialist",
      email: "sarah.martinez@example.com",
      avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      activeTickets: 6,
      department: "Product",
    },
  ];

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage team members and their ticket assignments
          </p>
        </div>

        <Card>
          <CardHeader className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium text-gray-900">Team Members</CardTitle>
              <Badge className="bg-primary">{team.length} Members</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {team.map((member) => (
                <div
                  key={member.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-500">{member.role}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Email</span>
                      <span className="text-sm text-gray-900">{member.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Department</span>
                      <span className="text-sm text-gray-900">{member.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Active Tickets</span>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-transparent">
                        {member.activeTickets}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
