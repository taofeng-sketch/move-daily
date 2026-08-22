import type { CoachPace, RoutineId } from '../domain/routine';
import type { SessionState } from '../session/session';

export interface Preferences {
  readonly voiceEnabled: boolean;
  readonly coachPace: CoachPace;
  readonly balanceSeconds: 10 | 15;
  readonly reducedMotion: boolean;
  readonly installEducationDismissed: boolean;
  readonly reminderEducationDismissed: boolean;
}

export interface CompletionRecord {
  readonly id: string;
  readonly routineId: RoutineId;
  readonly localDate: string;
  readonly outcome: 'complete' | 'saved-with-skips';
}

export interface PersistedAppState {
  readonly version: 1;
  readonly preferences: Preferences;
  readonly activeSession: SessionState | null;
  readonly history: readonly CompletionRecord[];
}

export interface LoadResult {
  readonly state: PersistedAppState;
  readonly available: boolean;
  readonly recoveredFromCorruption?: boolean;
}

export interface SaveResult {
  readonly ok: boolean;
}

export interface WeeklyProgress {
  readonly backCompletedDates: readonly string[];
  readonly toeCompleted: number;
  readonly toeTarget: 4;
}

export const DEFAULT_APP_STATE: PersistedAppState = {
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
