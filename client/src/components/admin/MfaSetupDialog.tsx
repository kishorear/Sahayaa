import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, ClipboardCopy, ArrowRight, ShieldAlert } from "lucide-react";

type MfaSetupDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function MfaSetupDialog({ open, onClose, onSuccess }: MfaSetupDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("setup");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [setupStep, setSetupStep] = useState<"initial" | "verification" | "backup" | "complete">("initial");

  // Generate MFA secret mutation
  const generateSecretMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/mfa/setup');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate MFA secret');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setQrCode(data.qrCodeUrl);
      setSecret(data.secret);
      setSetupStep("verification");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to setup MFA",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Verify MFA code mutation
  const verifyCodeMutation = useMutation({
    mutationFn: async () => {
      if (!secret) {
        throw new Error('Secret is missing');
      }
      
      const response = await apiRequest('POST', '/api/mfa/verify', {
        token: verificationCode,
        secret: secret
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify MFA code');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setSetupStep("backup");
      enableMfaMutation.mutate();
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Enable MFA mutation
  const enableMfaMutation = useMutation({
    mutationFn: async () => {
      if (!secret) {
        throw new Error('Secret is missing');
      }
      
      const response = await apiRequest('POST', '/api/mfa/enable', {
        token: verificationCode,
        secret: secret
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enable MFA');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes || []);
      toast({
        title: "MFA Enabled",
        description: "Multi-factor authentication has been enabled for your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to enable MFA",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Disable MFA mutation
  const disableMfaMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/mfa/disable', {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to disable MFA');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "MFA Disabled",
        description: "Multi-factor authentication has been disabled for your account.",
      });
      onSuccess();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to disable MFA",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Regenerate backup codes mutation
  const regenerateBackupCodesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/mfa/backup-codes/regenerate', {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to regenerate backup codes');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes || []);
      toast({
        title: "Backup Codes Regenerated",
        description: "Your MFA backup codes have been regenerated. Please save these codes securely.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to regenerate backup codes",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleVerifyCode = () => {
    if (!verificationCode) {
      toast({
        title: "Verification code required",
        description: "Please enter the verification code from your authenticator app.",
        variant: "destructive"
      });
      return;
    }
    
    verifyCodeMutation.mutate();
  };

  const handleDisableMfa = () => {
    disableMfaMutation.mutate();
  };

  const handleCopyBackupCodes = () => {
    if (backupCodes.length > 0) {
      navigator.clipboard.writeText(backupCodes.join('\n'));
      toast({
        title: "Copied to clipboard",
        description: "Backup codes have been copied to your clipboard.",
      });
    }
  };

  const handleComplete = () => {
    onSuccess();
    onClose();
    // Reset the state for next time
    setActiveTab("setup");
    setQrCode(null);
    setSecret(null);
    setVerificationCode("");
    setBackupCodes([]);
    setSetupStep("initial");
  };

  const startSetup = () => {
    generateSecretMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Multi-Factor Authentication</DialogTitle>
          <DialogDescription>
            Increase your account security by requiring a second factor when logging in.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="setup"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="setup">Setup MFA</TabsTrigger>
            <TabsTrigger value="manage">Manage MFA</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="mt-4 space-y-4">
            {setupStep === "initial" && (
              <div className="space-y-4">
                <div className="text-sm">
                  <p>Multi-factor authentication adds an extra layer of security to your account by requiring a second verification step when logging in.</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>You'll need an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator.</li>
                    <li>Each time you log in, you'll need to enter a code from your authenticator app.</li>
                    <li>You'll also receive backup codes to use if you lose access to your authenticator app.</li>
                  </ul>
                </div>
                <Button 
                  onClick={startSetup} 
                  className="w-full"
                  disabled={generateSecretMutation.isPending}
                >
                  {generateSecretMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Start MFA Setup
                </Button>
              </div>
            )}

            {setupStep === "verification" && qrCode && (
              <div className="space-y-4">
                <div className="text-sm">
                  <p className="mb-2">1. Scan this QR code with your authenticator app:</p>
                  <div className="flex justify-center mb-4">
                    <img src={qrCode} alt="QR Code" className="border border-gray-200 p-2 rounded-md" />
                  </div>
                  
                  <p className="mb-2">2. Or enter this code manually into your app:</p>
                  <div className="flex items-center">
                    <code className="bg-gray-100 p-2 rounded-md flex-1 font-mono text-sm">{secret}</code>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="ml-2"
                      onClick={() => {
                        if (secret) {
                          navigator.clipboard.writeText(secret);
                          toast({
                            title: "Copied to clipboard",
                            description: "Secret key has been copied to your clipboard.",
                          });
                        }
                      }}
                    >
                      <ClipboardCopy className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="mt-4 mb-2">3. Enter the verification code from your app:</p>
                  <div className="flex space-x-2">
                    <Input
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleVerifyCode}
                      disabled={verifyCodeMutation.isPending || !verificationCode}
                    >
                      {verifyCodeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {setupStep === "backup" && backupCodes.length > 0 && (
              <div className="space-y-4">
                <Alert>
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>
                    Save these backup codes in a secure place. They can be used if you lose access to your authenticator app.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="bg-gray-100 p-2 rounded-md text-center font-mono text-sm">
                      {code}
                    </code>
                  ))}
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleCopyBackupCodes} 
                    variant="outline" 
                    className="flex-1"
                  >
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy Backup Codes
                  </Button>
                  <Button 
                    onClick={() => setSetupStep("complete")} 
                    className="flex-1"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {setupStep === "complete" && (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
                <h3 className="text-lg font-medium">Setup Complete!</h3>
                <p className="text-sm text-gray-500">
                  Multi-factor authentication has been successfully enabled for your account.
                </p>
                <Button onClick={handleComplete} className="w-full">
                  Finish
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manage" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Disable MFA</h3>
                  <p className="text-sm text-gray-500">
                    Disabling MFA will remove the second authentication step when logging in.
                    This will make your account less secure.
                  </p>
                  <Button 
                    variant="destructive" 
                    onClick={handleDisableMfa}
                    disabled={disableMfaMutation.isPending}
                  >
                    {disableMfaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Disable MFA
                  </Button>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <h3 className="text-lg font-medium">Regenerate Backup Codes</h3>
                  <p className="text-sm text-gray-500">
                    Generate new backup codes. This will invalidate all existing backup codes.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => regenerateBackupCodesMutation.mutate()}
                    disabled={regenerateBackupCodesMutation.isPending}
                  >
                    {regenerateBackupCodesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Regenerate Backup Codes
                  </Button>
                </div>

                {regenerateBackupCodesMutation.isSuccess && backupCodes.length > 0 && (
                  <div className="pt-4 border-t space-y-2">
                    <h3 className="text-lg font-medium">New Backup Codes</h3>
                    <Alert>
                      <ShieldAlert className="h-4 w-4" />
                      <AlertDescription>
                        Save these backup codes in a secure place. They can be used if you lose access to your authenticator app.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, index) => (
                        <code key={index} className="bg-gray-100 p-2 rounded-md text-center font-mono text-sm">
                          {code}
                        </code>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={handleCopyBackupCodes} 
                      variant="outline" 
                      className="w-full"
                    >
                      <ClipboardCopy className="mr-2 h-4 w-4" />
                      Copy Backup Codes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          {(setupStep === "initial" || setupStep === "complete") && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}