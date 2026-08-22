import { useEffect, useRef, useState, type JSX, type KeyboardEvent, type MouseEvent } from 'react';
import type { RoutineId } from '../../domain/routine';
import {
  downloadCalendar,
  type CalendarDay,
  type ReminderSchedule,
} from './calendar';
import styles from './ReminderDialog.module.css';

export interface ReminderDialogProps {
  readonly routineId: RoutineId;
  readonly onClose: () => void;
  readonly onDownload?: (schedule: ReminderSchedule) => void;
  readonly returnFocus?: HTMLElement | null;
}

const DAYS: readonly { readonly value: CalendarDay; readonly label: string }[] = [
  { value: 'MO', label: 'Monday' },
  { value: 'TU', label: 'Tuesday' },
  { value: 'WE', label: 'Wednesday' },
  { value: 'TH', label: 'Thursday' },
  { value: 'FR', label: 'Friday' },
  { value: 'SA', label: 'Saturday' },
  { value: 'SU', label: 'Sunday' },
];

export function ReminderDialog({
  routineId,
  onClose,
  onDownload = downloadCalendar,
  returnFocus = null,
}: ReminderDialogProps): JSX.Element {
  const [days, setDays] = useState<readonly CalendarDay[]>([]);
  const [localTime, setLocalTime] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const firstDayRef = useRef<HTMLInputElement>(null);
  const routineName = routineId === 'back' ? 'Back' : 'Left Toe';
  const titleId = `reminder-${routineId}-title`;
  const valid = days.length > 0 && /^\d{2}:\d{2}$/.test(localTime);

  useEffect(() => {
    firstDayRef.current?.focus();
  }, []);

  const close = (): void => {
    onClose();
    if (returnFocus !== null) {
      queueMicrotask(() => {
        if (returnFocus.isConnected) returnFocus.focus();
      });
    }
  };

  const toggleDay = (day: CalendarDay): void => {
    setDays((current) =>
      current.includes(day)
        ? current.filter((candidate) => candidate !== day)
        : DAYS.map(({ value }) => value).filter((candidate) => candidate === day || current.includes(candidate)),
    );
  };

  const create = (): void => {
    if (!valid) return;
    onDownload({
      routineId,
      days,
      localTime: localTime as ReminderSchedule['localTime'],
    });
    close();
  };

  return (
    <div
      className={styles.backdrop}
      data-testid="reminder-backdrop"
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.dialog}
        onKeyDown={(event) => handleDialogKey(event, dialogRef.current, close)}
        ref={dialogRef}
        role="dialog"
      >
        <p className={styles.eyebrow}>Local calendar file</p>
        <h2 id={titleId}>Set {routineName} calendar reminder</h2>
        <p>Choose the days and time yourself. Nothing is sent by Move Daily.</p>

        <fieldset className={styles.fieldset}>
          <legend>Days</legend>
          <div className={styles.dayGrid}>
            {DAYS.map(({ value, label }, index) => (
              <label key={value} className={styles.dayChoice}>
                <input
                  checked={days.includes(value)}
                  onChange={() => toggleDay(value)}
                  ref={index === 0 ? firstDayRef : undefined}
                  type="checkbox"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className={styles.timeField}>
          <span>Reminder time</span>
          <input onChange={(event) => setLocalTime(event.currentTarget.value)} type="time" value={localTime} />
        </label>

        <p className={styles.note}>Your calendar app controls alert timing.</p>
        <div className={styles.actions}>
          <button onClick={close} type="button">
            Cancel reminder
          </button>
          <button className={styles.primary} disabled={!valid} onClick={create} type="button">
            Create calendar reminder
          </button>
        </div>
      </section>
    </div>
  );
}

function handleDialogKey(
  event: KeyboardEvent<HTMLElement>,
  dialog: HTMLElement | null,
  close: () => void,
): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== 'Tab' || dialog === null) return;

  const focusable = getFocusable(dialog);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')];
}
