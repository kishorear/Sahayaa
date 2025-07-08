import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import LogoIcon from "@/components/LogoIcon";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-gray-900 border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <LogoIcon className="w-10 h-10" />
              <span className="ml-2 text-xl font-bold">Sahayaa AI</span>
            </div>
            <div className="flex items-center space-x-6">
              <Link href="/pricing">
                <span className="hover:text-primary transition-colors cursor-pointer">Pricing</span>
              </Link>
              <Link href="/docs">
                <span className="hover:text-primary transition-colors cursor-pointer">Documentation</span>
              </Link>
              <Link href="/api">
                <span className="hover:text-primary transition-colors cursor-pointer">API</span>
              </Link>
              <Link href="/how-it-works">
                <span className="hover:text-primary transition-colors cursor-pointer">How It Works</span>
              </Link>
              <Link href="/contact">
                <span className="hover:text-primary transition-colors cursor-pointer">Contact Us</span>
              </Link>
              <Link href="/auth">
                <Button size="sm">Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              AI-Powered Support That Resolves Issues Instantly
            </h1>
            <p className="text-xl mb-8 text-indigo-100">
              Sahayaa AI automatically handles, routes, and resolves customer tickets
              to provide faster support and reduce team workload.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50">
                  Get Started
                </Button>
              </Link>
              <Link href="/pricing">
                <Button 
                  size="lg" 
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>
      {/* Features */}
      <section id="features" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 p-3 bg-indigo-100 rounded-full w-14 h-14 flex items-center justify-center">
                  <LogoIcon className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold mb-2">Intelligent Routing</h3>
                <p className="text-gray-600">
                  AI classifies tickets by complexity and automatically routes them to the right department - engineering, support, billing, or product teams.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 p-3 bg-green-100 rounded-full w-14 h-14 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Automatic Resolution</h3>
                <p className="text-gray-600">
                  Level 1 support issues are automatically resolved by the AI, freeing up your team to focus on more complex problems.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 p-3 bg-yellow-100 rounded-full w-14 h-14 flex items-center justify-center">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Context Enhancement</h3>
                <p className="text-gray-600">
                  AI adds valuable context to tickets that require human intervention, making the resolution process faster and more efficient.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* How it works */}
      <section id="how-it-works" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              
              <div className="relative mb-8">
                <div className="flex items-center mb-4">
                  <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center z-10">
                    <span className="text-xl font-bold">1</span>
                  </div>
                  <h3 className="text-xl font-bold ml-4">Customer Reaches Out</h3>
                </div>
                <div className="ml-20">
                  <p className="text-gray-600">
                    Customers interact with the AI chatbot through your website or app, describing their issue or question.
                  </p>
                </div>
              </div>
              
              <div className="relative mb-8">
                <div className="flex items-center mb-4">
                  <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center z-10">
                    <span className="text-xl font-bold">2</span>
                  </div>
                  <h3 className="text-xl font-bold ml-4">AI Analysis</h3>
                </div>
                <div className="ml-20">
                  <p className="text-gray-600">
                    The AI analyzes the inquiry to determine its category, complexity, and whether it can be resolved automatically.
                  </p>
                </div>
              </div>
              
              <div className="relative mb-8">
                <div className="flex items-center mb-4">
                  <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center z-10">
                    <span className="text-xl font-bold">3</span>
                  </div>
                  <h3 className="text-xl font-bold ml-4">Resolution or Routing</h3>
                </div>
                <div className="ml-20">
                  <p className="text-gray-600">
                    Simple issues are resolved immediately by the AI. More complex tickets are routed to the appropriate team with context and recommendations.
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <div className="flex items-center mb-4">
                  <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center z-10">
                    <span className="text-xl font-bold">4</span>
                  </div>
                  <h3 className="text-xl font-bold ml-4">Analytics & Improvement</h3>
                </div>
                <div className="ml-20">
                  <p className="text-gray-600">
                    The system continuously learns from interactions and provides analytics to help improve your support processes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Customers Say</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-xl">
                    A
                  </div>
                  <div className="ml-4">
                    <h4 className="font-bold">ANONYMOUS</h4>
                    <p className="text-sm text-gray-500">CTO, TechStart Inc.</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "Support AI has reduced our support response time by 70% and allowed our engineering team to focus on building product instead of handling routine support questions."
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-xl">
                    S
                  </div>
                  <div className="ml-4">
                    <h4 className="font-bold">ANONYMOUS</h4>
                    <p className="text-sm text-gray-500">Head of Support, CloudServe</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">
                  "The automatic routing and resolution capabilities have transformed our customer support workflow. We've seen a 45% increase in customer satisfaction scores."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to transform your customer support?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Get started today and see how AI can revolutionize your customer service experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth">
              <Button 
                size="lg" 
                className="bg-primary text-white hover:bg-primary/90"
              >
                Sign Up Now
              </Button>
            </Link>
            <Link href="/pricing">
              <Button 
                size="lg" 
                className="bg-primary text-white hover:bg-primary/90"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center">
                <LogoIcon className="w-10 h-10" />
                <span className="ml-2 text-xl font-bold text-white">Support AI</span>
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
              <Link href="/auth">
                <span className="hover:text-white transition-colors cursor-pointer">Login</span>
              </Link>
              <Link href="/docs">
                <span className="hover:text-white transition-colors cursor-pointer">Documentation</span>
              </Link>
              <Link href="/api">
                <span className="hover:text-white transition-colors cursor-pointer">API</span>
              </Link>
              <Link href="/contact">
                <span className="hover:text-white transition-colors cursor-pointer">Contact Us</span>
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Support AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}