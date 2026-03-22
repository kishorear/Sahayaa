# @sahayaa/widget

Embeddable AI chat widget for the Sahayaa platform.
Drop it onto any website with a single `<script>` tag or import it as an npm module.

---

## Installation

```bash
npm install @sahayaa/widget
```

Or via CDN (no build step required):

```html
<script src="https://cdn.sahayaa.ai/widget/sahayaa-widget.umd.js"></script>
```

---

## Quick start

### npm / bundler

```ts
import { SahayaaWidget } from '@sahayaa/widget';

const widget = SahayaaWidget.init({
  apiKey: 'sk_your_tenant_api_key',
  serverUrl: 'https://your-sahayaa-instance.com',
});
```

### CDN — pure HTML, no JavaScript required

```html
<script>
  window.sahayaaConfig = {
    apiKey: 'sk_your_tenant_api_key',
    serverUrl: 'https://your-sahayaa-instance.com',
  };
</script>
<script src="sahayaa-widget.umd.js"></script>
```

When `window.sahayaaConfig` is present the widget auto-initialises on
`DOMContentLoaded` with no extra code.

---

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `apiKey` | `string` | *required* | Tenant API key from the Sahayaa admin panel |
| `serverUrl` | `string` | *required* | Base URL of your Sahayaa instance |
| `primaryColor` | `string` | `"#6366F1"` | Accent colour (any valid CSS colour) |
| `position` | `"left" \| "right"` | `"right"` | Side of the screen to dock the launcher |
| `greetingMessage` | `string` | `"How can I help you today?"` | First assistant message |
| `autoOpen` | `boolean` | `false` | Auto-open the chat panel on page load |
| `autoOpenDelay` | `number` | `3000` | Milliseconds before auto-open fires |
| `requireAuth` | `boolean` | `false` | Require visitor authentication |
| `enableBranding` | `boolean` | `true` | Show "Powered by Sahayaa AI" footer |
| `trackEvents` | `boolean` | `true` | Push events to `window.sahayaaEvents` |
| `enableAgentWorkflow` | `boolean` | `true` | Route via multi-agent pipeline |
| `showBehindTheScenes` | `boolean` | `true` | Show collapsible agent steps panel |
| `showConfidenceScores` | `boolean` | `false` | Show confidence % on responses |
| `showProcessingTimes` | `boolean` | `false` | Show per-step duration in agent panel |
| `maxProcessingTime` | `number` | `5000` | Request timeout in milliseconds |
| `confidenceThreshold` | `number` | `0.8` | Below this score a low-confidence flag fires |

---

## Programmatic API

```ts
const widget = SahayaaWidget.init({ apiKey: '…', serverUrl: '…' });

widget.open();    // open chat panel
widget.close();   // close chat panel
widget.toggle();  // toggle open / closed
widget.destroy(); // remove widget from DOM
```

### Events

```ts
widget.on('message:received', (event) => {
  console.log(event.payload.response);
  if (event.payload.ticketId) {
    console.log('Ticket created:', event.payload.ticketId);
  }
});

widget.on('error', (event) => {
  console.error(event.payload.message);
});
```

Available event types: `widget:opened`, `widget:closed`, `message:sent`,
`message:received`, `ticket:created`, `error`.

---

## Building from source

```bash
cd packages/sahayaa-widget
npm install
npm run build        # outputs to dist/
npm run build:watch  # rebuild on file changes
npm run typecheck    # run tsc without emitting
```

### Output files

| File | Format | Use |
|---|---|---|
| `dist/index.esm.js` | ESM | Bundlers (Vite, Webpack, Rollup) |
| `dist/index.cjs.js` | CJS | Node.js / older bundlers |
| `dist/sahayaa-widget.umd.js` | UMD (minified) | `<script>` tags / CDN |
| `dist/index.d.ts` | TypeScript | Type-checking |

---

## Server endpoints

The widget posts to your Sahayaa server:

| Endpoint | Used when |
|---|---|
| `POST /api/widget/chat` | `enableAgentWorkflow: false` |
| `POST /api/widget/agent-chat` | `enableAgentWorkflow: true` (default) |

Both endpoints accept `{ message, sessionId }` and require the
`X-API-Key` header to be set to the tenant API key.

---

## License

MIT © Sahayaa AI
