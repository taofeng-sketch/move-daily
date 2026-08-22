import { useCallback, useEffect, useRef, useState } from 'react';

export interface DeadlineOptions {
  readonly durationMs: number | null;
  readonly running: boolean;
  readonly deadlineKey: unknown;
  readonly onElapsed: () => void;
}

export interface DeadlineState {
  readonly remainingMs: number | null;
  getRemainingMs(): number | null;
}

interface VisibleDeadline {
  readonly key: unknown;
  readonly remainingMs: number | null;
}

function validDuration(durationMs: number | null): durationMs is number {
  return durationMs !== null && Number.isFinite(durationMs) && durationMs >= 0;
}

export function useDeadline({
  durationMs,
  running,
  deadlineKey,
  onElapsed,
}: DeadlineOptions): DeadlineState {
  const [visible, setVisible] = useState<VisibleDeadline>(() => ({
    key: deadlineKey,
    remainingMs: validDuration(durationMs) ? durationMs : null,
  }));
  const remainingRef = useRef<number | null>(validDuration(durationMs) ? durationMs : null);
  const deadlineRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const keyRef = useRef<unknown>(deadlineKey);
  const durationRef = useRef<number | null>(durationMs);
  const elapsedRef = useRef(false);
  const onElapsedRef = useRef(onElapsed);

  useEffect(() => {
    onElapsedRef.current = onElapsed;
  }, [onElapsed]);

  useEffect(() => {
    const cancelFrame = () => {
      if (frameRef.current === null) return;
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };

    const captureRemaining = () => {
      if (deadlineRef.current === null) return;
      const nextRemaining = Math.max(0, deadlineRef.current - performance.now());
      remainingRef.current = nextRemaining;
      deadlineRef.current = null;
    };

    cancelFrame();

    if (!running) {
      captureRemaining();
      return cancelFrame;
    }

    if (!validDuration(durationMs)) {
      deadlineRef.current = null;
      remainingRef.current = null;
      elapsedRef.current = false;
      keyRef.current = deadlineKey;
      durationRef.current = durationMs;
      return cancelFrame;
    }

    const isNewDeadline = keyRef.current !== deadlineKey || durationRef.current !== durationMs;
    if (isNewDeadline || remainingRef.current === null || elapsedRef.current) {
      remainingRef.current = durationMs;
    }
    keyRef.current = deadlineKey;
    durationRef.current = durationMs;
    elapsedRef.current = false;
    deadlineRef.current = performance.now() + (remainingRef.current ?? durationMs);

    let disposed = false;
    const tick = () => {
      if (disposed || deadlineRef.current === null) return;
      const nextRemaining = Math.max(0, deadlineRef.current - performance.now());
      remainingRef.current = nextRemaining;
      setVisible({ key: deadlineKey, remainingMs: nextRemaining });
      if (nextRemaining === 0) {
        deadlineRef.current = null;
        frameRef.current = null;
        if (!elapsedRef.current) {
          elapsedRef.current = true;
          onElapsedRef.current();
        }
        return;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelFrame();
      captureRemaining();
    };
  }, [deadlineKey, durationMs, running]);

  const getRemainingMs = useCallback(() => {
    if (deadlineRef.current !== null) {
      return Math.max(0, deadlineRef.current - performance.now());
    }
    return remainingRef.current;
  }, []);
  const remainingMs = !validDuration(durationMs)
    ? null
    : Object.is(visible.key, deadlineKey)
      ? visible.remainingMs
      : durationMs;

  return { remainingMs, getRemainingMs };
}
