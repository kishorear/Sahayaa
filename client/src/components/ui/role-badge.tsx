import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Shield, 
  User, 
  Headset, 
  UserCog,
  type LucideIcon 
} from "lucide-react";
import { 
  type UserRole, 
  getRoleBadgeClasses, 
  formatRoleName 
} from "@/lib/role-utils";

// Map of role to icon component
const roleIconMap: Record<string, LucideIcon> = {
  administrator: Shield,
  support_engineer: Headset,
  user: User,
  creator: UserCog,
};

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * A badge that displays a user role with appropriate styling
 */
export function RoleBadge({ 
  role, 
  className, 
  showIcon = true,
  size = "md" 
}: RoleBadgeProps) {
  // Get the appropriate icon component for the role
  const IconComponent = roleIconMap[role] || User;
  
  // Determine icon size based on badge size
  const iconSize = size === "sm" ? 12 : size === "md" ? 14 : 16;
  
  // Get appropriate padding based on size
  const paddingClass = 
    size === "sm" ? "px-2 py-0.5 text-xs" : 
    size === "md" ? "px-2.5 py-0.5 text-sm" : 
    "px-3 py-1 text-base";

  return (
    <Badge
      variant="outline"
      className={cn(
        getRoleBadgeClasses(role),
        paddingClass,
        "rounded-md font-medium",
        className
      )}
    >
      {showIcon && (
        <IconComponent className="mr-1" size={iconSize} />
      )}
      {formatRoleName(role)}
    </Badge>
  );
}