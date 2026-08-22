import type { ManifestOptions } from 'vite-plugin-pwa';

export const PWA_MANIFEST = {
  name: 'Move Daily',
  short_name: 'Move Daily',
  description: 'A calm guided player for your existing exercise plan.',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#f4f0e7',
  theme_color: '#f4f0e7',
  icons: [
    { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    {
      src: 'icons/maskable-icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
} satisfies Partial<ManifestOptions>;
