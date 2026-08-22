import { useCallback, useEffect, useRef, useState } from 'react';
import { useCoachCycle } from '../../coach/runtime/useCoachCycle';
import type { CoachPace, Routine, RoutineId, RoutinePhase } from '../../domain/routine';
import { getCycleMs, getRoutine } from '../../domain/routines';
import { createCoachAudio, type CoachAudio } from '../../platform/audio/coachAudio';
import { observeVisibility } from '../../platform/lifecycle/visibility';
import {
  createWakeLockController,
  type WakeLockController,
} from '../../platform/lifecycle/wakeLock';
import { createSession, sessionReducer } from '../../session/reducer';
import { getCurrentPhase, getSessionSummary } from '../../session/selectors';
import type {
  SessionEvent,
  SessionPreferences,
  SessionState,
  SessionStatus,
} from '../../session/session';
import { useDeadline } from './useDeadline';

export interface SessionControllerDeps {
  readonly audio?: CoachAudio;
  readonly wakeLock?: WakeLockController;
  readonly initialSession?: SessionState;
  readonly preferences?: SessionPreferences;
  readonly voiceEnabled?: boolean;
  readonly reducedMotion?: boolean;
  readonly saveSession?: (state: SessionState) => void;
  readonly onExit?: (state: SessionState) => void;
  readonly onFinished?: (state: SessionState) => void;
  readonly onVoiceEnabledChange?: (enabled: boolean) => void;
}

export interface PlayerViewModel {
  readonly state: SessionState;
  readonly routine: Routine;
  readonly phase: RoutinePhase;
  readonly status: SessionStatus;
  readonly exercisePosition: string;
  readonly setLabel: string;
  readonly sideLabel: string | null;
  readonly countLabel: string;
  readonly caption: string;
  readonly countdownSeconds: number | null;
  readonly coachProgress: number;
  readonly speechAvailable: boolean;
  readonly wakeLockActive: boolean;
  readonly voiceEnabled: boolean;
  readonly reducedMotion: boolean;
}

export interface PlayerActions {
  start(): Promise<void>;
  ready(): void;
  needMoreTime(): void;
  startNow(): void;
  pause(): void;
  resume(): Promise<void>;
  replay(): void;
  markRep(): void;
  decrementRep(): void;
  restartSet(): void;
  skip(): void;
  background(): void;
  exit(): void;
  setCoachPace(pace: CoachPace): void;
  setVoiceEnabled(enabled: boolean): void;
}

export interface SessionControllerOptions extends SessionControllerDeps {
  readonly routineId: RoutineId;
}

const DEFAULT_PREFERENCES: SessionPreferences = {
  coachPace: 'standard',
  balanceSeconds: 10,
};

function isNonNegativeFinite(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

interface OwnedAudioHandle {
  readonly audio: CoachAudio;
  ensure(): CoachAudio;
  dispose(): void;
}

function createOwnedAudioHandle(factory: () => CoachAudio): OwnedAudioHandle {
  let resource: CoachAudio | null = null;
  let disposed = false;
  const ensure = () => {
    if (resource === null) resource = factory();
    return resource;
  };

  return {
    ensure,
    audio: {
      get speechAvailable() {
        return resource?.speechAvailable ?? false;
      },
      unlock: () => ensure().unlock(),
      speak: (text) => ensure().speak(text),
      tone: (kind) => ensure().tone(kind),
      cancel: () => resource?.cancel(),
      dispose: () => undefined,
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      resource?.dispose();
    },
  };
}

function uniqueExercisePosition(routine: Routine, phase: RoutinePhase): string {
  const exerciseIds = [...new Set(routine.phases.map((item) => item.exerciseId))];
  return `Exercise ${exerciseIds.indexOf(phase.exerciseId) + 1} of ${exerciseIds.length}`;
}

function stageDuration(state: SessionState, phase: RoutinePhase): number | null {
  if (state.status === 'replay') return getCycleMs(phase, state.preferences.coachPace);
  if (state.status === 'preparing' || state.status === 'set-transition') return state.remainingMs;
  if (state.status === 'active' && phase.dose.kind === 'hold') return state.remainingMs;
  return null;
}

function phaseTransitionCue(phase: RoutinePhase): string {
  return `Exercise complete. Next exercise: ${phase.name}. ${phase.setupCues.join(' ')}`;
}

function countdownWord(seconds: number): string | null {
  switch (seconds) {
    case 5: return 'Five';
    case 4: return 'Four';
    case 3: return 'Three';
    case 2: return 'Two';
    case 1: return 'One';
    default: return null;
  }
}

function liveCaption(
  state: SessionState,
  phase: RoutinePhase,
  countdownSeconds: number | null,
): string {
  switch (state.status) {
    case 'awaiting-ready':
      return phase.setupCues.join(' ');
    case 'phase-transition':
      return phaseTransitionCue(phase);
    case 'preparing':
      return 'Get ready';
    case 'active':
      if (phase.dose.kind === 'hold' && countdownSeconds !== null && countdownSeconds <= 3) {
        return phase.movementCues.at(-1) ?? 'Three, two, one. Done.';
      }
      return phase.movementCues.join(' ');
    case 'set-transition':
      return `Set complete. Set ${state.setIndex + 1}.`;
    case 'replay':
      return 'Replay demo';
    case 'paused':
      return 'Paused';
    case 'complete':
      return getSessionSummary(state).label;
  }
}

export function useSessionController(
  options: SessionControllerOptions,
): { readonly view: PlayerViewModel; readonly actions: PlayerActions } {
  const [state, setState] = useState<SessionState>(() => {
    if (options.initialSession && options.initialSession.routineId !== options.routineId) {
      throw new Error('Initial session routine does not match the requested routine.');
    }
    return options.initialSession
      ?? createSession(options.routineId, options.preferences ?? DEFAULT_PREFERENCES);
  });
  const stateRef = useRef(state);
  const [voiceEnabled, setVoiceEnabledState] = useState(options.voiceEnabled ?? true);
  const voiceEnabledRef = useRef(voiceEnabled);
  const [, setCapabilityVersion] = useState(0);

  const [injectedAudio] = useState<CoachAudio | undefined>(() => options.audio);
  const [ownedAudio] = useState<OwnedAudioHandle | null>(() =>
    injectedAudio === undefined ? createOwnedAudioHandle(createCoachAudio) : null,
  );
  const audio = injectedAudio ?? ownedAudio?.audio;
  if (audio === undefined) throw new Error('Session audio is unavailable.');
  const [wakeLock] = useState<WakeLockController>(() =>
    options.wakeLock ?? createWakeLockController(),
  );
  const saveSession = options.saveSession;
  const reducedMotion = options.reducedMotion ?? false;
  const routine = getRoutine(state.routineId);
  const phase = getCurrentPhase(state);

  const dispatch = useCallback((event: SessionEvent): SessionState => {
    const nextState = sessionReducer(stateRef.current, event);
    stateRef.current = nextState;
    setState(nextState);
    return nextState;
  }, []);

  const deadlineDuration = stageDuration(state, phase);
  const deadlineKey = `${state.status}:${state.phaseIndex}:${state.setIndex}:${state.resumeStatus ?? 'none'}:${deadlineDuration ?? 'none'}`;

  const onDeadlineElapsed = useCallback(() => {
    const current = stateRef.current;
    const currentPhase = getCurrentPhase(current);
    if (current.status === 'preparing') dispatch({ type: 'PREPARATION_FINISHED' });
    else if (current.status === 'set-transition') dispatch({ type: 'TRANSITION_FINISHED' });
    else if (current.status === 'replay') dispatch({ type: 'REPLAY_FINISHED' });
    else if (current.status === 'active' && currentPhase.dose.kind === 'hold') {
      dispatch({ type: 'HOLD_FINISHED' });
    }
  }, [dispatch]);

  const deadline = useDeadline({
    durationMs: deadlineDuration,
    running: isNonNegativeFinite(deadlineDuration),
    deadlineKey,
    onElapsed: onDeadlineElapsed,
  });

  const onCycleComplete = useCallback(() => {
    dispatch({ type: 'CYCLE_FINISHED' });
  }, [dispatch]);
  const coachCycle = useCoachCycle({
    durationMs: getCycleMs(phase, state.preferences.coachPace),
    running: state.status === 'active' && phase.dose.kind === 'reps' && !reducedMotion,
    onCycleComplete,
  });
  const resetCoachCycle = coachCycle.reset;
  const coachBoundaryKey = `${state.phaseIndex}:${state.setIndex}`;
  const previousCoachBoundaryRef = useRef(coachBoundaryKey);
  useEffect(() => {
    if (previousCoachBoundaryRef.current === coachBoundaryKey) return;
    previousCoachBoundaryRef.current = coachBoundaryKey;
    resetCoachCycle();
  }, [coachBoundaryKey, resetCoachCycle]);

  const sampleRemaining = useCallback((): number | undefined => {
    const current = stateRef.current;
    const currentPhase = getCurrentPhase(current);
    const timed =
      current.status === 'preparing' ||
      current.status === 'set-transition' ||
      current.status === 'replay' ||
      (current.status === 'active' && currentPhase.dose.kind === 'hold');
    if (!timed) return undefined;
    const remainingMs = deadline.getRemainingMs();
    return remainingMs !== null && Number.isFinite(remainingMs) && remainingMs >= 0
      ? remainingMs
      : undefined;
  }, [deadline]);

  const cancelAudio = useCallback(() => {
    try {
      audio.cancel();
    } catch {
      // Captions and state remain usable if an injected capability fails.
    }
  }, [audio]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabledRef.current) return;
    try {
      audio.speak(text);
    } catch {
      // Spoken cues are progressive enhancement only.
    }
  }, [audio]);

  const stageCueKey = `${state.status}:${state.phaseIndex}:${state.setIndex}`;
  const countdownSeconds = deadline.remainingMs === null
    ? null
    : Math.max(0, Math.ceil(deadline.remainingMs / 1000));
  const lastStageCueRef = useRef<string | null>(null);
  const lastCountdownCueRef = useRef<string | null>(null);
  const lastMovementCueRef = useRef<string | null>(null);
  const finishedStateRef = useRef<SessionState | null>(null);
  const onFinishedRef = useRef(options.onFinished);
  const onExitRef = useRef(options.onExit);
  useEffect(() => {
    onFinishedRef.current = options.onFinished;
  }, [options.onFinished]);
  useEffect(() => {
    onExitRef.current = options.onExit;
  }, [options.onExit]);
  useEffect(() => {
    if (lastStageCueRef.current === stageCueKey) return;
    lastStageCueRef.current = stageCueKey;
    const current = stateRef.current;
    const currentPhase = getCurrentPhase(current);
    cancelAudio();
    switch (current.status) {
      case 'awaiting-ready':
        speak(`${currentPhase.name}. ${currentPhase.setupCues.join(' ')}`);
        break;
      case 'preparing':
        {
          const firstCount = countdownSeconds === null ? null : countdownWord(countdownSeconds);
          speak(firstCount === null ? 'Get ready' : `Get ready. ${firstCount}.`);
        }
        lastCountdownCueRef.current = `${stageCueKey}:${countdownSeconds ?? 'none'}`;
        break;
      case 'active':
        try {
          audio.tone('start');
        } catch {
          // Visual progression is authoritative.
        }
        speak(currentPhase.movementCues.join(' ') || currentPhase.name);
        if (coachCycle.cycle < 1 || currentPhase.movementCues.length === 0) {
          lastMovementCueRef.current = null;
        } else {
          const cueIndex = Math.min(
            currentPhase.movementCues.length - 1,
            Math.floor(coachCycle.progress * currentPhase.movementCues.length),
          );
          lastMovementCueRef.current =
            `${current.phaseIndex}:${current.setIndex}:${coachCycle.cycle}:${cueIndex}`;
        }
        break;
      case 'set-transition':
        speak(`Set complete. Set ${current.setIndex + 1}.`);
        break;
      case 'phase-transition':
        speak(phaseTransitionCue(currentPhase));
        break;
      case 'replay':
        break;
      case 'paused':
        break;
      case 'complete': {
        const summary = getSessionSummary(current);
        try {
          audio.tone('complete');
        } catch {
          // The honest visible summary is always available.
        }
        speak(summary.label);
        if (finishedStateRef.current !== current) {
          finishedStateRef.current = current;
          onFinishedRef.current?.(current);
        }
        break;
      }
    }
  }, [audio, cancelAudio, coachCycle.cycle, coachCycle.progress, countdownSeconds, speak, stageCueKey]);

  useEffect(() => {
    const current = stateRef.current;
    if (current.status !== 'preparing' || countdownSeconds === null || countdownSeconds < 1) {
      lastCountdownCueRef.current = null;
      return;
    }
    const cueKey = `${stageCueKey}:${countdownSeconds}`;
    if (lastCountdownCueRef.current === cueKey) return;
    lastCountdownCueRef.current = cueKey;
    const cue = countdownWord(countdownSeconds);
    if (cue !== null) {
      cancelAudio();
      speak(cue);
    }
  }, [cancelAudio, countdownSeconds, speak, stageCueKey]);

  useEffect(() => {
    const current = stateRef.current;
    const currentPhase = getCurrentPhase(current);
    if (
      current.status !== 'active' ||
      currentPhase.dose.kind !== 'reps' ||
      reducedMotion ||
      coachCycle.cycle < 1 ||
      currentPhase.movementCues.length === 0
    ) {
      lastMovementCueRef.current = null;
      return;
    }
    const cueIndex = Math.min(
      currentPhase.movementCues.length - 1,
      Math.floor(coachCycle.progress * currentPhase.movementCues.length),
    );
    const cueKey = `${current.phaseIndex}:${current.setIndex}:${coachCycle.cycle}:${cueIndex}`;
    if (lastMovementCueRef.current === cueKey) return;
    lastMovementCueRef.current = cueKey;
    speak(currentPhase.movementCues[cueIndex] ?? currentPhase.name);
  }, [coachCycle.cycle, coachCycle.progress, reducedMotion, speak, state.phaseIndex, state.setIndex, state.status]);

  const previousRepRef = useRef(state.rep);
  useEffect(() => {
    if (state.status === 'active' && state.rep > previousRepRef.current) {
      try {
        audio.tone('count');
      } catch {
        // The large visual count remains authoritative.
      }
    }
    previousRepRef.current = state.rep;
  }, [audio, state.rep, state.status]);

  const requestCapabilities = useCallback(async () => {
    await Promise.allSettled([
      Promise.resolve().then(() => audio.unlock()),
      Promise.resolve().then(() => wakeLock.request()),
    ]);
    setCapabilityVersion((version) => version + 1);
  }, [audio, wakeLock]);

  const saveSafely = useCallback((session: SessionState) => {
    try {
      saveSession?.(session);
    } catch {
      // Local persistence failure must not block capability cleanup or controls.
    }
  }, [saveSession]);

  const releaseWakeLockSafely = useCallback(() => {
    try {
      void wakeLock.release().catch(() => undefined);
    } catch {
      // Cleanup is best-effort when a capability implementation fails synchronously.
    }
  }, [wakeLock]);

  const foregroundEpochRef = useRef(0);
  const background = useCallback(() => {
    foregroundEpochRef.current += 1;
    cancelAudio();
    const paused = dispatch({
      type: 'PAUSE',
      reason: 'background',
      remainingMs: sampleRemaining(),
    });
    try {
      saveSafely(paused);
    } finally {
      releaseWakeLockSafely();
    }
  }, [cancelAudio, dispatch, releaseWakeLockSafely, sampleRemaining, saveSafely]);

  const backgroundRef = useRef(background);
  useEffect(() => {
    backgroundRef.current = background;
  }, [background]);
  useEffect(() => observeVisibility(document, {
    onHidden: () => backgroundRef.current(),
    onVisible: () => undefined,
  }), []);
  useEffect(() => {
    const onPageHide = () => backgroundRef.current();
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

  const lifecycleEpochRef = useRef(0);
  useEffect(() => {
    ownedAudio?.ensure();
    lifecycleEpochRef.current += 1;
    const setupEpoch = lifecycleEpochRef.current;
    queueMicrotask(() => {
      if (lifecycleEpochRef.current === setupEpoch) {
        setCapabilityVersion((version) => version + 1);
      }
    });

    return () => {
      lifecycleEpochRef.current += 1;
      const cleanupEpoch = lifecycleEpochRef.current;
      queueMicrotask(() => {
        if (lifecycleEpochRef.current !== cleanupEpoch) return;
        cancelAudio();
        releaseWakeLockSafely();
        ownedAudio?.dispose();
      });
    };
  }, [cancelAudio, ownedAudio, releaseWakeLockSafely]);

  const actions: PlayerActions = {
    async start() {
      await requestCapabilities();
    },
    ready() {
      if (stateRef.current.status === 'phase-transition') {
        dispatch({ type: 'TRANSITION_FINISHED' });
      }
      dispatch({ type: 'READY' });
    },
    needMoreTime() {
      cancelAudio();
      dispatch({ type: 'NEED_MORE_TIME' });
    },
    startNow() {
      dispatch({ type: 'START_NOW' });
    },
    pause() {
      cancelAudio();
      dispatch({ type: 'PAUSE', reason: 'user', remainingMs: sampleRemaining() });
    },
    async resume() {
      const foregroundEpoch = foregroundEpochRef.current;
      await requestCapabilities();
      if (foregroundEpochRef.current !== foregroundEpoch) return;
      dispatch({ type: 'RESUME' });
    },
    replay() {
      cancelAudio();
      if (stateRef.current.status === 'phase-transition') {
        dispatch({ type: 'TRANSITION_FINISHED' });
      }
      dispatch({ type: 'REPLAY_DEMO', remainingMs: sampleRemaining() });
    },
    markRep() {
      if (reducedMotion) dispatch({ type: 'CYCLE_FINISHED' });
    },
    decrementRep() {
      dispatch({ type: 'DECREMENT_REP' });
    },
    restartSet() {
      coachCycle.reset();
      dispatch({ type: 'RESTART_SET' });
    },
    skip() {
      cancelAudio();
      coachCycle.reset();
      dispatch({ type: 'SKIP_PHASE' });
    },
    background,
    exit() {
      cancelAudio();
      const current = stateRef.current.status === 'paused' || stateRef.current.status === 'complete'
        ? stateRef.current
        : dispatch({ type: 'PAUSE', reason: 'user', remainingMs: sampleRemaining() });
      try {
        saveSafely(current);
        try {
          onExitRef.current?.(current);
        } catch {
          // Navigation is owned by the caller and cannot block player cleanup.
        }
      } finally {
        releaseWakeLockSafely();
      }
    },
    setCoachPace(pace) {
      dispatch({ type: 'SET_COACH_PACE', pace });
    },
    setVoiceEnabled(enabled) {
      voiceEnabledRef.current = enabled;
      setVoiceEnabledState(enabled);
      if (!enabled) cancelAudio();
      options.onVoiceEnabledChange?.(enabled);
    },
  };

  const countLabel = phase.dose.kind === 'hold'
    ? `${countdownSeconds ?? Math.ceil((state.remainingMs ?? state.preferences.balanceSeconds * 1000) / 1000)} seconds`
    : `${state.rep} of ${phase.dose.reps}`;
  const sideLabel = phase.dose.kind === 'reps' && phase.dose.sideMode === 'alternating-pairs'
    ? `Right ${state.rightCount} · Left ${state.leftCount}`
    : null;
  const replayDuration = state.status === 'replay' ? getCycleMs(phase, state.preferences.coachPace) : null;
  const replayProgress = replayDuration && deadline.remainingMs !== null
    ? Math.min(1, Math.max(0, 1 - deadline.remainingMs / replayDuration))
    : 0;

  const view: PlayerViewModel = {
    state,
    routine,
    phase,
    status: state.status,
    exercisePosition: uniqueExercisePosition(routine, phase),
    setLabel: `Set ${state.setIndex + 1} of ${phase.dose.sets}`,
    sideLabel,
    countLabel,
    caption: liveCaption(state, phase, countdownSeconds),
    countdownSeconds,
    coachProgress: state.status === 'replay' ? replayProgress : coachCycle.progress,
    speechAvailable: audio.speechAvailable,
    wakeLockActive: wakeLock.active,
    voiceEnabled,
    reducedMotion,
  };

  return { view, actions };
}
