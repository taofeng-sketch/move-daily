import { createLocalSpeech, type LocalSpeech, type LocalSpeechDependencies } from './localSpeech';
import { createTone, type ToneDependencies, type TonePlayer } from './tone';

export type ToneKind = 'count' | 'start' | 'complete' | 'warning';

export interface CoachAudio {
  readonly speechAvailable: boolean;
  unlock(): Promise<void>;
  speak(text: string): void;
  tone(kind: ToneKind): void;
  cancel(): void;
  dispose(): void;
}

export interface CoachAudioDependencies {
  readonly speech?: LocalSpeech;
  readonly tone?: TonePlayer;
  readonly speechDeps?: LocalSpeechDependencies;
  readonly toneDeps?: ToneDependencies;
}

export function createCoachAudio(deps: CoachAudioDependencies = {}): CoachAudio {
  const speech = deps.speech ?? createLocalSpeech(deps.speechDeps);
  const tonePlayer = deps.tone ?? createTone(deps.toneDeps);
  let disposed = false;

  return {
    get speechAvailable() {
      if (disposed) return false;
      try {
        return speech.available;
      } catch {
        return false;
      }
    },
    async unlock() {
      if (disposed) return;
      try {
        await tonePlayer.unlock();
      } catch {
        // Audio support is optional; captions and controls remain usable.
      }
    },
    speak(text) {
      if (disposed) return;
      try {
        speech.speak(text);
      } catch {
        // Speech failures must not affect session progression.
      }
    },
    tone(kind) {
      if (disposed) return;
      try {
        tonePlayer.tone(kind);
      } catch {
        // Tone playback is progressive enhancement only.
      }
    },
    cancel() {
      if (disposed) return;
      try {
        speech.cancel();
      } catch {
        // Continue cancelling the independent tone capability.
      }
      try {
        tonePlayer.cancel();
      } catch {
        // Capability errors are contained at this boundary.
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      try {
        speech.dispose();
      } catch {
        // Disposal is deliberately best effort.
      }
      try {
        tonePlayer.dispose();
      } catch {
        // Disposal is deliberately best effort.
      }
    },
  };
}
