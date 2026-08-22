import { expect, test } from '@playwright/test';
import {
  DEFAULT_STORED_STATE,
  activeToeHold,
  finalBackRep,
  onlyMobile390,
  pausedBackRep,
  readStoredState,
  resumeAndStartNow,
  seedOpen,
  startBackReady,
} from './helpers';

test('active Player keeps coach, instruction, progress, and dock in the initial viewport', async ({ page }) => {
  await seedOpen(page, { ...DEFAULT_STORED_STATE, activeSession: pausedBackRep() });
  await resumeAndStartNow(page, 'Back');

  for (const locator of [
    page.getByRole('img'),
    page.getByRole('heading', { name: 'Bridge articulations' }),
    page.getByRole('region', { name: 'Exercise progress' }),
    page.getByRole('navigation', { name: 'Session controls' }),
  ]) {
    await expect(locator).toBeInViewport();
  }
  const dockBox = await page.getByRole('navigation', { name: 'Session controls' }).boundingBox();
  const viewport = page.viewportSize();
  expect(dockBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect((dockBox?.y ?? 0) + (dockBox?.height ?? 0)).toBeLessThanOrEqual(viewport?.height ?? 0);
});

test('landscape Balance scales the whole coach instead of clipping its SVG', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'landscape-844', 'Landscape-specific coach scaling oracle.');
  await seedOpen(page, {
    ...DEFAULT_STORED_STATE,
    preferences: { ...DEFAULT_STORED_STATE.preferences, balanceSeconds: 15 },
    activeSession: activeToeHold(15_000),
  });
  await resumeAndStartNow(page, 'Left Toe');

  const frame = page.getByRole('img');
  const frameBox = await frame.boundingBox();
  expect(frameBox).not.toBeNull();
  expect((frameBox?.width ?? 0) / (frameBox?.height ?? 1)).toBeCloseTo(320 / 280, 1);
  expect((frameBox?.y ?? 0) + (frameBox?.height ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.height ?? 0,
  );
  await expect(page.getByRole('navigation', { name: 'Session controls' })).toBeInViewport();
});

test('landscape readiness keeps its complete control dock in one viewport', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'landscape-844', 'Landscape-specific readiness composition oracle.');
  await page.goto('./');
  await page.evaluate((key) => localStorage.removeItem(key), 'move-daily:app-state:v1');
  await page.reload();
  await startBackReady(page);

  const dimensions = await page.getByRole('main').evaluate((main) => ({
    clientHeight: main.clientHeight,
    scrollHeight: main.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight);
  await expect(page.getByRole('navigation', { name: 'Session controls' })).toBeInViewport();
});

test('readiness, countdown, one paced rep, Pause, Resume, Replay, and Skip stay synchronized', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  test.setTimeout(25_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await startBackReady(page);

  await page.getByRole('button', { name: 'I’m ready' }).click();
  await expect(page.getByRole('region', { name: 'Preparation controls' })).toBeVisible();
  await expect(page.getByLabel('Preparation countdown')).toHaveText(/5|4/);
  await page.getByRole('button', { name: 'Start now' }).click();
  await expect(page.getByText('0 of 6')).toBeVisible();
  await expect(page.getByText('1 of 6')).toBeVisible({ timeout: 5_500 });

  await page.getByRole('button', { name: 'Pause' }).click();
  const paused = page.getByRole('dialog', { name: 'Session paused' });
  await expect(paused).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume' })).toBeFocused();
  await expect(page.locator('main [inert]')).toHaveCount(1);
  for (let index = 0; index < 7; index += 1) {
    await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('[role="dialog"]')?.getAttribute('aria-label'))).toBe('Session paused');
  }

  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible();
  await page.getByRole('button', { name: 'Start now' }).click();
  await page.getByRole('button', { name: 'Replay demo' }).click();
  await expect(page.getByRole('status')).toContainText('Replay demo');

  await page.getByRole('button', { name: 'Skip exercise' }).click();
  const confirm = page.getByRole('dialog', { name: 'Confirm skip' });
  await expect(confirm).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep exercise' })).toBeFocused();
  await expect(page.getByText('1 of 6')).toBeVisible();
  await page.waitForTimeout(400);
  await expect(page.getByText('1 of 6')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible();
});

test('the final reduced-motion rep produces one honest persisted completion', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await seedOpen(page, {
    ...DEFAULT_STORED_STATE,
    preferences: { ...DEFAULT_STORED_STATE.preferences, reducedMotion: true },
    activeSession: finalBackRep(),
  });
  await resumeAndStartNow(page, 'Back');
  await page.getByRole('button', { name: 'Mark rep' }).click();

  await expect(page.getByRole('heading', { name: 'Back complete' })).toBeVisible();
  await expect(page.getByText('5 completed')).toBeVisible();
  const state = await readStoredState(page);
  expect(state?.activeSession).toBeNull();
  expect(state?.history).toHaveLength(1);
  expect((state?.history as Record<string, unknown>[])[0]?.outcome).toBe('complete');
});
