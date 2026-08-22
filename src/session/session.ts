import type { CoachPace, PhaseId, RoutineId } from '../domain/routine';

export type SessionStatus =
  | 'awaiting-ready'
  | 'preparing'
  | 'active'
  | 'set-transition'
  | 'phase-transition'
  | 'paused'
  | 'replay'
  | 'complete';

export interface SessionPreferences {
  readonly coachPace: CoachPace;
  readonly balanceSeconds: 10 | 15;
}

export interface SessionState {
  readonly version: 1;
  readonly routineId: RoutineId;
  readonly status: SessionStatus;
  readonly phaseIndex: number;
  readonly setIndex: number;
  readonly rep: number;
  readonly rightCount: number;
  readonly leftCount: number;
  readonly remainingMs: number | null;
  readonly preferences: SessionPreferences;
  readonly skippedPhaseIds: readonly PhaseId[];
  readonly completedPhaseIds: readonly PhaseId[];
  readonly resumeStatus: Exclude<SessionStatus, 'paused' | 'complete'> | null;
  readonly resumeRemainingMs: number | null;
  readonly pauseReason: 'user' | 'background' | null;
}

export type SessionEvent =
  | { readonly type: 'READY' }
  | { readonly type: 'NEED_MORE_TIME' }
  | { readonly type: 'START_NOW' }
  | { readonly type: 'PREPARATION_FINISHED' }
  | { readonly type: 'CYCLE_FINISHED' }
  | { readonly type: 'HOLD_FINISHED' }
  | { readonly type: 'TRANSITION_FINISHED' }
  | {
      readonly type: 'PAUSE';
      readonly reason: 'user' | 'background';
      readonly remainingMs?: number | null;
    }
  | { readonly type: 'RESUME' }
  | { readonly type: 'REPLAY_DEMO'; readonly remainingMs?: number | null }
  | { readonly type: 'REPLAY_FINISHED' }
  | { readonly type: 'DECREMENT_REP' }
  | { readonly type: 'RESTART_SET' }
  | { readonly type: 'SKIP_PHASE' }
  | { readonly type: 'SET_COACH_PACE'; readonly pace: CoachPace };

export interface SessionSummary {
  readonly completed: number;
  readonly skipped: number;
  readonly total: number;
  readonly label: 'Session complete' | 'Session saved';
}
