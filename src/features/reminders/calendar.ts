import type { RoutineId } from '../../domain/routine';

export type CalendarDay = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export interface ReminderSchedule {
  readonly routineId: RoutineId;
  readonly days: readonly CalendarDay[];
  readonly localTime: `${number}${number}:${number}${number}`;
}

const WEEK: readonly CalendarDay[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const JS_DAY: Readonly<Record<CalendarDay, number>> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 0,
};
const ROUTINE_DETAILS: Readonly<
  Record<RoutineId, { readonly summary: string; readonly uid: string; readonly filename: string }>
> = {
  back: {
    summary: 'Move Daily — Back',
    uid: 'urn:uuid:4f3d6bc8-1c0d-4fe8-9a3a-565f7f22d6d1',
    filename: 'move-daily-back-reminder.ics',
  },
  'left-toe': {
    summary: 'Move Daily — Left Toe',
    uid: 'urn:uuid:8c8d4a3f-0a85-4f6d-94c2-7ea503c11b72',
    filename: 'move-daily-left-toe-reminder.ics',
  },
};

export function createRecurringCalendar(schedule: ReminderSchedule): string {
  const normalized = validateSchedule(schedule);
  const now = new Date();
  const start = nextOccurrence(now, normalized.days, normalized.hour, normalized.minute);
  const logicalLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Move Daily//Local Calendar Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ROUTINE_DETAILS[schedule.routineId].uid}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatLocal(start)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${normalized.days.join(',')}`,
    'DURATION:PT15M',
    `SUMMARY:${escapeCalendarText(ROUTINE_DETAILS[schedule.routineId].summary)}`,
    `DESCRIPTION:${escapeCalendarText('Open Move Daily and follow your existing plan.')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${logicalLines.map(foldCalendarLine).join('\r\n')}\r\n`;
}

export function downloadCalendar(schedule: ReminderSchedule): void {
  const contents = createRecurringCalendar(schedule);
  const blob = new Blob([contents], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  let anchor: HTMLAnchorElement | undefined;

  try {
    anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = ROUTINE_DETAILS[schedule.routineId].filename;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor?.remove();
    URL.revokeObjectURL(url);
  }
}

function validateSchedule(schedule: ReminderSchedule): {
  readonly days: readonly CalendarDay[];
  readonly hour: number;
  readonly minute: number;
} {
  if (
    schedule === null ||
    typeof schedule !== 'object' ||
    (schedule.routineId !== 'back' && schedule.routineId !== 'left-toe')
  ) {
    throw new Error('Choose a known routine.');
  }
  if (!Array.isArray(schedule.days) || schedule.days.length === 0) {
    throw new Error('Select at least one day.');
  }
  if (!schedule.days.every((day) => WEEK.includes(day))) {
    throw new Error('Choose a known calendar day.');
  }
  if (new Set(schedule.days).size !== schedule.days.length) {
    throw new Error('Select each day only once.');
  }
  if (typeof schedule.localTime !== 'string' || !/^\d{2}:\d{2}$/.test(schedule.localTime)) {
    throw new Error('Enter a time as HH:mm.');
  }

  const hour = Number(schedule.localTime.slice(0, 2));
  const minute = Number(schedule.localTime.slice(3, 5));
  if (hour > 23 || minute > 59) {
    throw new Error('Enter a valid 24-hour time.');
  }

  return {
    days: WEEK.filter((day) => schedule.days.includes(day)),
    hour,
    minute,
  };
}

interface LocalStart {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

function nextOccurrence(now: Date, days: readonly CalendarDay[], hour: number, minute: number): LocalStart {
  let nearestOffset: number | undefined;
  const selectedMsOfDay = ((hour * 60 + minute) * 60) * 1_000;
  const currentMsOfDay =
    (((now.getHours() * 60 + now.getMinutes()) * 60 + now.getSeconds()) * 1_000) + now.getMilliseconds();

  for (const day of days) {
    let offset = (JS_DAY[day] - now.getDay() + 7) % 7;
    if (offset === 0 && selectedMsOfDay <= currentMsOfDay) offset = 7;
    if (nearestOffset === undefined || offset < nearestOffset) nearestOffset = offset;
  }

  if (nearestOffset === undefined) throw new Error('Select at least one day.');
  const calendarDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + nearestOffset));
  return {
    year: calendarDate.getUTCFullYear(),
    month: calendarDate.getUTCMonth() + 1,
    day: calendarDate.getUTCDate(),
    hour,
    minute,
  };
}

function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function formatLocal(start: LocalStart): string {
  return `${pad(start.year, 4)}${pad(start.month)}${pad(start.day)}T${pad(start.hour)}${pad(start.minute)}00`;
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

export function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function foldCalendarLine(line: string): string {
  const encoder = new TextEncoder();
  const folded: string[] = [];
  let segment = '';
  let bytes = 0;

  for (const character of line) {
    const characterBytes = encoder.encode(character).byteLength;
    const limit = folded.length === 0 ? 75 : 74;
    if (bytes + characterBytes > limit && segment.length > 0) {
      folded.push(segment);
      segment = character;
      bytes = characterBytes;
    } else {
      segment += character;
      bytes += characterBytes;
    }
  }
  folded.push(segment);

  return folded.join('\r\n ');
}
