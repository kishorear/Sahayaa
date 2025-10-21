import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CustomUserRole, RolePermissions } from "@shared/schema";

export default function RoleManagementPage() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("healthcare");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<CustomUserRole | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomUserRole | null>(null);
  const { toast } = useToast();

  // Fetch industry types
  const { data: industryTypes = [] } = useQuery<string[]>({
    queryKey: ['/api/industry-types'],
  });

  // Fetch roles for selected industry
  const { data: roles = [], isLoading } = useQuery<CustomUserRole[]>({
    queryKey: ['/api/custom-roles', selectedIndustry],
    queryFn: async () => {
      const response = await fetch(`/api/custom-roles?industryType=${selectedIndustry}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch roles');
      return response.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/custom-roles/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Role deleted",
        description: "The role has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/custom-roles'] });
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (role: CustomUserRole) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleEdit = (role: CustomUserRole) => {
    setEditingRole(role);
    setShowRoleForm(true);
  };

  const handleCreateNew = () => {
    setEditingRole(null);
    setShowRoleForm(true);
  };

  if (showRoleForm) {
    return (
      <RoleFormPage
        industry={selectedIndustry}
        role={editingRole}
        onBack={() => {
          setShowRoleForm(false);
          setEditingRole(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="page-title">Role Management</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage custom roles for different industries
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Custom Roles</CardTitle>
                <CardDescription>
                  Define custom roles with granular permissions for your industry
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Industry:</label>
                  <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger className="w-48" data-testid="select-industry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {industryTypes.map((type) => (
                        <SelectItem key={type} value={type} data-testid={`industry-option-${type}`}>
                          {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateNew} data-testid="button-create-role">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading roles...</div>
              </div>
            ) : roles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No custom roles found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first custom role for {selectedIndustry}
                </p>
                <Button onClick={handleCreateNew} data-testid="button-create-first-role">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Role
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {roles.map((role) => (
                  <Card key={role.id} className="border-2" data-testid={`role-card-${role.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold" data-testid={`role-name-${role.id}`}>
                              {role.roleName}
                            </h3>
                            <Badge variant="outline" data-testid={`role-key-${role.id}`}>
                              {role.roleKey}
                            </Badge>
                            {role.isDefault && (
                              <Badge variant="secondary" data-testid={`role-default-badge-${role.id}`}>
                                Default
                              </Badge>
                            )}
                            {!role.active && (
                              <Badge variant="destructive" data-testid={`role-inactive-badge-${role.id}`}>
                                Inactive
                              </Badge>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-sm text-muted-foreground" data-testid={`role-description-${role.id}`}>
                              {role.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {Object.entries(role.permissions || {})
                              .filter(([_, value]) => value === true)
                              .map(([key]) => (
                                <Badge key={key} variant="secondary" className="text-xs" data-testid={`permission-${role.id}-${key}`}>
                                  {key.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                                </Badge>
                              ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(role)}
                            data-testid={`button-edit-${role.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(role)}
                            data-testid={`button-delete-${role.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{roleToDelete?.roleName}"? This action cannot be undone.
              Users with this role may lose access to features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleToDelete && deleteMutation.mutate(roleToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const roleFormSchema = z.object({
  roleName: z.string().min(2, "Role name must be at least 2 characters"),
  roleKey: z.string().min(2, "Role key must be at least 2 characters").regex(/^[a-z_]+$/, "Role key must be lowercase with underscores only"),
  description: z.string().optional(),
  permissions: z.object({
    canViewOwnTickets: z.boolean(),
    canViewAllTickets: z.boolean(),
    canCreateTickets: z.boolean(),
    canEditOwnTickets: z.boolean(),
    canEditAllTickets: z.boolean(),
    canAssignTickets: z.boolean(),
    canDeleteTickets: z.boolean(),
    canCommentOnTickets: z.boolean(),
    canAccessAISettings: z.boolean(),
    canAccessAIProviders: z.boolean(),
    canManageInstructions: z.boolean(),
    canManageAgentResources: z.boolean(),
    canAccessIntegrations: z.boolean(),
    canManageIntegrations: z.boolean(),
    canViewUsers: z.boolean(),
    canManageUsers: z.boolean(),
    canManageTeams: z.boolean(),
    canAccessSettings: z.boolean(),
    canManageSettings: z.boolean(),
    canAccessAnalytics: z.boolean(),
    canAccessChatLogs: z.boolean(),
  }),
  active: z.boolean(),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

function RoleFormPage({ industry, role, onBack }: { industry: string; role: CustomUserRole | null; onBack: () => void }) {
  const { toast } = useToast();

  const defaultPermissions: RolePermissions = {
    canViewOwnTickets: true,
    canViewAllTickets: false,
    canCreateTickets: true,
    canEditOwnTickets: true,
    canEditAllTickets: false,
    canAssignTickets: false,
    canDeleteTickets: false,
    canCommentOnTickets: true,
    canAccessAISettings: false,
    canAccessAIProviders: false,
    canManageInstructions: false,
    canManageAgentResources: false,
    canAccessIntegrations: false,
    canManageIntegrations: false,
    canViewUsers: false,
    canManageUsers: false,
    canManageTeams: false,
    canAccessSettings: false,
    canManageSettings: false,
    canAccessAnalytics: false,
    canAccessChatLogs: false,
  };

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: role ? {
      roleName: role.roleName,
      roleKey: role.roleKey,
      description: role.description || "",
      permissions: role.permissions as RolePermissions,
      active: role.active,
    } : {
      roleName: "",
      roleKey: "",
      description: "",
      permissions: defaultPermissions,
      active: true,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: RoleFormValues) => {
      const payload = {
        ...data,
        industryType: industry,
      };

      if (role) {
        return apiRequest(`/api/custom-roles/${role.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return apiRequest('/api/custom-roles', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });
      }
    },
    onSuccess: () => {
      toast({
        title: role ? "Role updated" : "Role created",
        description: role ? "The role has been updated successfully." : "The role has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/custom-roles'] });
      onBack();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${role ? 'update' : 'create'} role`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoleFormValues) => {
    saveMutation.mutate(data);
  };

  const permissionGroups = [
    {
      title: "Ticket Permissions",
      description: "Control ticket viewing, editing, and management",
      permissions: [
        { key: 'canViewOwnTickets', label: 'View Own Tickets', description: 'Can view tickets created by them' },
        { key: 'canViewAllTickets', label: 'View All Tickets', description: 'Can view all tickets in the system' },
        { key: 'canCreateTickets', label: 'Create Tickets', description: 'Can create new tickets' },
        { key: 'canEditOwnTickets', label: 'Edit Own Tickets', description: 'Can edit tickets they created' },
        { key: 'canEditAllTickets', label: 'Edit All Tickets', description: 'Can edit any ticket' },
        { key: 'canAssignTickets', label: 'Assign Tickets', description: 'Can assign tickets to users' },
        { key: 'canDeleteTickets', label: 'Delete Tickets', description: 'Can delete tickets' },
        { key: 'canCommentOnTickets', label: 'Comment on Tickets', description: 'Can add comments to tickets' },
      ]
    },
    {
      title: "AI & Agent Permissions",
      description: "Control AI settings and agent resources",
      permissions: [
        { key: 'canAccessAISettings', label: 'Access AI Settings', description: 'Can view AI configuration' },
        { key: 'canAccessAIProviders', label: 'Access AI Providers', description: 'Can configure AI providers' },
        { key: 'canManageInstructions', label: 'Manage Instructions', description: 'Can manage AI instructions' },
        { key: 'canManageAgentResources', label: 'Manage Agent Resources', description: 'Can upload and manage agent files' },
      ]
    },
    {
      title: "Integration Permissions",
      description: "Control third-party integrations",
      permissions: [
        { key: 'canAccessIntegrations', label: 'Access Integrations', description: 'Can view integrations' },
        { key: 'canManageIntegrations', label: 'Manage Integrations', description: 'Can configure integrations' },
      ]
    },
    {
      title: "User & Team Permissions",
      description: "Control user and team management",
      permissions: [
        { key: 'canViewUsers', label: 'View Users', description: 'Can view user list' },
        { key: 'canManageUsers', label: 'Manage Users', description: 'Can create, edit, and delete users' },
        { key: 'canManageTeams', label: 'Manage Teams', description: 'Can manage team structure' },
      ]
    },
    {
      title: "System Permissions",
      description: "Control system settings and analytics",
      permissions: [
        { key: 'canAccessSettings', label: 'Access Settings', description: 'Can view system settings' },
        { key: 'canManageSettings', label: 'Manage Settings', description: 'Can modify system settings' },
        { key: 'canAccessAnalytics', label: 'Access Analytics', description: 'Can view analytics and reports' },
        { key: 'canAccessChatLogs', label: 'Access Chat Logs', description: 'Can view chat conversation logs' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="outline" onClick={onBack} className="mb-2" data-testid="button-back">
          ← Back to Roles
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{role ? 'Edit Role' : 'Create New Role'}</CardTitle>
            <CardDescription>
              Industry: {industry.charAt(0).toUpperCase() + industry.slice(1).replace('_', ' ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="roleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Senior Support Specialist" {...field} data-testid="input-role-name" />
                      </FormControl>
                      <FormDescription>
                        Display name for this role
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roleKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Key</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., senior_support_specialist"
                          {...field}
                          disabled={!!role}
                          data-testid="input-role-key"
                        />
                      </FormControl>
                      <FormDescription>
                        Unique identifier (lowercase, underscores only). Cannot be changed after creation.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the responsibilities and scope of this role"
                          {...field}
                          data-testid="input-role-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-active"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Active
                        </FormLabel>
                        <FormDescription>
                          Inactive roles cannot be assigned to users
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Permissions</h3>
                    <p className="text-sm text-muted-foreground">
                      Select the permissions this role should have
                    </p>
                  </div>

                  {permissionGroups.map((group) => (
                    <Card key={group.title} className="border-2">
                      <CardHeader>
                        <CardTitle className="text-base">{group.title}</CardTitle>
                        <CardDescription>{group.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {group.permissions.map((permission) => (
                          <FormField
                            key={permission.key}
                            control={form.control}
                            name={`permissions.${permission.key}` as any}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    data-testid={`checkbox-${permission.key}`}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-medium">
                                    {permission.label}
                                  </FormLabel>
                                  <FormDescription>
                                    {permission.description}
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={onBack} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={saveMutation.isPending}
                    data-testid="button-save-role"
                  >
                    {saveMutation.isPending ? "Saving..." : role ? "Update Role" : "Create Role"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
