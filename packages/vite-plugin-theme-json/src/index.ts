import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { generateThemeCSS, type ThemeJson } from './generate.js';

const THEME_FILE = 'theme.json';
const PLUGIN_NAME = 'sahayaa:theme-json';

/**
 * Vite plugin that reads `theme.json` from the project root and injects
 * the corresponding shadcn/ui CSS custom properties into every HTML page.
 *
 * Hot-reloads automatically when `theme.json` changes during development.
 */
export default function sahayaaThemeJson(): Plugin {
  let root = process.cwd();
  let themeFilePath = '';

  function readTheme(): ThemeJson | null {
    try {
      const raw = fs.readFileSync(themeFilePath, 'utf8');
      return JSON.parse(raw) as ThemeJson;
    } catch {
      return null;
    }
  }

  function buildStyleTag(): string {
    const theme = readTheme();
    if (!theme) {
      console.warn(`[${PLUGIN_NAME}] ${THEME_FILE} not found or invalid — skipping theme injection`);
      return '';
    }
    try {
      return generateThemeCSS(theme);
    } catch (err) {
      console.error(`[${PLUGIN_NAME}] Failed to generate theme CSS:`, err);
      return '';
    }
  }

  return {
    name: PLUGIN_NAME,

    configResolved(config) {
      root = config.root ?? process.cwd();
      // theme.json lives at the workspace root, one level above vite's root
      themeFilePath = path.resolve(root, '..', THEME_FILE);
      // fallback: also check vite root itself
      if (!fs.existsSync(themeFilePath)) {
        themeFilePath = path.resolve(root, THEME_FILE);
      }
    },

    // Inject the <style> tag into every HTML page
    transformIndexHtml: {
      order: 'pre',
      handler(_html) {
        const styleTag = buildStyleTag();
        if (!styleTag) return [];
        return [
          {
            tag: 'style',
            attrs: { 'data-sahayaa-theme': '' },
            children: styleTag
              .replace(/^<style[^>]*>/, '')
              .replace(/<\/style>$/, ''),
            injectTo: 'head-prepend',
          },
        ];
      },
    },

    // Watch theme.json and trigger a full reload when it changes
    configureServer(server) {
      server.watcher.add(themeFilePath);
      server.watcher.on('change', (file) => {
        if (path.resolve(file) === path.resolve(themeFilePath)) {
          console.log(`[${PLUGIN_NAME}] theme.json changed — reloading`);
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
  };
}

export type { ThemeJson };
