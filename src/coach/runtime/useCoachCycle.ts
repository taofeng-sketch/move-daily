import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoachCycleOptions, CoachCycleState } from './coach';

interface ClockState {
  readonly progress: number;
  readonly cycle: number;
}

const initialClockState: ClockState = { progress: 0, cycle: 0 };

function validDuration(durationMs: number): number | null {
  return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : null;
}

export function useCoachCycle({
  durationMs,
  running,
  onCycleComplete,
}: CoachCycleOptions): CoachCycleState {
  const [clock, setClock] = useState<ClockState>(initialClockState);
  const progressRef = useRef(0);
  const cycleRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const onCycleCompleteRef = useRef(onCycleComplete);

  useEffect(() => {
    onCycleCompleteRef.current = onCycleComplete;
  }, [onCycleComplete]);

  const publishClock = useCallback(() => {
    setClock({ progress: progressRef.current, cycle: cycleRef.current });
  }, []);

  const reset = useCallback(() => {
    progressRef.current = 0;
    cycleRef.current = 0;
    lastTimestampRef.current = performance.now();
    setClock(initialClockState);
  }, []);

  useEffect(() => {
    if (!running) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTimestampRef.current = null;
      return undefined;
    }

    const cycleDuration = validDuration(durationMs);
    if (cycleDuration === null) {
      lastTimestampRef.current = null;
      return undefined;
    }

    let disposed = false;

    const tick = () => {
      if (document.visibilityState === 'hidden') {
        frameRef.current = null;
        lastTimestampRef.current = null;
        return;
      }

      const currentTimestamp = performance.now();
      const previousTimestamp = lastTimestampRef.current ?? currentTimestamp;
      const elapsedMs = Math.max(0, currentTimestamp - previousTimestamp);
      lastTimestampRef.current = currentTimestamp;

      const elapsedWithinCycles = progressRef.current * cycleDuration + elapsedMs;
      const completedCycles = Math.floor(elapsedWithinCycles / cycleDuration);
      const overflowMs = elapsedWithinCycles - completedCycles * cycleDuration;

      progressRef.current = overflowMs / cycleDuration;
      if (completedCycles > 0) {
        cycleRef.current += completedCycles;
        for (let cycle = 0; cycle < completedCycles; cycle += 1) {
          onCycleCompleteRef.current();
        }
      }
      publishClock();
      frameRef.current = requestAnimationFrame(tick);
    };

    const startVisibleClock = () => {
      if (disposed || document.visibilityState === 'hidden' || frameRef.current !== null) {
        return;
      }

      lastTimestampRef.current = performance.now();
      frameRef.current = requestAnimationFrame(tick);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        lastTimestampRef.current = null;
        return;
      }

      startVisibleClock();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startVisibleClock();

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastTimestampRef.current = null;
    };
  }, [durationMs, publishClock, running]);

  return { ...clock, reset };
}
