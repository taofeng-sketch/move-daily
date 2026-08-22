import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRecurringCalendar,
  downloadCalendar,
  escapeCalendarText,
  foldCalendarLine,
  type ReminderSchedule,
} from './calendar';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

describe('calendar text serialization', () => {
  it('escapes every RFC TEXT delimiter and normalizes CR/LF variants', () => {
    const input = 'Path\\name,part;line\r\nnext\ronly\nlast';

    expect(escapeCalendarText(input)).toBe(String.raw`Path\\name\,part\;line\nnext\nonly\nlast`);
  });

  it('folds long UTF-8 lines by octet without splitting a multibyte character', () => {
    const logicalLine = `DESCRIPTION:${'a'.repeat(61)}—é${'b'.repeat(100)}`;

    const folded = foldCalendarLine(logicalLine);
    const physicalLines = folded.split('\r\n');

    expect(physicalLines.length).toBeGreaterThan(1);
    expect(physicalLines[1]).toMatch(/^ —é/);
    expect(physicalLines.slice(1).every((line) => line.startsWith(' '))).toBe(true);
    for (const line of physicalLines) {
      expect(new TextEncoder().encode(line).byteLength).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, '')).toBe(logicalLine);
  });
});

describe('calendar reminder', () => {
  it('uses only selected days in canonical week order without mutating the input', () => {
    vi.useFakeTimers();
    const now = new Date(2026, 7, 18, 18, 0, 0);
    vi.setSystemTime(now);
    const days = ['FR', 'MO', 'WE'] as const;

    const ics = createRecurringCalendar({ routineId: 'left-toe', days, localTime: '18:30' });

    expect(ics).toContain('DTSTART:20260819T183000\r\n');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR\r\n');
    expect(ics).toContain('SUMMARY:Move Daily — Left Toe\r\n');
    expect(days).toEqual(['FR', 'MO', 'WE']);
    expect(ics).not.toMatch(/diagnosis|clinic|patient|pain|physiotherapist/i);
  });

  it('places an occurrence at the same wall-clock time one week later', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 18, 18, 30, 0));

    const ics = createRecurringCalendar({ routineId: 'back', days: ['TU'], localTime: '18:30' });

    expect(ics).toContain('DTSTART:20260825T183000\r\n');
  });

  it('uses a real UTC stamp and floating local start from one captured clock value', () => {
    vi.useFakeTimers();
    const now = new Date(2026, 2, 27, 7, 5, 9);
    vi.setSystemTime(now);

    const ics = createRecurringCalendar({ routineId: 'back', days: ['FR'], localTime: '08:15' });

    expect(ics).toContain(`DTSTAMP:${utcStamp(now)}\r\n`);
    expect(ics).toContain('DTSTART:20260327T081500\r\n');
    expect(ics).not.toMatch(/DTSTART[^\r\n]*(?:Z|TZID)/);
  });

  it('preserves the selected floating wall-clock time across a daylight-saving boundary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 28, 12, 0, 0));

    const ics = createRecurringCalendar({ routineId: 'back', days: ['SU'], localTime: '01:30' });

    expect(ics).toContain('DTSTART:20260329T013000\r\n');
  });

  it('reads the current time exactly once per generation', () => {
    const NativeDate = Date;
    let zeroArgumentConstructions = 0;
    class ObservedDate extends NativeDate {
      constructor();
      constructor(value: string | number | Date);
      constructor(year: number, monthIndex: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number);
      constructor(...args: [] | [string | number | Date] | [number, number, number?, number?, number?, number?, number?]) {
        if (args.length === 0) zeroArgumentConstructions += 1;
        if (args.length === 0) {
          super();
        } else if (args.length === 1) {
          super(args[0] instanceof NativeDate ? args[0].getTime() : args[0]);
        } else {
          super(args[0], args[1], args[2] ?? 1, args[3] ?? 0, args[4] ?? 0, args[5] ?? 0, args[6] ?? 0);
        }
      }
    }
    vi.stubGlobal('Date', ObservedDate);

    createRecurringCalendar({ routineId: 'back', days: ['MO'], localTime: '09:00' });

    expect(zeroArgumentConstructions).toBe(1);
    vi.unstubAllGlobals();
  });

  it('uses stable opaque routine-specific UIDs across schedule changes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 10));
    const firstBack = createRecurringCalendar({ routineId: 'back', days: ['MO'], localTime: '09:00' });
    vi.setSystemTime(new Date(2026, 5, 1, 14));
    const secondBack = createRecurringCalendar({ routineId: 'back', days: ['WE'], localTime: '17:45' });
    const toe = createRecurringCalendar({ routineId: 'left-toe', days: ['WE'], localTime: '17:45' });
    const uid = (value: string) => value.match(/UID:([^\r\n]+)/)?.[1];

    expect(uid(firstBack)).toBe(uid(secondBack));
    expect(uid(firstBack)).not.toBe(uid(toe));
    expect(uid(firstBack)).toMatch(
      /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(uid(toe)).toMatch(
      /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(uid(firstBack)).not.toContain('@');
    expect(uid(toe)).not.toContain('@');
    expect(uid(firstBack)).not.toMatch(/patient|recipient|back/i);
  });

  it('emits a complete RFC calendar with CRLF, final CRLF, no alarm, and byte-safe lines', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 18, 8));

    const ics = createRecurringCalendar({
      routineId: 'left-toe',
      days: ['SU', 'SA', 'FR', 'TH', 'WE', 'TU', 'MO'],
      localTime: '20:05',
    });

    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('DURATION:PT15M\r\n');
    expect(ics).toContain('DESCRIPTION:Open Move Daily and follow your existing plan.\r\n');
    expect(ics).toContain('END:VCALENDAR\r\n');
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics).not.toMatch(/(^|[^\r])\n/);
    expect(ics).not.toContain('VALARM');
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).byteLength).toBeLessThanOrEqual(75);
    }
  });

  it.each([
    [{ routineId: 'back', days: [], localTime: '09:00' }, 'Select at least one day'],
    [{ routineId: 'back', days: ['MO', 'MO'], localTime: '09:00' }, 'Select each day only once'],
    [{ routineId: 'back', days: ['XX'], localTime: '09:00' }, 'Choose a known calendar day'],
    [{ routineId: 'back', days: ['MO'], localTime: '9:00' }, 'Enter a time as HH:mm'],
    [{ routineId: 'back', days: ['MO'], localTime: '24:00' }, 'Enter a valid 24-hour time'],
    [{ routineId: 'unknown', days: ['MO'], localTime: '09:00' }, 'Choose a known routine'],
    [{ routineId: 'toString', days: ['MO'], localTime: '09:00' }, 'Choose a known routine'],
  ] as const)('rejects invalid schedules: %s', (schedule, message) => {
    expect(() => createRecurringCalendar(schedule as unknown as ReminderSchedule)).toThrow(message);
  });
});

describe('calendar download', () => {
  it('downloads a deterministic calendar file through a temporary anchor', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 18, 8));
    let downloadedAnchor: HTMLAnchorElement | undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      downloadedAnchor = document.querySelector<HTMLAnchorElement>('a[download$=".ics"]') ?? undefined;
      expect(downloadedAnchor).toBeDefined();
    });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:move-daily-calendar');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    downloadCalendar({ routineId: 'back', days: ['MO'], localTime: '09:00' });

    expect(click).toHaveBeenCalledOnce();
    expect(downloadedAnchor?.download).toBe('move-daily-back-reminder.ics');
    expect(downloadedAnchor?.href).toBe('blob:move-daily-calendar');
    expect(document.body.contains(downloadedAnchor ?? null)).toBe(false);
    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe('text/calendar;charset=utf-8');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:move-daily-calendar');
  });

  it('removes the anchor and revokes the URL when clicking fails', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 18, 8));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('click blocked');
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:blocked-calendar');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    expect(() => downloadCalendar({ routineId: 'left-toe', days: ['WE'], localTime: '18:30' })).toThrow(
      'click blocked',
    );
    expect(document.querySelector('a[download$=".ics"]')).not.toBeInTheDocument();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:blocked-calendar');
  });

  it('revokes the URL when DOM setup fails before an anchor exists', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 18, 8));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:dom-setup-failed');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockImplementationOnce(() => {
      throw new Error('DOM unavailable');
    });

    expect(() => downloadCalendar({ routineId: 'back', days: ['MO'], localTime: '09:00' })).toThrow(
      'DOM unavailable',
    );
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:dom-setup-failed');
  });
});
