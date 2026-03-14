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
})
