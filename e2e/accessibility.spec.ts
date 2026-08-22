import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  DEFAULT_STORED_STATE,
  cleanOpen,
  expectMinimumTarget,
  expectNoHorizontalOverflow,
  finalBackRep,
  onlyMobile390,
  pausedBackRep,
  resumeAndStartNow,
  seedOpen,
  startBackReady,
} from './helpers';

async function expectNoSeriousViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical'),
  ).toEqual([]);
}

test('Home, ready Player, and active Player have no serious accessibility violations', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await cleanOpen(page);
  await expectNoSeriousViolations(page);
  await expectMinimumTarget(page.getByRole('button', { name: 'Settings' }));
  await expectMinimumTarget(page.getByRole('button', { name: 'Start Back' }));
  await page.keyboard.press('Tab');
  const focusStyle = await page.getByRole('button', { name: 'Settings' }).evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
  });
  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);
  await startBackReady(page);
  await expectNoSeriousViolations(page);
  await expectMinimumTarget(page.getByRole('button', { name: 'I’m ready' }));
  await expectMinimumTarget(page.getByRole('button', { name: 'Close session' }));
  await expect(page.getByRole('status')).toContainText('In standing, reach toward the floor.');
  await expect(page.getByRole('region', { name: 'Exercise progress' })).toContainText('Set 1 of 3');
  await expect(page.getByRole('region', { name: 'Exercise progress' })).toContainText('0 of 6');

  await page.getByRole('button', { name: 'I’m ready' }).click();
  await page.getByRole('button', { name: 'Start now' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('Settings, Skip confirmation, and Completion have no serious accessibility violations', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await cleanOpen(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expectNoSeriousViolations(page);
  await expectMinimumTarget(page.getByRole('button', { name: 'Done' }));

  await page.getByRole('button', { name: 'Done' }).click();
  await startBackReady(page);
  await page.getByRole('button', { name: 'I’m ready' }).click();
  await page.getByRole('button', { name: 'Start now' }).click();
  await page.getByRole('button', { name: 'Skip exercise' }).click();
  await expectNoSeriousViolations(page);
  await expect(page.getByRole('button', { name: 'Keep exercise' })).toBeFocused();
  await expect(page.locator('main [inert]')).toHaveCount(1);
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press('Tab');
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.activeElement?.closest('[role="dialog"]')?.getAttribute('aria-label'),
        ),
      )
      .toBe('Confirm skip');
  }

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Close session' }).click();
  await seedOpen(page, {
    ...DEFAULT_STORED_STATE,
    preferences: { ...DEFAULT_STORED_STATE.preferences, reducedMotion: true },
    activeSession: finalBackRep(),
  });
  await resumeAndStartNow(page, 'Back');
  await page.getByRole('button', { name: 'Mark rep' }).click();
  await expect(page.getByRole('heading', { name: 'Back complete' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Back complete' })).toBeFocused();
  await expectNoSeriousViolations(page);
  await expectMinimumTarget(page.getByRole('button', { name: 'Done' }));
  await expectMinimumTarget(page.getByRole('button', { name: 'Set a calendar reminder' }));
  await page.getByRole('button', { name: 'Set a calendar reminder' }).focus();
  await page.getByRole('button', { name: 'Set a calendar reminder' }).click();
  await expect(page.getByTestId('completion-surface')).toHaveAttribute('inert', '');
  await expect(page.getByRole('checkbox', { name: 'Monday' })).toBeFocused();
  await page.getByRole('button', { name: 'Cancel reminder' }).click();
  await expect(page.getByRole('button', { name: 'Set a calendar reminder' })).toBeFocused();
});

test('Pause, Reset, and Reminder are native-inert focus-contained dialogs', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await seedOpen(page, { ...DEFAULT_STORED_STATE, activeSession: pausedBackRep() });
  await page.getByRole('button', { name: /Resume Back/ }).click();
  await page.getByRole('button', { name: 'Start now' }).click();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.locator('main [inert]')).toHaveCount(1);
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: 'End session' }).click();

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Reset all progress' }).click();
  await expect(page.getByTestId('settings-surface')).toHaveAttribute('inert', '');
  await expect(page.getByRole('button', { name: 'Cancel reset' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Yes, reset progress' })).toBeFocused();
  await expectNoSeriousViolations(page);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Set Back reminder' }).click();
  await expect(page.getByTestId('settings-surface')).toHaveAttribute('inert', '');
  await expect(page.getByRole('checkbox', { name: 'Monday' })).toBeFocused();
  await page.getByRole('checkbox', { name: 'Monday' }).check();
  await page.getByLabel('Reminder time').fill('08:30');
  await page.getByRole('checkbox', { name: 'Monday' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Create calendar reminder' })).toBeFocused();
  await expectNoSeriousViolations(page);
});

test('calendar reminder downloads a real recurring ICS file', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await cleanOpen(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Set Back reminder' }).click();
  await page.getByRole('checkbox', { name: 'Monday' }).check();
  await page.getByRole('checkbox', { name: 'Thursday' }).check();
  await page.getByLabel('Reminder time').fill('08:30');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Create calendar reminder' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('move-daily-back-reminder.ics');
  const stream = await download.createReadStream();
  let calendar = '';
  for await (const chunk of stream) calendar += chunk.toString();
  expect(calendar).toContain('BEGIN:VCALENDAR\r\n');
  expect(calendar).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,TH');
  expect(calendar).not.toContain('VALARM');
});

test('all configured viewports and 200% text avoid horizontal overflow', async ({ page }) => {
  await cleanOpen(page);
  await expectNoHorizontalOverflow(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Reset all progress' }).click();
  await expect(page.getByRole('button', { name: 'Yes, reset progress' })).toBeInViewport();
  await expectNoHorizontalOverflow(page);
});

test('200% text enters Player at its top rail without a focus-induced scroll jump', async ({ page }, testInfo) => {
  onlyMobile390(testInfo);
  await cleanOpen(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.getByRole('button', { name: 'Start Back' }).click();

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole('button', { name: 'Help' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Close session' })).toBeInViewport();
  await expectNoHorizontalOverflow(page);
});

test('200% text keeps readiness and active controls reachable by user scrolling', async ({ page }) => {
  await cleanOpen(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await page.getByRole('button', { name: 'Start Back' }).click();

  const player = page.getByRole('main');
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('Expected a configured viewport');
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  for (let index = 0; index < 6; index += 1) await page.mouse.wheel(0, viewport.height);

  await expect.poll(() => player.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const ready = page.getByRole('button', { name: 'I’m ready' });
  await expect(ready).toBeInViewport();
  await expectMinimumTarget(ready);
  await ready.click();
  const startNow = page.getByRole('button', { name: 'Start now' });
  await expect(startNow).toBeInViewport();
  await startNow.click();

  for (let index = 0; index < 6; index += 1) await page.mouse.wheel(0, viewport.height);
  const pause = page.getByRole('button', { name: 'Pause' });
  await expect(pause).toBeInViewport();
  await expectMinimumTarget(pause);
  await pause.click();
  await expect(page.getByRole('dialog', { name: 'Session paused' })).toBeVisible();
  const resume = page.getByRole('button', { name: 'Resume' });
  await expectMinimumTarget(resume);
  await resume.click();
  await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible();
});
