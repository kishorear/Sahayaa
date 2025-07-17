import React, { useState } from 'react';
import { Link } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, MessageSquare, Video, ArrowRight, Zap, Shield, Brain } from 'lucide-react';
import DemoChatInterface from '@/components/chatbot/DemoChatInterface';
import LogoIcon from '@/components/LogoIcon';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState("chat");

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
                <span className="hover:text-primary transition-colors cursor-pointer">Contact Us</span>
              </Link>
              <Link href="/demo">
                <span className="text-primary font-medium transition-colors cursor-pointer">Demo</span>
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
          <h1 className="text-4xl font-bold mb-4">Experience Sahayaa AI</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Try our AI-powered customer support system and watch how it transforms your customer experience.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Try the Chat
              </TabsTrigger>
              <TabsTrigger value="walkthrough" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Product Walkthrough
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="mt-8">
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Demo Chat Interface */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Interactive Demo Chat
                      </CardTitle>
                      <CardDescription>
                        Experience our AI-powered customer support system. Ask questions, create tickets, and see how our intelligent assistants help resolve customer issues.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DemoChatInterface />
                    </CardContent>
                  </Card>
                </div>
                
                {/* Demo Features */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">What to Try</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 rounded-full p-2">
                          <Brain className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">Ask Technical Questions</h4>
                          <p className="text-sm text-gray-600">Try asking about API integration, billing, or technical issues.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 rounded-full p-2">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">Create Support Tickets</h4>
                          <p className="text-sm text-gray-600">Describe a problem and watch the AI create a structured ticket.</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 rounded-full p-2">
                          <Shield className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">Multi-Language Support</h4>
                          <p className="text-sm text-gray-600">Ask questions in different languages to see our multilingual capabilities.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sample Questions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <p className="text-sm">"How do I integrate the API?"</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <p className="text-sm">"I can't access my dashboard"</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <p className="text-sm">"What are your pricing plans?"</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <p className="text-sm">"How do I cancel my subscription?"</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="walkthrough" className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Product Walkthrough
                  </CardTitle>
                  <CardDescription>
                    Watch this comprehensive demo to see all the features of Sahayaa AI in action.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    <video 
                      controls 
                      className="w-full h-full object-cover"
                      poster="/api/placeholder/800/450"
                    >
                      <source src="/videos/product-demo.mp4" type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  
                  <div className="mt-6 grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-3">What You'll Learn</h3>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                        <li>• Setting up your AI support system</li>
                        <li>• Managing tickets and customer interactions</li>
                        <li>• Configuring AI providers and integrations</li>
                        <li>• Customizing the chat widget for your website</li>
                        <li>• Analytics and performance monitoring</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold mb-3">Key Features Demonstrated</h3>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                        <li>• Intelligent ticket classification</li>
                        <li>• Multi-language support</li>
                        <li>• Real-time collaboration tools</li>
                        <li>• Advanced analytics dashboard</li>
                        <li>• Third-party integrations (Jira, Slack, etc.)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Experience the power of AI-driven customer support for your business.
          </p>
          <div className="flex justify-center">
            <Link href="/contact">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90"
              >
                Contact Sales
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
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
              <Link href="/demo">
                <span className="hover:text-white transition-colors cursor-pointer">Demo</span>
              </Link>
              <Link href="/auth">
                <span className="hover:text-white transition-colors cursor-pointer">Login</span>
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