import { db } from '../db';
import { aiProviderAudit } from '../../shared/schema';

// Interface for AI provider access log entry
export interface AiProviderAccessLogEntry {
  userId: number;
  tenantId: number;
  teamId?: number | null;
  action: string;
  success: boolean;
  details: string | Record<string, any>;
}

/**
 * Log AI provider access attempts to the audit log
 * This function logs when users attempt to access or use AI providers
 * 
 * @param entry The audit log entry details
 */
export async function logAiProviderAccess(entry: AiProviderAccessLogEntry): Promise<void> {
  try {
    await db.insert(aiProviderAudit).values({
      userId: entry.userId,
      tenantId: entry.tenantId,
      teamId: entry.teamId,
      action: entry.action,
      timestamp: new Date(),
      success: entry.success,
      details: typeof entry.details === 'string'
        ? JSON.stringify({ message: entry.details })
        : JSON.stringify(entry.details)
    });
  } catch (error) {
    console.error('Error logging AI provider access:', error);
    // Don't throw - this is a non-critical operation
  }
}

// Interface for AI provider management log entry
export interface AiProviderManagementLogEntry {
  userId: number;
  tenantId: number;
  providerId?: number;
  action: 'create' | 'update' | 'delete' | 'enable' | 'disable';
  providerDetails: any;
}

/**
 * Log AI provider management operations to the audit log
 * This function logs when providers are created, updated, deleted, etc.
 * 
 * @param entry The audit log entry details
 */
export async function logAiProviderManagement(entry: AiProviderManagementLogEntry): Promise<void> {
  try {
    await db.insert(aiProviderAudit).values({
      userId: entry.userId,
      tenantId: entry.tenantId,
      providerId: entry.providerId,
      action: entry.action,
      timestamp: new Date(),
      success: true, // Management actions are only logged when successful
      details: JSON.stringify(entry.providerDetails)
    });
  } catch (error) {
    console.error('Error logging AI provider management:', error);
    // Don't throw - this is a non-critical operation
  }
}