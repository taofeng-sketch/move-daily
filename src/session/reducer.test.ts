import { describe, expect, it } from 'vitest';
import { createSession, sessionReducer } from './reducer';
import { getCurrentPhase, getSessionSummary, isSessionFullyComplete } from './selectors';

type ExpectedPhase = {
  readonly id: string;
  readonly completion: 'cycle' | 'hold';
  readonly setEvents: readonly number[];
};

const BACK_PHASES: readonly ExpectedPhase[] = [
  { id: 'standing-knee-bends', completion: 'cycle', setEvents: [6, 6, 6] },
  { id: 'standing-full-down-up', completion: 'cycle', setEvents: [8] },
  { id: 'bridge-articulations', completion: 'cycle', setEvents: [10, 10] },
  { id: 'cobra-forearms', completion: 'cycle', setEvents: [10] },
  { id: 'cobra-hands', completion: 'cycle', setEvents: [10] },
  { id: 'supermans', completion: 'cycle', setEvents: [16, 16] },
  { id: 'foam-roller-extensions', completion: 'cycle', setEvents: [10, 10] },
];

const LEFT_TOE_PHASES: readonly ExpectedPhase[] = [
  { id: 'big-toe-lifts', completion: 'cycle', setEvents: [20] },
  { id: 'banded-toe-pointing', completion: 'cycle', setEvents: [20] },
  { id: 'band-arch-lifts', completion: 'cycle', setEvents: [10, 10, 10] },
  { id: 'single-leg-balance', completion: 'hold', setEvents: [1, 1, 1, 1] },
];

function start(routineId: 'back' | 'left-toe', balanceSeconds: 10 | 15 = 10) {
  let state = createSession(routineId, { coachPace: 'standard', balanceSeconds });
  state = sessionReducer(state, { type: 'READY' });
  return sessionReducer(state, { type: 'PREPARATION_FINISHED' });
}

function finishCycles(state: ReturnType<typeof createSession>, count: number) {
  for (let index = 0; index < count; index += 1) {
    state = sessionReducer(state, { type: 'CYCLE_FINISHED' });
  }
  return state;
}

function finishHolds(state: ReturnType<typeof createSession>, count: number) {
  for (let index = 0; index < count; index += 1) {
    state = sessionReducer(state, { type: 'HOLD_FINISHED' });
  }
  return state;
}

function enterNextSet(state: ReturnType<typeof createSession>) {
  state = sessionReducer(state, { type: 'TRANSITION_FINISHED' });
  return sessionReducer(state, { type: 'PREPARATION_FINISHED' });
}

function enterNextPhase(state: ReturnType<typeof createSession>) {
  state = sessionReducer(state, { type: 'TRANSITION_FINISHED' });
  state = sessionReducer(state, { type: 'READY' });
  return sessionReducer(state, { type: 'PREPARATION_FINISHED' });
}

function pauseAt(
  state: ReturnType<typeof createSession>,
  remainingMs: number | null | undefined,
) {
  return sessionReducer(
    state,
    { type: 'PAUSE', reason: 'background', remainingMs } as unknown as Parameters<typeof sessionReducer>[1],
  );
}

function replayAt(
  state: ReturnType<typeof createSession>,
  remainingMs: number | null | undefined,
) {
  return sessionReducer(
    state,
    { type: 'REPLAY_DEMO', remainingMs } as unknown as Parameters<typeof sessionReducer>[1],
  );
}

function startBalance(balanceSeconds: 10 | 15) {
  return finishExpectedRoutine(start('left-toe', balanceSeconds), LEFT_TOE_PHASES.slice(0, 3), false);
}

function startFirstPhaseTransition() {
  let state = start('back');
  state = finishCycles(state, 6);
  state = enterNextSet(state);
  state = finishCycles(state, 6);
  state = enterNextSet(state);
  return finishCycles(state, 6);
}

function startFirstSetTransition() {
  return finishCycles(start('back'), 6);
}

function finishExpectedRoutine(
  state: ReturnType<typeof createSession>,
  phases: readonly ExpectedPhase[],
  completesRoutine = true,
) {
  for (let phaseOffset = 0; phaseOffset < phases.length; phaseOffset += 1) {
    const expectedPhase = phases[phaseOffset];
    if (expectedPhase === undefined) throw new Error('Expected phase is missing.');
    expect(getCurrentPhase(state).id).toBe(expectedPhase.id);

    for (let setIndex = 0; setIndex < expectedPhase.setEvents.length; setIndex += 1) {
      const eventCount = expectedPhase.setEvents[setIndex];
      if (eventCount === undefined) throw new Error('Expected set event count is missing.');
      if (expectedPhase.completion === 'cycle') {
        state = finishCycles(state, eventCount - 1);
        expect(state).toMatchObject({
          status: 'active',
          setIndex,
          rep: eventCount - 1,
        });
        expect(getCurrentPhase(state).id).toBe(expectedPhase.id);
        state = sessionReducer(state, { type: 'CYCLE_FINISHED' });
      } else {
        state = finishHolds(state, eventCount);
      }

      if (setIndex < expectedPhase.setEvents.length - 1) {
        expect(state).toMatchObject({
          status: 'set-transition',
          setIndex: setIndex + 1,
          rep: 0,
          remainingMs: 8000,
        });
        state = enterNextSet(state);
        expect(state).toMatchObject({ status: 'active', setIndex: setIndex + 1 });
      } else if (phaseOffset < phases.length - 1 || !completesRoutine) {
        expect(state).toMatchObject({ status: 'phase-transition', rep: 0 });
        state = enterNextPhase(state);
      } else {
        expect(state.status).toBe('complete');
      }
    }
  }
  return state;
}

describe('sessionReducer', () => {
  it('uses a readiness gate and five-second preparation before movement', () => {
    let state = createSession('back', { coachPace: 'standard', balanceSeconds: 10 });

    expect(state.status).toBe('awaiting-ready');
    expect(sessionReducer(state, { type: 'START_NOW' })).toMatchObject({ status: 'active' });
    state = sessionReducer(state, { type: 'READY' });
    expect(state).toMatchObject({ status: 'preparing', remainingMs: 5000 });
    state = sessionReducer(state, { type: 'PREPARATION_FINISHED' });

    expect(state.status).toBe('active');
  });

  it('advances only after six knee-bend coach cycles', () => {
    let state = start('back');
    state = finishCycles(state, 5);
    expect(state).toMatchObject({ status: 'active', setIndex: 0, rep: 5 });

    state = sessionReducer(state, { type: 'CYCLE_FINISHED' });
    expect(state).toMatchObject({
      status: 'set-transition',
      setIndex: 1,
      rep: 0,
      remainingMs: 8000,
    });
    expect(sessionReducer(state, { type: 'START_NOW' })).toMatchObject({
      status: 'preparing',
      remainingMs: 5000,
    });
  });

  it('pauses without consuming progress and resumes through a countdown', () => {
    let state = start('left-toe', 15);
    state = sessionReducer(state, { type: 'CYCLE_FINISHED' });
    const paused = sessionReducer(state, { type: 'PAUSE', reason: 'background' });

    expect(paused).toMatchObject({ status: 'paused', rep: 1, pauseReason: 'background' });
    expect(sessionReducer(paused, { type: 'RESUME' })).toMatchObject({
      status: 'preparing',
      remainingMs: 3000,
      rep: 1,
    });
  });

  it('replays an uncounted demo before the same three-second preparation', () => {
    let state = start('left-toe');
    state = sessionReducer(state, { type: 'CYCLE_FINISHED' });
    state = sessionReducer(state, { type: 'REPLAY_DEMO' });

    expect(state).toMatchObject({ status: 'replay', rep: 1 });
    state = sessionReducer(state, { type: 'REPLAY_FINISHED' });
    expect(state).toMatchObject({ status: 'preparing', remainingMs: 3000, rep: 1 });
    expect(sessionReducer(state, { type: 'PREPARATION_FINISHED' })).toMatchObject({
      status: 'active',
      rep: 1,
    });
  });

  it('preserves an exact active hold remainder through pause and resume preparation', () => {
    let state = startBalance(15);
    state = pauseAt(state, 7500);
    expect(state).toMatchObject({
      status: 'paused',
      remainingMs: 7500,
      resumeStatus: 'active',
      resumeRemainingMs: null,
    });

    state = sessionReducer(state, { type: 'RESUME' });
    expect(state).toMatchObject({
      status: 'preparing',
      remainingMs: 3000,
      resumeStatus: 'active',
      resumeRemainingMs: 7500,
    });
    state = sessionReducer(state, { type: 'PREPARATION_FINISHED' });

    expect(state).toMatchObject({
      status: 'active',
      remainingMs: 7500,
      resumeStatus: null,
      resumeRemainingMs: null,
    });
  });

  it('preserves active rep counts without creating a remainder during resume', () => {
    let state = start('left-toe');
    state = finishCycles(state, 2);
    state = pauseAt(state, undefined);
    expect(state).toMatchObject({ status: 'paused', rep: 2, remainingMs: null, resumeStatus: 'active' });

    state = sessionReducer(state, { type: 'RESUME' });
    state = sessionReducer(state, { type: 'PREPARATION_FINISHED' });
    expect(state).toMatchObject({ status: 'active', rep: 2, remainingMs: null, resumeRemainingMs: null });
  });

  it('restores an exact paused set-transition remainder through Start now', () => {
    let state = start('back');
    state = finishCycles(state, 6);
    state = pauseAt(state, 4250);
    expect(state).toMatchObject({ status: 'paused', resumeStatus: 'set-transition', remainingMs: 4250 });

    state = sessionReducer(state, { type: 'RESUME' });
    expect(state).toMatchObject({ status: 'preparing', remainingMs: 3000, resumeRemainingMs: 4250 });
    state = sessionReducer(state, { type: 'START_NOW' });
    expect(state).toMatchObject({
      status: 'set-transition',
      setIndex: 1,
      remainingMs: 4250,
      resumeStatus: null,
      resumeRemainingMs: null,
    });
  });

  it('keeps the original target and exact remainder through a nested pause during resume preparation', () => {
    let hold = pauseAt(startBalance(15), 7500);
    hold = sessionReducer(hold, { type: 'RESUME' });
    hold = pauseAt(hold, undefined);
    expect(hold).toMatchObject({
      status: 'paused',
      resumeStatus: 'active',
      remainingMs: 7500,
      resumeRemainingMs: null,
    });
    hold = sessionReducer(hold, { type: 'RESUME' });
    hold = sessionReducer(hold, { type: 'PREPARATION_FINISHED' });
    expect(hold).toMatchObject({ status: 'active', remainingMs: 7500 });

    let setTransition = pauseAt(startFirstSetTransition(), 4250);
    setTransition = sessionReducer(setTransition, { type: 'RESUME' });
    setTransition = pauseAt(setTransition, undefined);
    expect(setTransition).toMatchObject({
      status: 'paused',
      resumeStatus: 'set-transition',
      remainingMs: 4250,
      resumeRemainingMs: null,
    });
    setTransition = sessionReducer(setTransition, { type: 'RESUME' });
    setTransition = sessionReducer(setTransition, { type: 'START_NOW' });
    expect(setTransition).toMatchObject({ status: 'set-transition', remainingMs: 4250 });

    let awaitingReady = pauseAt(createSession('back', { coachPace: 'standard', balanceSeconds: 10 }), undefined);
    awaitingReady = sessionReducer(awaitingReady, { type: 'RESUME' });
    awaitingReady = pauseAt(awaitingReady, undefined);
    expect(awaitingReady).toMatchObject({
      status: 'paused',
      resumeStatus: 'awaiting-ready',
      remainingMs: null,
      resumeRemainingMs: null,
    });
    awaitingReady = sessionReducer(awaitingReady, { type: 'RESUME' });
    awaitingReady = sessionReducer(awaitingReady, { type: 'PREPARATION_FINISHED' });
    expect(awaitingReady).toMatchObject({ status: 'awaiting-ready', remainingMs: null });

    let phaseTransition = pauseAt(startFirstPhaseTransition(), undefined);
    phaseTransition = sessionReducer(phaseTransition, { type: 'RESUME' });
    phaseTransition = pauseAt(phaseTransition, undefined);
    expect(phaseTransition).toMatchObject({
      status: 'paused',
      resumeStatus: 'phase-transition',
      remainingMs: null,
      resumeRemainingMs: null,
    });
    phaseTransition = sessionReducer(phaseTransition, { type: 'RESUME' });
    phaseTransition = sessionReducer(phaseTransition, { type: 'START_NOW' });
    expect(phaseTransition).toMatchObject({ status: 'phase-transition', remainingMs: null });
  });

  it('returns paused readiness gates and phase transitions without auto-starting movement', () => {
    let awaitingReady = createSession('back', { coachPace: 'standard', balanceSeconds: 10 });
    awaitingReady = pauseAt(awaitingReady, undefined);
    expect(awaitingReady).toMatchObject({ status: 'paused', resumeStatus: 'awaiting-ready' });
    awaitingReady = sessionReducer(awaitingReady, { type: 'RESUME' });
    awaitingReady = sessionReducer(awaitingReady, { type: 'PREPARATION_FINISHED' });
    expect(awaitingReady).toMatchObject({ status: 'awaiting-ready', remainingMs: null });

    let phaseTransition = startFirstPhaseTransition();
    phaseTransition = pauseAt(phaseTransition, undefined);
    expect(phaseTransition).toMatchObject({ status: 'paused', resumeStatus: 'phase-transition' });
    phaseTransition = sessionReducer(phaseTransition, { type: 'RESUME' });
    phaseTransition = sessionReducer(phaseTransition, { type: 'START_NOW' });
    expect(phaseTransition).toMatchObject({ status: 'phase-transition', phaseIndex: 1, remainingMs: null });
  });

  it('replays exact hold progress from active and paused states', () => {
    let activeReplay = replayAt(startBalance(15), 7500);
    expect(activeReplay).toMatchObject({
      status: 'replay',
      remainingMs: 7500,
      resumeStatus: 'active',
      resumeRemainingMs: 7500,
    });
    activeReplay = sessionReducer(activeReplay, { type: 'REPLAY_FINISHED' });
    expect(activeReplay).toMatchObject({ status: 'preparing', remainingMs: 3000, resumeRemainingMs: 7500 });
    activeReplay = sessionReducer(activeReplay, { type: 'PREPARATION_FINISHED' });
    expect(activeReplay).toMatchObject({ status: 'active', remainingMs: 7500 });

    let pausedReplay = pauseAt(startBalance(15), 7500);
    pausedReplay = replayAt(pausedReplay, undefined);
    expect(pausedReplay).toMatchObject({ status: 'replay', remainingMs: 7500, resumeStatus: 'active' });
    pausedReplay = sessionReducer(pausedReplay, { type: 'REPLAY_FINISHED' });
    pausedReplay = sessionReducer(pausedReplay, { type: 'PREPARATION_FINISHED' });
    expect(pausedReplay).toMatchObject({ status: 'active', remainingMs: 7500 });

    let replaySetup = createSession('back', { coachPace: 'standard', balanceSeconds: 10 });
    replaySetup = replayAt(replaySetup, undefined);
    expect(replaySetup).toMatchObject({ status: 'replay', resumeStatus: 'awaiting-ready' });
    replaySetup = sessionReducer(replaySetup, { type: 'REPLAY_FINISHED' });
    expect(replaySetup).toMatchObject({ status: 'awaiting-ready', remainingMs: null });
  });

  it('pauses preparation and preserves frozen replay progress rather than leaving either stage live', () => {
    let preparing = createSession('left-toe', { coachPace: 'standard', balanceSeconds: 15 });
    preparing = sessionReducer(preparing, { type: 'READY' });
    preparing = pauseAt(preparing, 2250);
    expect(preparing).toMatchObject({ status: 'paused', resumeStatus: 'preparing', remainingMs: 2250 });
    preparing = sessionReducer(preparing, { type: 'RESUME' });
    preparing = sessionReducer(preparing, { type: 'PREPARATION_FINISHED' });
    expect(preparing).toMatchObject({ status: 'active', remainingMs: null });

    let replay = replayAt(startBalance(15), 7500);
    replay = pauseAt(replay, 6800);
    expect(replay).toMatchObject({
      status: 'paused',
      resumeStatus: 'active',
      remainingMs: 7500,
      resumeRemainingMs: null,
    });
    replay = sessionReducer(replay, { type: 'RESUME' });
    replay = sessionReducer(replay, { type: 'PREPARATION_FINISHED' });
    expect(replay).toMatchObject({ status: 'active', remainingMs: 7500 });

    let replayWithNullDemoRemainder = replayAt(startBalance(15), 7500);
    replayWithNullDemoRemainder = pauseAt(replayWithNullDemoRemainder, null);
    expect(replayWithNullDemoRemainder).toMatchObject({
      status: 'paused',
      resumeStatus: 'active',
      remainingMs: 7500,
      resumeRemainingMs: null,
    });

    let replayFromPaused = pauseAt(startBalance(15), 7500);
    replayFromPaused = replayAt(replayFromPaused, undefined);
    replayFromPaused = pauseAt(replayFromPaused, 6800);
    expect(replayFromPaused).toMatchObject({
      status: 'paused',
      resumeStatus: 'active',
      remainingMs: 7500,
      resumeRemainingMs: null,
    });
    replayFromPaused = sessionReducer(replayFromPaused, { type: 'RESUME' });
    replayFromPaused = sessionReducer(replayFromPaused, { type: 'PREPARATION_FINISHED' });
    expect(replayFromPaused).toMatchObject({ status: 'active', remainingMs: 7500 });
  });

  it('restarts paused rep and hold sets without leaving the paused state', () => {
    let superman = finishExpectedRoutine(start('back'), BACK_PHASES.slice(0, 5), false);
    superman = finishCycles(superman, 4);
    superman = pauseAt(superman, undefined);
    superman = sessionReducer(superman, { type: 'RESTART_SET' });
    expect(superman).toMatchObject({
      status: 'paused',
      resumeStatus: 'active',
      rep: 0,
      rightCount: 0,
      leftCount: 0,
      remainingMs: null,
    });

    let balance = pauseAt(startBalance(15), 7500);
    balance = sessionReducer(balance, { type: 'RESTART_SET' });
    expect(balance).toMatchObject({
      status: 'paused',
      resumeStatus: 'active',
      rep: 0,
      rightCount: 0,
      leftCount: 0,
      remainingMs: 15000,
      resumeRemainingMs: null,
    });

    let setTransition = pauseAt(startFirstSetTransition(), 4250);
    setTransition = sessionReducer(setTransition, { type: 'RESTART_SET' });
    expect(setTransition).toMatchObject({
      status: 'paused',
      resumeStatus: 'active',
      setIndex: 1,
      rep: 0,
      rightCount: 0,
      leftCount: 0,
      remainingMs: null,
      resumeRemainingMs: null,
    });
    setTransition = sessionReducer(setTransition, { type: 'RESUME' });
    setTransition = sessionReducer(setTransition, { type: 'PREPARATION_FINISHED' });
    expect(setTransition).toMatchObject({ status: 'active', setIndex: 1, remainingMs: null });

    let holdTransition = sessionReducer(startBalance(15), { type: 'HOLD_FINISHED' });
    holdTransition = pauseAt(holdTransition, 4250);
    holdTransition = sessionReducer(holdTransition, { type: 'RESTART_SET' });
    expect(holdTransition).toMatchObject({
      status: 'paused',
      resumeStatus: 'active',
      setIndex: 1,
      rep: 0,
      rightCount: 0,
      leftCount: 0,
      remainingMs: 15000,
      resumeRemainingMs: null,
    });
    holdTransition = sessionReducer(holdTransition, { type: 'RESUME' });
    holdTransition = sessionReducer(holdTransition, { type: 'PREPARATION_FINISHED' });
    expect(holdTransition).toMatchObject({ status: 'active', setIndex: 1, remainingMs: 15000 });

    const pausedAwaitingReady = pauseAt(
      createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
      undefined,
    );
    expect(sessionReducer(pausedAwaitingReady, { type: 'RESTART_SET' })).toBe(pausedAwaitingReady);
    const pausedPhaseTransition = pauseAt(startFirstPhaseTransition(), undefined);
    expect(sessionReducer(pausedPhaseTransition, { type: 'RESTART_SET' })).toBe(pausedPhaseTransition);
  });

  it('rejects null, invalid, and non-finite supplied remainders for numeric stages without changing state', () => {
    const state = startBalance(15);
    expect(pauseAt(state, null)).toBe(state);
    expect(replayAt(state, null)).toBe(state);
    const pausedHold = pauseAt(state, 7500);
    expect(replayAt(pausedHold, null)).toBe(pausedHold);
    for (const remainingMs of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(pauseAt(state, remainingMs)).toBe(state);
      expect(replayAt(state, remainingMs)).toBe(state);
    }

    const preparation = sessionReducer(
      createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
      { type: 'READY' },
    );
    expect(pauseAt(preparation, null)).toBe(preparation);
    const setTransition = startFirstSetTransition();
    expect(pauseAt(setTransition, null)).toBe(setTransition);
  });

  it('clears resume metadata after restore, phase advance, and skip paths', () => {
    let active = pauseAt(startBalance(15), 7500);
    active = sessionReducer(active, { type: 'RESUME' });
    active = sessionReducer(active, { type: 'PREPARATION_FINISHED' });

    let setTransition = pauseAt(startFirstSetTransition(), 4250);
    setTransition = sessionReducer(setTransition, { type: 'RESUME' });
    setTransition = sessionReducer(setTransition, { type: 'START_NOW' });

    let awaitingReady = pauseAt(createSession('back', { coachPace: 'standard', balanceSeconds: 10 }), undefined);
    awaitingReady = sessionReducer(awaitingReady, { type: 'RESUME' });
    awaitingReady = sessionReducer(awaitingReady, { type: 'PREPARATION_FINISHED' });

    let phaseTransition = pauseAt(startFirstPhaseTransition(), undefined);
    phaseTransition = sessionReducer(phaseTransition, { type: 'RESUME' });
    phaseTransition = sessionReducer(phaseTransition, { type: 'START_NOW' });

    let preparation = sessionReducer(
      createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
      { type: 'READY' },
    );
    preparation = pauseAt(preparation, 2250);
    preparation = sessionReducer(preparation, { type: 'RESUME' });
    preparation = sessionReducer(preparation, { type: 'PREPARATION_FINISHED' });

    let replay = replayAt(startBalance(15), 7500);
    replay = sessionReducer(replay, { type: 'REPLAY_FINISHED' });
    replay = sessionReducer(replay, { type: 'PREPARATION_FINISHED' });

    const advanced = startFirstPhaseTransition();
    const skipped = sessionReducer(pauseAt(start('back'), undefined), { type: 'SKIP_PHASE' });

    for (const state of [active, setTransition, awaitingReady, phaseTransition, preparation, replay, advanced, skipped]) {
      expect(state).toMatchObject({
        resumeStatus: null,
        resumeRemainingMs: null,
        pauseReason: null,
      });
    }
  });

  it('uses both selected balance durations and advances each of four holds at its exact boundary', () => {
    for (const [seconds, remainingMs] of [
      [10, 10000],
      [15, 15000],
    ] as const) {
      let state = start('left-toe', seconds);
      state = finishExpectedRoutine(state, LEFT_TOE_PHASES.slice(0, 3), false);

      expect(getCurrentPhase(state).id).toBe('single-leg-balance');
      expect(state).toMatchObject({ status: 'active', remainingMs, setIndex: 0 });
      expect(sessionReducer(state, { type: 'CYCLE_FINISHED' })).toBe(state);

      for (let setIndex = 0; setIndex < 4; setIndex += 1) {
        state = sessionReducer(state, { type: 'HOLD_FINISHED' });
        if (setIndex < 3) {
          expect(state).toMatchObject({
            status: 'set-transition',
            setIndex: setIndex + 1,
            remainingMs: 8000,
          });
          state = enterNextSet(state);
          expect(state).toMatchObject({
            status: 'active',
            setIndex: setIndex + 1,
            remainingMs,
          });
        } else {
          expect(state.status).toBe('complete');
        }
      }
    }
  });

  it('follows every Back phase and literal prescribed set boundary', () => {
    const state = finishExpectedRoutine(start('back'), BACK_PHASES);

    expect(getSessionSummary(state)).toEqual({
      completed: 5,
      skipped: 0,
      total: 5,
      label: 'Session complete',
    });
    expect(isSessionFullyComplete(state)).toBe(true);
  });

  it('alternates and completes both Superman sets with eight counts per side', () => {
    let state = finishExpectedRoutine(start('back'), BACK_PHASES.slice(0, 5), false);
    expect(getCurrentPhase(state).id).toBe('supermans');

    state = finishCycles(state, 1);
    expect(state).toMatchObject({ rightCount: 1, leftCount: 0, rep: 1 });
    state = finishCycles(state, 1);
    expect(state).toMatchObject({ rightCount: 1, leftCount: 1, rep: 2 });
    state = finishCycles(state, 14);
    expect(state).toMatchObject({
      status: 'set-transition',
      setIndex: 1,
      rightCount: 8,
      leftCount: 8,
      rep: 0,
    });

    state = enterNextSet(state);
    state = finishCycles(state, 1);
    expect(state).toMatchObject({ rightCount: 1, leftCount: 0, rep: 1 });
    state = finishCycles(state, 14);
    expect(state).toMatchObject({ rightCount: 8, leftCount: 7, rep: 15 });
    state = finishCycles(state, 1);

    expect(state).toMatchObject({
      status: 'phase-transition',
      phaseIndex: 6,
      completedPhaseIds: expect.arrayContaining(['supermans']),
    });
  });

  it('requires a transition and fresh readiness gate before a major phase change', () => {
    let state = start('back');
    state = finishCycles(state, 6);
    state = enterNextSet(state);
    state = finishCycles(state, 6);
    state = enterNextSet(state);
    state = finishCycles(state, 6);

    expect(state).toMatchObject({ status: 'phase-transition', phaseIndex: 1 });
    expect(sessionReducer(state, { type: 'READY' })).toBe(state);
    state = sessionReducer(state, { type: 'TRANSITION_FINISHED' });
    expect(state.status).toBe('awaiting-ready');
  });

  it('changes visual pace without losing progress and supports bounded rep correction', () => {
    let state = start('left-toe');
    state = finishCycles(state, 2);
    state = sessionReducer(state, { type: 'SET_COACH_PACE', pace: 'brisk' });

    expect(state).toMatchObject({ rep: 2, preferences: { coachPace: 'brisk', balanceSeconds: 10 } });
    state = sessionReducer(state, { type: 'DECREMENT_REP' });
    state = sessionReducer(state, { type: 'DECREMENT_REP' });
    state = sessionReducer(state, { type: 'DECREMENT_REP' });

    expect(state.rep).toBe(0);
  });

  it('restarts only the current set and keeps its phase and set index', () => {
    let state = start('back');
    state = finishCycles(state, 2);
    state = sessionReducer(state, { type: 'RESTART_SET' });

    expect(state).toMatchObject({ phaseIndex: 0, setIndex: 0, rep: 0, rightCount: 0, leftCount: 0 });
  });

  it('records skipped phases without falsely completing their written exercise group', () => {
    let state = start('back');
    state = sessionReducer(state, { type: 'SKIP_PHASE' });
    expect(state).toMatchObject({
      status: 'phase-transition',
      skippedPhaseIds: ['standing-knee-bends'],
      completedPhaseIds: [],
    });
    state = enterNextPhase(state);
    state = finishExpectedRoutine(state, BACK_PHASES.slice(1));

    expect(getSessionSummary(state)).toEqual({
      completed: 4,
      skipped: 1,
      total: 5,
      label: 'Session saved',
    });
    expect(isSessionFullyComplete(state)).toBe(false);
  });

  it('follows every Left Toe phase and literal prescribed set boundary', () => {
    const state = finishExpectedRoutine(start('left-toe', 10), LEFT_TOE_PHASES);

    expect(getSessionSummary(state)).toEqual({
      completed: 4,
      skipped: 0,
      total: 4,
      label: 'Session complete',
    });
  });

  it('returns the original state for events that are invalid in the current status', () => {
    const state = createSession('back', { coachPace: 'standard', balanceSeconds: 10 });

    expect(sessionReducer(state, { type: 'CYCLE_FINISHED' })).toBe(state);
    expect(sessionReducer(state, { type: 'HOLD_FINISHED' })).toBe(state);
  });

  it('returns an ordinary five-second preparation to readiness when more time is needed', () => {
    const preparing = sessionReducer(
      createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
      { type: 'READY' },
    );
    const state = sessionReducer(
      preparing,
      { type: 'NEED_MORE_TIME' } as unknown as Parameters<typeof sessionReducer>[1],
    );

    expect(state).toMatchObject({
      status: 'awaiting-ready',
      remainingMs: null,
      resumeStatus: null,
      resumeRemainingMs: null,
      pauseReason: null,
    });
  });

  it('returns resumed preparation to paused with the original exact target and remainder', () => {
    let state = pauseAt(startBalance(15), 7250);
    state = sessionReducer(state, { type: 'RESUME' });
    state = sessionReducer(
      state,
      { type: 'NEED_MORE_TIME' } as unknown as Parameters<typeof sessionReducer>[1],
    );

    expect(state).toMatchObject({
      status: 'paused',
      remainingMs: 7250,
      resumeStatus: 'active',
      resumeRemainingMs: null,
      pauseReason: 'user',
    });
  });

  it('ignores Need more time outside preparation', () => {
    const active = start('back');
    expect(
      sessionReducer(
        active,
        { type: 'NEED_MORE_TIME' } as unknown as Parameters<typeof sessionReducer>[1],
      ),
    ).toBe(active);
  });
});
