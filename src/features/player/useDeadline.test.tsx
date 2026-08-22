import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDeadline } from './useDeadline';

describe('useDeadline', () => {
  let now = 0;
  let nextFrameId = 1;
  let frames = new Map<number, FrameRequestCallback>();

  const advanceFrame = (milliseconds: number) => {
    now += milliseconds;
    const pending = [...frames.values()];
    frames = new Map();
    act(() => pending.forEach((frame) => frame(now)));
  };

  beforeEach(() => {
    now = 0;
    nextFrameId = 1;
    frames = new Map();
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('expires a 5000 ms absolute deadline once even after a late frame', () => {
    const onElapsed = vi.fn();
    const { result } = renderHook(() =>
      useDeadline({ durationMs: 5000, running: true, deadlineKey: 'prepare', onElapsed }),
    );

    advanceFrame(5200);
    advanceFrame(10_000);

    expect(result.current.remainingMs).toBe(0);
    expect(onElapsed).toHaveBeenCalledOnce();
    expect(frames).toHaveLength(0);
  });

  it('schedules an already elapsed zero-ms restore and emits exactly once', () => {
    const onElapsed = vi.fn();
    const { result } = renderHook(() =>
      useDeadline({ durationMs: 0, running: true, deadlineKey: 'restored-zero', onElapsed }),
    );

    expect(result.current.remainingMs).toBe(0);
    expect(frames).toHaveLength(1);
    advanceFrame(0);
    advanceFrame(1000);
    expect(onElapsed).toHaveBeenCalledOnce();
    expect(frames).toHaveLength(0);
  });

  it('preserves explicit remaining time while paused and creates a fresh deadline on resume', () => {
    const onElapsed = vi.fn();
    const { result, rerender } = renderHook(
      ({ running }) =>
        useDeadline({ durationMs: 5000, running, deadlineKey: 'prepare', onElapsed }),
      { initialProps: { running: true } },
    );

    advanceFrame(1800);
    rerender({ running: false });
    expect(result.current.remainingMs).toBe(3200);

    now += 20_000;
    rerender({ running: true });
    advanceFrame(3199);
    expect(onElapsed).not.toHaveBeenCalled();
    advanceFrame(1);
    expect(onElapsed).toHaveBeenCalledOnce();
  });

  it.each([null, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'does not schedule work for invalid duration %s and cleans up prior work',
    (durationMs) => {
      const onElapsed = vi.fn();
      const { rerender, unmount } = renderHook(
        ({ duration }) =>
          useDeadline({ durationMs: duration, running: true, deadlineKey: duration, onElapsed }),
        { initialProps: { duration: 1000 as number | null } },
      );

      expect(frames).toHaveLength(1);
      rerender({ duration: durationMs });
      expect(frames).toHaveLength(0);
      advanceFrame(10_000);
      expect(onElapsed).not.toHaveBeenCalled();
      unmount();
      expect(frames).toHaveLength(0);
    },
  );

  it('cancels scheduled work on unmount', () => {
    const onElapsed = vi.fn();
    const { unmount } = renderHook(() =>
      useDeadline({ durationMs: 5000, running: true, deadlineKey: 'prepare', onElapsed }),
    );

    expect(frames).toHaveLength(1);
    unmount();
    advanceFrame(6000);
    expect(onElapsed).not.toHaveBeenCalled();
  });
});
