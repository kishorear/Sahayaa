import * as crypto from "crypto";

/**
 * Generate a random password with a specified length
 * @param length The length of the password to generate
 * @returns A random password string
 */
export function generateRandomPassword(length: number = 12): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";
  let password = "";
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, charset.length);
    password += charset[randomIndex];
  }
  
  return password;
}

/**
 * Format a date for display
 * @param date The date to format
 * @returns A formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Truncate a string to a specified length with an ellipsis
 * @param str The string to truncate
 * @param length The maximum length of the string
 * @returns The truncated string
 */
export function truncateString(str: string, length: number): string {
  if (!str) return "";
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
}

/**
 * Sanitize a string for use in a URL slug
 * @param str The string to sanitize
 * @returns A sanitized string suitable for a URL slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove non-word chars
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Deep merge two objects
 * @param target The target object
 * @param source The source object
 * @returns The merged object
 */
export function deepMerge<T>(target: T, source: any): T {
  const output = { ...target } as any;

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
}

/**
 * Check if a value is an object
 * @param item The item to check
 * @returns Whether the item is an object
 */
function isObject(item: any): boolean {
  return item && typeof item === "object" && !Array.isArray(item);
}