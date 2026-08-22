export interface WakeLockSentinelLike {
  readonly released: boolean;
  release(): Promise<void>;
  addEventListener?(type: 'release', listener: EventListener): void;
  removeEventListener?(type: 'release', listener: EventListener): void;
}

export interface WakeLockNavigatorLike {
  readonly wakeLock?: {
    request(type: 'screen'): Promise<WakeLockSentinelLike>;
  };
}

export interface WakeLockController {
  readonly active: boolean;
  request(): Promise<boolean>;
  release(): Promise<void>;
}

function getBrowserNavigator(): WakeLockNavigatorLike | undefined {
  try {
    return globalThis.navigator as WakeLockNavigatorLike;
  } catch {
    return undefined;
  }
}

function isReleased(sentinel: WakeLockSentinelLike): boolean {
  try {
    return sentinel.released === true;
  } catch {
    return true;
  }
}

function releaseSilently(sentinel: WakeLockSentinelLike): void {
  try {
    void sentinel.release().catch(() => undefined);
  } catch {
    // A stale browser sentinel must not surface a platform error.
  }
}

export function createWakeLockController(
  navigatorLike: WakeLockNavigatorLike | undefined = getBrowserNavigator(),
): WakeLockController {
  let sentinel: WakeLockSentinelLike | null = null;
  let releaseListener: EventListener | null = null;
  let requestEpoch = 0;

  const clearSentinel = () => {
    try {
      if (sentinel && releaseListener) {
        sentinel.removeEventListener?.('release', releaseListener);
      }
    } catch {
      // Listener cleanup must not leak browser capability failures.
    } finally {
      sentinel = null;
      releaseListener = null;
    }
  };

  return {
    get active() {
      return sentinel !== null && !isReleased(sentinel);
    },
    async request() {
      const epoch = ++requestEpoch;
      if (sentinel && !isReleased(sentinel)) return true;
      clearSentinel();

      try {
        const acquired = await navigatorLike?.wakeLock?.request('screen');
        if (!acquired || epoch !== requestEpoch || isReleased(acquired)) {
          if (acquired && !isReleased(acquired)) releaseSilently(acquired);
          return false;
        }

        sentinel = acquired;
        releaseListener = () => {
          if (sentinel === acquired) clearSentinel();
        };
        try {
          sentinel.addEventListener?.('release', releaseListener);
        } catch {
          // Active state still remains observable even without release events.
        }
        if (!isReleased(sentinel)) return true;

        clearSentinel();
        return false;
      } catch {
        return false;
      }
    },
    async release() {
      requestEpoch += 1;
      const current = sentinel;
      if (!current) return;
      if (isReleased(current)) {
        clearSentinel();
        return;
      }

      try {
        await current.release();
      } catch {
        // Releasing a low-power or browser-revoked lock is best effort.
        return;
      }
      if (sentinel === current) clearSentinel();
    },
  };
}
