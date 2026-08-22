export type RoutineId = 'back' | 'left-toe';

export type ExerciseId =
  | 'standing-reach'
  | 'bridge-articulations'
  | 'cobras'
  | 'supermans'
  | 'foam-roller-extensions'
  | 'big-toe-lifts'
  | 'banded-toe-pointing'
  | 'band-arch-lifts'
  | 'single-leg-balance';

export type PhaseId =
  | 'standing-knee-bends'
  | 'standing-full-down-up'
  | 'bridge-articulations'
  | 'cobra-forearms'
  | 'cobra-hands'
  | 'supermans'
  | 'foam-roller-extensions'
  | 'big-toe-lifts'
  | 'banded-toe-pointing'
  | 'band-arch-lifts'
  | 'single-leg-balance';

export type VisualId =
  | 'standing-reach'
  | 'bridge'
  | 'cobra-forearms'
  | 'cobra-hands'
  | 'superman'
  | 'foam-roller'
  | 'big-toe'
  | 'banded-toe'
  | 'arch-lift'
  | 'balance';

export type CoachPace = 'slow' | 'standard' | 'brisk';
export type SideMode = 'none' | 'alternating-pairs';

export interface RepDose {
  readonly kind: 'reps';
  readonly reps: number;
  readonly sets: number;
  readonly sideMode: SideMode;
}

export interface HoldDose {
  readonly kind: 'hold';
  readonly seconds: readonly [10, 15];
  readonly sets: 4;
}

export interface RoutinePhase {
  readonly id: PhaseId;
  readonly exerciseId: ExerciseId;
  readonly name: string;
  readonly visual: VisualId;
  readonly setupCues: readonly string[];
  readonly movementCues: readonly string[];
  readonly dose: RepDose | HoldDose;
  readonly coachCycleMs: number;
  readonly readyGate: boolean;
  readonly equipment: readonly string[];
  readonly ambiguityNote?: string;
}

export interface Routine {
  readonly id: RoutineId;
  readonly name: 'Back' | 'Left Toe';
  readonly frequency: 'Most days' | '4× per week';
  readonly equipment: readonly string[];
  readonly phases: readonly RoutinePhase[];
}
