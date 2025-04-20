import { db } from '../db';
import * as schema from '../../shared/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { isCreatorOrAdminRole } from '../utils';

// Cache of providers loaded from database
let providersCache: schema.AiProvider[] = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Reload AI providers from database into cache
 * Used during server startup and when providers are modified
 * 
 * @returns Promise resolving to array of all AI providers
 */
export async function reloadProvidersFromDatabase(): Promise<schema.AiProvider[]> {
  try {
    // Load all enabled providers from database
    const providers = await db.select()
      .from(schema.aiProviders)
      .where(eq(schema.aiProviders.enabled, true))
      .orderBy(schema.aiProviders.priority);
    
    // Update cache
    providersCache = providers;
    lastCacheUpdate = Date.now();
    
    console.log(`Loaded ${providers.length} AI providers from database`);
    return providers;
  } catch (error) {
    console.error('Error loading AI providers from database:', error);
    return [];
  }
}

/**
 * Check if AI providers are available for a specific tenant and team
 * @param tenantId The tenant ID to check for
 * @param teamId The team ID to check for (optional)
 * @returns Promise resolving to boolean indicating if AI providers are available
 */
export async function getAiProviderAccessForUser(
  tenantId: number,
  teamId: number | null
): Promise<boolean> {
  try {
    // Query for providers that match the tenant and either:
    // 1. Match the specific team, or
    // 2. Are tenant-wide (teamId is null)
    const providers = await db.select({ id: schema.aiProviders.id })
      .from(schema.aiProviders)
      .where(and(
        eq(schema.aiProviders.tenantId, tenantId),
        eq(schema.aiProviders.enabled, true),
        or(
          isNull(schema.aiProviders.teamId),
          eq(schema.aiProviders.teamId, teamId || 0) // Handle null teamId case
        )
      ))
      .limit(1);

    return providers.length > 0;
  } catch (error) {
    console.error('Error checking AI provider availability:', error);
    return false;
  }
}

/**
 * Get available AI providers for a specific tenant and team
 * Applies proper filtering based on team scoping
 * 
 * @param tenantId The tenant ID to get providers for
 * @param teamId The team ID to get providers for (optional)
 * @param userRole The user's role (to check for cross-tenant access)
 * @returns Array of available AI providers
 */
export async function getAvailableAIProviders(
  tenantId: number,
  teamId: number | null,
  userRole: string
): Promise<schema.AiProvider[]> {
  // If creator or admin, include all providers for the tenant
  if (isCreatorOrAdminRole(userRole)) {
    return db.select()
      .from(schema.aiProviders)
      .where(and(
        eq(schema.aiProviders.tenantId, tenantId),
        eq(schema.aiProviders.enabled, true)
      ))
      .orderBy(schema.aiProviders.priority);
  }
  
  // Otherwise, filter for team-specific access
  return db.select()
    .from(schema.aiProviders)
    .where(and(
      eq(schema.aiProviders.tenantId, tenantId),
      eq(schema.aiProviders.enabled, true),
      or(
        isNull(schema.aiProviders.teamId),
        eq(schema.aiProviders.teamId, teamId || 0) // Handle null teamId case
      )
    ))
    .orderBy(schema.aiProviders.priority);
}

/**
 * Get the default AI provider for a tenant and team
 * Respects team-specific provider configuration
 * 
 * @param tenantId The tenant ID
 * @param teamId The team ID (optional)
 * @returns The default AI provider or null if none found
 */
export async function getDefaultAIProvider(
  tenantId: number,
  teamId: number | null
): Promise<schema.AiProvider | null> {
  // First try to find team-specific default provider
  if (teamId) {
    const teamProviders = await db.select()
      .from(schema.aiProviders)
      .where(and(
        eq(schema.aiProviders.tenantId, tenantId),
        eq(schema.aiProviders.teamId, teamId),
        eq(schema.aiProviders.isDefault, true),
        eq(schema.aiProviders.enabled, true)
      ))
      .limit(1);
    
    if (teamProviders.length > 0) {
      return teamProviders[0];
    }
  }
  
  // Fallback to tenant-wide default provider
  const tenantProviders = await db.select()
    .from(schema.aiProviders)
    .where(and(
      eq(schema.aiProviders.tenantId, tenantId),
      isNull(schema.aiProviders.teamId),
      eq(schema.aiProviders.isDefault, true),
      eq(schema.aiProviders.enabled, true)
    ))
    .limit(1);
  
  if (tenantProviders.length > 0) {
    return tenantProviders[0];
  }
  
  // If no default found, get highest priority provider
  const highestPriorityProviders = await db.select()
    .from(schema.aiProviders)
    .where(and(
      eq(schema.aiProviders.tenantId, tenantId),
      eq(schema.aiProviders.enabled, true),
      or(
        isNull(schema.aiProviders.teamId),
        eq(schema.aiProviders.teamId, teamId || 0)
      )
    ))
    .orderBy(schema.aiProviders.priority)
    .limit(1);
  
  return highestPriorityProviders.length > 0 ? highestPriorityProviders[0] : null;
}