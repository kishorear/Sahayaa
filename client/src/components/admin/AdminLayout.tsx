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
  ChevronLeft,
  UserCog,
  MessageSquare,
  UserPlus,
  Brain,
  Activity,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoIcon from "@/components/LogoIcon";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { TrialTicketCounter } from "@/components/TrialTicketCounter";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logoutMutation } = useAuth();
  const { data: permissions } = usePermissions();
  
  // Creator role has full access to everything
  const isCreator = user?.role?.toLowerCase() === 'creator';

  const isActive = (path: string) => {
    return location === path;
  };

  // Define all available routes with permission-based access
  const allRoutes = [
    { 
      path: "/admin", 
      label: "Dashboard", 
      icon: LayoutDashboard,
      permission: "canAccessAnalytics"
    },
    { 
      path: "/admin/team", 
      label: "Team", 
      icon: Users,
      permission: "canViewUsers"
    },
    { 
      path: "/admin/tickets", 
      label: "Tickets", 
      icon: TicketCheck,
      permission: "canViewOwnTickets"
    },
    { 
      path: "/admin/agent-resources", 
      label: "Agent Resources", 
      icon: FileText,
      permission: "canManageAgentResources"
    },
    { 
      path: "/admin/registration", 
      label: "Registration", 
      icon: UserPlus,
      creatorOnly: true
    },
    { 
      path: "/creator/roles", 
      label: "Role Management", 
      icon: ShieldCheck,
      creatorOnly: true
    },
    { 
      path: "/admin/integrations", 
      label: "Integrations", 
      icon: Link2,
      permission: "canAccessIntegrations"
    },
    { 
      path: "/admin/ai-settings", 
      label: "AI Settings", 
      icon: Bot,
      permission: "canAccessAISettings"
    },
    { 
      path: "/admin/agent-test", 
      label: "Agent Test", 
      icon: Brain,
      creatorOnly: true
    },
    { 
      path: "/admin/profile", 
      label: "My Profile", 
      icon: UserCog,
      alwaysShow: true
    },
    { 
      path: "/admin/settings", 
      label: "Settings", 
      icon: Settings,
      permission: "canAccessSettings"
    },
    { 
      path: "/admin/widget", 
      label: "Chat Widget", 
      icon: MessageSquare,
      permission: "canManageSettings"
    },
    { 
      path: "/admin/monitoring", 
      label: "Monitoring", 
      icon: Activity,
      permission: "canAccessSettings"
    },
  ];
  
  // Filter routes based on user permissions
  const routes = allRoutes.filter(route => {
    // If no user, don't show any routes
    if (!user) return false;
    
    // Creator role has access to EVERYTHING - bypass all permission checks
    if (isCreator) return true;
    
    // Always show routes marked as alwaysShow
    if (route.alwaysShow) return true;
    
    // Creator-only routes are blocked for non-creators
    if (route.creatorOnly) return false;
    
    // Permission-based routes
    if (route.permission) {
      // If permissions haven't loaded yet, show nothing (except alwaysShow)
      if (!permissions) return false;
      // Check if user has the required permission
      return permissions[route.permission as keyof typeof permissions] === true;
    }
    
    return false;
  });

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
              <LogoIcon className="w-8 h-8" />
              <span className="ml-2 text-xl font-bold text-white">Sahayaa AI</span>
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
                  try {
                    logoutMutation.mutate();
                  } catch (error) {
                    console.error('Logout button error:', error);
                  }
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
            <div className="flex items-center gap-3">
              <TrialTicketCounter variant="badge" />
              {user && (
                <div className="hidden md:flex mr-1 items-center">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.name || user.username}</p>
                    {user.company && (
                      <p className="text-xs text-gray-500">{user.company}</p>
                    )}
                    <p className="text-xs text-gray-500 capitalize">{user.role} {user.teamId ? `• Team ${user.teamId}` : ''}</p>
                  </div>
                </div>
              )}
              <Button variant="ghost" size="icon">
                <Bell className="w-6 h-6 text-gray-400" />
              </Button>
              <Link href="/admin/profile">
                <div className="profile-menu ml-3 relative cursor-pointer">
                  <Avatar>
                    {user?.profilePicture ? (
                      <AvatarImage 
                        src={user.profilePicture} 
                        alt={user?.name || user?.username || 'User'} 
                        onError={(e) => {
                          try {
                            // Fallback to generated avatar on error
                            const target = e.currentTarget as HTMLImageElement;
                            target.src = `https://avatars.dicebear.com/api/initials/${user?.name || user?.username || 'U'}.svg`;
                          } catch (error) {
                            console.error("Error in image fallback:", error);
                          }
                        }}
                      />
                    ) : (
                      <AvatarImage src={`https://avatars.dicebear.com/api/initials/${user?.name || user?.username || 'U'}.svg`} alt={user?.name || user?.username || 'User'} />
                    )}
                    <AvatarFallback>{user?.name?.[0] || user?.username?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile sidebar (when open) */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-gray-800 w-full absolute z-10">
            <div className="flex items-center px-4 py-3 border-b border-gray-700">
              <LogoIcon className="w-8 h-8 mr-2" />
              <span className="text-xl font-bold text-white">Sahayaa AI</span>
            </div>
            {user && (
              <Link href="/admin/profile">
                <div className="px-4 py-3 border-b border-gray-700 cursor-pointer hover:bg-gray-700">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-2">
                      {user?.profilePicture ? (
                        <AvatarImage 
                          src={user.profilePicture} 
                          alt={user?.name || user?.username || 'User'} 
                          onError={(e) => {
                            try {
                              // Fallback to generated avatar on error
                              const target = e.currentTarget as HTMLImageElement;
                              target.src = `https://avatars.dicebear.com/api/initials/${user?.name || user?.username || 'U'}.svg`;
                            } catch (error) {
                              console.error("Error in image fallback:", error);
                            }
                          }}
                        />
                      ) : (
                        <AvatarImage src={`https://avatars.dicebear.com/api/initials/${user?.name || user?.username || 'U'}.svg`} alt={user?.name || user?.username || 'User'} />
                      )}
                      <AvatarFallback>{user?.name?.[0] || user?.username?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-white">{user.name || user.username}</p>
                      {user.company && (
                        <p className="text-xs text-gray-400">{user.company}</p>
                      )}
                      <p className="text-xs text-gray-400 capitalize">{user.role} {user.teamId ? `• Team ${user.teamId}` : ''}</p>
                    </div>
                  </div>
                </div>
              </Link>
            )}
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
                  try {
                    logoutMutation.mutate();
                  } catch (error) {
                    console.error('Logout button error:', error);
                  }
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
        <main className="admin-dashboard flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
