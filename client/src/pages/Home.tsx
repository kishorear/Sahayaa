import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Bar */}
      <nav className="bg-white dark:bg-gray-900 border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-14h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              <span className="ml-2 text-xl font-bold">Sahayaa AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                Welcome, <span className="font-semibold">{user?.name || user?.username}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </Button>
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
              <Link href="/admin">
                <Button size="lg" className="bg-white text-indigo-600 hover:bg-indigo-50">
                  Admin Dashboard
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-indigo-700"
                onClick={() => document.getElementById('chat-bubble')?.click()}
              >
                Try the Chatbot
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="mb-4 p-3 bg-indigo-100 rounded-full w-14 h-14 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-14h2v6h-2zm0 8h2v2h-2z"/>
                  </svg>
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
      <section className="py-16 bg-gray-50">
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

      {/* CTA */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to transform your customer support?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Try the AI chatbot now by clicking the chat icon in the bottom right corner.
          </p>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-white text-white hover:bg-indigo-700"
            onClick={() => document.getElementById('chat-bubble')?.click()}
          >
            Start a Conversation
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center">
                <img src="/logo.svg" alt="Sahayaa AI Logo" className="w-8 h-8" />
                <span className="ml-2 text-xl font-bold text-white">Sahayaa AI</span>
              </div>
              <p className="mt-2 text-sm">AI-powered customer support solution</p>
            </div>
            <div className="flex space-x-6">
              <Link href="/admin">
                <span className="hover:text-white transition-colors cursor-pointer">Admin Dashboard</span>
              </Link>
              <span className="hover:text-white transition-colors cursor-pointer">Documentation</span>
              <span className="hover:text-white transition-colors cursor-pointer">API</span>
              <span className="hover:text-white transition-colors cursor-pointer">Contact</span>
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
