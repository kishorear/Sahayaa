import AdminLayout from "@/components/admin/AdminLayout";
import IntegrationSettings from "@/components/admin/IntegrationSettings";
import DataSourcesSettings from "@/components/admin/DataSourcesSettings";
import SsoSettings from "@/components/admin/SsoSettings";
import EmailSettings from "@/components/admin/EmailSettings";
import ChatLogsSettings from "@/components/admin/ChatLogsSettings";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const profileFormSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2, "Name must be at least 2 characters."),
  role: z.string().optional(),
});

const notificationsFormSchema = z.object({
  newTickets: z.boolean().default(true),
  ticketUpdates: z.boolean().default(true),
  aiResolutions: z.boolean().default(true),
  emailNotifications: z.boolean().default(true),
});

export default function SettingsPage() {
  const { toast } = useToast();
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoAssignment, setAutoAssignment] = useState(true);

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: "admin@example.com",
      name: "Admin User",
      role: "Support Manager",
    },
  });

  const notificationsForm = useForm<z.infer<typeof notificationsFormSchema>>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      newTickets: true,
      ticketUpdates: true,
      aiResolutions: true,
      emailNotifications: true,
    },
  });

  function onProfileSubmit(data: z.infer<typeof profileFormSchema>) {
    toast({
      title: "Profile updated",
      description: "Your profile settings have been updated.",
    });
  }

  function onNotificationsSubmit(data: z.infer<typeof notificationsFormSchema>) {
    toast({
      title: "Notification preferences saved",
      description: "Your notification settings have been updated.",
    });
  }

  function updateAISettings() {
    toast({
      title: "AI Settings updated",
      description: `AI assistance has been ${aiEnabled ? "enabled" : "disabled"}.`,
    });
  }

  function updateAssignmentSettings() {
    toast({
      title: "Assignment Settings updated",
      description: `Automatic ticket assignment has been ${autoAssignment ? "enabled" : "disabled"}.`,
    });
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your account and application preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-gray-100 p-1">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="ai">AI Settings</TabsTrigger>
            <TabsTrigger value="tickets">Ticket Settings</TabsTrigger>
            <TabsTrigger value="email">Email Support</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Sources</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="chatlogs">Chat Logs</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>Manage your personal information and preferences.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Your role determines what permissions you have in the system.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">Save Changes</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure what notifications you receive.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationsForm}>
                  <form
                    onSubmit={notificationsForm.handleSubmit(onNotificationsSubmit)}
                    className="space-y-6"
                  >
                    <div className="space-y-4">
                      <FormField
                        control={notificationsForm.control}
                        name="newTickets"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>New Tickets</FormLabel>
                              <FormDescription>
                                Get notified when a new support ticket is created.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationsForm.control}
                        name="ticketUpdates"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Ticket Updates</FormLabel>
                              <FormDescription>
                                Get notified when a ticket is updated or a new message is added.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationsForm.control}
                        name="aiResolutions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>AI Resolutions</FormLabel>
                              <FormDescription>
                                Get notified when AI automatically resolves a ticket.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={notificationsForm.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                              <FormLabel>Email Notifications</FormLabel>
                              <FormDescription>
                                Receive notifications via email in addition to in-app notifications.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button type="submit">Save Preferences</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI Assistant Settings</CardTitle>
                <CardDescription>
                  Configure how the AI assistant handles support tickets.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium">Enable AI Assistant</h3>
                      <p className="text-sm text-gray-500">
                        Allow AI to automatically classify and attempt to resolve tickets.
                      </p>
                    </div>
                    <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
                  </div>

                  <div className="px-4 py-3 border border-gray-200 rounded-md space-y-2">
                    <h3 className="text-sm font-medium">Auto-resolution Settings</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="authentication" defaultChecked />
                        <label
                          htmlFor="authentication"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Authentication Issues
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="billing" defaultChecked />
                        <label
                          htmlFor="billing"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Billing Questions
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="account" defaultChecked />
                        <label
                          htmlFor="account"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Account Management
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="general" defaultChecked />
                        <label
                          htmlFor="general"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          General Questions
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">OpenAI API Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-500">Model</label>
                        <Input defaultValue="gpt-4o" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-500">Temperature</label>
                        <Input type="number" defaultValue={0.7} min={0} max={1} step={0.1} />
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={updateAISettings}>Save AI Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tickets">
            <Card>
              <CardHeader>
                <CardTitle>Ticket Settings</CardTitle>
                <CardDescription>Configure how tickets are managed in the system.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-medium">Automatic Ticket Assignment</h3>
                      <p className="text-sm text-gray-500">
                        Automatically assign tickets to team members based on category and complexity.
                      </p>
                    </div>
                    <Switch checked={autoAssignment} onCheckedChange={setAutoAssignment} />
                  </div>

                  <div className="px-4 py-3 border border-gray-200 rounded-md space-y-3">
                    <h3 className="text-sm font-medium">Default Assignment Rules</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <label className="text-sm text-gray-500">Category</label>
                          <Input defaultValue="Authentication" className="mt-1" />
                        </div>
                        <div className="col-span-1">
                          <label className="text-sm text-gray-500">Complexity</label>
                          <select
                            className="w-full mt-1 rounded-md border border-gray-300 py-2"
                            defaultValue="any"
                          >
                            <option value="any">Any</option>
                            <option value="simple">Simple</option>
                            <option value="medium">Medium</option>
                            <option value="complex">Complex</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <label className="text-sm text-gray-500">Assign To</label>
                          <select
                            className="w-full mt-1 rounded-md border border-gray-300 py-2"
                            defaultValue="support"
                          >
                            <option value="support">Support Team</option>
                            <option value="engineering">Engineering</option>
                            <option value="billing">Billing</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <Input defaultValue="Billing" />
                        </div>
                        <div className="col-span-1">
                          <select
                            className="w-full rounded-md border border-gray-300 py-2"
                            defaultValue="any"
                          >
                            <option value="any">Any</option>
                            <option value="simple">Simple</option>
                            <option value="medium">Medium</option>
                            <option value="complex">Complex</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <select
                            className="w-full rounded-md border border-gray-300 py-2"
                            defaultValue="billing"
                          >
                            <option value="support">Support Team</option>
                            <option value="engineering">Engineering</option>
                            <option value="billing">Billing</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                          <Input defaultValue="Technical Issue" />
                        </div>
                        <div className="col-span-1">
                          <select
                            className="w-full rounded-md border border-gray-300 py-2"
                            defaultValue="complex"
                          >
                            <option value="any">Any</option>
                            <option value="simple">Simple</option>
                            <option value="medium">Medium</option>
                            <option value="complex">Complex</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <select
                            className="w-full rounded-md border border-gray-300 py-2"
                            defaultValue="engineering"
                          >
                            <option value="support">Support Team</option>
                            <option value="engineering">Engineering</option>
                            <option value="billing">Billing</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">SLA Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-gray-500">Response Time Goal (hours)</label>
                        <Input type="number" defaultValue={4} min={1} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-gray-500">Resolution Time Goal (hours)</label>
                        <Input type="number" defaultValue={24} min={1} />
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={updateAssignmentSettings}>Save Ticket Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <EmailSettings />
          </TabsContent>

          <TabsContent value="knowledge">
            <DataSourcesSettings />
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationSettings />
          </TabsContent>

          <TabsContent value="chatlogs">
            <ChatLogsSettings />
          </TabsContent>

          <TabsContent value="security">
            <SsoSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
