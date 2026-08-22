import type { RoutineId } from '../../domain/routine';
import type { CompletionRecord } from '../../persistence/appState';
import { getWeeklyProgress, safeLocalDate } from '../../persistence/history';
import styles from './HomeScreen.module.css';

export interface WeeklyProgressProps {
  readonly routineId: RoutineId;
  readonly history: readonly CompletionRecord[];
  readonly now: Date;
}

const DAY_FORMATTER = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

export function WeeklyProgress({ routineId, history, now }: WeeklyProgressProps) {
  const weekStart = localWeekStart(now);
  const progress = getWeeklyProgress(history, safeLocalDate(weekStart));

  return routineId === 'back' ? (
    <section className={styles.weeklyProgress} aria-label="Back weekly progress">
      <p className={styles.weeklyCaption}>Most days</p>
      <ul className={styles.dayDots} aria-label="Back completion days">
        {Array.from({ length: 7 }, (_, index) => {
          const date = addDays(weekStart, index);
          const localDate = safeLocalDate(date);
          const complete = progress.backCompletedDates.includes(localDate);
          const state = complete ? 'completed' : 'not completed';

          return (
            <li
              className={complete ? styles.completedDot : styles.emptyDot}
              key={localDate}
              aria-label={`Back, ${DAY_FORMATTER.format(date)}: ${state}`}
            >
              <span aria-hidden="true">{DAY_FORMATTER.format(date).slice(0, 1)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  ) : (
    <section className={styles.weeklyProgress} aria-label="Left Toe weekly progress">
      <p className={styles.weeklyCaption}>{progress.toeCompleted} of 4 this week</p>
      <ul className={styles.targetMarks} aria-label="Left Toe weekly target">
        {Array.from({ length: progress.toeTarget }, (_, index) => {
          const complete = index < progress.toeCompleted;
          return (
            <li
              className={complete ? styles.completedMark : styles.emptyMark}
              key={index}
              aria-label={`Left Toe weekly target mark ${index + 1} of ${progress.toeTarget}: ${
                complete ? 'completed' : 'not completed'
              }`}
            />
          );
        })}
      </ul>
    </section>
  );
}

function localWeekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return start;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
