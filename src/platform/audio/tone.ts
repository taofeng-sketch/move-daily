import type { ToneKind } from './coachAudio';

export const TONE_PROFILE = {
  count: { frequency: 520, durationMs: 70 },
  start: { frequency: 740, durationMs: 120 },
  complete: { frequency: 880, durationMs: 180 },
  warning: { frequency: 260, durationMs: 180 },
} as const;

interface AudioParamLike {
  value: number;
  setValueAtTime?(value: number, startTime: number): void;
  exponentialRampToValueAtTime?(value: number, endTime: number): void;
}

interface OscillatorLike {
  readonly frequency: AudioParamLike;
  onended?: ((event: Event) => void) | null;
  connect(destination: unknown): unknown;
  start(when?: number): void;
  stop(when?: number): void;
}

interface GainLike {
  readonly gain: AudioParamLike;
  connect(destination: unknown): unknown;
}

export interface ToneAudioContext {
  readonly currentTime: number;
  readonly destination: unknown;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
  resume?(): Promise<void>;
  close?(): Promise<void>;
}

export interface ToneDependencies {
  readonly createContext?: () => ToneAudioContext | null;
}

export interface TonePlayer {
  unlock(): Promise<void>;
  tone(kind: ToneKind): void;
  cancel(): void;
  dispose(): void;
}

function createBrowserContext(): ToneAudioContext | null {
  try {
    const audioGlobals = globalThis as typeof globalThis & {
      webkitAudioContext?: new () => AudioContext;
    };
    const AudioContextConstructor = audioGlobals.AudioContext ?? audioGlobals.webkitAudioContext;
    return AudioContextConstructor ? new AudioContextConstructor() : null;
  } catch {
    return null;
  }
}

function closeSilently(context: ToneAudioContext | null): void {
  try {
    void context?.close?.().catch(() => undefined);
  } catch {
    // Closing is best effort only.
  }
}

export function createTone(deps: ToneDependencies = {}): TonePlayer {
  const createContext = deps.createContext ?? createBrowserContext;
  const activeOscillators = new Set<OscillatorLike>();
  let context: ToneAudioContext | null = null;
  let unlocked = false;
  let disposed = false;

  const stop = (oscillator: OscillatorLike) => {
    try {
      oscillator.stop();
    } catch {
      // Stopping an already ended oscillator is harmless to the coaching flow.
    }
  };

  return {
    async unlock() {
      if (disposed || unlocked) return;
      let nextContext: ToneAudioContext | null = null;

      try {
        nextContext = createContext();
        if (!nextContext) return;
        await nextContext.resume?.();
        context = nextContext;
        unlocked = true;
      } catch {
        closeSilently(nextContext);
        context = null;
        unlocked = false;
      }
    },
    tone(kind) {
      if (disposed || !unlocked || !context) return;

      const profile = TONE_PROFILE[kind];
      const startTime = context.currentTime;
      const endTime = startTime + profile.durationMs / 1000;

      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = profile.frequency;
        oscillator.frequency.setValueAtTime?.(profile.frequency, startTime);
        gain.gain.setValueAtTime?.(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime?.(0.12, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime?.(0.0001, endTime);
        oscillator.connect(gain);
        gain.connect(context.destination);
        activeOscillators.add(oscillator);
        oscillator.onended = () => activeOscillators.delete(oscillator);
        oscillator.start(startTime);
        oscillator.stop(endTime);
      } catch {
        // A browser may lose audio capability mid-session; visual coaching continues.
      }
    },
    cancel() {
      for (const oscillator of activeOscillators) stop(oscillator);
      activeOscillators.clear();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unlocked = false;
      for (const oscillator of activeOscillators) stop(oscillator);
      activeOscillators.clear();

      closeSilently(context);
      context = null;
    },
  };
}
