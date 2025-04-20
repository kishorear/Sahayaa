import { db } from '../db';
import { aiProviders, type AiProvider } from '../../shared/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { AIProviderFactory } from './providers';
import { logAiProviderAccess } from './audit-log';

// Local cache of AI providers to avoid database queries on every request
let aiProvidersCache: Map<number, AiProvider[]> = new Map();
let lastCacheUpdate: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Load all AI providers for a given tenant and optional team from database
 * 
 * @param tenantId The tenant ID to load providers for
 * @param teamId Optional team ID to filter providers by
 * @returns Array of AI providers
 */
async function loadProvidersFromDatabase(tenantId: number, teamId?: number | null): Promise<AiProvider[]> {
  try {
    let query = db.select().from(aiProviders)
      .where(eq(aiProviders.tenantId, tenantId))
      .where(eq(aiProviders.enabled, true));

    // If teamId is provided, filter by teamId or null (providers available to all teams)
    if (teamId !== undefined && teamId !== null) {
      query = query.where(or(
        eq(aiProviders.teamId, teamId),
        isNull(aiProviders.teamId)
      ));
    }

    // Order by priority (highest first)
    const providers = await query.orderBy(aiProviders.priority);
    
    return providers;
  } catch (error) {
    console.error('Error loading AI providers from database:', error);
    return [];
  }
}

/**
 * Refresh the providers cache for all tenants
 * Used during startup and when providers are updated
 */
export async function reloadProvidersFromDatabase(tenantId?: number): Promise<void> {
  try {
    // If a specific tenantId is provided, only reload that tenant's providers
    if (tenantId) {
      const providers = await loadProvidersFromDatabase(tenantId);
      aiProvidersCache.set(tenantId, providers);
      console.log(`Reloaded ${providers.length} AI providers for tenant ${tenantId}`);
    } else {
      // Otherwise, find all unique tenantIds with providers and reload each
      const allProviders = await db.select({ tenantId: aiProviders.tenantId })
        .from(aiProviders)
        .groupBy(aiProviders.tenantId);
      
      for (const { tenantId } of allProviders) {
        const providers = await loadProvidersFromDatabase(tenantId);
        aiProvidersCache.set(tenantId, providers);
      }
      
      console.log(`Reloaded AI providers for ${aiProvidersCache.size} tenants`);
    }
    
    lastCacheUpdate = Date.now();
  } catch (error) {
    console.error('Error reloading AI providers:', error);
    throw error;
  }
}

/**
 * Get AI providers for a specific tenant and team
 * Uses caching to avoid repeated database queries
 * 
 * @param tenantId The tenant ID to get providers for
 * @param teamId Optional team ID to filter providers by
 * @returns Array of AI providers
 */
export async function getAIProviders(tenantId: number, teamId?: number | null): Promise<AiProvider[]> {
  // Check if cache needs refresh
  const now = Date.now();
  if (now - lastCacheUpdate > CACHE_TTL || !aiProvidersCache.has(tenantId)) {
    await reloadProvidersFromDatabase(tenantId);
  }
  
  // Get providers from cache
  const allTenantProviders = aiProvidersCache.get(tenantId) || [];
  
  // If no teamId specified, return all tenant providers
  if (teamId === undefined) {
    return allTenantProviders;
  }
  
  // Filter providers by team (null teamId means available to all teams)
  return allTenantProviders.filter(provider => 
    provider.teamId === teamId || provider.teamId === null
  );
}

/**
 * Check if a user has access to AI providers based on their tenant and team
 * 
 * @param tenantId The tenant ID of the user
 * @param teamId The team ID of the user (optional)
 * @returns Promise resolving to true if user has AI provider access, false otherwise
 */
export async function getAiProviderAccessForUser(tenantId: number, teamId?: number | null): Promise<boolean> {
  try {
    const providers = await getAIProviders(tenantId, teamId);
    return providers.length > 0;
  } catch (error) {
    console.error('Error checking AI provider access:', error);
    return false;
  }
}

/**
 * Get all available AI providers for a user based on their tenant and team
 * 
 * @param tenantId The tenant ID of the user
 * @param teamId The team ID of the user (optional)
 * @param role The user's role (creator and admin users can see all providers)
 * @returns Array of available AI providers
 */
export async function getAvailableAIProviders(
  tenantId: number, 
  teamId?: number | null,
  role?: string
): Promise<AiProvider[]> {
  try {
    // Creator and admin users can see all providers for their tenant
    if (role === 'creator' || role === 'admin') {
      return await getAIProviders(tenantId);
    }
    
    // Other users only see providers for their team
    return await getAIProviders(tenantId, teamId);
  } catch (error) {
    console.error('Error getting available AI providers:', error);
    return [];
  }
}

/**
 * Get the default AI provider for a user based on their tenant and team
 * Returns the provider with isDefault=true or the highest priority provider
 * 
 * @param tenantId The tenant ID of the user
 * @param teamId The team ID of the user (optional)
 * @returns The default AI provider or undefined if none available
 */
export async function getDefaultAIProvider(
  tenantId: number,
  teamId?: number | null
): Promise<AiProvider | undefined> {
  try {
    const providers = await getAIProviders(tenantId, teamId);
    
    if (providers.length === 0) {
      return undefined;
    }
    
    // First look for a provider marked as default
    const defaultProvider = providers.find(p => p.isDefault);
    if (defaultProvider) {
      return defaultProvider;
    }
    
    // Otherwise return the highest priority provider (providers are already sorted by priority)
    return providers[0];
  } catch (error) {
    console.error('Error getting default AI provider:', error);
    return undefined;
  }
}

/**
 * Get an AI provider instance by ID
 * Used for specific operations where a particular provider is required
 * 
 * @param providerId The ID of the provider to get
 * @param userId The ID of the user making the request (for audit logging)
 * @param tenantId The tenant ID context (for audit logging)
 * @param teamId The team ID context (for audit logging, optional)
 * @returns The AI provider instance or undefined if not found or not accessible
 */
export async function getAIProviderById(
  providerId: number,
  userId: number,
  tenantId: number,
  teamId?: number | null
): Promise<any | undefined> {
  try {
    // Get provider from database directly (no caching for ID-based lookup)
    const [provider] = await db.select().from(aiProviders)
      .where(eq(aiProviders.id, providerId))
      .where(eq(aiProviders.enabled, true));
    
    if (!provider) {
      // Log failed access attempt
      await logAiProviderAccess({
        userId,
        tenantId,
        teamId,
        action: 'provider_by_id',
        success: false,
        details: `Provider not found or not enabled: ${providerId}`
      });
      
      return undefined;
    }
    
    // Check if provider belongs to the user's tenant
    if (provider.tenantId !== tenantId) {
      // Log failed access attempt
      await logAiProviderAccess({
        userId,
        tenantId,
        teamId,
        action: 'provider_by_id',
        success: false,
        details: `Provider tenant mismatch: ${providerId}`
      });
      
      return undefined;
    }
    
    // Check if provider is accessible to the user's team
    if (teamId && provider.teamId !== null && provider.teamId !== teamId) {
      // Log failed access attempt
      await logAiProviderAccess({
        userId,
        tenantId,
        teamId,
        action: 'provider_by_id',
        success: false,
        details: `Provider team mismatch: ${providerId}`
      });
      
      return undefined;
    }
    
    // Create provider instance
    const providerInstance = AIProviderFactory.getInstance(provider);
    
    // Log successful access
    await logAiProviderAccess({
      userId,
      tenantId,
      teamId,
      action: 'provider_by_id',
      success: true,
      details: `Provider accessed: ${provider.name} (${provider.type})`
    });
    
    return providerInstance;
  } catch (error) {
    console.error('Error getting AI provider by ID:', error);
    
    // Log error access attempt
    await logAiProviderAccess({
      userId,
      tenantId,
      teamId,
      action: 'provider_by_id',
      success: false,
      details: `Error accessing provider ${providerId}: ${error}`
    });
    
    return undefined;
  }
}

/**
 * Get a provider for a user based on tenant and team
 * This is a convenience wrapper for getAIProviders that returns the first provider or undefined
 * 
 * @param tenantId The tenant ID of the user
 * @param teamId The team ID of the user (optional)
 * @returns The first available AI provider or undefined if none available
 */
export async function getAIProviderForUser(
  tenantId: number, 
  teamId?: number | null
): Promise<AiProvider | undefined> {
  try {
    const providers = await getAIProviders(tenantId, teamId);
    return providers.length > 0 ? providers[0] : undefined;
  } catch (error) {
    console.error('Error getting AI provider for user:', error);
    return undefined;
  }
}

/**
 * Get the default provider for a user based on tenant and team
 * Alias for getDefaultAIProvider with a more user-focused name
 * 
 * @param tenantId The tenant ID of the user
 * @param teamId The team ID of the user (optional)
 * @returns The default AI provider or undefined if none available
 */
export async function getDefaultProviderForUser(
  tenantId: number,
  teamId?: number | null
): Promise<AiProvider | undefined> {
  return getDefaultAIProvider(tenantId, teamId);
}