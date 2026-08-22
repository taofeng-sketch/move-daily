import type { JSX } from 'react';
import { BackCoach } from '../../coach/back/BackCoach';
import { ToeCoach } from '../../coach/toe/ToeCoach';
import type { PhaseId, RoutinePhase, VisualId } from '../../domain/routine';

const BACK_VISUALS = new Set<VisualId>([
  'standing-reach',
  'bridge',
  'cobra-forearms',
  'cobra-hands',
  'superman',
  'foam-roller',
]);
const TOE_VISUALS = new Set<VisualId>(['big-toe', 'banded-toe', 'arch-lift', 'balance']);
const PHASE_VISUALS: Readonly<Record<PhaseId, VisualId>> = {
  'standing-knee-bends': 'standing-reach',
  'standing-full-down-up': 'standing-reach',
  'bridge-articulations': 'bridge',
  'cobra-forearms': 'cobra-forearms',
  'cobra-hands': 'cobra-hands',
  supermans: 'superman',
  'foam-roller-extensions': 'foam-roller',
  'big-toe-lifts': 'big-toe',
  'banded-toe-pointing': 'banded-toe',
  'band-arch-lifts': 'arch-lift',
  'single-leg-balance': 'balance',
};

export interface CoachRouterProps {
  readonly phase: RoutinePhase;
  readonly progress: number;
  readonly reducedMotion: boolean;
  readonly preview?: boolean;
}

export function CoachRouter({
  phase,
  progress,
  reducedMotion,
  preview = false,
}: CoachRouterProps): JSX.Element {
  const expectedVisual = PHASE_VISUALS[phase.id];
  if (phase.visual !== expectedVisual) {
    throw new Error(
      `Coach phase/visual mismatch: ${phase.id} requires ${expectedVisual}, received ${phase.visual}`,
    );
  }
  const props = {
    phaseId: phase.id,
    visualId: phase.visual,
    progress,
    reducedMotion,
    preview,
  };

  if (BACK_VISUALS.has(phase.visual)) return <BackCoach {...props} />;
  if (TOE_VISUALS.has(phase.visual)) return <ToeCoach {...props} />;

  throw new Error(`Unsupported coach visual: ${phase.visual}`);
}
