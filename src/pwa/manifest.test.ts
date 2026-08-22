import { describe, expect, it } from 'vitest';
import { PWA_MANIFEST } from './manifest';

describe('PWA manifest', () => {
  it('uses repository-relative launch paths and the approved product identity', () => {
    expect(PWA_MANIFEST).toMatchObject({
      name: 'Move Daily',
      short_name: 'Move Daily',
      description: 'A calm guided player for your existing exercise plan.',
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: '#f4f0e7',
      theme_color: '#f4f0e7',
    });
  });

  it('declares install and maskable icons without remote assets', () => {
    expect(PWA_MANIFEST.icons).toEqual([
      { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      {
        src: 'icons/maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ]);
    expect(PWA_MANIFEST.icons.every((icon) => !/^https?:/.test(icon.src))).toBe(true);
  });
});
