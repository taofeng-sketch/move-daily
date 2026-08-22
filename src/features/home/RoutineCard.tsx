import type { CoachPace, Routine } from '../../domain/routine';
import { getCycleMs } from '../../domain/routines';
import type { CompletionRecord } from '../../persistence/appState';
import { WeeklyProgress } from './WeeklyProgress';
import styles from './HomeScreen.module.css';

export interface RoutineCardProps {
  readonly routine: Routine;
  readonly history: readonly CompletionRecord[];
  readonly now: Date;
  readonly coachPace: CoachPace;
  readonly balanceSeconds: 10 | 15;
  readonly onStart: (routineId: Routine['id']) => void;
}

const PREPARATION_SECONDS = 5;
const EXTRA_SET_TRANSITION_SECONDS = 8;

function estimateRoutineMinutes(
  routine: Routine,
  coachPace: CoachPace,
  balanceSeconds: 10 | 15,
): number {
  const seconds = routine.phases.reduce((total, phase) => {
    const setCount = phase.dose.sets;
    const workSeconds =
      phase.dose.kind === 'hold'
        ? setCount * balanceSeconds
        : (phase.dose.reps *
            setCount *
            (phase.dose.sideMode === 'alternating-pairs' ? 2 : 1) *
            getCycleMs(phase, coachPace)) /
          1000;
    const preparationSeconds = setCount * PREPARATION_SECONDS;
    const transitionSeconds = Math.max(0, setCount - 1) * EXTRA_SET_TRANSITION_SECONDS;

    return total + workSeconds + preparationSeconds + transitionSeconds;
  }, 0);

  return Math.ceil(seconds / 60);
}

export function RoutineCard({
  routine,
  history,
  now,
  coachPace,
  balanceSeconds,
  onStart,
}: RoutineCardProps) {
  const estimate = estimateRoutineMinutes(routine, coachPace, balanceSeconds);

  return (
    <section className={styles.routineCard} aria-labelledby={`${routine.id}-title`}>
      <div className={styles.cardHeading}>
        <h2 id={`${routine.id}-title`}>{routine.name}</h2>
        <p className={styles.frequency}>{routine.frequency}</p>
      </div>
      <p className={styles.estimate}>About {estimate} min</p>
      <p className={styles.equipment}>Equipment: {routine.equipment.join(' and ')}</p>
      <WeeklyProgress routineId={routine.id} history={history} now={now} />
      <button className={styles.primaryAction} type="button" onClick={() => onStart(routine.id)}>
        Start {routine.name}
      </button>
    </section>
  );
}
