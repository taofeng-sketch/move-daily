import { getRoutine } from '../domain/routines';
import type { CoachPace, PhaseId, RoutineId, RoutinePhase } from '../domain/routine';
import type { SessionState, SessionStatus } from '../session/session';
import {
  DEFAULT_APP_STATE,
  type CompletionRecord,
  type LoadResult,
  type PersistedAppState,
  type Preferences,
  type SaveResult,
} from './appState';

export const APP_STORAGE_KEY = 'move-daily:app-state:v1';

type StorageAdapter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const ROUTINE_IDS: readonly RoutineId[] = ['back', 'left-toe'];
const COACH_PACES: readonly CoachPace[] = ['slow', 'standard', 'brisk'];
const SESSION_STATUSES: readonly SessionStatus[] = [
  'awaiting-ready',
  'preparing',
  'active',
  'set-transition',
  'phase-transition',
  'paused',
  'replay',
  'complete',
];
const RESUME_STATUSES: readonly Exclude<SessionStatus, 'paused' | 'complete'>[] = [
  'awaiting-ready',
  'preparing',
  'active',
  'set-transition',
  'phase-transition',
  'replay',
];

export function loadAppState(storage?: StorageAdapter): LoadResult {
  const adapter = storage ?? getBrowserStorage();
  if (adapter === undefined) return { state: DEFAULT_APP_STATE, available: false };

  let raw: string | null;
  try {
    raw = adapter.getItem(APP_STORAGE_KEY);
  } catch {
    return { state: DEFAULT_APP_STATE, available: false };
  }
  if (raw === null) return { state: DEFAULT_APP_STATE, available: true };

  try {
    const parsed: unknown = JSON.parse(raw);
    return isPersistedAppState(parsed) ? { state: parsed, available: true } : recoveredState();
  } catch {
    return recoveredState();
  }
}

export function saveAppState(state: PersistedAppState, storage?: StorageAdapter): SaveResult {
  const adapter = storage ?? getBrowserStorage();
  if (adapter === undefined || !isPersistedAppState(state)) return { ok: false };

  try {
    adapter.setItem(APP_STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export function clearAppState(storage?: StorageAdapter): SaveResult {
  const adapter = storage ?? getBrowserStorage();
  if (adapter === undefined) return { ok: false };

  try {
    adapter.removeItem(APP_STORAGE_KEY);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function recoveredState(): LoadResult {
  return { state: DEFAULT_APP_STATE, available: true, recoveredFromCorruption: true };
}

function getBrowserStorage(): StorageAdapter | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function isPersistedAppState(value: unknown): value is PersistedAppState {
  if (!hasExactKeys(value, ['version', 'preferences', 'activeSession', 'history'])) return false;
  const state = value as Record<string, unknown>;

  return (
    state.version === 1 &&
    isPreferences(state.preferences) &&
    (state.activeSession === null || isSessionState(state.activeSession)) &&
    Array.isArray(state.history) &&
    state.history.length <= 180 &&
    state.history.every(isCompletionRecord)
  );
}

function isPreferences(value: unknown): value is Preferences {
  if (
    !hasExactKeys(value, [
      'voiceEnabled',
      'coachPace',
      'balanceSeconds',
      'reducedMotion',
      'installEducationDismissed',
      'reminderEducationDismissed',
    ])
  ) {
    return false;
  }
  const preferences = value as Record<string, unknown>;

  return (
    typeof preferences.voiceEnabled === 'boolean' &&
    isOneOf(preferences.coachPace, COACH_PACES) &&
    (preferences.balanceSeconds === 10 || preferences.balanceSeconds === 15) &&
    typeof preferences.reducedMotion === 'boolean' &&
    typeof preferences.installEducationDismissed === 'boolean' &&
    typeof preferences.reminderEducationDismissed === 'boolean'
  );
}

function isCompletionRecord(value: unknown): value is CompletionRecord {
  if (!hasExactKeys(value, ['id', 'routineId', 'localDate', 'outcome'])) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || !isOneOf(record.routineId, ROUTINE_IDS) || !isLocalDate(record.localDate)) {
    return false;
  }
  if (record.outcome !== 'complete' && record.outcome !== 'saved-with-skips') return false;

  return record.id === `${record.routineId}:${record.localDate}:${record.outcome}`;
}

function isSessionState(value: unknown): value is SessionState {
  if (
    !hasExactKeys(value, [
      'version',
      'routineId',
      'status',
      'phaseIndex',
      'setIndex',
      'rep',
      'rightCount',
      'leftCount',
      'remainingMs',
      'preferences',
      'skippedPhaseIds',
      'completedPhaseIds',
      'resumeStatus',
      'resumeRemainingMs',
      'pauseReason',
    ])
  ) {
    return false;
  }
  const session = value as Record<string, unknown>;
  if (!isOneOf(session.routineId, ROUTINE_IDS)) return false;
  const routine = getRoutine(session.routineId);
  const phaseIds = routine.phases.map((phase) => phase.id);

  const hasValidFields =
    session.version === 1 &&
    isOneOf(session.status, SESSION_STATUSES) &&
    isBoundedInteger(session.phaseIndex, phaseIds.length - 1) &&
    isNonNegativeInteger(session.setIndex) &&
    isNonNegativeInteger(session.rep) &&
    isNonNegativeInteger(session.rightCount) &&
    isNonNegativeInteger(session.leftCount) &&
    (session.remainingMs === null || (typeof session.remainingMs === 'number' && Number.isFinite(session.remainingMs) && session.remainingMs >= 0)) &&
    isSessionPreferences(session.preferences) &&
    isKnownPhaseList(session.skippedPhaseIds, phaseIds) &&
    isKnownPhaseList(session.completedPhaseIds, phaseIds) &&
    (session.resumeStatus === null || isOneOf(session.resumeStatus, RESUME_STATUSES)) &&
    (session.resumeRemainingMs === null ||
      (typeof session.resumeRemainingMs === 'number' &&
        Number.isFinite(session.resumeRemainingMs) &&
        session.resumeRemainingMs >= 0)) &&
    (session.pauseReason === null || session.pauseReason === 'user' || session.pauseReason === 'background');

  if (!hasValidFields) return false;
  const sessionState = session as unknown as SessionState;
  return isResumeShapeConsistent(sessionState, routine.phases[sessionState.phaseIndex]);
}

function isResumeShapeConsistent(session: SessionState, phase: RoutinePhase | undefined): boolean {
  if (phase === undefined) return false;

  switch (session.status) {
    case 'active':
      return hasClearedResumeMetadata(session) && hasActiveRemainder(session.remainingMs, phase);
    case 'awaiting-ready':
    case 'phase-transition':
      return hasClearedResumeMetadata(session) && session.remainingMs === null;
    case 'set-transition':
      return hasClearedResumeMetadata(session) && isRemainder(session.remainingMs);
    case 'preparing':
      return (
        isRemainder(session.remainingMs) &&
        session.pauseReason === null &&
        (session.resumeStatus === null
          ? session.resumeRemainingMs === null
          : hasResumeTargetRemainder(session.resumeStatus, session.resumeRemainingMs, phase))
      );
    case 'paused':
      return (
        session.resumeStatus !== null &&
        session.resumeRemainingMs === null &&
        session.pauseReason !== null &&
        hasResumeTargetRemainder(session.resumeStatus, session.remainingMs, phase)
      );
    case 'replay':
      return (
        session.pauseReason === null &&
        (session.resumeStatus === 'active'
          ? hasActiveRemainder(session.resumeRemainingMs, phase)
          : session.resumeStatus === 'awaiting-ready' && session.resumeRemainingMs === null)
      );
    case 'complete':
      return hasClearedResumeMetadata(session) && session.remainingMs === null;
    default:
      return false;
  }
}

function hasClearedResumeMetadata(session: SessionState): boolean {
  return session.resumeStatus === null && session.resumeRemainingMs === null && session.pauseReason === null;
}

function hasResumeTargetRemainder(
  status: Exclude<SessionStatus, 'paused' | 'complete'>,
  remainingMs: number | null,
  phase: RoutinePhase,
): boolean {
  switch (status) {
    case 'active':
      return hasActiveRemainder(remainingMs, phase);
    case 'preparing':
    case 'set-transition':
      return isRemainder(remainingMs);
    case 'awaiting-ready':
    case 'phase-transition':
      return remainingMs === null;
    case 'replay':
      return false;
    default:
      return false;
  }
}

function hasActiveRemainder(
  remainingMs: number | null,
  phase: RoutinePhase,
): boolean {
  return phase.dose.kind === 'hold' ? isRemainder(remainingMs) : remainingMs === null;
}

function isRemainder(value: number | null): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isSessionPreferences(value: unknown): boolean {
  return (
    hasExactKeys(value, ['coachPace', 'balanceSeconds']) &&
    isOneOf((value as Record<string, unknown>).coachPace, COACH_PACES) &&
    ((value as Record<string, unknown>).balanceSeconds === 10 || (value as Record<string, unknown>).balanceSeconds === 15)
  );
}

function isKnownPhaseList(value: unknown, phaseIds: readonly PhaseId[]): boolean {
  return Array.isArray(value) && value.every((phaseId) => isOneOf(phaseId, phaseIds)) && new Set(value).size === value.length;
}

function isLocalDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function hasExactKeys(value: unknown, keys: readonly string[]): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
  );
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isBoundedInteger(value: unknown, max: number): boolean {
  return isNonNegativeInteger(value) && value <= max;
}
