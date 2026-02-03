/**
 * @file electron-vite configuration
 * @description Configuration for building main, preload, and renderer processes
 */

import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig({
  // Main process configuration
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      lib: {
        entry: resolve(__dirname, 'src/main/index.ts'),
      },
      rollupOptions: {
        external: ['electron', 'electron-store'],
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
  },

  // Preload scripts configuration
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: resolve(__dirname, 'src/preload/index.ts'),
      },
      rollupOptions: {
        external: ['electron'],
      },
    },
  },

  // Renderer process configuration
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@excel/core': resolve(__dirname, '../core/src'),
        '@excel/shared': resolve(__dirname, '../shared/src'),
      },
    },
    server: {
      // In development, proxy to the web app dev server
      proxy: {
        // This is configured to work with the web app running on port 3000
      },
    },
  },
});
