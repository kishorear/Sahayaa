import type { Plugin } from 'vite';
import { OVERLAY_SCRIPT } from './overlay.js';

const PLUGIN_NAME = 'sahayaa:error-modal';

/**
 * Vite plugin that injects a styled runtime error overlay in development.
 *
 * Features:
 * - Catches uncaught errors AND unhandled promise rejections
 * - Shows file/line/column, error message, and colour-coded stack trace
 * - Dismiss with Esc, backdrop click, or the Dismiss button
 * - Zero dependencies — pure browser JS injected at build time
 * - Never runs in production (skipped when mode !== 'development')
 *
 * @example
 * // vite.config.ts
 * import errorModal from '@sahayaa/vite-plugin-error-modal';
 * export default defineConfig({ plugins: [errorModal()] });
 */
export default function sahayaaErrorModal(): Plugin {
  let isDev = true;

  return {
    name: PLUGIN_NAME,
    enforce: 'pre',

    configResolved(config) {
      isDev = config.command === 'serve';
    },

    transformIndexHtml: {
      order: 'pre',
      handler() {
        if (!isDev) return [];
        return [
          {
            tag: 'script',
            attrs: { 'data-sahayaa-error-modal': '' },
            children: OVERLAY_SCRIPT,
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}
