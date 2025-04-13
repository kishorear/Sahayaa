import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ExternalLink, ShieldCheck } from "lucide-react";

type SsoProvider = {
  id: number;
  name: string;
  type: string;
};

type SsoSetupDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function SsoSetupDialog({ open, onClose, onSuccess }: SsoSetupDialogProps) {
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  // Fetch available SSO providers
  const { data: providers, isLoading: isLoadingProviders } = useQuery<SsoProvider[]>({
    queryKey: ['/api/sso/providers'],
    queryFn: async () => {
      const response = await fetch('/api/sso/providers');
      if (!response.ok) {
        throw new Error('Failed to fetch SSO providers');
      }
      return response.json();
    },
    enabled: open, // Only fetch when dialog is open
  });

  // Link SSO to user account mutation
  const linkSsoMutation = useMutation({
    mutationFn: async (providerId: string) => {
      // This is a placeholder - actually this will be handled by the browser redirect
      // The actual linking happens through the passport flow
      return { success: true };
    },
    onSuccess: () => {
      // This won't actually happen in a real implementation because we're redirecting
      toast({
        title: "SSO Setup",
        description: "You will be redirected to the SSO provider to complete setup.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "SSO Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Disable SSO mutation
  const disableSsoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/profile/disable-sso', {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to disable SSO');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "SSO Disabled",
        description: "Single Sign-On has been disabled for your account.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to disable SSO",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Redirect to SSO provider for authentication & linking
  const handleConnect = () => {
    if (!selectedProvider) {
      toast({
        title: "No Provider Selected",
        description: "Please select an SSO provider to connect with.",
        variant: "destructive"
      });
      return;
    }

    const [type, id] = selectedProvider.split(':');
    
    // In a real implementation, we would redirect to the SSO provider
    window.location.href = `/api/sso/${type}/${id}`;
    
    // Show toast before redirecting
    toast({
      title: "Redirecting to SSO Provider",
      description: "You will be redirected to complete the authentication process.",
    });
  };

  const handleDisableSso = () => {
    disableSsoMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Single Sign-On</DialogTitle>
          <DialogDescription>
            Connect your account with a company SSO provider for simplified login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Connect SSO Provider</h3>
                  <p className="text-sm text-gray-500">
                    After connecting, you can use your organization's identity provider to log in to your account.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sso-provider">Select SSO Provider</Label>
                  <Select 
                    onValueChange={setSelectedProvider} 
                    disabled={isLoadingProviders || !providers || providers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {isLoadingProviders ? (
                          <SelectItem value="loading" disabled>
                            Loading providers...
                          </SelectItem>
                        ) : providers && providers.length > 0 ? (
                          providers.map((provider) => (
                            <SelectItem key={provider.id} value={`${provider.type}:${provider.id}`}>
                              {provider.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No providers available
                          </SelectItem>
                        )}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={isLoadingProviders || !selectedProvider || linkSsoMutation.isPending}
                  className="w-full"
                >
                  {linkSsoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect with SSO Provider
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Disable SSO</h3>
                  <p className="text-sm text-gray-500">
                    Remove the connection to your SSO provider. You will need to log in with your username and password.
                  </p>
                </div>

                <Button
                  variant="destructive"
                  onClick={handleDisableSso}
                  disabled={disableSsoMutation.isPending}
                  className="w-full"
                >
                  {disableSsoMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Disable SSO
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Alert className="mt-4">
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              Using Single Sign-On increases security and simplifies access to your account.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}