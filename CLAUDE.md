# vite-icon-zen

Vite plugin that generates all icon assets from a single source image.

## Structure

- `src/index.ts` - Main plugin, exports `iconZen()`
- Uses `sharp` as peer dependency for image processing

## Key Behavior

- Dev: serves icons on-the-fly via middleware (no disk writes)
- Build: generates all assets into `outDir` via `writeBundle` hook
- Injects `<link>` and `<meta>` tags via `transformIndexHtml`

## Generated Assets

- `favicon.ico` (32x32 ICO)
- `apple-touch-icon.png` (180x180)
- `icons/icon-{size}x{size}.png` for sizes: 16, 32, 48, 64, 96, 128, 192, 256, 384, 512
- `icons/apple-touch-icon-{size}x{size}.png` for sizes: 120, 152, 167, 180
- `site.webmanifest`
- `opengraph-image.png` (1200x630, if `opengraph` option set)

## Build

```bash
bun run build
```
