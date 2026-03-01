import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/modric-juggle-app/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['football-icon.svg', 'assets/icon-192.png', 'assets/icon-512.png'],

      manifest: {
        id: '/modric-juggle-app/',
        name: 'Modrić Juggling Challenge',
        short_name: 'Modrić Juggle',
        description: 'AI-verified football juggling game sponsored by Luka Modrić. Test your skills!',
        start_url: '/modric-juggle-app/',
        scope: '/modric-juggle-app/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#030510',
        theme_color: '#D4AF37',
        categories: ['games', 'sports'],
        icons: [
          {
            src: '/assets/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/assets/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/assets/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/assets/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Practice Mode',
            short_name: 'Practice',
            url: '/?mode=practice',
            icons: [{ src: '/assets/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Ranked Mode',
            short_name: 'Ranked',
            url: '/?mode=ranked',
            icons: [{ src: '/assets/icon-192.png', sizes: '192x192' }],
          },
        ],
      },

      workbox: {
        // Precache built JS/CSS/HTML
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],

        // Don't precache video files (too large)
        globIgnores: ['**/*.mp4'],

        // SPA fallback
        navigateFallback: '/modric-juggle-app/index.html',
        navigateFallbackDenylist: [/^\/api/],

        // Runtime caching strategies
        runtimeCaching: [
          {
            // Images — cache first (fast loads)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            // Videos — network first with cache fallback (large files)
            urlPattern: /\.(?:mp4|webm)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'video-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Google Fonts stylesheets
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            // Google Fonts files
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
            },
          },
          {
            // Firebase API calls — network first
            urlPattern: /^https:\/\/.*\.googleapis\.com|firebaseio\.com|firebase\.google\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
})
