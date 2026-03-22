/**
 * @sahayaa/widget
 *
 * Embeddable Sahayaa AI chat widget — drop-in customer support
 * powered by multi-agent AI.
 *
 * @example
 * // ESM / bundler usage
 * import { SahayaaWidget } from '@sahayaa/widget';
 * const widget = SahayaaWidget.init({ apiKey: 'sk_...', serverUrl: 'https://...' });
 * widget.open();
 *
 * @example
 * // CDN / script tag usage
 * // After loading sahayaa-widget.umd.js the global `SahayaaWidget` is available.
 * window.SahayaaWidget.init({ apiKey: 'sk_...', serverUrl: 'https://...' });
 */

import { SahayaaWidgetInstance } from './widget';
import type {
  SahayaaWidgetConfig,
  ChatMessage,
  AgentStep,
  ChatResponse,
  ChatRequest,
  WidgetEvent,
  WidgetInstance,
} from './types';

export type {
  SahayaaWidgetConfig,
  ChatMessage,
  AgentStep,
  ChatResponse,
  ChatRequest,
  WidgetEvent,
  WidgetInstance,
};

// ── Static factory / singleton guard ─────────────────────────────────────────

let _instance: SahayaaWidgetInstance | null = null;

export const SahayaaWidget = {
  /**
   * Initialise the widget and mount it to `document.body`.
   * Calling `init` a second time destroys the previous instance first.
   */
  init(config: SahayaaWidgetConfig): WidgetInstance {
    if (_instance) {
      _instance.destroy();
    }
    _instance = new SahayaaWidgetInstance(config);
    return _instance;
  },

  /**
   * Access the current widget instance (if any).
   * Useful when `init` was called elsewhere in the page.
   */
  getInstance(): WidgetInstance | null {
    return _instance;
  },

  /** Destroy and remove the current widget instance. */
  destroy(): void {
    _instance?.destroy();
    _instance = null;
  },
};

// ── Auto-init from window.sahayaaConfig ───────────────────────────────────────
// Allows pure CDN usage without writing any JS:
//   <script>window.sahayaaConfig = { apiKey: '...', serverUrl: '...' }</script>
//   <script src="sahayaa-widget.umd.js"></script>

if (typeof window !== 'undefined') {
  const autoConfig = (window as any).sahayaaConfig as
    | SahayaaWidgetConfig
    | undefined;

  if (autoConfig?.apiKey && autoConfig?.serverUrl) {
    // Defer until DOM is ready
    const run = (): void => { SahayaaWidget.init(autoConfig); };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  }
}
