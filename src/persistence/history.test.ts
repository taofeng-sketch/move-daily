import { describe, expect, it } from 'vitest';
import { getRoutine } from '../domain/routines';
import { createSession } from '../session/reducer';
import type { SessionState } from '../session/session';
import { DEFAULT_APP_STATE } from './appState';
import { getWeeklyProgress, recordSession, safeLocalDate } from './history';

function completeSession(routineId: 'back' | 'left-toe'): SessionState {
  const initial = createSession(routineId, { coachPace: 'standard', balanceSeconds: 10 });
  return {
    ...initial,
    status: 'complete',
    phaseIndex: getRoutine(routineId).phases.length - 1,
    completedPhaseIds: getRoutine(routineId).phases.map((phase) => phase.id),
  };
}

describe('session history', () => {
  it('records a fully completed routine once per local date', () => {
    const session = completeSession('left-toe');
    const recorded = recordSession(DEFAULT_APP_STATE, session, '2026-08-20');
    const repeated = recordSession(recorded, session, '2026-08-20');

    expect(repeated.history).toEqual([
      {
        id: 'left-toe:2026-08-20:complete',
        routineId: 'left-toe',
        localDate: '2026-08-20',
        outcome: 'complete',
      },
    ]);
  });

  it('saves incomplete sessions honestly without counting them as completion', () => {
    const initial = createSession('back', { coachPace: 'standard', balanceSeconds: 10 });
    const skipped = {
      ...initial,
      status: 'complete' as const,
      skippedPhaseIds: ['standing-knee-bends' as const],
    };
    const state = recordSession(DEFAULT_APP_STATE, skipped, '2026-08-20');

    expect(state.history).toEqual([
      {
        id: 'back:2026-08-20:saved-with-skips',
        routineId: 'back',
        localDate: '2026-08-20',
        outcome: 'saved-with-skips',
      },
    ]);
    expect(getWeeklyProgress(state.history, '2026-08-17')).toEqual({
      backCompletedDates: [],
      toeCompleted: 0,
      toeTarget: 4,
    });
  });

  it('retains only the newest 180 history records', () => {
    const history = Array.from({ length: 180 }, (_, index) => {
      const date = new Date(2026, 0, index + 1);
      const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
      ).padStart(2, '0')}`;
      return {
        id: `back:${localDate}:complete`,
        routineId: 'back' as const,
        localDate,
        outcome: 'complete' as const,
      };
    });
    const state = { ...DEFAULT_APP_STATE, history };

    const recorded = recordSession(state, completeSession('left-toe'), '2026-12-31');

    expect(recorded.history).toHaveLength(180);
    expect(recorded.history.at(0)?.id).toBe('back:2026-01-02:complete');
    expect(recorded.history.at(-1)?.id).toBe('left-toe:2026-12-31:complete');
  });

  it('counts completed toe routines but does not invent a Back target', () => {
    const progress = getWeeklyProgress(
      [
        { id: 'a', routineId: 'left-toe', localDate: '2026-08-18', outcome: 'complete' },
        { id: 'b', routineId: 'left-toe', localDate: '2026-08-20', outcome: 'complete' },
        { id: 'c', routineId: 'back', localDate: '2026-08-21', outcome: 'complete' },
      ],
      '2026-08-17',
    );

    expect(progress).toEqual({ backCompletedDates: ['2026-08-21'], toeCompleted: 2, toeTarget: 4 });
  });

  it('uses local dates and excludes skipped, duplicate, and next-week records', () => {
    expect(safeLocalDate(new Date(2026, 0, 2, 23, 59))).toBe('2026-01-02');

    const progress = getWeeklyProgress(
      [
        { id: 'before', routineId: 'back', localDate: '2026-08-16', outcome: 'complete' },
        { id: 'back-one', routineId: 'back', localDate: '2026-08-17', outcome: 'complete' },
        { id: 'back-duplicate', routineId: 'back', localDate: '2026-08-17', outcome: 'complete' },
        { id: 'skipped', routineId: 'left-toe', localDate: '2026-08-18', outcome: 'saved-with-skips' },
        { id: 'toe', routineId: 'left-toe', localDate: '2026-08-23', outcome: 'complete' },
        { id: 'next-week', routineId: 'back', localDate: '2026-08-24', outcome: 'complete' },
      ],
      '2026-08-17',
    );

    expect(progress).toEqual({ backCompletedDates: ['2026-08-17'], toeCompleted: 1, toeTarget: 4 });
  });
});
