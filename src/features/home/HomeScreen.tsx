import type { CoachPace } from '../../domain/routine';
import { ROUTINES } from '../../domain/routines';
import type { CompletionRecord } from '../../persistence/appState';
import { getCurrentPhase } from '../../session/selectors';
import type { SessionState } from '../../session/session';
import { RoutineCard } from './RoutineCard';
import styles from './HomeScreen.module.css';

export interface HomeScreenProps {
  readonly activeSession: SessionState | null;
  readonly history: readonly CompletionRecord[];
  readonly onStart: (routineId: 'back' | 'left-toe') => void;
  readonly onResume: () => void;
  readonly onOpenSettings: () => void;
  readonly coachPace?: CoachPace;
  readonly balanceSeconds?: 10 | 15;
  readonly now?: Date;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function HomeScreen({
  activeSession,
  history,
  onStart,
  onResume,
  onOpenSettings,
  coachPace = 'standard',
  balanceSeconds = 10,
  now = new Date(),
}: HomeScreenProps) {
  const unfinishedSession =
    activeSession !== null && activeSession.status !== 'complete' ? activeSession : null;

  return (
    <main className={styles.home}>
      <header className={styles.header}>
        <div>
          <p className={styles.productLine}>Your plan, one move at a time.</p>
          <h1>Move Daily</h1>
          <p className={styles.date}>{DATE_FORMATTER.format(now)}</p>
        </div>
        <button className={styles.settings} type="button" onClick={onOpenSettings}>
          Settings
        </button>
      </header>

      {unfinishedSession !== null ? (
        <ResumeCard session={unfinishedSession} onResume={onResume} />
      ) : null}

      {unfinishedSession === null ? (
        <div className={styles.routineList} aria-label="Routines">
          {ROUTINES.map((routine) => (
            <RoutineCard
              balanceSeconds={balanceSeconds}
              coachPace={coachPace}
              history={history}
              key={routine.id}
              now={now}
              onStart={onStart}
              routine={routine}
            />
          ))}
        </div>
      ) : null}
    </main>
  );
}

function ResumeCard({ session, onResume }: { readonly session: SessionState; readonly onResume: () => void }) {
  const routine = ROUTINES.find((candidate) => candidate.id === session.routineId);
  if (routine === undefined) return null;

  const phase = getCurrentPhase(session);
  const exerciseIds = [...new Set(routine.phases.map((item) => item.exerciseId))];
  const exerciseIndex = exerciseIds.indexOf(phase.exerciseId) + 1;
  const setTotal = phase.dose.sets;
  const accessibleName = `Resume ${routine.name} — Exercise ${exerciseIndex} of ${exerciseIds.length}, ${phase.name}, Set ${session.setIndex + 1} of ${setTotal}`;

  return (
    <section className={styles.resumeCard} aria-label="Resume session">
      <button className={styles.primaryAction} type="button" onClick={onResume} aria-label={accessibleName}>
        <span className={styles.resumeEyebrow}>Continue when you are ready</span>
        <span className={styles.resumeTitle}>Resume {routine.name}</span>
        <span className={styles.resumeDetails}>
          Exercise {exerciseIndex} of {exerciseIds.length} · {phase.name} · Set {session.setIndex + 1} of {setTotal}
        </span>
      </button>
    </section>
  );
}
