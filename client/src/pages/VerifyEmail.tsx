import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get email from location state or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const storedEmail = localStorage.getItem('verificationEmail');
    
    if (emailParam) {
      setEmail(emailParam);
      localStorage.setItem('verificationEmail', emailParam);
    } else if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // No email found, redirect to login
      setLocation("/login");
    }
  }, [setLocation]);

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const verifyMutation = useMutation({
    mutationFn: async (verificationCode: string) => {
      const response = await apiRequest('/api/trial/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code: verificationCode }),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Email verified!",
        description: "Your account has been activated successfully.",
      });
      localStorage.removeItem('verificationEmail');
      // Redirect to dashboard
      setTimeout(() => setLocation("/dashboard"), 1000);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message || "Invalid or expired code. Please try again.",
      });
      // Clear code inputs
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/trial/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' }
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Code resent",
        description: "A new verification code has been sent to your email.",
      });
      setCountdown(60);
      setCanResend(false);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to resend code",
        description: error.message || "Please try again later.",
      });
    }
  });

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only take the last character
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (newCode.every(digit => digit !== "") && index === 5) {
      const verificationCode = newCode.join("");
      verifyMutation.mutate(verificationCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, "").slice(0, 6).split("");
        const newCode = [...code];
        digits.forEach((digit, i) => {
          if (i < 6) newCode[i] = digit;
        });
        setCode(newCode);
        // Auto-submit if all 6 digits pasted
        if (digits.length === 6) {
          verifyMutation.mutate(digits.join(""));
        }
      });
    }
  };

  const handleResend = () => {
    if (canResend && !resendMutation.isPending) {
      resendMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription className="mt-2">
            We've sent a 6-digit verification code to
            <br />
            <span className="font-semibold text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={verifyMutation.isPending}
                data-testid={`verification-code-input-${index}`}
                className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            ))}
          </div>

          {verifyMutation.isPending && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying...</span>
            </div>
          )}

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={!canResend || resendMutation.isPending}
              data-testid="button-resend-code"
              className="w-full"
            >
              {resendMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : canResend ? (
                "Resend Code"
              ) : (
                `Resend in ${countdown}s`
              )}
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => {
                localStorage.removeItem('verificationEmail');
                setLocation("/login");
              }}
              data-testid="link-back-login"
              className="text-sm"
            >
              Back to Login
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> The verification code will expire in 15 minutes. 
              Check your spam folder if you don't see the email.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
