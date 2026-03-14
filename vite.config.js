import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest: {
        name:        'D.A Command',
        short_name:  'D.A CMD',
        description: 'D.A fleet command and control',
        start_url:   '/',
        display:     'standalone',
      },
    }),
  ],
  server: { port: 3001 }
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name:             'D.A — Drive Assistant',
        short_name:       'D.A',
        description:      'Peer-to-peer vehicular mesh intelligence network',
        theme_color:      '#00d4ff',
        background_color: '#0a0e1a',
        display:          'standalone',
        orientation:      'portrait-primary',
        start_url:        '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: { cacheName: 'da-fonts', expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest/,
            handler: 'NetworkFirst',
            options: { cacheName: 'da-api', expiration: { maxAgeSeconds: 60 * 5 } },
          },
        ],
      },
    }),
  ],
  server: { port: 3001 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
