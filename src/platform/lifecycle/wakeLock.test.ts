import { describe, expect, it, vi } from 'vitest';
import { createWakeLockController } from './wakeLock';

class FakeSentinel extends EventTarget {
  released = false;
  readonly release = vi.fn(async () => {
    this.released = true;
    this.dispatchEvent(new Event('release'));
  });
}

function makeCleanupThrow(sentinel: FakeSentinel): void {
  Object.defineProperty(sentinel, 'removeEventListener', {
    value: () => {
      throw new Error('listener cleanup failed');
    },
  });
}

describe('screen Wake Lock', () => {
  it('remains inactive when the capability is unsupported', async () => {
    const wakeLock = createWakeLockController({});

    await expect(wakeLock.request()).resolves.toBe(false);
    expect(wakeLock.active).toBe(false);
  });

  it('tracks a successful lock and a browser release event', async () => {
    const sentinel = new FakeSentinel();
    const request = vi.fn().mockResolvedValue(sentinel);
    const wakeLock = createWakeLockController({ wakeLock: { request } });

    await expect(wakeLock.request()).resolves.toBe(true);
    expect(wakeLock.active).toBe(true);

    sentinel.released = true;
    sentinel.dispatchEvent(new Event('release'));

    expect(wakeLock.active).toBe(false);
  });

  it('contains a rejected request', async () => {
    const wakeLock = createWakeLockController({
      wakeLock: { request: vi.fn().mockRejectedValue(new Error('denied')) },
    });

    await expect(wakeLock.request()).resolves.toBe(false);
    expect(wakeLock.active).toBe(false);
  });

  it('treats an already released sentinel as unavailable', async () => {
    const sentinel = new FakeSentinel();
    sentinel.released = true;
    const wakeLock = createWakeLockController({
      wakeLock: { request: vi.fn().mockResolvedValue(sentinel) },
    });

    await expect(wakeLock.request()).resolves.toBe(false);
    expect(wakeLock.active).toBe(false);
  });

  it('releases the current sentinel only once', async () => {
    const sentinel = new FakeSentinel();
    const wakeLock = createWakeLockController({
      wakeLock: { request: vi.fn().mockResolvedValue(sentinel) },
    });
    await wakeLock.request();

    await wakeLock.release();
    await wakeLock.release();

    expect(sentinel.release).toHaveBeenCalledOnce();
    expect(wakeLock.active).toBe(false);
  });

  it('continues requesting when stale listener cleanup throws', async () => {
    const stale = new FakeSentinel();
    makeCleanupThrow(stale);
    const replacement = new FakeSentinel();
    const request = vi.fn().mockResolvedValueOnce(stale).mockResolvedValueOnce(replacement);
    const wakeLock = createWakeLockController({ wakeLock: { request } });
    await wakeLock.request();
    stale.released = true;

    await expect(wakeLock.request()).resolves.toBe(true);
    expect(wakeLock.active).toBe(true);
  });

  it('contains throwing listener cleanup during release', async () => {
    const sentinel = new FakeSentinel();
    makeCleanupThrow(sentinel);
    const wakeLock = createWakeLockController({
      wakeLock: { request: vi.fn().mockResolvedValue(sentinel) },
    });
    await wakeLock.request();

    await expect(wakeLock.release()).resolves.toBeUndefined();
    expect(wakeLock.active).toBe(false);
  });

  it('keeps the lock active when the browser rejects release', async () => {
    const sentinel = new FakeSentinel();
    sentinel.release.mockRejectedValueOnce(new Error('release rejected'));
    const wakeLock = createWakeLockController({
      wakeLock: { request: vi.fn().mockResolvedValue(sentinel) },
    });
    await wakeLock.request();

    await expect(wakeLock.release()).resolves.toBeUndefined();
    expect(wakeLock.active).toBe(true);
  });
});
