# vite-icon-zen

Generate favicons, apple-touch-icons, web manifest, and opengraph images from a single source icon.

Drop in an `icon.png` and get all the icons you need for a modern web app, plus the correct HTML meta tags injected automatically.

## Install

```bash
bun add -D vite-icon-zen sharp
```

> **Note:** [`sharp`](https://sharp.pixelplumbing.com/) (>= 0.32.0) is a required peer dependency — the plugin uses it for all image processing and will throw at startup if it isn't installed. You must install it yourself alongside `vite-icon-zen`.

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { iconZen } from 'vite-icon-zen';

export default defineConfig({
  plugins: [
    iconZen(),
  ],
});
```

Add an `icon.png` (512x512 or larger recommended) to your project root. That's it.

## What Gets Generated

| Asset | Description |
|-------|-------------|
| `/favicon.ico` | 32x32 ICO file |
| `/apple-touch-icon.png` | 180x180 PNG |
| `/icons/icon-{size}x{size}.png` | PNGs at 16, 32, 48, 64, 96, 128, 192, 256, 384, 512 |
| `/icons/apple-touch-icon-{size}x{size}.png` | PNGs at 120, 152, 167, 180 |
| `/site.webmanifest` | Web app manifest with all icon references |
| `/opengraph-image.png` | 1200x630 OG image (if `opengraph` option set) |

## HTML Injection

The plugin automatically injects the correct `<link>` and `<meta>` tags into your HTML:

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icons/icon-192x192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#000000">
```

## Options

```ts
iconZen({
  // Path to source icon relative to project root (default: "icon.png")
  source: 'icon.png',

  // Path to opengraph image source (optional)
  opengraph: 'og-source.png',

  // Production URL for absolute OG meta tags
  url: 'https://myapp.com',

  // App name for manifest (default: directory name)
  name: 'My App',

  // Background color for manifest (default: "#000000")
  backgroundColor: '#ffffff',

  // Theme color for manifest and meta tag (default: "#000000")
  themeColor: '#3b82f6',
});
```

## Development

During development, icons are generated on-the-fly when requested. No files are written to disk until you build.

## License

MIT
