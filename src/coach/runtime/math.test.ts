import { describe, expect, it } from 'vitest';
import { easeInOut, lerp, pulse } from './math';

describe('coach animation math', () => {
  it('interpolates and returns to the start across one cycle', () => {
    expect(lerp(10, 20, 0.25)).toBe(12.5);
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(pulse(0)).toBe(0);
    expect(pulse(0.5)).toBe(1);
    expect(pulse(1)).toBe(0);
  });

  it('clamps visual progress outside its defined range', () => {
    expect(lerp(10, 20, -1)).toBe(10);
    expect(lerp(10, 20, 2)).toBe(20);
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
    expect(pulse(-1)).toBe(0);
    expect(pulse(2)).toBe(0);
  });
});
