# SupportAI Chat Widget Browser Extension

This browser extension allows you to easily integrate the SupportAI Chat Widget into any website for testing and demonstration purposes.

## Features

- **Easy Configuration**: Set up your Tenant ID, API Key, and widget appearance.
- **One-Click Injection**: Add the chat widget to any website with a single click.
- **Customization Options**: Choose widget position and primary color.
- **Permanent Installation Helper**: Includes code snippets for permanent installation.

## Installation

1. Download and unzip the extension package.
2. Open your browser's extension management page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Firefox: `about:addons`
3. Enable "Developer mode" (toggle in the top-right corner for Chrome/Edge).
4. Click "Load unpacked" (Chrome/Edge) or "Load Temporary Add-on" (Firefox).
5. Select the folder containing the unpacked extension.

## Usage

1. Click on the SupportAI icon in your browser toolbar.
2. Enter your Tenant ID and API Key from your SupportAI dashboard.
3. Select your preferred widget position and color.
4. Click "Save & Apply" to save your configuration.
5. Visit any website where you want to test the widget.
6. Click "Inject Widget" to add the chat widget to the current page.

## Permanent Installation

For a permanent installation on your website, add the following script tag to your HTML:

```html
<script src="https://supportai.com/widget.js?tenant=YOUR_TENANT_ID"></script>
```

Replace `YOUR_TENANT_ID` with your actual Tenant ID from your SupportAI dashboard.

## Advanced Configuration

For advanced configuration, you can add this script before the widget script:

```html
<script>
  window.supportAiConfig = {
    tenantId: "YOUR_TENANT_ID",
    apiKey: "YOUR_API_KEY",
    primaryColor: "#6366F1",
    position: "right",
    autoOpen: false,
    branding: true
  };
</script>
```

## Support

For support, visit [https://supportai.com/help](https://supportai.com/help) or contact our support team at support@supportai.com.

## License

© 2025 SupportAI, Inc. All rights reserved.
