import { describe, expect, it } from 'vitest';
import { getRoutine, ROUTINES } from './routines';

describe('public routine contract', () => {
  it('contains the exact routine frequencies and eleven player phases', () => {
    expect(ROUTINES.map(({ id, frequency }) => [id, frequency])).toEqual([
      ['back', 'Most days'],
      ['left-toe', '4× per week'],
    ]);
    expect(ROUTINES.flatMap((routine) => routine.phases)).toHaveLength(11);
  });

  it('preserves every prescribed dose without adding one', () => {
    const dose = Object.fromEntries(
      ROUTINES.flatMap((routine) => routine.phases).map((phase) => [phase.id, phase.dose]),
    );
    expect(dose).toEqual({
      'standing-knee-bends': { kind: 'reps', reps: 6, sets: 3, sideMode: 'none' },
      'standing-full-down-up': { kind: 'reps', reps: 8, sets: 1, sideMode: 'none' },
      'bridge-articulations': { kind: 'reps', reps: 10, sets: 2, sideMode: 'none' },
      'cobra-forearms': { kind: 'reps', reps: 10, sets: 1, sideMode: 'none' },
      'cobra-hands': { kind: 'reps', reps: 10, sets: 1, sideMode: 'none' },
      supermans: { kind: 'reps', reps: 8, sets: 2, sideMode: 'alternating-pairs' },
      'foam-roller-extensions': { kind: 'reps', reps: 10, sets: 2, sideMode: 'none' },
      'big-toe-lifts': { kind: 'reps', reps: 20, sets: 1, sideMode: 'none' },
      'banded-toe-pointing': { kind: 'reps', reps: 20, sets: 1, sideMode: 'none' },
      'band-arch-lifts': { kind: 'reps', reps: 10, sets: 3, sideMode: 'none' },
      'single-leg-balance': { kind: 'hold', seconds: [10, 15], sets: 4 },
    });
  });

  it('keeps public data free of personal or clinic identifiers', () => {
    const serialised = JSON.stringify(getRoutine('back'));
    expect(serialised).not.toMatch(/patient|clinic|diagnosis|appointment|@/i);
  });
});
