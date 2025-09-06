import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@functions': path.resolve(__dirname, '../shared/functions'),
      '@config': path.resolve(__dirname, '../shared/config'),
      '@utils': path.resolve(__dirname, '../shared/utils'),
      components: path.resolve(__dirname, 'src/components'),
    }
  },
  plugins: [
    react()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: ['7dfe-75-83-103-76.ngrok-free.app'],
  },
});
