import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // Own port so browser cache / PWA from other localhost apps (e.g. playground) don't stick
  server: {
    port: 5280,
    strictPort: true,
  },
  preview: {
    port: 5280,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered manually in main.tsx via virtual:pwa-register
      injectRegister: false,
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'auth-shell.css',
        'fonts/*.woff2',
      ],
      manifest: {
        name: 'Tandem — Household Operating System',
        short_name: 'Tandem',
        description:
          'Private, local-first family financial portal with zero-knowledge encryption.',
        theme_color: '#0f766e',
        background_color: '#f4f7f6',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Hashed JS/CSS/fonts only — never precache index.html (stale shell flash).
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        // Disable default NavigationRoute so NetworkFirst below can own navigations.
        navigateFallback: undefined,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'tandem-html',
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
})
