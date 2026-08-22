function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export function lerp(from: number, to: number, progress: number): number {
  const clampedProgress = clampUnit(progress);
  return from + (to - from) * clampedProgress;
}

export function easeInOut(progress: number): number {
  const clampedProgress = clampUnit(progress);
  return clampedProgress * clampedProgress * (3 - 2 * clampedProgress);
}

export function pulse(progress: number): number {
  const clampedProgress = clampUnit(progress);
  if (clampedProgress === 0 || clampedProgress === 1) {
    return 0;
  }

  return Math.sin(Math.PI * clampedProgress);
}
