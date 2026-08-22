import type { ExerciseId, RoutinePhase } from '../domain/routine';
import { getRoutine } from '../domain/routines';
import type { SessionState, SessionSummary } from './session';

export function getCurrentPhase(state: SessionState): RoutinePhase {
  const phase = getRoutine(state.routineId).phases[state.phaseIndex];
  if (phase === undefined) {
    throw new Error(`Session phase index is out of range: ${state.phaseIndex}`);
  }
  return phase;
}

export function isSessionFullyComplete(state: SessionState): boolean {
  const routine = getRoutine(state.routineId);
  return (
    state.status === 'complete' &&
    state.skippedPhaseIds.length === 0 &&
    routine.phases.every((phase) => state.completedPhaseIds.includes(phase.id))
  );
}

export function getSessionSummary(state: SessionState): SessionSummary {
  const routine = getRoutine(state.routineId);
  const exerciseIds = uniqueExerciseIds(routine.phases);
  const skippedExercises = new Set(
    routine.phases
      .filter((phase) => state.skippedPhaseIds.includes(phase.id))
      .map((phase) => phase.exerciseId),
  );
  const completed = exerciseIds.filter(
    (exerciseId) =>
      !skippedExercises.has(exerciseId) &&
      routine.phases
        .filter((phase) => phase.exerciseId === exerciseId)
        .every((phase) => state.completedPhaseIds.includes(phase.id)),
  ).length;

  return {
    completed,
    skipped: skippedExercises.size,
    total: exerciseIds.length,
    label: isSessionFullyComplete(state) ? 'Session complete' : 'Session saved',
  };
}

function uniqueExerciseIds(phases: readonly RoutinePhase[]): readonly ExerciseId[] {
  return [...new Set(phases.map((phase) => phase.exerciseId))];
}
