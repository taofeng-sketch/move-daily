import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoutineId } from '../domain/routine';
import {
  DEFAULT_APP_STATE,
  type CompletionRecord,
  type PersistedAppState,
  type Preferences,
} from '../persistence/appState';
import { recordSession, safeLocalDate } from '../persistence/history';
import {
  APP_STORAGE_KEY,
  clearAppState,
  loadAppState,
  saveAppState,
} from '../persistence/storage';
import { createSession, sessionReducer } from '../session/reducer';
import type { SessionState } from '../session/session';
import type { SettingsPreferencePatch } from '../features/settings/SettingsScreen';

export type AppRoute =
  | { readonly name: 'home' }
  | { readonly name: 'player'; readonly routineId: RoutineId; readonly session: SessionState }
  | { readonly name: 'completion'; readonly session: SessionState }
  | { readonly name: 'settings'; readonly returnTo: 'home' | 'completion' };

export type PersistenceNotice = 'unavailable' | 'recovered' | null;

export interface AppStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AppModelDependencies {
  readonly storage?: AppStorage;
  readonly clock?: () => Date;
  readonly prefersReducedMotion?: () => boolean;
}

export interface AppModel {
  readonly route: AppRoute;
  readonly preferences: Preferences;
  readonly history: readonly CompletionRecord[];
  readonly activeSession: SessionState | null;
  readonly now: Date;
  readonly persistenceNotice: PersistenceNotice;
  startRoutine(routineId: RoutineId): void;
  resumeSession(): void;
  saveActiveSession(session: SessionState): void;
  exitSession(session: SessionState): void;
  finishSession(session: SessionState): void;
  openSettings(): void;
  closeSettings(): void;
  goHome(): void;
  resetAllProgress(): void;
  updatePreferences(patch: SettingsPreferencePatch): void;
}

interface InitialModelState {
  readonly appState: PersistedAppState;
  readonly notice: PersistenceNotice;
}

interface ModelRuntime {
  readonly storage: AppStorage | undefined;
  readonly clock: () => Date;
  readonly prefersReducedMotion: () => boolean;
}

export function useAppModel(dependencies: AppModelDependencies = {}): AppModel {
  const [runtime] = useState<ModelRuntime>(() => ({
    storage: resolveStorage(dependencies.storage),
    clock: dependencies.clock ?? (() => new Date()),
    prefersReducedMotion: dependencies.prefersReducedMotion ?? browserPrefersReducedMotion,
  }));
  const [initial] = useState<InitialModelState>(() =>
    loadInitialState(runtime.storage, runtime.prefersReducedMotion),
  );

  const [appState, setAppState] = useState(initial.appState);
  const appStateRef = useRef(appState);
  const [route, setRoute] = useState<AppRoute>({ name: 'home' });
  const routeRef = useRef<AppRoute>(route);
  const [persistenceNotice, setPersistenceNotice] = useState<PersistenceNotice>(
    initial.notice,
  );
  const [now, setNow] = useState(() => runtime.clock());
  const completionRef = useRef<SessionState | null>(null);
  const finishedFingerprintRef = useRef<string | null>(null);

  const replaceRoute = useCallback((next: AppRoute): void => {
    routeRef.current = next;
    setRoute(next);
  }, []);

  const replaceState = useCallback((next: PersistedAppState, persist = true): void => {
    appStateRef.current = next;
    setAppState(next);
    if (!persist) return;
    if (!saveAppState(next, runtime.storage).ok) setPersistenceNotice('unavailable');
  }, [runtime.storage]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const scheduleMidnight = (): void => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      const current = runtime.clock();
      setNow(current);
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      );
      timeoutId = setTimeout(scheduleMidnight, Math.max(1, nextMidnight.getTime() - current.getTime()));
    };
    const onVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') scheduleMidnight();
    };

    scheduleMidnight();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [runtime]);

  const startRoutine = useCallback((routineId: RoutineId): void => {
    const current = appStateRef.current;
    const session = createSession(routineId, {
      coachPace: current.preferences.coachPace,
      balanceSeconds: current.preferences.balanceSeconds,
    });
    const next = { ...current, activeSession: session };
    finishedFingerprintRef.current = null;
    replaceState(next);
    replaceRoute({ name: 'player', routineId, session });
  }, [replaceRoute, replaceState]);

  const resumeSession = useCallback((): void => {
    const active = appStateRef.current.activeSession;
    if (active === null || active.status === 'complete') return;
    const paused =
      active.status === 'paused'
        ? active
        : sessionReducer(active, {
            type: 'PAUSE',
            reason: 'background',
            remainingMs: active.remainingMs,
          });
    const resumed = sessionReducer(paused, { type: 'RESUME' });
    const next = { ...appStateRef.current, activeSession: resumed };
    replaceState(next);
    replaceRoute({ name: 'player', routineId: resumed.routineId, session: resumed });
  }, [replaceRoute, replaceState]);

  const saveActiveSession = useCallback((session: SessionState): void => {
    if (session.status === 'complete') return;
    const next = { ...appStateRef.current, activeSession: session };
    replaceState(next);
    if (routeRef.current.name === 'player') {
      replaceRoute({ name: 'player', routineId: session.routineId, session });
    }
  }, [replaceRoute, replaceState]);

  const exitSession = useCallback((session: SessionState): void => {
    const next = { ...appStateRef.current, activeSession: session };
    replaceState(next);
    replaceRoute({ name: 'home' });
  }, [replaceRoute, replaceState]);

  const finishSession = useCallback((session: SessionState): void => {
    if (session.status !== 'complete') return;
    const fingerprint = JSON.stringify(session);
    if (finishedFingerprintRef.current === fingerprint) return;
    finishedFingerprintRef.current = fingerprint;
    const next = recordSession(appStateRef.current, session, safeLocalDate(runtime.clock()));
    completionRef.current = session;
    replaceState(next);
    replaceRoute({ name: 'completion', session });
  }, [replaceRoute, replaceState, runtime]);

  const openSettings = useCallback((): void => {
    const current = routeRef.current;
    const returnTo = current.name === 'completion' ? 'completion' : 'home';
    if (current.name === 'completion') completionRef.current = current.session;
    replaceRoute({ name: 'settings', returnTo });
  }, [replaceRoute]);

  const closeSettings = useCallback((): void => {
    const current = routeRef.current;
    if (current.name === 'settings' && current.returnTo === 'completion' && completionRef.current !== null) {
      replaceRoute({ name: 'completion', session: completionRef.current });
      return;
    }
    replaceRoute({ name: 'home' });
  }, [replaceRoute]);

  const goHome = useCallback((): void => replaceRoute({ name: 'home' }), [replaceRoute]);

  const resetAllProgress = useCallback((): void => {
    const cleared = clearAppState(runtime.storage);
    const reset = cloneDefaultState();
    appStateRef.current = reset;
    setAppState(reset);
    completionRef.current = null;
    finishedFingerprintRef.current = null;
    if (!cleared.ok) setPersistenceNotice('unavailable');
    else setPersistenceNotice(null);
    replaceRoute({ name: 'home' });
  }, [replaceRoute, runtime.storage]);

  const updatePreferences = useCallback((patch: SettingsPreferencePatch): void => {
    const current = appStateRef.current;
    const next: PersistedAppState = {
      ...current,
      preferences: {
        ...current.preferences,
        ...pickEditablePreferences(patch),
      },
    };
    replaceState(next);
  }, [replaceState]);

  return {
    route,
    preferences: appState.preferences,
    history: appState.history,
    activeSession: appState.activeSession,
    now,
    persistenceNotice,
    startRoutine,
    resumeSession,
    saveActiveSession,
    exitSession,
    finishSession,
    openSettings,
    closeSettings,
    goHome,
    resetAllProgress,
    updatePreferences,
  };
}

function loadInitialState(
  storage: AppStorage | undefined,
  prefersReducedMotion: () => boolean,
): InitialModelState {
  let hadStoredRecord: boolean;
  try {
    hadStoredRecord = storage?.getItem(APP_STORAGE_KEY) !== null;
  } catch {
    hadStoredRecord = false;
  }
  const loaded = loadAppState(storage);
  const noValidRecord = !hadStoredRecord || loaded.recoveredFromCorruption === true;
  const cloned = cloneState(
    loaded.state,
    noValidRecord ? safeMotionPreference(prefersReducedMotion) : undefined,
  );
  const appState =
    cloned.activeSession?.status === 'complete'
      ? { ...cloned, activeSession: null }
      : cloned;

  return {
    appState,
    notice: !loaded.available
      ? 'unavailable'
      : loaded.recoveredFromCorruption
        ? 'recovered'
        : null,
  };
}

function cloneState(state: PersistedAppState, reducedMotion?: boolean): PersistedAppState {
  return {
    ...state,
    preferences: {
      ...state.preferences,
      ...(reducedMotion === undefined ? {} : { reducedMotion }),
    },
    history: [...state.history],
  };
}

function cloneDefaultState(): PersistedAppState {
  return cloneState(DEFAULT_APP_STATE);
}

function pickEditablePreferences(patch: SettingsPreferencePatch): SettingsPreferencePatch {
  const validPace =
    patch.coachPace === 'slow' ||
    patch.coachPace === 'standard' ||
    patch.coachPace === 'brisk';
  return {
    ...(typeof patch.voiceEnabled === 'boolean' ? { voiceEnabled: patch.voiceEnabled } : {}),
    ...(validPace ? { coachPace: patch.coachPace } : {}),
    ...(patch.balanceSeconds === 10 || patch.balanceSeconds === 15
      ? { balanceSeconds: patch.balanceSeconds }
      : {}),
    ...(typeof patch.reducedMotion === 'boolean' ? { reducedMotion: patch.reducedMotion } : {}),
  };
}

function resolveStorage(injected: AppStorage | undefined): AppStorage | undefined {
  if (injected !== undefined) return injected;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function safeMotionPreference(reader: () => boolean): boolean {
  try {
    return reader();
  } catch {
    return false;
  }
}

function browserPrefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
