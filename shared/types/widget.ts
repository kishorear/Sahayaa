/**
 * Widget interaction data to record analytics
 */
export interface WidgetInteraction {
  tenantId: number;
  sessionId: string;
  messageType: 'user' | 'assistant';
  message: string;
  timestamp: Date;
  url?: string | null;
  metadata?: Record<string, any>;
}