import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Move off the old URLs that Chrome may still have cached as immutable.
  cacheDir: 'node_modules/.vite-hogwarts',
  server: {
    // Revalidate optimized dependencies after Vite regenerates shader chunks.
    headers: { 'Cache-Control': 'no-cache' },
  },
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
