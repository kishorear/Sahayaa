import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import AdminLayout from "@/components/admin/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, UserCog, Key, Shield } from "lucide-react";

// Schema for profile updates
const profileFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Schema for password change
const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "Current password must be at least 6 characters"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  // Query for the user's profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/profile'],
    queryFn: async () => {
      const response = await fetch('/api/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      return response.json();
    },
    enabled: !!user,
  });

  // Initialize the form with profile data
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile?.name || '',
      email: profile?.email || '',
    },
    values: {
      name: profile?.name || '',
      email: profile?.email || '',
    },
  });

  // Initialize the password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const response = await apiRequest('PATCH', '/api/profile', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest('POST', '/api/profile/change-password', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change password');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
      setIsPasswordDialogOpen(false);
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Profile form submission handler
  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Password form submission handler
  const onPasswordSubmit = (data: PasswordFormValues) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[70vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading profile...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Summary Card */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Profile Summary</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={`https://avatars.dicebear.com/api/initials/${profile?.name || profile?.username || 'U'}.svg`} alt={profile?.name || profile?.username || 'User'} />
                <AvatarFallback className="text-2xl">{profile?.name?.[0] || profile?.username?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold">{profile?.name || profile?.username}</h3>
              <p className="text-sm text-muted-foreground mb-2">{profile?.email}</p>
              
              <div className="w-full mt-4 px-4">
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="font-medium">Username</span>
                  <span>{profile?.username}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="font-medium">Role</span>
                  <span className="capitalize">{profile?.role}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="font-medium">Account Created</span>
                  <span>{new Date(profile?.createdAt).toLocaleDateString()}</span>
                </div>
                {profile?.teamId && (
                  <div className="flex justify-between text-sm py-2 border-b">
                    <span className="font-medium">Team ID</span>
                    <span>{profile.teamId}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm py-2 border-b">
                  <span className="font-medium">MFA Enabled</span>
                  <span>{profile?.mfaEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="font-medium">SSO Enabled</span>
                  <span>{profile?.ssoEnabled ? 'Yes' : 'No'}</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="mt-6 w-full"
                onClick={() => setIsPasswordDialogOpen(true)}
              >
                <Key className="mr-2 h-4 w-4" />
                Change Password
              </Button>
            </CardContent>
          </Card>

          {/* Profile Settings Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="profile">
                    <UserCog className="mr-2 h-4 w-4" />
                    Profile Details
                  </TabsTrigger>
                  <TabsTrigger value="security">
                    <Shield className="mr-2 h-4 w-4" />
                    Security
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile" className="space-y-4 mt-4">
                  <Form {...profileForm}>
                    <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name" {...field} />
                            </FormControl>
                            <FormDescription>
                              This is your full name as it will appear across the platform.
                            </FormDescription>
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
                              <Input placeholder="Your email address" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your email address will be used for notifications and password resets.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full md:w-auto"
                        disabled={updateProfileMutation.isPending}
                      >
                        {updateProfileMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Save Changes
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
                
                <TabsContent value="security" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Password</h3>
                      <p className="text-sm text-muted-foreground">
                        Change your password to keep your account secure.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsPasswordDialogOpen(true)}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Change Password
                      </Button>
                    </div>
                    
                    <div className="space-y-2 pt-4 border-t">
                      <h3 className="text-lg font-medium">Multi-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">
                        Enhance your account security by enabling MFA.
                      </p>
                      <Button variant="outline" disabled>
                        <Shield className="mr-2 h-4 w-4" />
                        {profile?.mfaEnabled ? 'Manage MFA' : 'Setup MFA'}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Password Change Dialog */}
        <AlertDialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change Your Password</AlertDialogTitle>
              <AlertDialogDescription>
                Enter your current password and a new password to update your credentials.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Your current password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button 
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Change Password
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </form>
            </Form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}