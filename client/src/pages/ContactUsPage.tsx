import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Mail, MessageSquare, Send } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Contact form schema
const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

// Email support form schema
const emailSupportSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;
type EmailSupportFormValues = z.infer<typeof emailSupportSchema>;

export default function ContactUsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("contact");
  const [emailResponse, setEmailResponse] = useState<string | null>(null);
  const [emailResponseLoading, setEmailResponseLoading] = useState(false);

  // Contact form setup
  const contactForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  // Email support form setup
  const emailForm = useForm<EmailSupportFormValues>({
    resolver: zodResolver(emailSupportSchema),
    defaultValues: {
      email: "",
      subject: "",
      message: "",
    },
  });

  // Mutation for submitting contact form
  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      return await apiRequest("POST", "/api/contact", data);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent. We'll get back to you soon.",
      });
      contactForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error Sending Message",
        description: error.message || "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for submitting email support request with AI response
  const emailSupportMutation = useMutation({
    mutationFn: async (data: EmailSupportFormValues) => {
      return await apiRequest("POST", "/api/email-support", data);
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setEmailResponse(data.aiResponse);
      setEmailResponseLoading(false);
      
      toast({
        title: "Support Request Received",
        description: "Your support request has been processed. Check your email for our response.",
      });
    },
    onError: (error) => {
      setEmailResponseLoading(false);
      toast({
        title: "Error Processing Request",
        description: error.message || "There was an error processing your support request. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle contact form submission
  const onContactSubmit = (data: ContactFormValues) => {
    contactMutation.mutate(data);
  };

  // Handle email support form submission
  const onEmailSupportSubmit = (data: EmailSupportFormValues) => {
    setEmailResponseLoading(true);
    setEmailResponse(null);
    emailSupportMutation.mutate(data);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-8">Contact Us</h1>
      
      <div className="max-w-3xl mx-auto">
        <Tabs defaultValue="contact" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="contact">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Form
            </TabsTrigger>
            <TabsTrigger value="email-support">
              <Mail className="h-4 w-4 mr-2" />
              Email Support
            </TabsTrigger>
          </TabsList>
          
          {/* Contact Form Tab */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Send Us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below to get in touch with our team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...contactForm}>
                  <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={contactForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Your name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={contactForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Your email address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={contactForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Message subject" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contactForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Your message"
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full md:w-auto"
                      disabled={contactMutation.isPending}
                    >
                      {contactMutation.isPending ? (
                        <>Sending...</>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Email Support Tab */}
          <TabsContent value="email-support">
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Email Support</CardTitle>
                <CardDescription>
                  Submit your support request and receive an instant AI-generated response via email.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(onEmailSupportSubmit)} className="space-y-6">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Your email address" {...field} />
                          </FormControl>
                          <FormDescription>
                            We'll send the response to this email address.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={emailForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="Support request subject" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={emailForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Request</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your issue or question in detail"
                              className="min-h-[150px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Please provide as much detail as possible to help our AI provide the best solution.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {emailResponse && (
                      <Alert className="my-4">
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>AI Response Preview</AlertTitle>
                        <AlertDescription className="mt-2 text-sm">
                          {emailResponse}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <Button
                      type="submit"
                      className="w-full md:w-auto"
                      disabled={emailSupportMutation.isPending || emailResponseLoading}
                    >
                      {(emailSupportMutation.isPending || emailResponseLoading) ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Submit Support Request
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}