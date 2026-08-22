import { expect, test } from '@playwright/test';
import {
  DEFAULT_STORED_STATE,
  cleanOpen,
  expectNoHorizontalOverflow,
  onlyMobile390,
  pausedBackRep,
  seedOpen,
} from './helpers';

test('Home exposes exact frequencies, equipment, safe viewport metadata, and one-tap Start', async ({ page }) => {
  await cleanOpen(page);

  await expect(page.getByText('Most days')).toHaveCount(2);
  await expect(page.getByText('4× per week')).toBeVisible();
  await expect(page.getByText('Equipment: mat and foam roller')).toBeVisible();
  await expect(page.getByText('Equipment: loop band and heavy loop band')).toBeVisible();
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Start Back' }).click();
  await expect(page.getByRole('heading', { name: 'Standing reach: knee bends' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'I’m ready' })).toBeVisible();
});

test('Resume is the sole session path and preserves written-group progress', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await seedOpen(page, { ...DEFAULT_STORED_STATE, activeSession: pausedBackRep() });

  await expect(
    page.getByRole('button', {
      name: 'Resume Back — Exercise 2 of 5, Bridge articulations, Set 2 of 2',
    }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Back' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start Left Toe' })).toHaveCount(0);

  await page.getByRole('button', { name: /Resume Back/ }).click();
  await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible();
  await expect(page.getByText('7 of 10')).toBeVisible();
});

test('Home settings route receives focus and returns to Home', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await cleanOpen(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings and safety' })).toBeFocused();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('heading', { name: 'Move Daily' })).toBeFocused();
});

test('the live local week rolls from Sunday into Monday without a reload', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await page.clock.install({ time: new Date(2026, 7, 23, 23, 59) });
  await seedOpen(page, {
    ...DEFAULT_STORED_STATE,
    history: [
      {
        id: 'back:2026-08-23:complete',
        routineId: 'back',
        localDate: '2026-08-23',
        outcome: 'complete',
      },
    ],
  });
  await page.clock.pauseAt(new Date(2026, 7, 23, 23, 59, 59, 900));
  await expect(page.getByText('Sunday, 23 August 2026')).toBeVisible();
  await expect(page.getByRole('listitem', { name: /Back, Sunday.*23 August: completed/ })).toBeVisible();

  await page.clock.runFor(101);

  await expect(page.getByText('Monday, 24 August 2026')).toBeVisible();
  await expect(page.getByRole('listitem', { name: /Back, Monday.*24 August: not completed/ })).toBeVisible();
});

test('editable preferences survive Settings remount and preserve education flags', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await seedOpen(page, {
    ...DEFAULT_STORED_STATE,
    preferences: {
      ...DEFAULT_STORED_STATE.preferences,
      installEducationDismissed: true,
      reminderEducationDismissed: true,
    },
  });
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: 'Use voice prompts' }).uncheck();
  await page.getByRole('radio', { name: 'Brisk visual rhythm' }).check();
  await page.getByRole('radio', { name: '15 seconds' }).check();
  await page.getByRole('checkbox', { name: 'Use reduced motion' }).check();

  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('checkbox', { name: 'Use voice prompts' })).not.toBeChecked();
  await expect(page.getByRole('radio', { name: 'Brisk visual rhythm' })).toBeChecked();
  await expect(page.getByRole('radio', { name: '15 seconds' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Use reduced motion' })).toBeChecked();
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), 'move-daily:app-state:v1');
  expect(stored.preferences).toMatchObject({
    installEducationDismissed: true,
    reminderEducationDismissed: true,
  });
});
