import type { CoachPace, Routine, RoutineId, RoutinePhase } from './routine';

export const PACE_MULTIPLIER: Readonly<Record<CoachPace, number>> = {
  slow: 1.3,
  standard: 1,
  brisk: 0.8,
};

export const ROUTINES: readonly [Routine, Routine] = [
  {
    id: 'back',
    name: 'Back',
    frequency: 'Most days',
    equipment: ['mat', 'foam roller'],
    phases: [
      {
        id: 'standing-knee-bends',
        exerciseId: 'standing-reach',
        name: 'Standing reach: knee bends',
        visual: 'standing-reach',
        setupCues: ['In standing, reach toward the floor.'],
        movementCues: ['Bend your knees.', 'Straighten your knees.'],
        dose: { kind: 'reps', reps: 6, sets: 3, sideMode: 'none' },
        coachCycleMs: 4000,
        readyGate: true,
        equipment: [],
      },
      {
        id: 'standing-full-down-up',
        exerciseId: 'standing-reach',
        name: 'Standing reach: full down and up',
        visual: 'standing-reach',
        setupCues: ['Now go all the way down and back up.'],
        movementCues: ['Down.', 'Back up.'],
        dose: { kind: 'reps', reps: 8, sets: 1, sideMode: 'none' },
        coachCycleMs: 5000,
        readyGate: true,
        equipment: [],
        ambiguityNote:
          'The endpoint and spinal/knee pattern of “all the way down and back up” remain ambiguous.',
      },
      {
        id: 'bridge-articulations',
        exerciseId: 'bridge-articulations',
        name: 'Bridge articulations',
        visual: 'bridge',
        setupCues: ['Lie on your back with your knees bent.'],
        movementCues: [
          'Lift your hips and squeeze your glutes.',
          'Lower your chest, one vertebra at a time, until your hips reach the floor.',
        ],
        dose: { kind: 'reps', reps: 10, sets: 2, sideMode: 'none' },
        coachCycleMs: 6000,
        readyGate: true,
        equipment: ['mat'],
      },
      {
        id: 'cobra-forearms',
        exerciseId: 'cobras',
        name: 'Cobra on forearms',
        visual: 'cobra-forearms',
        setupCues: ['Lie on your tummy.'],
        movementCues: ['Push down through your forearms and lift your chest.', 'Lower.'],
        dose: { kind: 'reps', reps: 10, sets: 1, sideMode: 'none' },
        coachCycleMs: 4500,
        readyGate: true,
        equipment: ['mat'],
      },
      {
        id: 'cobra-hands',
        exerciseId: 'cobras',
        name: 'Cobra on hands',
        visual: 'cobra-hands',
        setupCues: ['Now lift all the way up onto your hands into a bigger extension.'],
        movementCues: ['Lower.'],
        dose: { kind: 'reps', reps: 10, sets: 1, sideMode: 'none' },
        coachCycleMs: 4500,
        readyGate: true,
        equipment: ['mat'],
      },
      {
        id: 'supermans',
        exerciseId: 'supermans',
        name: 'Supermans',
        visual: 'superman',
        setupCues: ['Start on your hands and knees.'],
        movementCues: ['Lift one arm and the opposite leg.', 'Lower.', 'Other side.'],
        dose: { kind: 'reps', reps: 8, sets: 2, sideMode: 'alternating-pairs' },
        coachCycleMs: 5000,
        readyGate: true,
        equipment: ['mat'],
        ambiguityNote:
          'The plan does not specify whether to alternate sides or complete one side at a time; the app uses alternating sides only as a transparent interface convention.',
      },
      {
        id: 'foam-roller-extensions',
        exerciseId: 'foam-roller-extensions',
        name: 'Foam-roller upper-back extensions',
        visual: 'foam-roller',
        setupCues: [
          'Lie on your back with the roller across your upper back.',
          'Bend your knees and place your hands behind your head.',
          'Keep your hips down.',
        ],
        movementCues: ['Extend your upper back over the roller.', 'Lift back up.'],
        dose: { kind: 'reps', reps: 10, sets: 2, sideMode: 'none' },
        coachCycleMs: 5000,
        readyGate: true,
        equipment: ['mat', 'foam roller'],
      },
    ],
  },
  {
    id: 'left-toe',
    name: 'Left Toe',
    frequency: '4× per week',
    equipment: ['loop band', 'heavy loop band'],
    phases: [
      {
        id: 'big-toe-lifts',
        exerciseId: 'big-toe-lifts',
        name: 'Big-toe lifts',
        visual: 'big-toe',
        setupCues: ['Keep your foot on the floor.'],
        movementCues: ['Lift your big toe.', 'Lower.'],
        dose: { kind: 'reps', reps: 20, sets: 1, sideMode: 'none' },
        coachCycleMs: 3000,
        readyGate: true,
        equipment: [],
      },
      {
        id: 'banded-toe-pointing',
        exerciseId: 'banded-toe-pointing',
        name: 'Banded big-toe pointing',
        visual: 'banded-toe',
        setupCues: [
          'Hook a loop band around your big toe.',
          'Use the band setup your physiotherapist showed you.',
        ],
        movementCues: ['Press your toe down into the band.', 'Relax.'],
        dose: { kind: 'reps', reps: 20, sets: 1, sideMode: 'none' },
        coachCycleMs: 3000,
        readyGate: true,
        equipment: ['loop band'],
        ambiguityNote: 'The band anchor and resistance direction remain unspecified.',
      },
      {
        id: 'band-arch-lifts',
        exerciseId: 'band-arch-lifts',
        name: 'Heavy-band arch lifts',
        visual: 'arch-lift',
        setupCues: [
          'Place your left foot inside the loop band.',
          'Pull it to the side and stand on the band with your right foot.',
          'Use the band position your physiotherapist showed you.',
        ],
        movementCues: ['Relax the left arch in.', 'Lift the arch back up.'],
        dose: { kind: 'reps', reps: 10, sets: 3, sideMode: 'none' },
        coachCycleMs: 4000,
        readyGate: true,
        equipment: ['heavy loop band'],
        ambiguityNote: 'The precise band position and pull direction remain ambiguous.',
      },
      {
        id: 'single-leg-balance',
        exerciseId: 'single-leg-balance',
        name: 'Single-leg balance',
        visual: 'balance',
        setupCues: ['Keep your toe straight and your arch lifted.'],
        movementCues: ['Hold.', 'Three, two, one. Done.'],
        dose: { kind: 'hold', seconds: [10, 15], sets: 4 },
        coachCycleMs: 1000,
        readyGate: true,
        equipment: [],
      },
    ],
  },
];

export const ROUTINE_BY_ID: Readonly<Record<RoutineId, Routine>> = {
  back: ROUTINES[0],
  'left-toe': ROUTINES[1],
};

export function getRoutine(id: RoutineId): Routine {
  return ROUTINE_BY_ID[id];
}

export function getCycleMs(phase: RoutinePhase, pace: CoachPace): number {
  return Math.round(phase.coachCycleMs * PACE_MULTIPLIER[pace]);
}

export function assertRoutineIntegrity(routines: readonly Routine[]): void {
  const expectedRoutineIds = new Set<RoutineId>(['back', 'left-toe']);
  const routineIds = new Set<RoutineId>();
  const phaseIds = new Set<string>();

  if (routines.length !== expectedRoutineIds.size) {
    throw new Error('Routine records must contain exactly Back and Left Toe.');
  }

  for (const routine of routines) {
    if (routineIds.has(routine.id)) {
      throw new Error(`Duplicate routine ID: ${routine.id}`);
    }
    routineIds.add(routine.id);

    if (!expectedRoutineIds.has(routine.id)) {
      throw new Error(`Unexpected routine ID: ${routine.id}`);
    }
    if (routine.phases.length === 0) {
      throw new Error(`Routine has no phases: ${routine.id}`);
    }
    const expectedPhaseCount = routine.id === 'back' ? 7 : 4;
    if (routine.phases.length !== expectedPhaseCount) {
      throw new Error(`Unexpected phase count for ${routine.id}.`);
    }

    const exerciseIds = new Set(routine.phases.map((phase) => phase.exerciseId));
    const expectedExerciseCount = routine.id === 'back' ? 5 : 4;
    if (exerciseIds.size !== expectedExerciseCount) {
      throw new Error(`Unexpected exercise grouping for ${routine.id}.`);
    }

    for (const phase of routine.phases) {
      if (phaseIds.has(phase.id)) {
        throw new Error(`Duplicate phase ID: ${phase.id}`);
      }
      phaseIds.add(phase.id);

      if (!phase.visual) {
        throw new Error(`Missing visual for phase: ${phase.id}`);
      }
      if (
        phase.setupCues.length === 0 ||
        phase.movementCues.length === 0 ||
        [...phase.setupCues, ...phase.movementCues].some((cue) => cue.trim().length === 0)
      ) {
        throw new Error(`Missing cue for phase: ${phase.id}`);
      }
      if (!Number.isFinite(phase.coachCycleMs) || phase.coachCycleMs <= 0) {
        throw new Error(`Coach cycle must be positive for phase: ${phase.id}`);
      }
      if (!Number.isFinite(phase.dose.sets) || phase.dose.sets <= 0) {
        throw new Error(`Set count must be positive for phase: ${phase.id}`);
      }

      if (phase.dose.kind === 'reps') {
        if (!Number.isFinite(phase.dose.reps) || phase.dose.reps <= 0) {
          throw new Error(`Rep dose must be positive for phase: ${phase.id}`);
        }
      } else if (
        phase.dose.seconds.length !== 2 ||
        phase.dose.seconds[0] !== 10 ||
        phase.dose.seconds[1] !== 15
      ) {
        throw new Error(`Hold duration must be exactly 10 or 15 seconds for phase: ${phase.id}`);
      }
    }
  }

  for (const routineId of expectedRoutineIds) {
    if (!routineIds.has(routineId)) {
      throw new Error(`Missing routine ID: ${routineId}`);
    }
  }

  if (phaseIds.size !== 11) {
    throw new Error('Routine records must contain exactly eleven phases.');
  }
}

assertRoutineIntegrity(ROUTINES);
