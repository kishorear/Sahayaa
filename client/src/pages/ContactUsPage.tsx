import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import LogoIcon from '@/components/LogoIcon';

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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Phone, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Define form schemas
const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Please enter a valid email address."),
  subject: z.string().min(5, "Subject must be at least 5 characters."),
  message: z.string().min(10, "Message must be at least 10 characters.")
});

type ContactValues = z.infer<typeof contactSchema>;

export default function ContactUsPage() {
  const { toast } = useToast();
  const [contactFormSubmitting, setContactFormSubmitting] = useState(false);
  
  // Contact form setup
  const contactForm = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: ""
    }
  });
  
  // Define email status type
  interface EmailStatusType {
    supportEmail?: string;
    configured: boolean;
  }

  // Check if email is configured
  const { data: emailStatus, isLoading: isLoadingEmailStatus } = useQuery<EmailStatusType, Error, EmailStatusType>({
    queryKey: ['/api/email/status'],
    retry: false
  });
  
  // Handle Contact Form submission
  const onContactSubmit = async (data: ContactValues) => {
    setContactFormSubmitting(true);
    
    try {
      const response = await apiRequest("POST", "/api/contact", data);
      
      toast({
        title: "Message sent!",
        description: "Thank you for contacting us. We'll get back to you soon.",
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <LogoIcon className="w-8 h-8" />
                <span className="ml-2 text-xl font-bold">Sahayaa AI</span>
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
            Get in touch with our team for assistance with your questions or concerns.
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
                    <Mail className="w-5 h-5 mt-1 mr-3 text-primary" />
                    <div>
                      <h3 className="font-medium">Email</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {emailStatus?.supportEmail || "support@supportai.com"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="md:col-span-2">
              {/* Contact Form */}
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
                <LogoIcon className="w-8 h-8" />
                <span className="ml-2 text-xl font-bold text-white">Sahayaa AI</span>
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
            <p>&copy; {new Date().getFullYear()} Sahayaa AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}