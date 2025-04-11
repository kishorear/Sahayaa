import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  TicketCheck, 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  Menu,
  Link2,
  Bot,
  FileText,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location === path;
  };

  const routes = [
    { 
      path: "/admin", 
      label: "Dashboard", 
      icon: LayoutDashboard 
    },
    { 
      path: "/admin/tickets", 
      label: "Tickets", 
      icon: TicketCheck 
    },
    { 
      path: "/admin/team", 
      label: "Team", 
      icon: Users 
    },
    { 
      path: "/admin/documents", 
      label: "Documents", 
      icon: FileText 
    },
    { 
      path: "/admin/integrations", 
      label: "Integrations", 
      icon: Link2 
    },
    { 
      path: "/admin/ai-settings", 
      label: "AI Settings", 
      icon: Bot 
    },
    { 
      path: "/admin/settings", 
      label: "Settings", 
      icon: Settings 
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-gray-800">
          <div className="flex items-center h-16 px-4 bg-gray-900">
            <div className="flex items-center">
              <button 
                onClick={() => window.history.back()} 
                className="mr-2 p-1 rounded-full hover:bg-gray-700 focus:outline-none"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5 text-gray-300" />
              </button>
              <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-14h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              <span className="ml-2 text-xl font-bold text-white">SupportAI</span>
            </div>
          </div>
          <div className="flex flex-col flex-grow px-4 pb-4 overflow-y-auto">
            <nav className="flex-1 space-y-2 mt-5">
              {routes.map((route) => (
                <Link key={route.path} href={route.path}>
                  <div
                    className={cn(
                      "flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer",
                      isActive(route.path)
                        ? "text-white bg-gray-900"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    )}
                  >
                    <route.icon className="w-6 h-6 mr-3 text-gray-300" />
                    {route.label}
                  </div>
                </Link>
              ))}
              <button 
                onClick={() => {
                  fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include'
                  }).then(() => {
                    window.location.href = '/auth';
                  });
                }}
                className="flex w-full items-center px-2 py-2 mt-8 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white"
              >
                <LogOut className="w-6 h-6 mr-3 text-gray-400" />
                Logout
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white shadow">
          <div className="flex justify-between px-4 py-4 md:px-6">
            <div className="flex md:hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu className="w-6 h-6" />
              </Button>
            </div>
            <div className="flex-1"></div>
            <div className="flex items-center">
              <Button variant="ghost" size="icon">
                <Bell className="w-6 h-6 text-gray-400" />
              </Button>
              <div className="ml-3 relative">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile sidebar (when open) */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-800 w-full absolute z-10">
            <nav className="flex flex-col px-4 py-4 space-y-2">
              {routes.map((route) => (
                <Link key={route.path} href={route.path}>
                  <div
                    className={cn(
                      "flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer",
                      isActive(route.path)
                        ? "text-white bg-gray-900"
                        : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    )}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <route.icon className="w-6 h-6 mr-3 text-gray-300" />
                    {route.label}
                  </div>
                </Link>
              ))}
              <button 
                onClick={() => {
                  fetch('/api/logout', {
                    method: 'POST',
                    credentials: 'include'
                  }).then(() => {
                    window.location.href = '/auth';
                  });
                }}
                className="flex w-full items-center px-2 py-2 mt-4 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-700 hover:text-white"
              >
                <LogOut className="w-6 h-6 mr-3 text-gray-400" />
                Logout
              </button>
            </nav>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
