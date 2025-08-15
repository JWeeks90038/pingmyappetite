import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Grubana Food Truck Locator',
        short_name: 'Grubana',
        start_url: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#2c6f57',
        icons: [
          {
            src: '/grubana-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/grubana-logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      components: path.resolve(__dirname, 'src/components'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['7dfe-75-83-103-76.ngrok-free.app'],
  },
});
