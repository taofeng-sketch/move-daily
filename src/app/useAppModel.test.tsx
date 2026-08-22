import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_STATE, type PersistedAppState } from '../persistence/appState';
import { APP_STORAGE_KEY } from '../persistence/storage';
import { createSession, sessionReducer } from '../session/reducer';
import type { SessionState } from '../session/session';
import { useAppModel } from './useAppModel';

interface MemoryStorageOptions {
  readonly initial?: PersistedAppState | string | null;
  readonly failGet?: boolean;
  readonly failSet?: boolean;
  readonly failRemove?: boolean;
}

function memoryStorage(options: MemoryStorageOptions = {}) {
  let value =
    typeof options.initial === 'string' || options.initial === null
      ? options.initial
      : options.initial === undefined
        ? null
        : JSON.stringify(options.initial);
  const writes: string[] = [];
  const removed: string[] = [];

  return {
    getItem(key: string) {
      if (options.failGet) throw new DOMException('blocked');
      return key === APP_STORAGE_KEY ? value : null;
    },
    setItem(key: string, next: string) {
      if (options.failSet) throw new DOMException('blocked');
      if (key === APP_STORAGE_KEY) value = next;
      writes.push(key);
    },
    removeItem(key: string) {
      if (options.failRemove) throw new DOMException('blocked');
      if (key === APP_STORAGE_KEY) value = null;
      removed.push(key);
    },
    value: () => value,
    writes,
    removed,
  };
}

function completeBack(session: SessionState): SessionState {
  return {
    ...session,
    status: 'complete',
    phaseIndex: 6,
    completedPhaseIds: [
      'standing-knee-bends',
      'standing-full-down-up',
      'bridge-articulations',
      'cobra-forearms',
      'cobra-hands',
      'supermans',
      'foam-roller-extensions',
    ],
    remainingMs: null,
    resumeStatus: null,
    resumeRemainingMs: null,
    pauseReason: null,
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useAppModel', () => {
  it('persists home -> player -> completion -> home as one local history record', () => {
    const storage = memoryStorage();
    const now = new Date(2026, 7, 22, 10, 30);
    const { result } = renderHook(() =>
      useAppModel({ storage, clock: () => now, prefersReducedMotion: () => false }),
    );

    expect(result.current.route.name).toBe('home');
    act(() => result.current.startRoutine('back'));
    expect(result.current.route).toMatchObject({
      name: 'player',
      routineId: 'back',
      session: { status: 'awaiting-ready' },
    });
    if (result.current.route.name !== 'player') throw new Error('Expected player route');
    const startedSession = result.current.route.session;

    act(() => result.current.finishSession(completeBack(startedSession)));
    expect(result.current.route.name).toBe('completion');
    expect(result.current.history).toEqual([
      {
        id: 'back:2026-08-22:complete',
        routineId: 'back',
        localDate: '2026-08-22',
        outcome: 'complete',
      },
    ]);

    act(() => result.current.goHome());
    expect(result.current.route.name).toBe('home');
    expect(JSON.parse(storage.value() ?? '')).toMatchObject({ activeSession: null, history: result.current.history });
  });

  it('rehydrates an exact rep and resumes through a fresh three-second preparation', () => {
    const active = {
      ...createSession('back', { coachPace: 'slow', balanceSeconds: 10 }),
      status: 'paused' as const,
      phaseIndex: 2,
      setIndex: 1,
      rep: 7,
      completedPhaseIds: ['standing-knee-bends', 'standing-full-down-up'] as const,
      resumeStatus: 'active' as const,
      pauseReason: 'background' as const,
    };
    const storage = memoryStorage({ initial: { ...DEFAULT_APP_STATE, activeSession: active } });
    const { result } = renderHook(() => useAppModel({ storage, prefersReducedMotion: () => false }));

    expect(result.current.route.name).toBe('home');
    expect(result.current.activeSession).toMatchObject({ phaseIndex: 2, setIndex: 1, rep: 7 });

    act(() => result.current.resumeSession());
    expect(result.current.route).toMatchObject({
      name: 'player',
      session: {
        status: 'preparing',
        remainingMs: 3000,
        resumeStatus: 'active',
        phaseIndex: 2,
        setIndex: 1,
        rep: 7,
      },
    });
  });

  it('preserves the exact 7250 ms active-hold remainder through Home Resume', () => {
    const active = {
      ...createSession('left-toe', { coachPace: 'standard', balanceSeconds: 15 }),
      status: 'active' as const,
      phaseIndex: 3,
      remainingMs: 7250,
    };
    const storage = memoryStorage({ initial: { ...DEFAULT_APP_STATE, activeSession: active } });
    const { result } = renderHook(() => useAppModel({ storage, prefersReducedMotion: () => false }));

    act(() => result.current.resumeSession());

    expect(result.current.route).toMatchObject({
      name: 'player',
      session: {
        status: 'preparing',
        remainingMs: 3000,
        resumeStatus: 'active',
        resumeRemainingMs: 7250,
      },
    });
  });

  it.each([
    [
      'awaiting-ready',
      createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
      { resumeStatus: 'awaiting-ready', resumeRemainingMs: null },
    ],
    [
      'preparing',
      {
        ...createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
        status: 'preparing' as const,
        remainingMs: 2500,
      },
      { resumeStatus: 'preparing', resumeRemainingMs: 2500 },
    ],
    [
      'set-transition',
      {
        ...createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
        status: 'set-transition' as const,
        setIndex: 1,
        remainingMs: 4250,
      },
      { resumeStatus: 'set-transition', resumeRemainingMs: 4250 },
    ],
    [
      'phase-transition',
      {
        ...createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
        status: 'phase-transition' as const,
        phaseIndex: 1,
        completedPhaseIds: ['standing-knee-bends'] as const,
      },
      { resumeStatus: 'phase-transition', resumeRemainingMs: null },
    ],
    [
      'replay',
      {
        ...createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
        status: 'replay' as const,
        resumeStatus: 'active' as const,
      },
      { resumeStatus: 'active', resumeRemainingMs: null },
    ],
  ] as const)(
    'normalises a saved %s stage into the fresh Resume preparation',
    (_label, activeSession, expected) => {
      const storage = memoryStorage({ initial: { ...DEFAULT_APP_STATE, activeSession } });
      const { result } = renderHook(() => useAppModel({ storage, prefersReducedMotion: () => false }));

      act(() => result.current.resumeSession());

      expect(result.current.route).toMatchObject({
        name: 'player',
        session: { status: 'preparing', remainingMs: 3000, ...expected },
      });
    },
  );

  it('keeps passive saves in Player but deliberate exit saves then routes Home', () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useAppModel({ storage, prefersReducedMotion: () => false }));
    act(() => result.current.startRoutine('back'));
    if (result.current.route.name !== 'player') throw new Error('Expected player route');
    const paused = sessionReducer(result.current.route.session, { type: 'PAUSE', reason: 'background' });

    act(() => result.current.saveActiveSession(paused));
    expect(result.current.route).toMatchObject({ name: 'player', session: paused });

    act(() => result.current.exitSession({ ...paused, pauseReason: 'user' }));
    expect(result.current.route.name).toBe('home');
    expect(result.current.activeSession).toMatchObject({ status: 'paused', pauseReason: 'user' });
  });

  it('makes equivalent completion callbacks idempotent', () => {
    const storage = memoryStorage();
    const { result } = renderHook(() =>
      useAppModel({ storage, clock: () => new Date(2026, 7, 22, 10), prefersReducedMotion: () => false }),
    );
    act(() => result.current.startRoutine('back'));
    if (result.current.route.name !== 'player') throw new Error('Expected player route');
    const completed = completeBack(result.current.route.session);
    const writesBeforeFinish = storage.writes.length;

    act(() => {
      result.current.finishSession(completed);
      result.current.finishSession({ ...completed });
    });

    expect(result.current.history).toHaveLength(1);
    expect(storage.writes).toHaveLength(writesBeforeFinish + 1);
  });

  it('drops a loaded non-resumable complete active slot without inventing history', () => {
    const complete = completeBack(
      createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
    );
    const storage = memoryStorage({ initial: { ...DEFAULT_APP_STATE, activeSession: complete } });
    const { result } = renderHook(() =>
      useAppModel({
        storage,
        clock: () => new Date(2026, 7, 22, 11),
        prefersReducedMotion: () => false,
      }),
    );

    expect(result.current.route.name).toBe('home');
    expect(result.current.activeSession).toBeNull();
    expect(result.current.history).toEqual([]);
    expect(JSON.parse(storage.value() ?? '').activeSession).toEqual(complete);

    act(() => result.current.updatePreferences({ coachPace: 'slow' }));
    expect(JSON.parse(storage.value() ?? '').activeSession).toBeNull();
  });

  it('patches only editable settings and preserves both education flags', () => {
    const stored = {
      ...DEFAULT_APP_STATE,
      preferences: {
        ...DEFAULT_APP_STATE.preferences,
        installEducationDismissed: true,
        reminderEducationDismissed: true,
      },
    };
    const storage = memoryStorage({ initial: stored });
    const { result } = renderHook(() => useAppModel({ storage, prefersReducedMotion: () => true }));

    act(() => result.current.updatePreferences({ coachPace: 'brisk', balanceSeconds: 15 }));

    expect(result.current.preferences).toEqual({
      ...stored.preferences,
      coachPace: 'brisk',
      balanceSeconds: 15,
    });
  });

  it('resets only the app namespace atomically and never recreates it', () => {
    const storage = memoryStorage({ initial: { ...DEFAULT_APP_STATE, history: [] } });
    const { result } = renderHook(() => useAppModel({ storage, prefersReducedMotion: () => false }));
    act(() => result.current.openSettings());
    const writesBeforeReset = storage.writes.length;

    act(() => result.current.resetAllProgress());

    expect(storage.removed).toEqual([APP_STORAGE_KEY]);
    expect(storage.writes).toHaveLength(writesBeforeReset);
    expect(storage.value()).toBeNull();
    expect(result.current.route.name).toBe('home');
    expect(result.current.preferences).toEqual(DEFAULT_APP_STATE.preferences);
    expect(result.current.history).toEqual([]);
    expect(result.current.activeSession).toBeNull();
  });

  it('still resets memory and discloses unavailable saving when removal fails', () => {
    const storage = memoryStorage({ initial: DEFAULT_APP_STATE, failRemove: true });
    const { result } = renderHook(() => useAppModel({ storage, prefersReducedMotion: () => false }));

    act(() => result.current.resetAllProgress());

    expect(result.current.route.name).toBe('home');
    expect(result.current.persistenceNotice).toBe('unavailable');
    expect(result.current.activeSession).toBeNull();
  });

  it('commits a route in memory and exposes sticky unavailable saving when a later write fails', () => {
    const storage = memoryStorage({ failSet: true });
    const { result } = renderHook(() =>
      useAppModel({ storage, prefersReducedMotion: () => false }),
    );

    act(() => result.current.startRoutine('back'));

    expect(result.current.route.name).toBe('player');
    expect(result.current.activeSession).toMatchObject({ routineId: 'back' });
    expect(result.current.persistenceNotice).toBe('unavailable');
  });

  it('distinguishes unavailable storage from recovered corrupt data', () => {
    const unavailable = renderHook(() =>
      useAppModel({ storage: memoryStorage({ failGet: true }), prefersReducedMotion: () => false }),
    );
    expect(unavailable.result.current.persistenceNotice).toBe('unavailable');
    unavailable.unmount();

    const recovered = renderHook(() =>
      useAppModel({ storage: memoryStorage({ initial: '{broken' }), prefersReducedMotion: () => false }),
    );
    expect(recovered.result.current.persistenceNotice).toBe('recovered');
  });

  it('uses OS reduced motion only without a valid saved record', () => {
    const firstVisit = renderHook(() =>
      useAppModel({ storage: memoryStorage(), prefersReducedMotion: () => true }),
    );
    expect(firstVisit.result.current.preferences.reducedMotion).toBe(true);
    firstVisit.unmount();

    const explicitFalse = renderHook(() =>
      useAppModel({ storage: memoryStorage({ initial: DEFAULT_APP_STATE }), prefersReducedMotion: () => true }),
    );
    expect(explicitFalse.result.current.preferences.reducedMotion).toBe(false);
  });

  it('refreshes the local date across Sunday to Monday and on visibility return', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 23, 23, 59, 59, 900));
    const { result } = renderHook(() =>
      useAppModel({ storage: memoryStorage(), prefersReducedMotion: () => false }),
    );
    expect(result.current.now.getDate()).toBe(23);

    act(() => vi.advanceTimersByTime(101));
    expect(result.current.now.getDate()).toBe(24);

    vi.setSystemTime(new Date(2026, 7, 25, 9));
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.now.getDate()).toBe(25);
  });

  it('replaces rather than multiplies the live local-midnight timer on visibility return', () => {
    vi.useFakeTimers();
    vi.clearAllTimers();
    vi.setSystemTime(new Date(2026, 7, 23, 18));
    const { unmount } = renderHook(() =>
      useAppModel({ storage: memoryStorage(), prefersReducedMotion: () => false }),
    );
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    {
      boundary: 'spring clock change',
      start: '2026-03-29T00:00:00.000Z',
      intervalHours: 23,
      expectedLocalDate: [2026, 2, 30] as const,
    },
    {
      boundary: 'autumn clock change',
      start: '2026-10-24T23:00:00.000Z',
      intervalHours: 25,
      expectedLocalDate: [2026, 9, 26] as const,
    },
  ])(
    'schedules the next Europe/London midnight across the $boundary in $intervalHours hours',
    ({ start, intervalHours, expectedLocalDate }) => {
      const previousTimeZone = process.env.TZ;
      process.env.TZ = 'Europe/London';
      vi.useFakeTimers();
      vi.setSystemTime(new Date(start));
      const hook = renderHook(() =>
        useAppModel({ storage: memoryStorage(), prefersReducedMotion: () => false }),
      );

      try {
        act(() => vi.advanceTimersByTime(intervalHours * 60 * 60 * 1000 - 1));
        expect([
          hook.result.current.now.getFullYear(),
          hook.result.current.now.getMonth(),
          hook.result.current.now.getDate(),
        ]).not.toEqual(expectedLocalDate);

        act(() => vi.advanceTimersByTime(1));
        expect([
          hook.result.current.now.getFullYear(),
          hook.result.current.now.getMonth(),
          hook.result.current.now.getDate(),
        ]).toEqual(expectedLocalDate);
      } finally {
        hook.unmount();
        if (previousTimeZone === undefined) delete process.env.TZ;
        else process.env.TZ = previousTimeZone;
      }
    },
  );

  it('records completion using the same injected local clock shown by Home', () => {
    let now = new Date(2026, 7, 24, 23, 59);
    const { result } = renderHook(() =>
      useAppModel({ storage: memoryStorage(), clock: () => now, prefersReducedMotion: () => false }),
    );
    act(() => result.current.startRoutine('back'));
    if (result.current.route.name !== 'player') throw new Error('Expected player route');
    const complete = completeBack(result.current.route.session);
    now = new Date(2026, 7, 25, 0, 1);

    act(() => result.current.finishSession(complete));
    expect(result.current.history[0]?.localDate).toBe('2026-08-25');
  });
});
