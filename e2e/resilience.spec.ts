import { expect, test } from '@playwright/test';
import {
  APP_STORAGE_KEY,
  DEFAULT_STORED_STATE,
  activeToeHold,
  cleanOpen,
  onlyMobile390,
  pausedBackRep,
  readStoredState,
  seedOpen,
} from './helpers';

test('Home Resume preserves an exact 7250 ms hold through pagehide and refresh', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await seedOpen(page, {
    ...DEFAULT_STORED_STATE,
    preferences: { ...DEFAULT_STORED_STATE.preferences, balanceSeconds: 15 },
    activeSession: activeToeHold(7250),
  });

  await page.getByRole('button', { name: /Resume Left Toe/ }).click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect(page.getByRole('dialog', { name: 'Session paused' })).toBeVisible();
  let state = await readStoredState(page);
  expect(state?.activeSession).toMatchObject({
    status: 'paused',
    remainingMs: 7250,
    resumeStatus: 'active',
  });

  await page.reload();
  await expect(page.getByRole('button', { name: /Resume Left Toe/ })).toBeVisible();
  state = await readStoredState(page);
  expect(state?.activeSession).toMatchObject({ remainingMs: 7250 });
});

test('background stays Player while deliberate Close saves then returns Home', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await seedOpen(page, { ...DEFAULT_STORED_STATE, activeSession: pausedBackRep() });
  await page.getByRole('button', { name: /Resume Back/ }).click();
  await page.getByRole('button', { name: 'Start now' }).click();
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect(page.getByRole('dialog', { name: 'Session paused' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Move Daily' })).toHaveCount(0);

  await page.getByRole('button', { name: 'End session' }).click();
  await expect(page.getByRole('button', { name: /Resume Back/ })).toBeVisible();
});

test('rep progress survives pagehide, reload, and Home Resume exactly', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await seedOpen(page, { ...DEFAULT_STORED_STATE, activeSession: pausedBackRep() });
  await page.getByRole('button', { name: /Resume Back/ }).click();
  await page.getByRole('button', { name: 'Start now' }).click();
  await expect(page.getByText('7 of 10')).toBeVisible();

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await expect(page.getByRole('dialog', { name: 'Session paused' })).toBeVisible();
  let state = await readStoredState(page);
  expect(state?.activeSession).toMatchObject({ phaseIndex: 2, setIndex: 1, rep: 7 });

  await page.reload();
  await page.getByRole('button', { name: /Resume Back/ }).click();
  await expect(page.getByText('7 of 10')).toBeVisible();
  state = await readStoredState(page);
  expect(state?.activeSession).toMatchObject({ phaseIndex: 2, setIndex: 1, rep: 7 });
});

test('speech absence, denied Wake Lock, and unavailable storage keep guidance usable', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: () => Promise.reject(new DOMException('denied')) },
    });
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value: () => {
          throw new DOMException('blocked');
        },
      });
    }
  });
  await page.goto('./');
  await expect(page.getByText('This session will work, but progress cannot be saved on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Start Back' }).click();
  await expect(page.getByRole('heading', { name: 'Standing reach: knee bends' })).toBeVisible();
  await expect(page.getByText('Voice is unavailable. Captions and tones remain usable.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'I’m ready' })).toBeVisible();
});

test('reset is atomic for the app namespace and preserves unrelated origin storage', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await cleanOpen(page);
  await page.evaluate(() => localStorage.setItem('unrelated:keep', 'yes'));
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Reset all progress' }).click();
  await page.getByRole('button', { name: 'Yes, reset progress' }).click();

  await expect(page.getByRole('heading', { name: 'Move Daily' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), APP_STORAGE_KEY)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated:keep'))).toBe('yes');
});

test('a real beforeinstallprompt is buffered once and replaced only by a new event', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await cleanOpen(page);
  const emitPrompt = () =>
    page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.defineProperties(event, {
        prompt: { value: () => Promise.resolve() },
        userChoice: { value: Promise.resolve({ outcome: 'dismissed' }) },
      });
      window.dispatchEvent(event);
    });

  await emitPrompt();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Install Move Daily' }).click();
  await expect(page.getByText('Installation is not available in this browser.')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('button', { name: 'Install Move Daily' })).toHaveCount(0);

  await emitPrompt();
  await expect(page.getByRole('button', { name: 'Install Move Daily' })).toBeVisible();
});

test('offline reload works only after the first online service-worker readiness signal', async ({ page, browser }, testInfo) => {
  onlyMobile390(testInfo);
  test.setTimeout(35_000);

  const neverLoaded = await browser.newContext({ offline: true });
  const offlinePage = await neverLoaded.newPage();
  await expect(offlinePage.goto('http://127.0.0.1:4173/move-daily/', { waitUntil: 'domcontentloaded', timeout: 5_000 })).rejects.toThrow();
  await neverLoaded.close();

  await page.addInitScript((key) => localStorage.removeItem(key), APP_STORAGE_KEY);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Move Daily' })).toBeVisible();
  await expect(page.getByText('Ready offline — Move Daily can now open without a connection.')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('Available offline on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Ready offline — Move Daily can now open without a connection.')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('Available offline on this device.')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  await page.context().setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Move Daily' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('Available offline on this device.')).toBeVisible();
});
