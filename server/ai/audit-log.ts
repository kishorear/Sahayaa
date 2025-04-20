import { db } from '../db';
import { aiProviderAudit } from '../../shared/schema';

/**
 * Log AI provider access attempts and management operations
 * This is important for security auditing and debugging
 * 
 * @param userId User ID of the person performing the action
 * @param tenantId Tenant ID context
 * @param teamId Team ID context (optional)
 * @param action Type of action (access, create, update, delete, etc.)
 * @param success Whether the action was successful
 * @param details Additional details about the action
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
    await db.insert(aiProviderAudit).values({
      userId,
      tenantId,
      teamId,
      action,
      success,
      details: details || {}
    });
    
    // Use console.debug so we don't fill logs in production but can enable for troubleshooting
    console.debug(`AI provider audit log: ${action} by user ${userId} (tenant: ${tenantId}, team: ${teamId}) - ${success ? 'Success' : 'Failed'}`);
  } catch (error) {
    // If audit logging fails, we don't want to break the application
    // But we do want to log the error for investigation
    console.error('Failed to log AI provider access/action:', error);
  }
}

/**
 * Log AI provider management actions (create, update, delete)
 * This is more specific than the general access log and includes provider ID
 * 
 * @param userId User ID of the person performing the action
 * @param tenantId Tenant ID context
 * @param teamId Team ID context (optional)
 * @param action Type of action (create, update, delete)
 * @param providerId ID of the AI provider being managed
 * @param details Additional details about the action
 */
export async function logAiProviderManagement(
  userId: number,
  tenantId: number,
  teamId: number | null,
  action: string,
  providerId: number,
  details?: Record<string, any>
): Promise<void> {
  try {
    await db.insert(aiProviderAudit).values({
      userId,
      tenantId,
      teamId,
      action: `provider_${action}`,
      providerId,
      success: true, // Assume success since this is called after successful operation
      details: details || {}
    });
    
    console.debug(`AI provider management: ${action} provider ${providerId} by user ${userId} (tenant: ${tenantId}, team: ${teamId})`);
  } catch (error) {
    console.error('Failed to log AI provider management action:', error);
  }
}