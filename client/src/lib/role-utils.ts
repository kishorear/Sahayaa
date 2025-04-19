/**
 * Utility functions and constants for handling user roles and their visual representation
 */

export type UserRole = 'administrator' | 'support_engineer' | 'user' | 'creator' | string;

/**
 * Color scheme for different user roles
 * Each role has a background, text, border, and hover color
 */
export const roleColors: Record<UserRole, { bg: string, text: string, border: string, hover: string }> = {
  administrator: {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    hover: 'hover:bg-purple-200 dark:hover:bg-purple-900/30'
  },
  support_engineer: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/30'
  },
  user: {
    bg: 'bg-gray-100 dark:bg-gray-800/40',
    text: 'text-gray-800 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-800/60'
  },
  creator: {
    bg: 'bg-amber-100 dark:bg-amber-900/20',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    hover: 'hover:bg-amber-200 dark:hover:bg-amber-900/30'
  },
  // Default fallback for any unrecognized roles
  default: {
    bg: 'bg-slate-100 dark:bg-slate-800/40',
    text: 'text-slate-800 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    hover: 'hover:bg-slate-200 dark:hover:bg-slate-800/60'
  }
};

/**
 * Get color classes for a user role
 * @param role The user role
 * @returns Object with appropriate Tailwind classes for the role
 */
export function getRoleColors(role: UserRole) {
  return roleColors[role] || roleColors.default;
}

/**
 * Get CSS classes for a role badge
 * @param role The user role
 * @returns Combined Tailwind classes for the badge
 */
export function getRoleBadgeClasses(role: UserRole) {
  const colors = getRoleColors(role);
  return `${colors.bg} ${colors.text} ${colors.border} ${colors.hover}`;
}

/**
 * Get readable role name for display
 * @param role The user role from the database
 * @returns Formatted role name for display
 */
export function formatRoleName(role: UserRole): string {
  switch (role) {
    case 'administrator':
      return 'Administrator';
    case 'support_engineer':
      return 'Support Engineer';
    case 'user':
      return 'User';
    case 'creator':
      return 'Creator';
    default:
      // Capitalize first letter of each word
      return role
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
}

/**
 * Get icon name for a role (used with Lucide icons)
 * @param role The user role
 * @returns Icon name to use with the role
 */
export function getRoleIconName(role: UserRole): string {
  switch (role) {
    case 'administrator':
      return 'Shield';
    case 'support_engineer':
      return 'Headset';
    case 'user':
      return 'User';
    case 'creator':
      return 'UserCog';
    default:
      return 'User';
  }
}