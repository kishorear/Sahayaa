import { db } from '../db';
import { aiProviderAudit } from '../../shared/schema';

/**
 * Interface for AI provider access log entries
 */
export interface AiProviderAccessLogEntry {
  userId: number;
  tenantId: number;
  teamId?: number | null;
  action: 'list' | 'view' | 'use' | 'check' | 'provider_by_id' | 'getDefault';
  success: boolean;
  details: string;
}

/**
 * Interface for AI provider management log entries
 */
export interface AiProviderManagementLogEntry {
  userId: number;
  tenantId: number;
  action: 'create' | 'update' | 'delete';
  providerId: number;
  details: Record<string, any>;
}

/**
 * Logs an AI provider access event
 */
export async function logAiProviderAccess(logEntry: AiProviderAccessLogEntry): Promise<void> {
  try {
    await db.insert(aiProviderAudit).values({
      userId: logEntry.userId,
      tenantId: logEntry.tenantId,
      teamId: logEntry.teamId || null,
      action: `ai_provider_${logEntry.action}`,
      providerId: null,
      success: logEntry.success,
      details: { 
        details: logEntry.details 
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging AI provider access:', error);
  }
}

/**
 * Logs an AI provider management event
 */
export async function logAiProviderManagement(logEntry: AiProviderManagementLogEntry): Promise<void> {
  try {
    await db.insert(aiProviderAudit).values({
      userId: logEntry.userId,
      tenantId: logEntry.tenantId,
      teamId: null,
      action: `ai_provider_${logEntry.action}`,
      providerId: logEntry.providerId,
      success: true,
      details: logEntry.details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging AI provider management:', error);
  }
}