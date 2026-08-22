import { defineConfig, type Preset } from '@vite-pwa/assets-generator/config';

const paperBackground = { fit: 'contain' as const, background: '#f4f0e7' };

const preset: Preset = {
  transparent: {
    sizes: [192, 512],
    padding: 0,
    resizeOptions: paperBackground,
  },
  maskable: {
    sizes: [512],
    padding: 0,
    resizeOptions: paperBackground,
  },
  apple: {
    sizes: [180],
    padding: 0,
    resizeOptions: paperBackground,
  },
  png: {
    compressionLevel: 9,
    adaptiveFiltering: false,
    palette: false,
  },
};

export default defineConfig({
  images: ['public/icons/move-daily.svg'],
  manifestIconsEntry: false,
  overrideAssets: true,
  preset,
});
