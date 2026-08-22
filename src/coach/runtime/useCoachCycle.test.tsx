import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoachSvg } from './CoachSvg';
import { Band, Ground, Joint, Limb, Mat, MotionArrow, PoseLabel, Roller } from './primitives';
import { useCoachCycle } from './useCoachCycle';

type FrameCallback = FrameRequestCallback;

describe('useCoachCycle', () => {
  let now = 0;
  let nextFrameId = 1;
  let frames = new Map<number, FrameCallback>();
  let requestFrame: ReturnType<typeof vi.fn>;
  let cancelFrame: ReturnType<typeof vi.fn>;
  let pageVisible = true;

  const advanceFrame = (milliseconds: number) => {
    now += milliseconds;
    const pendingFrames = [...frames.values()];
    frames = new Map();
    act(() => {
      pendingFrames.forEach((frame) => frame(now));
    });
  };

  beforeEach(() => {
    now = 0;
    nextFrameId = 1;
    frames = new Map();
    pageVisible = true;
    requestFrame = vi.fn((callback: FrameCallback) => {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    });
    cancelFrame = vi.fn((id: number) => {
      frames.delete(id);
    });
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
      pageVisible ? 'visible' : 'hidden',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not advance while paused and resumes without counting paused time', () => {
    const onCycleComplete = vi.fn();
    const { result, rerender } = renderHook(
      ({ running }) => useCoachCycle({ durationMs: 1000, running, onCycleComplete }),
      { initialProps: { running: true } },
    );

    advanceFrame(250);
    expect(result.current.progress).toBe(0.25);

    rerender({ running: false });
    now += 10_000;
    expect(result.current.progress).toBe(0.25);
    expect(onCycleComplete).not.toHaveBeenCalled();

    rerender({ running: true });
    advanceFrame(750);
    expect(result.current.progress).toBe(0);
    expect(onCycleComplete).toHaveBeenCalledOnce();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'keeps the clock static for invalid duration %s',
    (durationMs) => {
      const onCycleComplete = vi.fn();
      const { result } = renderHook(() =>
        useCoachCycle({ durationMs, running: true, onCycleComplete }),
      );

      now += 100_000;
      advanceFrame(10_000);

      expect(result.current.progress).toBe(0);
      expect(result.current.cycle).toBe(0);
      expect(onCycleComplete).not.toHaveBeenCalled();
      expect(requestFrame).not.toHaveBeenCalled();
    },
  );

  it('starts a clean clock when a duration becomes valid', () => {
    const onCycleComplete = vi.fn();
    const { result, rerender } = renderHook(
      ({ durationMs }) => useCoachCycle({ durationMs, running: true, onCycleComplete }),
      { initialProps: { durationMs: 0 } },
    );

    now += 100_000;
    rerender({ durationMs: 1000 });
    advanceFrame(250);

    expect(result.current.progress).toBe(0.25);
    expect(result.current.cycle).toBe(0);
    expect(onCycleComplete).not.toHaveBeenCalled();
  });

  it('resets the visual clock and cycle count', () => {
    const { result } = renderHook(() =>
      useCoachCycle({ durationMs: 1000, running: true, onCycleComplete: vi.fn() }),
    );

    advanceFrame(1_250);
    expect(result.current.progress).toBe(0.25);
    expect(result.current.cycle).toBe(1);

    act(() => result.current.reset());
    expect(result.current.progress).toBe(0);
    expect(result.current.cycle).toBe(0);
  });

  it('does not count elapsed time while the document is hidden', () => {
    const onCycleComplete = vi.fn();
    const { result } = renderHook(() =>
      useCoachCycle({ durationMs: 1000, running: true, onCycleComplete }),
    );

    advanceFrame(250);
    pageVisible = false;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    now += 10_000;
    pageVisible = true;
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    advanceFrame(750);
    expect(result.current.progress).toBe(0);
    expect(onCycleComplete).toHaveBeenCalledOnce();
  });

  it('carries overflow and emits exactly one callback for every completed cycle', () => {
    const onCycleComplete = vi.fn();
    const { result } = renderHook(() =>
      useCoachCycle({ durationMs: 1000, running: true, onCycleComplete }),
    );

    advanceFrame(2_500);
    expect(result.current.progress).toBe(0.5);
    expect(result.current.cycle).toBe(2);
    expect(onCycleComplete).toHaveBeenCalledTimes(2);

    advanceFrame(100);
    expect(result.current.progress).toBe(0.6);
    expect(onCycleComplete).toHaveBeenCalledTimes(2);
  });

  it('cancels its pending animation frame when unmounted', () => {
    const { unmount } = renderHook(() =>
      useCoachCycle({ durationMs: 1000, running: true, onCycleComplete: vi.fn() }),
    );

    expect(requestFrame).toHaveBeenCalledOnce();
    unmount();
    expect(cancelFrame).toHaveBeenCalledOnce();
    expect(frames).toHaveLength(0);
  });
});

describe('coach SVG primitives', () => {
  it('exposes one labelled SVG while leaving movement arrows decorative', () => {
    render(
      <CoachSvg label="Illustrated movement">
        <Ground x1={8} y1={240} x2={312} y2={240} />
        <Limb x1={80} y1={190} x2={140} y2={150} />
        <Joint cx={140} cy={150} />
        <Mat height={18} width={180} x={68} y={222} />
        <Roller cx={116} cy={202} />
        <Band x1={196} y1={204} x2={250} y2={204} />
        <MotionArrow x1={160} y1={180} x2={200} y2={130} />
        <PoseLabel x={16} y={24} label="Start position" />
      </CoachSvg>,
    );

    const graphic = screen.getByRole('img', { name: 'Illustrated movement' });
    expect(graphic).toHaveAttribute('viewBox', '0 0 320 280');
    expect(graphic).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
    expect(screen.getByText('Start position')).toBeVisible();
    expect(screen.getByTestId('motion-arrow')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('limb')).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    expect(screen.getByTestId('ground')).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    expect(screen.getByTestId('joint')).toHaveAttribute('cx', '140');
    expect(screen.getByTestId('mat')).toHaveAttribute('fill', 'var(--paper-raised)');
    expect(screen.getByTestId('roller')).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    expect(screen.getByTestId('band')).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    expect(screen.getByTestId('pose-label')).toHaveAttribute('aria-label', 'Start position');
  });
});
