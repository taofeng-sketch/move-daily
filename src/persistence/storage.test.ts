import { describe, expect, it } from 'vitest';
import { createSession, sessionReducer } from '../session/reducer';
import { DEFAULT_APP_STATE } from './appState';
import { APP_STORAGE_KEY, clearAppState, loadAppState, saveAppState } from './storage';

function createMemoryStorage(initialValue: string | null = null) {
  let value = initialValue;
  const removedKeys: string[] = [];

  return {
    getItem: () => value,
    setItem: (...args: [string, string]) => {
      value = args[1];
    },
    removeItem: (key: string) => {
      removedKeys.push(key);
      value = null;
    },
    storedValue: () => value,
    removedKeys,
  };
}

describe('local app state', () => {
  it('starts with the approved six preference defaults', () => {
    expect(DEFAULT_APP_STATE.preferences.voiceEnabled).toBe(true);
    expect(DEFAULT_APP_STATE.preferences.coachPace).toBe('standard');
    expect(DEFAULT_APP_STATE.preferences.balanceSeconds).toBe(10);
    expect(DEFAULT_APP_STATE.preferences.reducedMotion).toBe(false);
    expect(DEFAULT_APP_STATE.preferences.installEducationDismissed).toBe(false);
    expect(DEFAULT_APP_STATE.preferences.reminderEducationDismissed).toBe(false);
  });

  it('uses a versioned namespaced key', () => {
    expect(APP_STORAGE_KEY).toBe('move-daily:app-state:v1');
  });

  it('continues without persistence when storage throws', () => {
    const failingStorage = {
      getItem: () => {
        throw new DOMException('blocked');
      },
      setItem: () => {
        throw new DOMException('blocked');
      },
      removeItem: () => {
        throw new DOMException('blocked');
      },
    };

    expect(loadAppState(failingStorage)).toEqual({ state: DEFAULT_APP_STATE, available: false });
    expect(saveAppState(DEFAULT_APP_STATE, failingStorage)).toEqual({ ok: false });
    expect(clearAppState(failingStorage)).toEqual({ ok: false });
  });

  it('round-trips the one allowed active session and preferences', () => {
    const storage = createMemoryStorage();
    const state = {
      ...DEFAULT_APP_STATE,
      preferences: { ...DEFAULT_APP_STATE.preferences, coachPace: 'brisk' as const },
      activeSession: {
        version: 1 as const,
        routineId: 'back' as const,
        status: 'paused' as const,
        phaseIndex: 1,
        setIndex: 0,
        rep: 3,
        rightCount: 0,
        leftCount: 0,
        remainingMs: null,
        preferences: { coachPace: 'brisk' as const, balanceSeconds: 10 as const },
        skippedPhaseIds: [],
        completedPhaseIds: ['standing-knee-bends' as const],
        resumeStatus: 'active' as const,
        resumeRemainingMs: null,
        pauseReason: 'user' as const,
      },
    };

    expect(saveAppState(state, storage)).toEqual({ ok: true });
    expect(loadAppState(storage)).toEqual({ state, available: true });
  });

  it('round-trips exact paused and resume-preparation remainders', () => {
    const pausedHold = {
      ...createSession('left-toe', { coachPace: 'standard', balanceSeconds: 15 }),
      status: 'paused' as const,
      phaseIndex: 3,
      remainingMs: 7500,
      resumeStatus: 'active' as const,
      resumeRemainingMs: null,
      pauseReason: 'background' as const,
    };
    const resumePreparation = {
      ...pausedHold,
      status: 'preparing' as const,
      remainingMs: 3000,
      resumeRemainingMs: 7500,
      pauseReason: null,
    };

    for (const activeSession of [pausedHold, resumePreparation]) {
      const storage = createMemoryStorage();
      const state = { ...DEFAULT_APP_STATE, activeSession };

      expect(saveAppState(state, storage)).toEqual({ ok: true });
      expect(loadAppState(storage)).toEqual({ state, available: true });
    }
  });

  it('round-trips nested-pause snapshots for every resumable target', () => {
    const activeHold = {
      ...createSession('left-toe', { coachPace: 'standard', balanceSeconds: 15 }),
      status: 'active' as const,
      phaseIndex: 3,
      remainingMs: 7500,
    };
    let nestedPaused = sessionReducer(activeHold, {
      type: 'PAUSE',
      reason: 'background',
      remainingMs: 7500,
    });
    nestedPaused = sessionReducer(nestedPaused, { type: 'RESUME' });
    nestedPaused = sessionReducer(nestedPaused, { type: 'PAUSE', reason: 'background' });
    expect(nestedPaused).toMatchObject({
      status: 'paused',
      resumeStatus: 'active',
      remainingMs: 7500,
      resumeRemainingMs: null,
    });

    const nestedPausedSessions = [
      nestedPaused,
      {
        ...createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
        status: 'paused' as const,
        setIndex: 1,
        remainingMs: 4250,
        resumeStatus: 'set-transition' as const,
        resumeRemainingMs: null,
        pauseReason: 'background' as const,
      },
      {
        ...createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
        status: 'paused' as const,
        remainingMs: null,
        resumeStatus: 'awaiting-ready' as const,
        resumeRemainingMs: null,
        pauseReason: 'background' as const,
      },
      {
        ...createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
        status: 'paused' as const,
        phaseIndex: 1,
        remainingMs: null,
        completedPhaseIds: ['standing-knee-bends'] as const,
        resumeStatus: 'phase-transition' as const,
        resumeRemainingMs: null,
        pauseReason: 'background' as const,
      },
    ];

    for (const activeSession of nestedPausedSessions) {
      const storage = createMemoryStorage();
      const state = { ...DEFAULT_APP_STATE, activeSession };
      expect(saveAppState(state, storage)).toEqual({ ok: true });
      expect(loadAppState(storage)).toEqual({ state, available: true });
    }
  });

  it('requires the exact finite non-negative resume-remainder session shape', () => {
    const validSession = {
      ...createSession('left-toe', { coachPace: 'standard', balanceSeconds: 15 }),
      status: 'paused' as const,
      phaseIndex: 3,
      remainingMs: 7500,
      resumeStatus: 'active' as const,
      resumeRemainingMs: null,
      pauseReason: 'background' as const,
    };
    const { resumeRemainingMs: ignoredResumeRemainder, ...missingResumeRemainder } = validSession;
    void ignoredResumeRemainder;
    const invalidLoadSessions = [
      missingResumeRemainder,
      { ...validSession, resumeRemainingMs: -1 },
      { ...validSession, resumeRemainingMs: 7500, extraResumeRemainder: 1 },
      { ...validSession, resumeRemainingMs: 7500 },
      { ...validSession, status: 'preparing' as const, remainingMs: 3000, resumeRemainingMs: null, pauseReason: null },
      {
        ...validSession,
        status: 'active' as const,
        remainingMs: null,
        resumeStatus: null,
        resumeRemainingMs: null,
        pauseReason: null,
      },
    ];

    for (const activeSession of invalidLoadSessions) {
      const storage = createMemoryStorage(JSON.stringify({ ...DEFAULT_APP_STATE, activeSession }));
      expect(loadAppState(storage)).toEqual({
        state: DEFAULT_APP_STATE,
        available: true,
        recoveredFromCorruption: true,
      });
    }

    for (const resumeRemainingMs of [Number.NaN, Number.POSITIVE_INFINITY]) {
      const storage = createMemoryStorage();
      expect(
        saveAppState(
          { ...DEFAULT_APP_STATE, activeSession: { ...validSession, resumeRemainingMs } },
          storage,
        ),
      ).toEqual({ ok: false });
    }
  });

  it('recovers from malformed state without touching other storage', () => {
    const storage = createMemoryStorage('{not json');

    expect(loadAppState(storage)).toEqual({
      state: DEFAULT_APP_STATE,
      available: true,
      recoveredFromCorruption: true,
    });
    expect(storage.removedKeys).toEqual([]);

    expect(saveAppState(DEFAULT_APP_STATE, storage)).toEqual({ ok: true });
    expect(storage.removedKeys).toEqual([]);
    expect(JSON.parse(storage.storedValue() ?? '')).toEqual(DEFAULT_APP_STATE);
  });

  it('rejects version, unknown routine, and malformed preferences as corruption', () => {
    const invalidStates = [
      { ...DEFAULT_APP_STATE, version: 2 },
      {
        ...DEFAULT_APP_STATE,
        history: [{ id: 'unknown', routineId: 'other', localDate: '2026-08-22', outcome: 'complete' }],
      },
      {
        ...DEFAULT_APP_STATE,
        history: [{ id: 'arbitrary text', routineId: 'back', localDate: '2026-08-22', outcome: 'complete' }],
      },
      { ...DEFAULT_APP_STATE, preferences: { ...DEFAULT_APP_STATE.preferences, balanceSeconds: 12 } },
    ];

    for (const invalidState of invalidStates) {
      const storage = createMemoryStorage(JSON.stringify(invalidState));
      expect(loadAppState(storage)).toEqual({
        state: DEFAULT_APP_STATE,
        available: true,
        recoveredFromCorruption: true,
      });
    }
  });

  it('recovers from a structured but invalid active session', () => {
    const invalidState = {
      ...DEFAULT_APP_STATE,
      activeSession: {
        ...createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
        phaseIndex: 99,
      },
    };
    const storage = createMemoryStorage(JSON.stringify(invalidState));

    expect(loadAppState(storage)).toEqual({
      state: DEFAULT_APP_STATE,
      available: true,
      recoveredFromCorruption: true,
    });
  });

  it('clears only this application namespace', () => {
    const storage = createMemoryStorage(JSON.stringify(DEFAULT_APP_STATE));

    expect(clearAppState(storage)).toEqual({ ok: true });
    expect(storage.removedKeys).toEqual([APP_STORAGE_KEY]);
  });
});
