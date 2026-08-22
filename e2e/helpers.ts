import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

export const APP_STORAGE_KEY = 'move-daily:app-state:v1';

export interface StoredState {
  readonly version: 1;
  readonly preferences: {
    readonly voiceEnabled: boolean;
    readonly coachPace: 'slow' | 'standard' | 'brisk';
    readonly balanceSeconds: 10 | 15;
    readonly reducedMotion: boolean;
    readonly installEducationDismissed: boolean;
    readonly reminderEducationDismissed: boolean;
  };
  readonly activeSession: Record<string, unknown> | null;
  readonly history: readonly Record<string, unknown>[];
}

export const DEFAULT_STORED_STATE: StoredState = {
  version: 1,
  preferences: {
    voiceEnabled: true,
    coachPace: 'standard',
    balanceSeconds: 10,
    reducedMotion: false,
    installEducationDismissed: false,
    reminderEducationDismissed: false,
  },
  activeSession: null,
  history: [],
};

const BASE_SESSION = {
  version: 1,
  routineId: 'back',
  status: 'awaiting-ready',
  phaseIndex: 0,
  setIndex: 0,
  rep: 0,
  rightCount: 0,
  leftCount: 0,
  remainingMs: null,
  preferences: { coachPace: 'standard', balanceSeconds: 10 },
  skippedPhaseIds: [],
  completedPhaseIds: [],
  resumeStatus: null,
  resumeRemainingMs: null,
  pauseReason: null,
} as const;

export function pausedBackRep(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...BASE_SESSION,
    status: 'paused',
    phaseIndex: 2,
    setIndex: 1,
    rep: 7,
    completedPhaseIds: ['standing-knee-bends', 'standing-full-down-up'],
    resumeStatus: 'active',
    pauseReason: 'background',
    ...overrides,
  };
}

export function activeToeHold(remainingMs = 7250): Record<string, unknown> {
  return {
    ...BASE_SESSION,
    routineId: 'left-toe',
    status: 'active',
    phaseIndex: 3,
    remainingMs,
    preferences: { coachPace: 'standard', balanceSeconds: 15 },
    completedPhaseIds: ['big-toe-lifts', 'banded-toe-pointing', 'band-arch-lifts'],
  };
}

export function finalBackRep(): Record<string, unknown> {
  return pausedBackRep({
    phaseIndex: 6,
    setIndex: 1,
    rep: 9,
    completedPhaseIds: [
      'standing-knee-bends',
      'standing-full-down-up',
      'bridge-articulations',
      'cobra-forearms',
      'cobra-hands',
      'supermans',
    ],
  });
}

export async function cleanOpen(page: Page): Promise<void> {
  await page.goto('./');
  await page.evaluate((key) => localStorage.removeItem(key), APP_STORAGE_KEY);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Move Daily' })).toBeVisible();
}

export async function seedOpen(page: Page, state: StoredState): Promise<void> {
  await page.goto('./');
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: APP_STORAGE_KEY, value: JSON.stringify(state) },
  );
  await page.reload();
}

export async function readStoredState(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw) as Record<string, unknown>;
  }, APP_STORAGE_KEY);
}

export async function startBackReady(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start Back' }).click();
  await expect(page.getByRole('heading', { name: 'Standing reach: knee bends' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'I’m ready' })).toBeVisible();
}

export async function resumeAndStartNow(page: Page, routineName: 'Back' | 'Left Toe'): Promise<void> {
  await page.getByRole('button', { name: new RegExp(`Resume ${routineName}`) }).click();
  await expect(page.getByRole('button', { name: 'Start now' })).toBeVisible();
  await page.getByRole('button', { name: 'Start now' }).click();
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      })),
    )
    .toMatchObject({ scrollWidth: await page.evaluate(() => window.innerWidth) });
}

export async function expectMinimumTarget(locator: Locator, minimum = 44): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, 'target must have a rendered box').not.toBeNull();
  const subpixelTolerance = 0.001;
  expect(box?.width, 'target width').toBeGreaterThanOrEqual(minimum - subpixelTolerance);
  expect(box?.height, 'target height').toBeGreaterThanOrEqual(minimum - subpixelTolerance);
}

export function onlyMobile390(testInfo: TestInfo): void {
  test.skip(testInfo.project.name !== 'mobile-390', 'Focused production flow runs once at 390 x 844.');
}
