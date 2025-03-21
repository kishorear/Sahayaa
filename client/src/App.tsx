import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import TicketsPage from "@/pages/admin/TicketsPage";
import TicketDetailsPage from "@/pages/admin/TicketDetailsPage";
import TeamPage from "@/pages/admin/TeamPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import ChatbotInterface from "@/components/chatbot/ChatbotInterface";
import AuthPage from "@/pages/AuthPage";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/admin" component={AdminDashboard} />
      <ProtectedRoute path="/admin/tickets" component={TicketsPage} />
      <ProtectedRoute path="/admin/tickets/:id" component={TicketDetailsPage} />
      <ProtectedRoute path="/admin/team" component={TeamPage} />
      <ProtectedRoute path="/admin/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <ChatbotInterface />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
