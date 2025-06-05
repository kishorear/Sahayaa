import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";  // New Dashboard component
import LandingPage from "@/pages/LandingPage";  // New Landing Page component
import PricingPage from "@/pages/PricingPage";  // New Pricing Page component
import DocumentationPage from "@/pages/DocumentationPage"; // Documentation page
import HowItWorksPage from "@/pages/HowItWorksPage"; // How It Works page
import ApiDocsPage from "@/pages/ApiDocsPage"; // API documentation page
import ContactUsPage from "@/pages/ContactUsPage"; // Contact Us page with Email Support
import AdminDashboard from "@/pages/admin/AdminDashboard";
import TicketsPage from "@/pages/admin/TicketsPage";
import TicketDetailsPage from "@/pages/admin/TicketDetailsPage";
import TeamPage from "@/pages/admin/TeamPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import ProfilePage from "@/pages/admin/ProfilePage"; // User profile management
import IntegrationsPage from "@/pages/admin/IntegrationsPage"; // New Integrations Page component
import ChatWidgetPage from "@/pages/admin/ChatWidgetPage"; // New Chat Widget Page component
import AISettingsPage from "@/pages/admin/AISettingsPage"; // AI Provider Settings Page
import DocumentsPage from "@/pages/admin/DocumentsPage"; // Knowledge base documents management
import MCPTestPage from "@/pages/MCP-Test-Page"; // MCP Testing Page
import WidgetTestPage from "@/pages/WidgetTestPage"; // Widget Testing Page
import KnowledgeSync from "@/pages/KnowledgeSync"; // Knowledge Repository Sync Page
import ChatbotInterface from "@/components/chatbot/ChatbotInterface";
import AuthPage from "@/pages/AuthPage";
import CreatorLoginPage from "@/pages/creator/CreatorLoginPage"; // Creator login page
import CreatorDashboardPage from "@/pages/creator/CreatorDashboardPage"; // Creator dashboard
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { CreatorProtectedRoute } from "@/lib/creator-protected-route"; // Creator route protection
import RegistrationPage from "@/pages/admin/RegistrationPage"; // Registration page
// ChatbotProvider removed as we're using simpler implementation

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/docs" component={DocumentationPage} />
      <Route path="/api" component={ApiDocsPage} />
      <Route path="/how-it-works" component={HowItWorksPage} />
      <Route path="/contact" component={ContactUsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/mcp-test" component={MCPTestPage} />
      <Route path="/widget-test" component={WidgetTestPage} />
      
      {/* Creator Routes */}
      <Route path="/creator/login" component={CreatorLoginPage} />
      <CreatorProtectedRoute path="/creator/dashboard" component={CreatorDashboardPage} />
      
      {/* Protected Routes - Application */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      
      {/* Protected Routes - Admin */}
      <ProtectedRoute path="/admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/tickets" component={TicketsPage} />
      <ProtectedRoute path="/admin/tickets/:id" component={TicketDetailsPage} />
      <ProtectedRoute path="/admin/team" component={TeamPage} />
      <ProtectedRoute path="/admin/integrations" component={IntegrationsPage} />
      <ProtectedRoute path="/admin/documents" component={DocumentsPage} />
      <ProtectedRoute path="/admin/settings" component={SettingsPage} />
      <ProtectedRoute path="/admin/profile" component={ProfilePage} />
      <ProtectedRoute path="/admin/widget" component={ChatWidgetPage} />
      <ProtectedRoute path="/admin/ai-settings" component={AISettingsPage} />
      <ProtectedRoute path="/admin/knowledge-sync" component={KnowledgeSync} />
      <CreatorProtectedRoute path="/admin/registration" component={RegistrationPage} />
      
      {/* 404 Route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <ProtectedChatbot />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Component that renders the chatbot only for authenticated users
function ProtectedChatbot() {
  const { user, isLoading } = useAuth();
  
  // Only show the chatbot if the user is logged in
  if (!user) return null;
  
  // Show loading state only while authentication is being checked
  if (isLoading) return null;
  
  // If authenticated, render the chatbot interface
  return <ChatbotInterface />;
}

export default App;
