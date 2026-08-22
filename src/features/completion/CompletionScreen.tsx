import type { ExerciseId, RoutineId } from '../../domain/routine';
import { getRoutine } from '../../domain/routines';
import type { SessionSummary } from '../../session/session';
import styles from './CompletionScreen.module.css';

export interface CompletionScreenProps {
  readonly routineId: RoutineId;
  readonly summary: SessionSummary;
  readonly onDone: () => void;
  readonly onSetReminder: () => void;
  readonly onInstall: () => void;
  readonly showInstallAction?: boolean;
  readonly showReminderAction?: boolean;
}

export function CompletionScreen({
  routineId,
  summary,
  onDone,
  onSetReminder,
  onInstall,
  showInstallAction = false,
  showReminderAction = false,
}: CompletionScreenProps) {
  const routine = getRoutine(routineId);
  const expectedGroupCount = new Set(routine.phases.map((phase) => phase.exerciseId)).size;
  const complete =
    summary.label === 'Session complete' &&
    summary.skipped === 0 &&
    summary.completed === summary.total &&
    summary.total === expectedGroupCount;
  const completedExercises = complete ? exerciseGroups(routineId) : [];

  return (
    <main className={styles.completion}>
      <section className={styles.card} aria-labelledby="completion-heading">
        <p className={styles.eyebrow}>{complete ? 'Today’s session' : 'Your session'}</p>
        <h1 id="completion-heading">{complete ? `${routine.name} complete` : 'Session saved'}</h1>
        <p className={styles.summary}>
          {complete ? `${summary.completed} completed` : `${summary.completed} completed · ${summary.skipped} skipped`}
        </p>

        {complete ? (
          <ul className={styles.exerciseList} aria-label={`Completed ${routine.name} exercises`}>
            {completedExercises.map((exercise) => (
              <li key={exercise}>{exercise}</li>
            ))}
          </ul>
        ) : null}

        <div className={styles.actions}>
          <button className={styles.done} type="button" onClick={onDone}>
            Done
          </button>
          {(showInstallAction || showReminderAction) && complete ? (
            <div className={styles.habitActions}>
              {showInstallAction ? (
                <button type="button" onClick={onInstall}>
                  Add to Home Screen
                </button>
              ) : null}
              {showReminderAction ? (
                <button type="button" onClick={onSetReminder}>
                  Set a calendar reminder
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function exerciseGroups(routineId: RoutineId): readonly string[] {
  const groupNames: Readonly<Record<ExerciseId, string>> = {
    'standing-reach': 'Standing reach',
    'bridge-articulations': 'Bridge articulations',
    cobras: 'Cobras',
    supermans: 'Supermans',
    'foam-roller-extensions': 'Foam-roller upper-back extensions',
    'big-toe-lifts': 'Big-toe lifts',
    'banded-toe-pointing': 'Banded big-toe pointing',
    'band-arch-lifts': 'Heavy-band arch lifts',
    'single-leg-balance': 'Single-leg balance',
  };

  return [...new Set(getRoutine(routineId).phases.map((phase) => phase.exerciseId))].map(
    (exerciseId) => groupNames[exerciseId],
  );
}
