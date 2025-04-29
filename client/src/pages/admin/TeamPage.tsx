import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import TenantSelector from "@/components/TenantSelector";

// Define the team member type and valid roles
type Role = "admin" | "support-agent" | "engineer" | "user";

type TeamMember = {
  id: number;
  username: string;
  role: Role;
  name: string | null;
  email: string | null;
  tenantId: number;
  createdAt: string;
  updatedAt: string;
  activeTickets?: number; // This would come from a more complex query
};

// Form validation schema for adding/editing team members
const teamMemberSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  role: z.enum(["admin", "support-agent", "engineer", "user"], {
    required_error: "Please select a role",
  }),
  name: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

type TeamMemberFormValues = z.infer<typeof teamMemberSchema>;

export default function TeamPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<number | undefined>(undefined);
  
  // Check user roles for permissions
  const isCreator = currentUser?.role === 'creator';
  const isEngineer = currentUser?.role === 'engineer';
  const hasEditPermission = !isEngineer; // Engineer users have read-only access

  // Query to fetch team members
  const { data: teamMembers, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members", selectedTenantId],
    queryFn: async () => {
      const url = selectedTenantId 
        ? `/api/team-members?tenantId=${selectedTenantId}` 
        : "/api/team-members";
      const response = await apiRequest("GET", url);
      return await response.json();
    },
  });

  // Form for adding a new team member
  const addForm = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "user",
      name: "",
      email: "",
    },
  });

  // Form for editing an existing team member
  const editForm = useForm<TeamMemberFormValues>({
    resolver: zodResolver(teamMemberSchema.extend({
      password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
    })),
    defaultValues: {
      username: "",
      password: "",
      role: "user",
      name: "",
      email: "",
    },
  });

  // Reset form when closing dialogs
  useEffect(() => {
    if (!isAddDialogOpen) {
      addForm.reset();
    }
  }, [isAddDialogOpen, addForm]);

  useEffect(() => {
    if (!isEditDialogOpen) {
      editForm.reset();
    }
  }, [isEditDialogOpen, editForm]);

  // Set form values when editing a team member
  useEffect(() => {
    if (selectedMember && isEditDialogOpen) {
      editForm.setValue("username", selectedMember.username);
      // Make sure we set a valid role value with proper type casting
      if (["admin", "support-agent", "engineer", "user"].includes(selectedMember.role)) {
        editForm.setValue("role", selectedMember.role as "admin" | "support-agent" | "engineer" | "user");
      } else {
        editForm.setValue("role", "user"); // Default to user role if invalid
      }
      editForm.setValue("name", selectedMember.name || "");
      editForm.setValue("email", selectedMember.email || "");
      // Don't set password - it should be blank for security
    }
  }, [selectedMember, isEditDialogOpen, editForm]);

  // Mutation for creating a team member
  const createMutation = useMutation({
    mutationFn: async (data: TeamMemberFormValues) => {
      const response = await apiRequest("POST", "/api/team-members", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create team member");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Team member created",
        description: "The team member has been created successfully.",
      });
      queryClient.invalidateQueries({queryKey: ["/api/team-members", selectedTenantId]});
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating a team member
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TeamMemberFormValues }) => {
      // If password is empty, remove it from the payload
      if (!data.password) {
        const { password, ...restData } = data;
        data = restData as TeamMemberFormValues;
      }
      
      const response = await apiRequest("PATCH", `/api/team-members/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update team member");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Team member updated",
        description: "The team member has been updated successfully.",
      });
      queryClient.invalidateQueries({queryKey: ["/api/team-members", selectedTenantId]});
      setIsEditDialogOpen(false);
      setSelectedMember(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting a team member
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/team-members/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete team member");
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Team member deleted",
        description: "The team member has been deleted successfully.",
      });
      queryClient.invalidateQueries({queryKey: ["/api/team-members", selectedTenantId]});
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting team member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onAddSubmit = (data: TeamMemberFormValues) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: TeamMemberFormValues) => {
    if (selectedMember) {
      updateMutation.mutate({ id: selectedMember.id, data });
    }
  };

  const handleDeleteMember = (member: TeamMember) => {
    deleteMutation.mutate(member.id);
  };

  // Helper function to map role names to display values
  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      "admin": "Administrator",
      "support-agent": "Support Agent",
      "engineer": "Engineer",
      "user": "User"
    };
    return roleMap[role] || role;
  };

  // Helper function to get initials for avatar fallback
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Helper function to generate a random color for avatar fallback based on user id
  const getAvatarColor = (id: number) => {
    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-amber-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-violet-500",
      "bg-purple-500",
      "bg-fuchsia-500",
      "bg-pink-500",
      "bg-rose-500",
    ];
    return colors[id % colors.length];
  };

  return (
    <AdminLayout>
      <div>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Team Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Add, edit and remove team members
            </p>
          </div>
          <div className="flex gap-4">
            {/* Only show tenant selector for creator role */}
            {isCreator && (
              <TenantSelector
                onTenantChange={setSelectedTenantId}
                selectedTenantId={selectedTenantId}
                className="w-[200px]"
              />
            )}
            <Button 
              onClick={() => setIsAddDialogOpen(true)} 
              className="mb-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium text-gray-900">Team Members</CardTitle>
              <Badge className="bg-primary">{teamMembers?.length || 0} Members</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : teamMembers?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No team members found. Add your first team member to get started.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {teamMembers?.map((member) => (
                  <div
                    key={member.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className={`h-12 w-12 ${getAvatarColor(member.id)}`}>
                        <AvatarFallback className="text-white">
                          {getInitials(member.name || member.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {member.name || member.username}
                        </h3>
                        <p className="text-sm text-gray-500">{getRoleDisplayName(member.role)}</p>
                      </div>
                      {/* Don't show edit/delete controls for current user */}
                      {currentUser?.id !== member.id && (
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedMember(member);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {member.name || member.username}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteMember(member)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Username</span>
                        <span className="text-sm text-gray-900">{member.username}</span>
                      </div>
                      {member.email && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Email</span>
                          <span className="text-sm text-gray-900">{member.email}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Created</span>
                        <span className="text-sm text-gray-900">
                          {new Date(member.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Team Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[475px]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Create a new team member for your support system.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
              <FormField
                control={addForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="support-agent">Support Agent</SelectItem>
                        <SelectItem value="engineer">Engineer</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Team Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[475px]">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              Update team member information.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="john.doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (Leave blank to keep current)</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="support-agent">Support Agent</SelectItem>
                        <SelectItem value="engineer">Engineer</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john.doe@example.com" {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Member
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
