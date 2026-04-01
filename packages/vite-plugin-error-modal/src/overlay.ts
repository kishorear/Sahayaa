/**
 * Client-side overlay script.
 * This string is injected as an inline <script> into the dev HTML page.
 * It is NOT imported as a module — it runs in browser global scope.
 */
export const OVERLAY_SCRIPT = /* js */ `
(function () {
  'use strict';

  // Only run in dev (Vite sets import.meta.env.DEV but this runs before modules)
  // Disable via sessionStorage.setItem('__sw_overlay_off__', '1')
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('__sw_overlay_off__')) return;

  // ── Styles ────────────────────────────────────────────────────────────────

  var STYLE = [
    '#__sw-error-overlay__ {',
    '  position: fixed; inset: 0; z-index: 2147483647;',
    '  background: rgba(0,0,0,.85); display: flex;',
    '  align-items: center; justify-content: center;',
    '  font-family: ui-monospace, "Cascadia Code", Menlo, monospace;',
    '  padding: 24px; box-sizing: border-box;',
    '}',
    '#__sw-error-overlay__ .sw-err-box {',
    '  background: #1e1e2e; color: #cdd6f4; border-radius: 12px;',
    '  max-width: 800px; width: 100%; max-height: 85vh;',
    '  overflow-y: auto; box-shadow: 0 24px 64px rgba(0,0,0,.6);',
    '  border: 1px solid #313244;',
    '}',
    '#__sw-error-overlay__ .sw-err-header {',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  padding: 16px 20px; border-bottom: 1px solid #313244;',
    '  background: #181825; border-radius: 12px 12px 0 0;',
    '}',
    '#__sw-error-overlay__ .sw-err-title {',
    '  color: #f38ba8; font-size: 14px; font-weight: 700;',
    '  display: flex; align-items: center; gap: 8px; margin: 0;',
    '}',
    '#__sw-error-overlay__ .sw-err-close {',
    '  background: none; border: 1px solid #45475a; color: #cdd6f4;',
    '  border-radius: 6px; padding: 4px 10px; cursor: pointer;',
    '  font-size: 12px; font-family: inherit;',
    '}',
    '#__sw-error-overlay__ .sw-err-close:hover { background: #313244; }',
    '#__sw-error-overlay__ .sw-err-body { padding: 20px; }',
    '#__sw-error-overlay__ .sw-err-message {',
    '  color: #f38ba8; font-size: 15px; font-weight: 600;',
    '  margin: 0 0 16px; white-space: pre-wrap; word-break: break-word;',
    '}',
    '#__sw-error-overlay__ .sw-err-meta {',
    '  color: #a6e3a1; font-size: 12px; margin: 0 0 16px;',
    '}',
    '#__sw-error-overlay__ .sw-err-stack {',
    '  background: #181825; border: 1px solid #313244; border-radius: 8px;',
    '  padding: 14px; font-size: 12px; line-height: 1.6;',
    '  white-space: pre-wrap; word-break: break-all; color: #bac2de;',
    '  margin: 0;',
    '}',
    '#__sw-error-overlay__ .sw-err-stack .sw-frame-app { color: #89dceb; }',
    '#__sw-error-overlay__ .sw-err-stack .sw-frame-vendor { color: #6c7086; }',
    '#__sw-error-overlay__ .sw-err-footer {',
    '  padding: 12px 20px; border-top: 1px solid #313244;',
    '  font-size: 11px; color: #585b70; text-align: right;',
    '}',
  ].join('\\n');

  // ── DOM helpers ────────────────────────────────────────────────────────────

  function injectCSS() {
    if (document.getElementById('__sw-error-style__')) return;
    var el = document.createElement('style');
    el.id = '__sw-error-style__';
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function formatStack(stack) {
    if (!stack) return '(no stack trace available)';
    return stack.split('\\n').map(function (line) {
      var cls = line.includes('node_modules') ? 'sw-frame-vendor' : 'sw-frame-app';
      return '<span class="' + cls + '">' + escHtml(line) + '</span>';
    }).join('\\n');
  }

  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Overlay ────────────────────────────────────────────────────────────────

  function showOverlay(title, message, meta, stack) {
    injectCSS();

    var existing = document.getElementById('__sw-error-overlay__');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = '__sw-error-overlay__';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Runtime error');

    overlay.innerHTML = [
      '<div class="sw-err-box">',
      '  <div class="sw-err-header">',
      '    <p class="sw-err-title">&#9888;&#65039; ' + escHtml(title) + '</p>',
      '    <button class="sw-err-close" onclick="document.getElementById(\'__sw-error-overlay__\').remove()">',
      '      Dismiss &nbsp;[Esc]',
      '    </button>',
      '  </div>',
      '  <div class="sw-err-body">',
      '    <p class="sw-err-message">' + escHtml(message) + '</p>',
      meta ? '    <p class="sw-err-meta">&#128204; ' + escHtml(meta) + '</p>' : '',
      '    <pre class="sw-err-stack"><code>' + formatStack(stack) + '</code></pre>',
      '  </div>',
      '  <div class="sw-err-footer">Sahayaa AI &bull; Dev error overlay &bull; Press Esc to dismiss</div>',
      '</div>',
    ].join('');

    document.body.appendChild(overlay);

    // Dismiss on Escape
    function onKey(e) {
      if (e.key === 'Escape') {
        overlay.remove();
        window.removeEventListener('keydown', onKey);
      }
    }
    window.addEventListener('keydown', onKey);

    // Dismiss on backdrop click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
  }

  // ── Error listeners ────────────────────────────────────────────────────────

  window.addEventListener('error', function (event) {
    var err = event.error || {};
    var meta = event.filename
      ? event.filename + ':' + event.lineno + ':' + event.colno
      : null;
    showOverlay(
      'Uncaught Runtime Error',
      err.message || event.message || String(event),
      meta,
      err.stack || null,
    );
  });

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason || {};
    showOverlay(
      'Unhandled Promise Rejection',
      reason.message || String(event.reason),
      null,
      reason.stack || null,
    );
  });

})();
`;
