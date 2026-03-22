import type {
  SahayaaWidgetConfig,
  ChatMessage,
  AgentStep,
  ChatRequest,
  ChatResponse,
  WidgetEvent,
  WidgetInstance,
} from './types';

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULTS: Required<SahayaaWidgetConfig> = {
  apiKey: '',
  serverUrl: '',
  primaryColor: '#6366F1',
  position: 'right',
  greetingMessage: 'How can I help you today?',
  autoOpen: false,
  autoOpenDelay: 3000,
  requireAuth: false,
  enableBranding: true,
  trackEvents: true,
  enableAgentWorkflow: true,
  showBehindTheScenes: true,
  showConfidenceScores: false,
  showProcessingTimes: false,
  maxProcessingTime: 5000,
  confidenceThreshold: 0.8,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function sessionId(): string {
  const key = '__sahayaa_session__';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = uid() + uid();
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ── SahayaaWidgetInstance ─────────────────────────────────────────────────────

export class SahayaaWidgetInstance implements WidgetInstance {
  private cfg: Required<SahayaaWidgetConfig>;
  private session: string;
  private messages: ChatMessage[] = [];
  private listeners: Map<string, Set<(e: WidgetEvent) => void>> = new Map();

  // DOM roots
  private container!: HTMLElement;
  private launcher!: HTMLButtonElement;
  private panel!: HTMLElement;
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLInputElement;

  private isOpen = false;

  constructor(config: SahayaaWidgetConfig) {
    if (!config.apiKey) throw new Error('[SahayaaWidget] apiKey is required');
    if (!config.serverUrl) throw new Error('[SahayaaWidget] serverUrl is required');

    this.cfg = { ...DEFAULTS, ...config };
    this.session = sessionId();

    this.injectStyles();
    this.buildDOM();
    this.addGreeting();

    if (this.cfg.autoOpen) {
      setTimeout(() => this.open(), this.cfg.autoOpenDelay);
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  open(): void {
    this.isOpen = true;
    this.panel.classList.add('sw-open');
    this.launcher.setAttribute('aria-expanded', 'true');
    this.emit({ type: 'widget:opened' });
  }

  close(): void {
    this.isOpen = false;
    this.panel.classList.remove('sw-open');
    this.launcher.setAttribute('aria-expanded', 'false');
    this.emit({ type: 'widget:closed' });
  }

  toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  destroy(): void {
    this.container.remove();
    this.listeners.clear();
  }

  on(type: WidgetEvent['type'], handler: (e: WidgetEvent) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(handler);
  }

  off(type: WidgetEvent['type'], handler: (e: WidgetEvent) => void): void {
    this.listeners.get(type)?.delete(handler);
  }

  // ── DOM ─────────────────────────────────────────────────────────────────────

  private buildDOM(): void {
    const { primaryColor, position, enableBranding } = this.cfg;

    // Root container
    this.container = document.createElement('div');
    this.container.className = `sw-root sw-${position}`;
    this.container.style.setProperty('--sw-primary', primaryColor);

    // ── Panel ──────────────────────────────────────────────────────────────
    this.panel = document.createElement('div');
    this.panel.className = 'sw-panel';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-label', 'Sahayaa AI chat');

    // Header
    const header = document.createElement('div');
    header.className = 'sw-header';
    header.innerHTML = `
      <div class="sw-header-info">
        <span class="sw-avatar">🤖</span>
        <div>
          <p class="sw-header-title">Sahayaa AI</p>
          <p class="sw-header-sub">Typically replies in seconds</p>
        </div>
      </div>
      <button class="sw-close-btn" aria-label="Close chat">✕</button>
    `;
    header.querySelector('.sw-close-btn')!.addEventListener('click', () => this.close());

    // Messages area
    this.messagesEl = document.createElement('div');
    this.messagesEl.className = 'sw-messages';
    this.messagesEl.setAttribute('role', 'log');
    this.messagesEl.setAttribute('aria-live', 'polite');

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'sw-input-area';

    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.className = 'sw-input';
    this.inputEl.placeholder = 'Type your message…';
    this.inputEl.setAttribute('aria-label', 'Chat message');
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSend();
      }
    });

    const sendBtn = document.createElement('button');
    sendBtn.className = 'sw-send-btn';
    sendBtn.setAttribute('aria-label', 'Send message');
    sendBtn.innerHTML = '➤';
    sendBtn.addEventListener('click', () => this.handleSend());

    inputArea.append(this.inputEl, sendBtn);

    // Branding
    const branding = enableBranding
      ? (() => {
          const b = document.createElement('p');
          b.className = 'sw-branding';
          b.innerHTML = 'Powered by <strong>Sahayaa AI</strong>';
          return b;
        })()
      : null;

    this.panel.append(header, this.messagesEl, inputArea);
    if (branding) this.panel.append(branding);

    // ── Launcher ───────────────────────────────────────────────────────────
    this.launcher = document.createElement('button');
    this.launcher.className = 'sw-launcher';
    this.launcher.setAttribute('aria-label', 'Open chat');
    this.launcher.setAttribute('aria-expanded', 'false');
    this.launcher.setAttribute('aria-controls', 'sw-panel');
    this.launcher.innerHTML = '<span class="sw-launcher-icon">💬</span>';
    this.launcher.addEventListener('click', () => this.toggle());

    this.container.append(this.panel, this.launcher);
    document.body.appendChild(this.container);
  }

  private injectStyles(): void {
    if (document.getElementById('sw-styles')) return;
    const style = document.createElement('style');
    style.id = 'sw-styles';
    style.textContent = SW_CSS;
    document.head.appendChild(style);
  }

  // ── Messaging ───────────────────────────────────────────────────────────────

  private addGreeting(): void {
    this.appendMessage({
      id: uid(),
      role: 'assistant',
      content: this.cfg.greetingMessage,
      timestamp: new Date(),
    });
  }

  private async handleSend(): Promise<void> {
    const text = this.inputEl.value.trim();
    if (!text) return;

    this.inputEl.value = '';
    this.inputEl.disabled = true;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);
    this.appendMessage(userMsg);
    this.emit({ type: 'message:sent', payload: { message: text } });

    // Show typing indicator
    const typingId = uid();
    this.appendTyping(typingId);

    try {
      const reply = await this.fetchResponse(text);

      this.removeTyping(typingId);

      const assistantMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: reply.response,
        timestamp: new Date(),
        confidence: reply.confidence,
        agentSteps: reply.agentSteps,
      };
      this.messages.push(assistantMsg);
      this.appendMessage(assistantMsg);

      this.emit({
        type: 'message:received',
        payload: { response: reply.response, ticketId: reply.ticketId },
      });

      if (reply.ticketId) {
        this.emit({ type: 'ticket:created', payload: { ticketId: reply.ticketId } });
      }
    } catch (err) {
      this.removeTyping(typingId);
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      this.appendMessage({
        id: uid(),
        role: 'system',
        content: `⚠️ ${msg} Please try again.`,
        timestamp: new Date(),
      });
      this.emit({ type: 'error', payload: { message: msg } });
    } finally {
      this.inputEl.disabled = false;
      this.inputEl.focus();
    }
  }

  private async fetchResponse(message: string): Promise<ChatResponse> {
    const endpoint = this.cfg.enableAgentWorkflow
      ? `${this.cfg.serverUrl}/api/widget/agent-chat`
      : `${this.cfg.serverUrl}/api/widget/chat`;

    const body: ChatRequest = { message, sessionId: this.session };

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.cfg.maxProcessingTime,
    );

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.cfg.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => res.statusText);
        throw new Error(`Server error ${res.status}: ${detail}`);
      }

      return (await res.json()) as ChatResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  private appendMessage(msg: ChatMessage): void {
    const bubble = document.createElement('div');
    bubble.className = `sw-bubble sw-bubble--${msg.role}`;
    bubble.dataset.id = msg.id;

    const text = document.createElement('p');
    text.className = 'sw-bubble-text';
    text.textContent = msg.content;
    bubble.appendChild(text);

    // Confidence badge
    if (
      msg.role === 'assistant' &&
      msg.confidence !== undefined &&
      this.cfg.showConfidenceScores
    ) {
      const badge = document.createElement('span');
      badge.className = 'sw-confidence';
      badge.textContent = `${Math.round(msg.confidence * 100)}% confident`;
      bubble.appendChild(badge);
    }

    // Agent steps panel
    if (
      msg.role === 'assistant' &&
      msg.agentSteps?.length &&
      this.cfg.showBehindTheScenes
    ) {
      bubble.appendChild(this.buildAgentPanel(msg.agentSteps));
    }

    this.messagesEl.appendChild(bubble);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private buildAgentPanel(steps: AgentStep[]): HTMLElement {
    const panel = document.createElement('details');
    panel.className = 'sw-agent-panel';

    const summary = document.createElement('summary');
    summary.textContent = '🔍 Behind the scenes';
    panel.appendChild(summary);

    const list = document.createElement('ul');
    list.className = 'sw-agent-steps';

    steps.forEach((s) => {
      const li = document.createElement('li');
      li.className = 'sw-agent-step';
      li.innerHTML = `
        <span class="sw-step-name">${s.step}</span>
        <span class="sw-step-detail">${s.details}</span>
        ${this.cfg.showProcessingTimes ? `<span class="sw-step-time">${s.duration}ms</span>` : ''}
      `;
      list.appendChild(li);
    });

    panel.appendChild(list);
    return panel;
  }

  private appendTyping(id: string): void {
    const el = document.createElement('div');
    el.className = 'sw-bubble sw-bubble--assistant sw-typing';
    el.dataset.typingId = id;
    el.innerHTML = '<span></span><span></span><span></span>';
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private removeTyping(id: string): void {
    this.messagesEl
      .querySelector(`[data-typing-id="${id}"]`)
      ?.remove();
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  private emit(event: WidgetEvent): void {
    this.listeners.get(event.type)?.forEach((h) => h(event));

    if (this.cfg.trackEvents) {
      const q = ((window as any).sahayaaEvents ??= []) as WidgetEvent[];
      q.push(event);
    }
  }
}

// ── Inline CSS ────────────────────────────────────────────────────────────────

const SW_CSS = `
.sw-root {
  --sw-primary: #6366F1;
  --sw-radius: 12px;
  --sw-shadow: 0 8px 32px rgba(0,0,0,.18);
  position: fixed;
  bottom: 24px;
  z-index: 999999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
}
.sw-right { right: 24px; }
.sw-left  { left: 24px; }

/* Panel */
.sw-panel {
  position: absolute;
  bottom: 72px;
  width: 360px;
  max-height: 560px;
  background: #fff;
  border-radius: var(--sw-radius);
  box-shadow: var(--sw-shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transform: translateY(12px) scale(.97);
  pointer-events: none;
  transition: opacity .2s ease, transform .2s ease;
}
.sw-right .sw-panel { right: 0; }
.sw-left  .sw-panel { left: 0; }
.sw-panel.sw-open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Header */
.sw-header {
  background: var(--sw-primary);
  color: #fff;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sw-header-info { display: flex; align-items: center; gap: 10px; }
.sw-avatar { font-size: 22px; }
.sw-header-title { margin: 0; font-weight: 600; font-size: 15px; }
.sw-header-sub { margin: 0; font-size: 11px; opacity: .8; }
.sw-close-btn {
  background: none; border: none; color: #fff;
  font-size: 16px; cursor: pointer; padding: 4px; line-height: 1;
  border-radius: 4px; opacity: .8;
}
.sw-close-btn:hover { opacity: 1; background: rgba(255,255,255,.15); }

/* Messages */
.sw-messages {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
  background: #f8f9fb;
}
.sw-bubble {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 16px;
  line-height: 1.5;
  word-break: break-word;
}
.sw-bubble--user {
  align-self: flex-end;
  background: var(--sw-primary);
  color: #fff;
  border-bottom-right-radius: 4px;
}
.sw-bubble--assistant {
  align-self: flex-start;
  background: #fff;
  color: #1a1a2e;
  box-shadow: 0 1px 4px rgba(0,0,0,.08);
  border-bottom-left-radius: 4px;
}
.sw-bubble--system {
  align-self: center;
  background: #fff3cd;
  color: #856404;
  font-size: 12px;
  text-align: center;
  border-radius: 8px;
}
.sw-bubble-text { margin: 0; }

/* Confidence badge */
.sw-confidence {
  display: block; font-size: 10px;
  opacity: .6; margin-top: 4px;
}

/* Typing indicator */
.sw-typing {
  display: flex; align-items: center; gap: 4px;
  padding: 12px 16px;
}
.sw-typing span {
  width: 6px; height: 6px; background: #999;
  border-radius: 50%; display: inline-block;
  animation: sw-bounce .9s infinite;
}
.sw-typing span:nth-child(2) { animation-delay: .15s; }
.sw-typing span:nth-child(3) { animation-delay: .3s; }
@keyframes sw-bounce {
  0%,80%,100% { transform: translateY(0); }
  40%         { transform: translateY(-6px); }
}

/* Agent panel */
.sw-agent-panel {
  margin-top: 8px; font-size: 11px;
  border-top: 1px solid #eee; padding-top: 6px;
}
.sw-agent-panel summary {
  cursor: pointer; color: var(--sw-primary);
  font-weight: 600; list-style: none;
}
.sw-agent-panel summary::-webkit-details-marker { display: none; }
.sw-agent-steps { margin: 6px 0 0; padding: 0; list-style: none; }
.sw-agent-step {
  padding: 4px 0; border-bottom: 1px solid #f0f0f0;
  display: flex; flex-direction: column; gap: 1px;
}
.sw-step-name { font-weight: 600; color: #444; }
.sw-step-detail { color: #777; }
.sw-step-time { color: #aaa; }

/* Input area */
.sw-input-area {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-top: 1px solid #eee; background: #fff;
}
.sw-input {
  flex: 1; border: 1px solid #ddd; border-radius: 8px;
  padding: 8px 12px; font-size: 14px; outline: none;
  transition: border-color .2s;
}
.sw-input:focus { border-color: var(--sw-primary); }
.sw-input:disabled { background: #f5f5f5; }
.sw-send-btn {
  background: var(--sw-primary); color: #fff; border: none;
  border-radius: 8px; padding: 8px 12px; cursor: pointer;
  font-size: 14px; transition: opacity .2s;
}
.sw-send-btn:hover { opacity: .85; }

/* Branding */
.sw-branding {
  text-align: center; font-size: 10px; color: #bbb;
  margin: 0; padding: 4px 0 6px;
  background: #fff; border-top: 1px solid #f0f0f0;
}

/* Launcher button */
.sw-launcher {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--sw-primary); color: #fff; border: none;
  box-shadow: 0 4px 16px rgba(0,0,0,.2); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: transform .2s, box-shadow .2s;
}
.sw-launcher:hover {
  transform: scale(1.08);
  box-shadow: 0 6px 22px rgba(0,0,0,.28);
}
.sw-launcher-icon { font-size: 24px; line-height: 1; }

@media (max-width: 420px) {
  .sw-panel { width: calc(100vw - 16px); bottom: 68px; }
  .sw-root  { bottom: 16px; }
  .sw-right { right: 8px; }
  .sw-left  { left: 8px; }
}
`;

export { SahayaaWidgetConfig, ChatMessage, AgentStep, WidgetInstance };
