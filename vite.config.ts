import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: [
            '@babylonjs/core',
            '@babylonjs/loaders',
            '@babylonjs/materials',
          ],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
