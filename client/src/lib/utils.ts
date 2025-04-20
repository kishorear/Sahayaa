import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  try {
    return format(date, 'MMM dd, yyyy HH:mm')
  } catch (e) {
    return 'Invalid date'
  }
}

/**
 * Generate a random password of specified length
 * @param length The length of the password to generate
 * @returns A random password string
 */
export function generateRandomPassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=";
  let password = "";
  
  // Ensure at least one of each character type
  password += getRandomChar("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  password += getRandomChar("abcdefghijklmnopqrstuvwxyz");
  password += getRandomChar("0123456789");
  password += getRandomChar("!@#$%^&*()_-+=");
  
  // Fill the rest of the password
  for (let i = password.length; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

/**
 * Get a random character from a character set
 * @param charset The character set to select from
 * @returns A single random character
 */
function getRandomChar(charset: string): string {
  return charset.charAt(Math.floor(Math.random() * charset.length));
}
