import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Auto-update PWA. The service worker and precache manifest are
    // regenerated on every build with content-hashed URLs, so each
    // deploy yields a new SW. Installed clients detect the new SW,
    // fetch the new bundle silently, and activate it on the next
    // page load — no need to remove the icon and reinstall.
    VitePWA({
      // prompt mode: the new SW installs silently in the background and
      // waits for the React component (PWAUpdateToast) to call its
      // `updateServiceWorker()` — which it does when the user clicks
      // "Recharger" on the toast. No forced page swap mid-flow.
      registerType: 'prompt',
      injectRegister: false,
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api/, /^\/auth/],
        // Pull in our Web Push handler (push + notificationclick listeners).
        // Served from /public so it's addressable at the site root.
        importScripts: ['/push-handler.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      includeAssets: ['favicon.png', 'logo-180.png', 'logo-512.png'],
      manifest: {
        name: 'IMMO PRO-X — CRM Immobilier',
        short_name: 'IMMO PRO-X',
        description: 'CRM immobilier: pipeline, visites, réservations, ventes.',
        theme_color: '#0F1115',
        background_color: '#0F1115',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'fr',
        icons: [
          { src: '/logo-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          { src: '/screenshots/pipeline.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
          { src: '/screenshots/projects.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
          { src: '/screenshots/tasks.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
