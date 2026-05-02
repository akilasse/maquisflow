import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          // Cache API produits
          {
            urlPattern: /^https?.*\/api\/stock\/produits/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-produits',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 },
            }
          },
          // Cache API dashboard
          {
            urlPattern: /^https?.*\/api\/dashboard/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-dashboard',
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 5 },
            }
          },
          // Cache API ventes
          {
            urlPattern: /^https?.*\/api\/ventes/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-ventes',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            }
          },
          // Cache API stock
          {
            urlPattern: /^https?.*\/api\/stock/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-stock',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 },
            }
          },
          // Toutes les autres requêtes API
          {
            urlPattern: /^https?.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-general',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            }
          }
        ]
      },
      manifest: {
        name: 'Flowix',
        short_name: 'Flowix',
        description: 'Gestion commerciale intelligente',
        theme_color: '#FF6B35',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})