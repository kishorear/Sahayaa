import { useQuery } from "@tanstack/react-query";
import type { RolePermissions } from "@shared/schema";

/**
 * Hook to get current user's permissions
 */
export function usePermissions() {
  return useQuery<RolePermissions>({
    queryKey: ["/api/permissions/me"],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to check if user has a specific permission
 */
export function useHasPermission(permission: keyof RolePermissions): boolean {
  const { data: permissions } = usePermissions();
  
  if (!permissions) {
    return false;
  }
  
  return permissions[permission] === true;
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useHasAnyPermission(permissions: Array<keyof RolePermissions>): boolean {
  const { data: userPermissions } = usePermissions();
  
  if (!userPermissions) {
    return false;
  }
  
  return permissions.some(permission => userPermissions[permission] === true);
}

/**
 * Hook to check if user has all of the specified permissions
 */
export function useHasAllPermissions(permissions: Array<keyof RolePermissions>): boolean {
  const { data: userPermissions } = usePermissions();
  
  if (!userPermissions) {
    return false;
  }
  
  return permissions.every(permission => userPermissions[permission] === true);
}

/**
 * Hook to get available roles for the current tenant's industry
 */
export function useAvailableRoles() {
  return useQuery<Array<{ key: string; name: string; description: string }>>({
    queryKey: ["/api/permissions/available-roles"],
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });
}
