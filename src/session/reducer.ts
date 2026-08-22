import type { RoutinePhase } from '../domain/routine';
import { getRoutine } from '../domain/routines';
import type { SessionEvent, SessionPreferences, SessionState, SessionStatus } from './session';
import { getCurrentPhase } from './selectors';

const PREPARATION_MS = 5000;
const RESUME_PREPARATION_MS = 3000;
const SET_TRANSITION_MS = 8000;

export function createSession(
  routineId: SessionState['routineId'],
  preferences: SessionPreferences,
): SessionState {
  getRoutine(routineId);
  return {
    version: 1,
    routineId,
    status: 'awaiting-ready',
    phaseIndex: 0,
    setIndex: 0,
    rep: 0,
    rightCount: 0,
    leftCount: 0,
    remainingMs: null,
    preferences,
    skippedPhaseIds: [],
    completedPhaseIds: [],
    resumeStatus: null,
    resumeRemainingMs: null,
    pauseReason: null,
  };
}

export function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case 'READY':
      if (state.status === 'awaiting-ready') return prepare(state, PREPARATION_MS);
      if (state.status === 'set-transition') return prepareForNextSet(state);
      return state;
    case 'NEED_MORE_TIME':
      return needMoreTime(state);
    case 'START_NOW':
      if (state.status === 'preparing') {
        return state.resumeStatus === null ? activate(state) : restoreResumedStage(state);
      }
      if (state.status === 'awaiting-ready') return activate(state);
      if (state.status === 'set-transition') return prepareForNextSet(state);
      return state;
    case 'PREPARATION_FINISHED':
      if (state.status !== 'preparing') return state;
      return state.resumeStatus === null ? activate(state) : restoreResumedStage(state);
    case 'CYCLE_FINISHED':
      return state.status === 'active' ? finishCycle(state) : state;
    case 'HOLD_FINISHED':
      return state.status === 'active' ? finishHold(state) : state;
    case 'TRANSITION_FINISHED':
      if (state.status === 'set-transition') return prepareForNextSet(state);
      if (state.status === 'phase-transition') return awaitReady(state);
      return state;
    case 'PAUSE':
      return canUseSuppliedRemainder(state, event.remainingMs) ? pauseSession(state, event) : state;
    case 'RESUME':
      return state.status === 'paused' && state.resumeStatus !== null ? beginResume(state) : state;
    case 'REPLAY_DEMO':
      return canUseSuppliedRemainder(state, event.remainingMs) ? beginReplay(state, event.remainingMs) : state;
    case 'REPLAY_FINISHED':
      return finishReplay(state);
    case 'DECREMENT_REP':
      return state.status === 'active' ? decrementRep(state) : state;
    case 'RESTART_SET':
      if (state.status === 'active') return restartSet(state);
      if (state.status === 'paused') return restartPausedSet(state);
      return state;
    case 'SKIP_PHASE':
      return canSkip(state.status) ? skipCurrentPhase(state) : state;
    case 'SET_COACH_PACE':
      return { ...state, preferences: { ...state.preferences, coachPace: event.pace } };
    default:
      return assertNever(event);
  }
}

function needMoreTime(state: SessionState): SessionState {
  if (state.status !== 'preparing') return state;
  if (state.resumeStatus === null) return awaitReady(state);

  return {
    ...state,
    status: 'paused',
    remainingMs: state.resumeRemainingMs,
    resumeRemainingMs: null,
    pauseReason: 'user',
  };
}

function prepare(state: SessionState, remainingMs: number): SessionState {
  return clearResume({ ...state, status: 'preparing', remainingMs });
}

function beginResume(state: SessionState): SessionState {
  const resumeRemainingMs =
    state.resumeStatus === 'replay'
      ? state.resumeRemainingMs ?? state.remainingMs
      : state.remainingMs;
  return {
    ...state,
    status: 'preparing',
    remainingMs: RESUME_PREPARATION_MS,
    resumeRemainingMs,
    pauseReason: null,
  };
}

function prepareForNextSet(state: SessionState): SessionState {
  return {
    ...prepare(state, PREPARATION_MS),
    rightCount: 0,
    leftCount: 0,
  };
}

function activate(state: SessionState): SessionState {
  const phase = getCurrentPhase(state);
  return clearResume({
    ...state,
    status: 'active',
    remainingMs: phase.dose.kind === 'hold' ? state.preferences.balanceSeconds * 1000 : null,
  });
}

function restoreResumedStage(state: SessionState): SessionState {
  switch (state.resumeStatus) {
    case 'active':
      return restoreActive(state, state.resumeRemainingMs);
    case 'set-transition':
      return clearResume({ ...state, status: 'set-transition', remainingMs: state.resumeRemainingMs });
    case 'awaiting-ready':
      return clearResume({ ...state, status: 'awaiting-ready', remainingMs: state.resumeRemainingMs });
    case 'phase-transition':
      return clearResume({ ...state, status: 'phase-transition', remainingMs: state.resumeRemainingMs });
    case 'preparing':
      return restoreActive(state, null);
    case 'replay':
      return restoreActive(state, state.resumeRemainingMs);
    case null:
      return activate(state);
    default:
      return assertNever(state.resumeStatus);
  }
}

function restoreActive(state: SessionState, resumeRemainingMs: number | null): SessionState {
  const phase = getCurrentPhase(state);
  const remainingMs =
    phase.dose.kind === 'hold'
      ? resumeRemainingMs ?? state.preferences.balanceSeconds * 1000
      : null;
  return clearResume({ ...state, status: 'active', remainingMs });
}

function pauseSession(
  state: SessionState,
  event: Extract<SessionEvent, { readonly type: 'PAUSE' }>,
): SessionState {
  if (!canPause(state.status)) return state;

  if (state.status === 'preparing' && state.resumeStatus !== null) {
    return {
      ...state,
      status: 'paused',
      remainingMs: state.resumeRemainingMs,
      resumeRemainingMs: null,
      pauseReason: event.reason,
    };
  }

  if (state.status === 'replay') {
    if (state.resumeStatus === null) return state;
    return {
      ...state,
      status: 'paused',
      remainingMs: state.resumeRemainingMs,
      resumeRemainingMs: null,
      pauseReason: event.reason,
    };
  }

  const remainingMs = resolveRemainder(state.remainingMs, event.remainingMs);
  const resumeStatus = state.status;
  if (resumeStatus === null) return state;

  return {
    ...state,
    status: 'paused',
    remainingMs,
    resumeStatus,
    resumeRemainingMs: null,
    pauseReason: event.reason,
  };
}

function beginReplay(state: SessionState, suppliedRemainingMs: number | null | undefined): SessionState {
  if (state.status === 'active') {
    const remainingMs = resolveRemainder(state.remainingMs, suppliedRemainingMs);
    return {
      ...state,
      status: 'replay',
      remainingMs,
      resumeStatus: 'active',
      resumeRemainingMs: remainingMs,
      pauseReason: null,
    };
  }
  if (state.status === 'awaiting-ready') {
    return {
      ...state,
      status: 'replay',
      remainingMs: resolveRemainder(state.remainingMs, suppliedRemainingMs),
      resumeStatus: 'awaiting-ready',
      resumeRemainingMs: null,
      pauseReason: null,
    };
  }
  if (state.status === 'paused' && (state.resumeStatus === 'active' || state.resumeStatus === 'awaiting-ready')) {
    const remainingMs = resolveRemainder(state.remainingMs, suppliedRemainingMs);
    return {
      ...state,
      status: 'replay',
      remainingMs,
      resumeStatus: state.resumeStatus,
      resumeRemainingMs: state.resumeStatus === 'active' ? remainingMs : null,
      pauseReason: null,
    };
  }
  return state;
}

function finishReplay(state: SessionState): SessionState {
  if (state.status !== 'replay') return state;
  if (state.resumeStatus === 'awaiting-ready') {
    return clearResume({ ...state, status: 'awaiting-ready', remainingMs: null });
  }
  if (state.resumeStatus !== 'active') return state;
  return {
    ...state,
    status: 'preparing',
    remainingMs: RESUME_PREPARATION_MS,
    pauseReason: null,
  };
}

function finishCycle(state: SessionState): SessionState {
  const phase = getCurrentPhase(state);
  if (phase.dose.kind !== 'reps') return state;

  if (phase.dose.sideMode === 'alternating-pairs') return finishSupermanCycle(state, phase);

  const rep = state.rep + 1;
  return rep < phase.dose.reps ? { ...state, rep } : finishSet({ ...state, rep }, phase);
}

function finishSupermanCycle(state: SessionState, phase: RoutinePhase): SessionState {
  if (phase.dose.kind !== 'reps') return state;
  const counts =
    state.rightCount <= state.leftCount
      ? { rightCount: state.rightCount + 1, leftCount: state.leftCount }
      : { rightCount: state.rightCount, leftCount: state.leftCount + 1 };
  const nextState = { ...state, ...counts, rep: counts.rightCount + counts.leftCount };

  return counts.rightCount === phase.dose.reps && counts.leftCount === phase.dose.reps
    ? finishSet(nextState, phase)
    : nextState;
}

function finishHold(state: SessionState): SessionState {
  const phase = getCurrentPhase(state);
  return phase.dose.kind === 'hold' ? finishSet(state, phase) : state;
}

function finishSet(state: SessionState, phase: RoutinePhase): SessionState {
  if (state.setIndex + 1 < phase.dose.sets) {
    return clearResume({
      ...state,
      status: 'set-transition',
      setIndex: state.setIndex + 1,
      rep: 0,
      remainingMs: SET_TRANSITION_MS,
    });
  }
  return completeCurrentPhase(state);
}

function completeCurrentPhase(state: SessionState): SessionState {
  const phaseId = getCurrentPhase(state).id;
  return advancePhase({
    ...state,
    completedPhaseIds: appendUnique(state.completedPhaseIds, phaseId),
  });
}

function skipCurrentPhase(state: SessionState): SessionState {
  const phaseId = getCurrentPhase(state).id;
  return advancePhase({
    ...state,
    skippedPhaseIds: appendUnique(state.skippedPhaseIds, phaseId),
  });
}

function advancePhase(state: SessionState): SessionState {
  const routine = getRoutine(state.routineId);
  const nextPhase = routine.phases[state.phaseIndex + 1];
  if (nextPhase === undefined) {
    return clearResume({ ...state, status: 'complete', remainingMs: null });
  }

  const nextState: SessionState = clearResume({
    ...state,
    phaseIndex: state.phaseIndex + 1,
    setIndex: 0,
    rep: 0,
    rightCount: 0,
    leftCount: 0,
    remainingMs: null,
  });
  return nextPhase.readyGate
    ? { ...nextState, status: 'phase-transition' }
    : activate({ ...nextState, status: 'active' });
}

function awaitReady(state: SessionState): SessionState {
  return clearResume({ ...state, status: 'awaiting-ready', remainingMs: null });
}

function decrementRep(state: SessionState): SessionState {
  const phase = getCurrentPhase(state);
  if (phase.dose.kind !== 'reps') return state;
  if (phase.dose.sideMode !== 'alternating-pairs') return state.rep === 0 ? state : { ...state, rep: state.rep - 1 };

  if (state.rightCount === 0 && state.leftCount === 0) return state;
  const counts =
    state.rightCount === state.leftCount
      ? { rightCount: state.rightCount, leftCount: state.leftCount - 1 }
      : { rightCount: state.rightCount - 1, leftCount: state.leftCount };
  return { ...state, ...counts, rep: counts.rightCount + counts.leftCount };
}

function restartSet(state: SessionState): SessionState {
  const phase = getCurrentPhase(state);
  return clearResume({
    ...state,
    rep: 0,
    rightCount: 0,
    leftCount: 0,
    remainingMs: phase.dose.kind === 'hold' ? state.preferences.balanceSeconds * 1000 : null,
  });
}

function restartPausedSet(state: SessionState): SessionState {
  if (state.resumeStatus !== 'active' && state.resumeStatus !== 'set-transition') return state;
  const phase = getCurrentPhase(state);
  return {
    ...state,
    rep: 0,
    rightCount: 0,
    leftCount: 0,
    remainingMs: phase.dose.kind === 'hold' ? state.preferences.balanceSeconds * 1000 : null,
    resumeStatus: 'active',
    resumeRemainingMs: null,
  };
}

function clearResume(state: SessionState): SessionState {
  return {
    ...state,
    resumeStatus: null,
    resumeRemainingMs: null,
    pauseReason: null,
  };
}

function resolveRemainder(current: number | null, supplied: number | null | undefined): number | null {
  return supplied === undefined ? current : supplied;
}

function isValidRemainder(value: number | null | undefined): boolean {
  return value === undefined || value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0);
}

function canUseSuppliedRemainder(state: SessionState, value: number | null | undefined): boolean {
  return (
    isValidRemainder(value) &&
    (state.status === 'replay' || !(value === null && requiresNumericRemainder(state)))
  );
}

function requiresNumericRemainder(state: SessionState): boolean {
  if (state.status === 'preparing' || state.status === 'set-transition') return true;
  if (state.status === 'active') return getCurrentPhase(state).dose.kind === 'hold';

  if (state.status === 'paused' || state.status === 'replay') {
    if (state.resumeStatus === 'preparing' || state.resumeStatus === 'set-transition') return true;
    return state.resumeStatus === 'active' && getCurrentPhase(state).dose.kind === 'hold';
  }

  return false;
}

function appendUnique<T>(items: readonly T[], item: T): readonly T[] {
  return items.includes(item) ? items : [...items, item];
}

function canPause(status: SessionStatus): status is Exclude<SessionStatus, 'paused' | 'complete'> {
  return status !== 'paused' && status !== 'complete';
}

function canSkip(status: SessionStatus): boolean {
  return status !== 'complete';
}

function assertNever(value: never): never {
  throw new Error(`Unhandled session event: ${JSON.stringify(value)}`);
}
