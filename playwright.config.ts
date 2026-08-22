import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 15_000,
  expect: { timeout: 6_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:4173/move-daily/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/move-daily/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'mobile-320', use: { viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-360', use: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'landscape-844', use: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
