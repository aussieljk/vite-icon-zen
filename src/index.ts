import fs from 'fs'
import path from 'path'
import type { HtmlTagDescriptor, Plugin, ResolvedConfig } from 'vite'

/* eslint-disable @typescript-eslint/no-explicit-any */
type SharpFn = any

const SIZES = [16, 32, 48, 64, 96, 128, 192, 256, 384, 512]
const APPLE_SIZES = [120, 152, 167, 180]

export interface IconZenOptions {
  /** Path to source icon relative to project root. Default: "icon.png" */
  source?: string
  /** Path to opengraph image relative to project root */
  opengraph?: string
  /** Production URL for absolute OG meta tags */
  url?: string
  /** App name for manifest. Default: directory name */
  name?: string
  /** Background color for manifest. Default: "#000000" */
  backgroundColor?: string
  /** Theme color for manifest and meta tag. Default: "#000000" */
  themeColor?: string
}

async function importSharp(): Promise<SharpFn> {
  try {
    const mod = await import('sharp')
    return mod.default
  } catch {
    throw new Error('[vite-icon-zen] sharp is required as a peer dependency. Install it with: bun add sharp')
  }
}

export function iconZen(options: IconZenOptions = {}): Plugin {
  const source = options.source ?? 'icon.png'
  const ogSource = options.opengraph
  const siteUrl = options.url?.replace(/\/$/, '') ?? ''
  const bgColor = options.backgroundColor ?? '#000000'
  const themeColor = options.themeColor ?? '#000000'

  let config: ResolvedConfig
  let sourcePath: string
  let ogSourcePath: string | undefined
  let appName: string

  function getOutDir() {
    return config.build.outDir
  }

  async function generateIcoBuffer(sharp: SharpFn, imgPath: string) {
    const png = await sharp(imgPath).resize(32, 32).png().toBuffer()
    return pngToIco(png)
  }

  function pngToIco(png: Buffer): Buffer {
    const iconDir = Buffer.alloc(6)
    iconDir.writeUInt16LE(0, 0)
    iconDir.writeUInt16LE(1, 2)
    iconDir.writeUInt16LE(1, 4)

    const entry = Buffer.alloc(16)
    entry.writeUInt8(32, 0)
    entry.writeUInt8(32, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(6 + 16, 12)

    return Buffer.concat([iconDir, entry, png])
  }

  async function generateAssets(outDir: string) {
    if (!fs.existsSync(sourcePath)) {
      console.warn(`[vite-icon-zen] Source icon not found: ${sourcePath}`)
      return
    }

    const sharp = await importSharp()
    const iconsDir = path.join(outDir, 'icons')
    fs.mkdirSync(iconsDir, { recursive: true })

    const tasks: Promise<void>[] = []

    for (const size of SIZES) {
      tasks.push(
        sharp(sourcePath)
          .resize(size, size)
          .png()
          .toBuffer()
          .then((buf: Buffer) => fs.promises.writeFile(path.join(iconsDir, `icon-${size}x${size}.png`), buf))
      )
    }

    for (const size of APPLE_SIZES) {
      tasks.push(
        sharp(sourcePath)
          .resize(size, size)
          .png()
          .toBuffer()
          .then((buf: Buffer) => fs.promises.writeFile(path.join(iconsDir, `apple-touch-icon-${size}x${size}.png`), buf))
      )
    }

    tasks.push(
      sharp(sourcePath)
        .resize(180, 180)
        .png()
        .toBuffer()
        .then((buf: Buffer) => fs.promises.writeFile(path.join(outDir, 'apple-touch-icon.png'), buf))
    )

    tasks.push(
      generateIcoBuffer(sharp, sourcePath).then((buf) =>
        fs.promises.writeFile(path.join(outDir, 'favicon.ico'), buf)
      )
    )

    const manifest = {
      name: appName,
      short_name: appName,
      icons: SIZES.map((size) => ({
        src: `/icons/icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
      })),
      display: 'standalone',
      background_color: bgColor,
      theme_color: themeColor,
    }

    tasks.push(
      fs.promises.writeFile(
        path.join(outDir, 'site.webmanifest'),
        JSON.stringify(manifest, null, 2)
      )
    )

    if (ogSourcePath && fs.existsSync(ogSourcePath)) {
      tasks.push(
        sharp(ogSourcePath)
          .resize(1200, 630, { fit: 'cover' })
          .png()
          .toBuffer()
          .then((buf: Buffer) => fs.promises.writeFile(path.join(outDir, 'opengraph-image.png'), buf))
      )
    }

    await Promise.all(tasks)
    console.log('[vite-icon-zen] Generated all icon assets')
  }

  return {
    name: 'vite-icon-zen',

    configResolved(resolved) {
      config = resolved
      sourcePath = path.resolve(config.root, source)
      ogSourcePath = ogSource ? path.resolve(config.root, ogSource) : undefined
      appName = options.name ?? path.basename(config.root)
    },

    transformIndexHtml() {
      if (!fs.existsSync(sourcePath)) return []

      const tags: HtmlTagDescriptor[] = [
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '32x32' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'icon', href: '/icons/icon-192x192.png', type: 'image/png', sizes: '192x192' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'manifest', href: '/site.webmanifest' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'theme-color', content: themeColor }, injectTo: 'head' },
      ]

      if (ogSourcePath && fs.existsSync(ogSourcePath)) {
        tags.push(
          { tag: 'meta', attrs: { property: 'og:image', content: `${siteUrl}/opengraph-image.png` }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image:height', content: '630' }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:image:type', content: 'image/png' }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
          { tag: 'meta', attrs: { name: 'twitter:image', content: `${siteUrl}/opengraph-image.png` }, injectTo: 'head' }
        )
      }

      return tags
    },

    async writeBundle() {
      await generateAssets(getOutDir())
    },

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next()

        const url = req.url.split('?')[0]

        try {
          const sharp = await importSharp()

          if (url === '/favicon.ico') {
            if (!fs.existsSync(sourcePath)) return next()
            const buf = await generateIcoBuffer(sharp, sourcePath)
            res.setHeader('Content-Type', 'image/x-icon')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.end(buf)
            return
          }

          if (url === '/apple-touch-icon.png') {
            if (!fs.existsSync(sourcePath)) return next()
            const buf = await sharp(sourcePath).resize(180, 180).png().toBuffer()
            res.setHeader('Content-Type', 'image/png')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.end(buf)
            return
          }

          if (url === '/site.webmanifest') {
            const manifest = {
              name: appName,
              short_name: appName,
              icons: SIZES.map((size) => ({
                src: `/icons/icon-${size}x${size}.png`,
                sizes: `${size}x${size}`,
                type: 'image/png',
              })),
              display: 'standalone',
              background_color: bgColor,
              theme_color: themeColor,
            }
            res.setHeader('Content-Type', 'application/manifest+json')
            res.end(JSON.stringify(manifest, null, 2))
            return
          }

          if (url === '/opengraph-image.png') {
            if (!ogSourcePath || !fs.existsSync(ogSourcePath)) return next()
            const buf = await sharp(ogSourcePath).resize(1200, 630, { fit: 'cover' }).png().toBuffer()
            res.setHeader('Content-Type', 'image/png')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.end(buf)
            return
          }

          const iconMatch = url.match(/^\/icons\/icon-(\d+)x(\d+)\.png$/)
          if (iconMatch) {
            if (!fs.existsSync(sourcePath)) return next()
            const size = parseInt(iconMatch[1])
            const buf = await sharp(sourcePath).resize(size, size).png().toBuffer()
            res.setHeader('Content-Type', 'image/png')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.end(buf)
            return
          }

          const appleMatch = url.match(/^\/icons\/apple-touch-icon-(\d+)x(\d+)\.png$/)
          if (appleMatch) {
            if (!fs.existsSync(sourcePath)) return next()
            const size = parseInt(appleMatch[1])
            const buf = await sharp(sourcePath).resize(size, size).png().toBuffer()
            res.setHeader('Content-Type', 'image/png')
            res.setHeader('Cache-Control', 'public, max-age=3600')
            res.end(buf)
            return
          }
        } catch {
          // sharp not available, skip
        }

        next()
      })
    },
  }
}

export default iconZen
