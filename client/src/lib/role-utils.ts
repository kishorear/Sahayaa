/**
 * Role utilities to maintain consistent styling across the dashboard
 */

// Define role types for type safety
export type UserRole = 'administrator' | 'support_engineer' | 'user' | 'creator' | string;

// Define the color scheme for each role
export const roleColors: Record<UserRole, { bg: string, text: string, border: string, hover: string }> = {
  // Administrator: Purple
  'administrator': {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    hover: 'hover:bg-purple-200 dark:hover:bg-purple-800/50'
  },
  // Support Engineer: Blue
  'support_engineer': {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    hover: 'hover:bg-blue-200 dark:hover:bg-blue-800/50'
  },
  // Regular User: Green
  'user': {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-800 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    hover: 'hover:bg-green-200 dark:hover:bg-green-800/50'
  },
  // Creator: Amber/Gold
  'creator': {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    hover: 'hover:bg-amber-200 dark:hover:bg-amber-800/50'
  },
  // Default styling for any other role
  'default': {
    bg: 'bg-gray-100 dark:bg-gray-800/50',
    text: 'text-gray-800 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-700',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-700'
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
  return `${colors.bg} ${colors.text} ${colors.border} ${colors.hover} font-medium`;
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
      // Capitalize first letter of each word for custom roles
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