import { db } from '../db';
import * as schema from '../../shared/schema';

/**
 * Log AI provider access attempts
 * Records user access attempts to AI providers for security audit purposes
 * 
 * @param userId User ID attempting access
 * @param tenantId Tenant ID being accessed
 * @param teamId Team ID being accessed (optional)
 * @param action The action being performed (e.g., "chat", "classify", "auto_resolve")
 * @param success Whether access was granted (true) or denied (false)
 * @param details Additional details about the access attempt
 */
export async function logAiProviderAccess(
  userId: number,
  tenantId: number,
  teamId: number | null,
  action: string,
  success: boolean,
  details?: Record<string, any>
): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO ai_provider_audit (user_id, tenant_id, team_id, action, success, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        tenantId,
        teamId,
        action,
        success,
        details ? JSON.stringify(details) : null,
        new Date()
      ]
    );
  } catch (error) {
    console.error('Error logging AI provider access:', error);
    // Non-blocking - continue execution even if logging fails
  }
}

/**
 * Log AI provider management actions (create, update, delete)
 * Records administrative actions on AI provider configurations
 * 
 * @param userId User ID performing the action
 * @param tenantId Tenant ID of the provider
 * @param teamId Team ID of the provider (optional)
 * @param action The administrative action ("create", "update", "delete")
 * @param providerId Provider ID being modified (optional for create)
 * @param details Additional details about the action (e.g., provider name, changed fields)
 */
export async function logAiProviderManagement(
  userId: number,
  tenantId: number,
  teamId: number | null,
  action: 'create' | 'update' | 'delete',
  providerId?: number,
  details?: Record<string, any>
): Promise<void> {
  try {
    await db.execute(
      `INSERT INTO ai_provider_audit (user_id, tenant_id, team_id, action, provider_id, success, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        tenantId,
        teamId,
        action,
        providerId || null,
        true, // Management actions are always "successful" if they reach this point
        details ? JSON.stringify(details) : null,
        new Date()
      ]
    );
  } catch (error) {
    console.error('Error logging AI provider management action:', error);
    // Non-blocking - continue execution even if logging fails
  }
}