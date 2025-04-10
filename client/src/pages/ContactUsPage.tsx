import React, { useState } from "react";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, MapPin, Phone, AlertCircle, CheckCircle } from "lucide-react";

// Form validation schemas
const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

const emailSupportSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;
type EmailSupportFormValues = z.infer<typeof emailSupportSchema>;

export default function ContactUsPage() {
  const { toast } = useToast();
  const [emailSupportSubmitting, setEmailSupportSubmitting] = useState(false);
  const [emailSupportSuccess, setEmailSupportSuccess] = useState(false);
  const [emailSupportResponse, setEmailSupportResponse] = useState("");
  const [contactFormSubmitting, setContactFormSubmitting] = useState(false);
  
  // Check if email is configured
  const { data: emailStatus, isLoading: isLoadingEmailStatus } = useQuery({
    queryKey: ["/api/email/status"],
    queryFn: async () => {
      const response = await fetch("/api/email/status");
      if (!response.ok) {
        throw new Error("Failed to fetch email configuration status");
      }
      return response.json();
    },
    // Retry if the status check fails
    retry: 2,
    // Don't refetch unnecessarily
    refetchOnWindowFocus: false,
  });

  // Regular contact form
  const contactForm = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  // Email support form with AI response
  const emailSupportForm = useForm<EmailSupportFormValues>({
    resolver: zodResolver(emailSupportSchema),
    defaultValues: {
      email: "",
      subject: "",
      message: "",
    },
  });

  // Submit regular contact form
  const onContactSubmit = async (data: ContactFormValues) => {
    setContactFormSubmitting(true);
    try {
      await apiRequest("POST", "/api/contact", data);

      toast({
        title: "Message sent!",
        description: "We've received your message and will get back to you soon.",
      });

      contactForm.reset();
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast({
        title: "Error",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setContactFormSubmitting(false);
    }
  };

  // Submit email support form with AI response
  const onEmailSupportSubmit = async (data: EmailSupportFormValues) => {
    setEmailSupportSubmitting(true);
    setEmailSupportSuccess(false);
    setEmailSupportResponse("");
    
    try {
      const response = await apiRequest("/api/email-support", {
        method: "POST",
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      if (result.aiResponse) {
        setEmailSupportResponse(result.aiResponse);
        setEmailSupportSuccess(true);
        
        toast({
          title: "Support email sent!",
          description: "We've sent an automated response to your email. See the response below.",
        });
        
        emailSupportForm.reset();
      } else {
        throw new Error("No AI response received");
      }
    } catch (error) {
      console.error("Error submitting email support form:", error);
      toast({
        title: "Error",
        description: "There was an error processing your support request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEmailSupportSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-14h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
                <span className="ml-2 text-xl font-bold">SupportAI</span>
              </div>
            </Link>
            <div className="flex items-center space-x-6">
              <Link href="/pricing">
                <span className="hover:text-primary transition-colors cursor-pointer">Pricing</span>
              </Link>
              <Link href="/how-it-works">
                <span className="hover:text-primary transition-colors cursor-pointer">How It Works</span>
              </Link>
              <Link href="/contact">
                <span className="text-primary font-medium transition-colors cursor-pointer">Contact Us</span>
              </Link>
              <Link href="/auth">
                <Button size="sm">Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-white dark:from-primary/20 dark:to-gray-900 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Get in touch with our team or try our AI-powered email support for immediate assistance.
          </p>
        </div>
      </div>

      <div className="flex-grow py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="md:col-span-1">
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 mt-1 mr-3 text-primary" />
                    <div>
                      <h3 className="font-medium">Address</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        123 AI Boulevard<br />
                        San Francisco, CA 94107<br />
                        United States
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Phone className="w-5 h-5 mt-1 mr-3 text-primary" />
                    <div>
                      <h3 className="font-medium">Phone</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        +1 (555) 123-4567
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Mail className="w-5 h-5 mt-1 mr-3 text-primary" />
                    <div>
                      <h3 className="font-medium">Email</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        support@supportai.example.com
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium mb-3">Office Hours</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Monday - Friday: 9:00 AM - 6:00 PM PST<br />
                    Saturday: 10:00 AM - 4:00 PM PST<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              <Tabs defaultValue="contact" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="contact">Contact Form</TabsTrigger>
                  <TabsTrigger value="email-support">Email Support</TabsTrigger>
                </TabsList>
                
                {/* Regular Contact Form */}
                <TabsContent value="contact">
                  <Card>
                    <CardHeader>
                      <CardTitle>Send us a message</CardTitle>
                      <CardDescription>
                        Fill out the form below and we'll get back to you as soon as possible.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...contactForm}>
                        <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    <Input placeholder="Your email" type="email" {...field} />
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
                                    rows={5}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={contactFormSubmitting}
                          >
                            {contactFormSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              'Send Message'
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* AI Email Support Form */}
                <TabsContent value="email-support">
                  <Card>
                    <CardHeader>
                      <CardTitle>Get AI-Powered Email Support</CardTitle>
                      <CardDescription>
                        Our AI assistant will provide an immediate solution to your question.
                        The response will be sent to your email and displayed below.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Email Configuration Status */}
                      {isLoadingEmailStatus ? (
                        <div className="mb-4 flex items-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Checking email configuration status...
                        </div>
                      ) : emailStatus && !emailStatus.configured ? (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Email Not Configured</AlertTitle>
                          <AlertDescription>
                            The email support service is currently unavailable. Please use the regular contact form instead.
                          </AlertDescription>
                        </Alert>
                      ) : emailStatus && emailStatus.configured ? (
                        <Alert variant="default" className="mb-4 bg-primary/10 border-primary/20">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          <AlertTitle>Email Support Ready</AlertTitle>
                          <AlertDescription>
                            Our email support system is ready to help you. Fill out the form below to get instant AI-powered assistance.
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      
                      <Form {...emailSupportForm}>
                        <form onSubmit={emailSupportForm.handleSubmit(onEmailSupportSubmit)} className="space-y-6">
                          <FormField
                            control={emailSupportForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Your Email</FormLabel>
                                <FormControl>
                                  <Input placeholder="email@example.com" type="email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={emailSupportForm.control}
                            name="subject"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <FormControl>
                                  <Input placeholder="What's your question about?" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={emailSupportForm.control}
                            name="message"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Your Question</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Describe your question or issue in detail" 
                                    rows={5}
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={emailSupportSubmitting || (emailStatus && !emailStatus.configured)}
                          >
                            {emailSupportSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Getting AI Support...
                              </>
                            ) : (
                              'Get AI Support'
                            )}
                          </Button>
                        </form>
                      </Form>
                      
                      {/* AI Response Display */}
                      {emailSupportSuccess && emailSupportResponse && (
                        <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <h3 className="text-lg font-medium mb-4">AI Support Response:</h3>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {emailSupportResponse.split('\n').map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                            This response has been sent to your email.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to transform your customer support?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Get started today with a 14-day free trial. No credit card required.
          </p>
          <Link href="/auth">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90"
            >
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center">
                <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-14h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
                <span className="ml-2 text-xl font-bold text-white">SupportAI</span>
              </div>
              <p className="mt-2 text-sm">AI-powered customer support solution</p>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/pricing">
                <span className="hover:text-white transition-colors cursor-pointer">Pricing</span>
              </Link>
              <Link href="/how-it-works">
                <span className="hover:text-white transition-colors cursor-pointer">How It Works</span>
              </Link>
              <Link href="/contact">
                <span className="hover:text-white transition-colors cursor-pointer">Contact Us</span>
              </Link>
              <Link href="/auth">
                <span className="hover:text-white transition-colors cursor-pointer">Login</span>
              </Link>
              <Link href="/docs">
                <span className="hover:text-white transition-colors cursor-pointer">Documentation</span>
              </Link>
              <Link href="/api">
                <span className="hover:text-white transition-colors cursor-pointer">API</span>
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} SupportAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}