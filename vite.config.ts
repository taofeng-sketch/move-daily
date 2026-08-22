import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { configDefaults, defineConfig } from 'vitest/config';
import { PWA_MANIFEST } from './src/pwa/manifest.ts';

export default defineConfig({
  base: '/move-daily/',
  plugins: [
    react(),
    VitePWA({
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: ['robots.txt'],
      manifest: PWA_MANIFEST,
      pwaAssets: {
        config: true,
        includeHtmlHeadLinks: true,
        integration: { baseUrl: '/move-daily/icons/' },
        overrideManifestIcons: false,
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,png,svg,woff2,txt,webmanifest}'],
        navigateFallback: 'index.html',
        runtimeCaching: [],
        skipWaiting: false,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: [...configDefaults.exclude, 'e2e/**', 'scripts/**/*.test.mjs'],
  },
});
