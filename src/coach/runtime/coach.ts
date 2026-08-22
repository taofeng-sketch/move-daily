import type { PhaseId, VisualId } from '../../domain/routine';

export interface CoachVisualProps {
  readonly phaseId: PhaseId;
  readonly visualId: VisualId;
  readonly progress: number;
  readonly reducedMotion: boolean;
  readonly preview: boolean;
}

export interface CoachCycleOptions {
  readonly durationMs: number;
  readonly running: boolean;
  readonly onCycleComplete: () => void;
}

export interface CoachCycleState {
  readonly progress: number;
  readonly cycle: number;
  reset: () => void;
}
