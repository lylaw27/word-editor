import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

// Check if we're building for web only
const isWebBuild = process.env.VITE_BUILD_TARGET === 'web';

export default defineConfig({
  plugins: [
    react(),
    // Only include Electron plugins when not building for web
    ...(!isWebBuild
      ? [
          electron([
            {
              entry: 'electron/main.ts',
              onstart(options) {
                options.startup();
              },
              vite: {
                build: {
                  outDir: 'dist-electron',
                  rollupOptions: {
                    external: ['electron', 'mammoth', 'html-to-docx', 'pdf-parse', 'openai', 'convex'],
                  },
                },
              },
            },
            {
              entry: 'electron/preload.ts',
              onstart(options) {
                options.reload();
              },
              vite: {
                build: {
                  outDir: 'dist-electron',
                  rollupOptions: {
                    external: ['electron'],
                  },
                },
              },
            },
          ]),
          renderer(),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: isWebBuild ? 'dist-web' : 'dist',
    emptyOutDir: true,
  },
  define: {
    'process.env.VITE_PLATFORM': JSON.stringify(isWebBuild ? 'web' : 'electron'),
  },
  server: {
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
