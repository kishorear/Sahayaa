import { db } from '../db';
import * as schema from '../../shared/schema';

/**
 * Log AI provider access attempts (both successful and failed)
 * Essential for security auditing and compliance monitoring
 * 
 * @param userId The user ID making the access attempt
 * @param tenantId The tenant ID context of the access
 * @param teamId The team ID context of the access (if applicable)
 * @param action The action being performed (e.g., 'api_call', 'middleware_access', etc.)
 * @param success Whether the access attempt was successful
 * @param metadata Additional context about the access (optional)
 * @returns Promise that resolves when logging is complete
 */
export async function logAiProviderAccess(
  userId: number,
  tenantId: number,
  teamId: number | null,
  action: string,
  success: boolean,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    await db.insert(schema.aiProviderAudit).values({
      userId,
      tenantId,
      teamId,
      action,
      success,
      details: metadata,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log AI provider access:', error);
    // Non-throwing - logging failures shouldn't break application flow
  }
}

/**
 * Log management operations on AI providers (create, update, delete)
 * Provides audit trail for configuration changes
 * 
 * @param userId The user ID performing the management action
 * @param tenantId The tenant ID context
 * @param teamId The team ID context (if applicable)
 * @param operation The operation being performed ('create', 'update', 'delete')
 * @param providerId The ID of the AI provider being managed
 * @param details Additional details about the operation
 * @returns Promise that resolves when logging is complete
 */
export async function logAiProviderManagement(
  userId: number,
  tenantId: number,
  teamId: number | null,
  operation: 'create' | 'update' | 'delete',
  providerId: number,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    await db.insert(schema.aiProviderAudit).values({
      userId,
      tenantId,
      teamId,
      action: operation,
      providerId,
      details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error(`Failed to log AI provider ${operation} operation:`, error);
    // Non-throwing - logging failures shouldn't break application flow
  }
}

/**
 * Log AI provider usage in actual operations
 * Useful for usage metrics, billing, and performance monitoring
 * 
 * @param userId The user ID using the AI provider
 * @param tenantId The tenant ID context
 * @param teamId The team ID context (if applicable)
 * @param providerId The ID of the AI provider being used
 * @param operationType The type of operation ('classification', 'chat', 'auto_resolve', etc.)
 * @param performanceMetrics Performance data (tokens, latency, etc.)
 * @returns Promise that resolves when logging is complete
 */
export async function logAiProviderUsage(
  userId: number,
  tenantId: number,
  teamId: number | null,
  providerId: number,
  operationType: string,
  performanceMetrics: Record<string, any> = {}
): Promise<void> {
  try {
    await db.insert(schema.aiProviderAudit).values({
      userId,
      tenantId,
      teamId,
      action: `usage_${operationType}`,
      providerId,
      details: performanceMetrics,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log AI provider usage:', error);
    // Non-throwing - logging failures shouldn't break application flow
  }
}