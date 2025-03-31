import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";  // New Dashboard component
import LandingPage from "@/pages/LandingPage";  // New Landing Page component
import PricingPage from "@/pages/PricingPage";  // New Pricing Page component
import DocumentationPage from "@/pages/DocumentationPage"; // Documentation page
import ApiDocsPage from "@/pages/ApiDocsPage"; // API documentation page
import AdminDashboard from "@/pages/admin/AdminDashboard";
import TicketsPage from "@/pages/admin/TicketsPage";
import TicketDetailsPage from "@/pages/admin/TicketDetailsPage";
import TeamPage from "@/pages/admin/TeamPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import IntegrationsPage from "@/pages/admin/IntegrationsPage"; // New Integrations Page component
import ChatWidgetPage from "@/pages/admin/ChatWidgetPage"; // New Chat Widget Page component
import AISettingsPage from "@/pages/admin/AISettingsPage"; // AI Provider Settings Page
import DocumentsPage from "@/pages/admin/DocumentsPage"; // Knowledge base documents management
import ChatbotInterface from "@/components/chatbot/ChatbotInterface";
import AuthPage from "@/pages/AuthPage";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/docs" component={DocumentationPage} />
      <Route path="/api" component={ApiDocsPage} />
      <Route path="/auth" component={AuthPage} />
      
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
      <ProtectedRoute path="/admin/widget" component={ChatWidgetPage} />
      <ProtectedRoute path="/admin/ai-settings" component={AISettingsPage} />
      
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

// Component that renders the chatbot (temporarily allowing access without authentication)
function ProtectedChatbot() {
  const { user, isLoading } = useAuth();
  
  /* TEMPORARILY DISABLED: Authentication check
  // Only show the chatbot if the user is logged in
  if (!user) return null;
  */
  
  // Show loading state only while authentication is being checked
  if (isLoading) return null;
  
  // Always render the chatbot interface (temporarily)
  return <ChatbotInterface />;
}

export default App;
