import { isSessionFullyComplete } from '../session/selectors';
import type { SessionState } from '../session/session';
import type { CompletionRecord, PersistedAppState, WeeklyProgress } from './appState';

const MAX_HISTORY_RECORDS = 180;
const WEEK_LENGTH_DAYS = 7;

export function recordSession(
  appState: PersistedAppState,
  session: SessionState,
  localDate: string,
): PersistedAppState {
  const outcome = isSessionFullyComplete(session) ? 'complete' : 'saved-with-skips';
  const record: CompletionRecord = {
    id: `${session.routineId}:${localDate}:${outcome}`,
    routineId: session.routineId,
    localDate,
    outcome,
  };
  const history = appState.history
    .filter((entry) => entry.id !== record.id)
    .filter(
      (entry) =>
        outcome !== 'complete' ||
        entry.routineId !== session.routineId ||
        entry.localDate !== localDate ||
        entry.outcome !== 'complete',
    )
    .concat(record)
    .sort((left, right) => left.localDate.localeCompare(right.localDate))
    .slice(-MAX_HISTORY_RECORDS);

  return { ...appState, activeSession: null, history };
}

export function getWeeklyProgress(
  records: readonly CompletionRecord[],
  weekStart: string,
): WeeklyProgress {
  const start = parseLocalDate(weekStart);
  if (start === null) return { backCompletedDates: [], toeCompleted: 0, toeTarget: 4 };
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + WEEK_LENGTH_DAYS);
  const completed = records.filter((record) => {
    const date = parseLocalDate(record.localDate);
    return record.outcome === 'complete' && date !== null && date >= start && date < end;
  });
  const backCompletedDates = [...new Set(
    completed.filter((record) => record.routineId === 'back').map((record) => record.localDate),
  )].sort();
  const toeCompleted = new Set(
    completed.filter((record) => record.routineId === 'left-toe').map((record) => record.localDate),
  ).size;

  return { backCompletedDates, toeCompleted, toeTarget: 4 };
}

export function safeLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
