import { describe, expect, it, vi } from 'vitest';
import { createTone } from './tone';

function createFakeContext() {
  const oscillator = {
    connect: vi.fn(),
    frequency: { value: 0 },
    start: vi.fn(),
    stop: vi.fn(),
  };
  const gain = {
    connect: vi.fn(),
    gain: {
      exponentialRampToValueAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
      value: 0,
    },
  };
  const context = {
    close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => gain),
    createOscillator: vi.fn(() => oscillator),
    currentTime: 1,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
  };

  return { context, gain, oscillator };
}

describe('coaching tones', () => {
  it('does not create or play a tone before the Start-gesture unlock', () => {
    const fake = createFakeContext();
    const createContext = vi.fn(() => fake.context);
    const tone = createTone({ createContext });

    tone.tone('count');

    expect(createContext).not.toHaveBeenCalled();
    expect(fake.context.createOscillator).not.toHaveBeenCalled();
  });

  it.each([
    { durationMs: 70, frequency: 520, kind: 'count' as const },
    { durationMs: 120, frequency: 740, kind: 'start' as const },
    { durationMs: 180, frequency: 880, kind: 'complete' as const },
    { durationMs: 180, frequency: 260, kind: 'warning' as const },
  ])('plays the $kind tone at $frequency Hz for $durationMs ms after unlock', async ({ kind, frequency, durationMs }) => {
    const fake = createFakeContext();
    const tone = createTone({ createContext: () => fake.context });

    await tone.unlock();
    tone.tone(kind);

    expect(fake.oscillator.frequency.value).toBe(frequency);
    expect(fake.oscillator.start).toHaveBeenCalledWith(1);
    expect(fake.oscillator.stop).toHaveBeenCalledWith(1 + durationMs / 1000);
  });

  it('closes safely on disposal and prevents later playback', async () => {
    const fake = createFakeContext();
    const tone = createTone({ createContext: () => fake.context });

    await tone.unlock();
    tone.dispose();
    tone.tone('start');

    expect(fake.context.close).toHaveBeenCalledOnce();
    expect(fake.context.createOscillator).not.toHaveBeenCalled();
  });

  it('cleans up a failed unlock and retries from a later user gesture', async () => {
    const failed = createFakeContext();
    failed.context.resume.mockRejectedValueOnce(new Error('gesture rejected'));
    const recovered = createFakeContext();
    const createContext = vi
      .fn()
      .mockReturnValueOnce(failed.context)
      .mockReturnValueOnce(recovered.context);
    const tone = createTone({ createContext });

    await tone.unlock();
    tone.tone('count');
    await tone.unlock();
    tone.tone('count');

    expect(failed.context.close).toHaveBeenCalledOnce();
    expect(failed.context.createOscillator).not.toHaveBeenCalled();
    expect(recovered.context.createOscillator).toHaveBeenCalledOnce();
  });
});
