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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/tickets" component={TicketsPage} />
      <Route path="/admin/tickets/:id" component={TicketDetailsPage} />
      <Route path="/admin/team" component={TeamPage} />
      <Route path="/admin/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <ChatbotInterface />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
