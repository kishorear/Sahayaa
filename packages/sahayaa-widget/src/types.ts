/** Configuration passed by the host page to initialise the widget. */
export interface SahayaaWidgetConfig {
  /** Tenant API key issued by your Sahayaa instance (required). */
  apiKey: string;

  /** Base URL of your Sahayaa server, e.g. "https://support.acme.com" (required). */
  serverUrl: string;

  /**
   * Widget button and header accent colour.
   * Accepts any valid CSS colour value.
   * @default "#6366F1"
   */
  primaryColor?: string;

  /**
   * Position of the widget launcher button.
   * @default "right"
   */
  position?: 'left' | 'right';

  /**
   * Initial greeting message shown inside the chat window.
   * @default "How can I help you today?"
   */
  greetingMessage?: string;

  /**
   * When true the chat window opens automatically after `autoOpenDelay` ms.
   * @default false
   */
  autoOpen?: boolean;

  /**
   * Milliseconds before auto-open fires (only relevant when autoOpen = true).
   * @default 3000
   */
  autoOpenDelay?: number;

  /**
   * Require visitors to authenticate before chatting.
   * @default false
   */
  requireAuth?: boolean;

  /**
   * Show "Powered by Sahayaa AI" branding inside the widget.
   * @default true
   */
  enableBranding?: boolean;

  /**
   * Emit analytics events to `window.sahayaaEvents`.
   * @default true
   */
  trackEvents?: boolean;

  // ── Agent workflow options ──────────────────────────────────────────────────

  /**
   * Route messages through the multi-agent pipeline instead of the simple
   * REST endpoint.
   * @default true
   */
  enableAgentWorkflow?: boolean;

  /**
   * Show the animated "behind-the-scenes" agent processing panel.
   * @default true
   */
  showBehindTheScenes?: boolean;

  /**
   * Display confidence scores on agent responses.
   * @default false
   */
  showConfidenceScores?: boolean;

  /**
   * Display per-step processing times in the agent panel.
   * @default false
   */
  showProcessingTimes?: boolean;

  /**
   * Maximum ms to wait for the agent pipeline before falling back to a
   * placeholder response.
   * @default 5000
   */
  maxProcessingTime?: number;

  /**
   * Responses with a confidence score below this threshold are flagged as
   * "low confidence" and trigger an escalation prompt.
   * @default 0.8
   */
  confidenceThreshold?: number;
}

/** A single message in the chat transcript. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  confidence?: number;
  agentSteps?: AgentStep[];
}

/** A single step produced by the multi-agent pipeline. */
export interface AgentStep {
  step: string;
  details: string;
  duration: number;
  status: 'pending' | 'running' | 'done' | 'error';
}

/** Payload sent to `POST /api/widget/chat`. */
export interface ChatRequest {
  message: string;
  sessionId: string;
  tenantId?: string;
}

/** Successful response from `POST /api/widget/chat`. */
export interface ChatResponse {
  response: string;
  ticketId?: string;
  sessionId: string;
  confidence?: number;
  agentSteps?: AgentStep[];
  processingTime?: number;
}

/** Events emitted to `window.sahayaaEvents` when `trackEvents = true`. */
export type WidgetEvent =
  | { type: 'widget:opened' }
  | { type: 'widget:closed' }
  | { type: 'message:sent'; payload: { message: string } }
  | { type: 'message:received'; payload: { response: string; ticketId?: string } }
  | { type: 'ticket:created'; payload: { ticketId: string } }
  | { type: 'error'; payload: { message: string } };

/** Public API returned by `SahayaaWidget.init()`. */
export interface WidgetInstance {
  /** Open the chat window. */
  open(): void;
  /** Close the chat window. */
  close(): void;
  /** Toggle the chat window. */
  toggle(): void;
  /** Completely remove the widget from the DOM. */
  destroy(): void;
  /** Subscribe to widget events. */
  on(type: WidgetEvent['type'], handler: (event: WidgetEvent) => void): void;
  /** Remove an event subscription. */
  off(type: WidgetEvent['type'], handler: (event: WidgetEvent) => void): void;
}
