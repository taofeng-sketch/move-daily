import { beforeEach, describe, expect, it, vi } from 'vitest';

const pwa = vi.hoisted(() => ({
  registerSW: vi.fn(),
  update: vi.fn<() => Promise<void>>(),
}));

vi.mock('virtual:pwa-register', () => ({ registerSW: pwa.registerSW }));

import { registerMoveDailyPwa } from './register';

beforeEach(() => {
  pwa.registerSW.mockReset();
  pwa.update.mockReset();
  pwa.update.mockResolvedValue(undefined);
  pwa.registerSW.mockReturnValue(pwa.update);
});

describe('registerMoveDailyPwa', () => {
  it('forwards truthful offline, refresh, and registration callbacks without applying an update', async () => {
    const callbacks = {
      onOfflineReady: vi.fn(),
      onNeedRefresh: vi.fn<(update: () => Promise<void>) => void>(),
      onRegistered: vi.fn(),
    };
    registerMoveDailyPwa(callbacks);
    const options = pwa.registerSW.mock.calls[0]?.[0];
    const registration = {} as ServiceWorkerRegistration;

    options.onOfflineReady();
    options.onNeedRefresh();
    options.onRegisteredSW('/move-daily/sw.js', registration);

    expect(callbacks.onOfflineReady).toHaveBeenCalledOnce();
    expect(callbacks.onNeedRefresh).toHaveBeenCalledOnce();
    expect(callbacks.onRegistered).toHaveBeenCalledWith(registration);
    expect(pwa.update).not.toHaveBeenCalled();

    const applyUpdate = callbacks.onNeedRefresh.mock.calls[0]?.[0];
    if (!applyUpdate) throw new Error('Expected an explicit update callback');
    await applyUpdate();
    expect(pwa.update).toHaveBeenCalledOnce();
  });

  it('suppresses virtual-module callbacks after cleanup', () => {
    const callbacks = {
      onOfflineReady: vi.fn(),
      onNeedRefresh: vi.fn(),
      onRegistered: vi.fn(),
    };
    const cleanup = registerMoveDailyPwa(callbacks);
    const options = pwa.registerSW.mock.calls[0]?.[0];

    cleanup();
    options.onOfflineReady();
    options.onNeedRefresh();
    options.onRegisteredSW('/move-daily/sw.js', undefined);

    expect(callbacks.onOfflineReady).not.toHaveBeenCalled();
    expect(callbacks.onNeedRefresh).not.toHaveBeenCalled();
    expect(callbacks.onRegistered).not.toHaveBeenCalled();
  });

  it('contains a synchronous registration failure', () => {
    pwa.registerSW.mockImplementationOnce(() => {
      throw new Error('service workers unavailable');
    });

    expect(() =>
      registerMoveDailyPwa({
        onOfflineReady: vi.fn(),
        onNeedRefresh: vi.fn(),
        onRegistered: vi.fn(),
      }),
    ).not.toThrow();
  });

  it('contains a rejected explicit update request', async () => {
    pwa.update.mockRejectedValueOnce(new Error('update failed'));
    const onNeedRefresh = vi.fn<(update: () => Promise<void>) => void>();
    registerMoveDailyPwa({
      onOfflineReady: vi.fn(),
      onNeedRefresh,
      onRegistered: vi.fn(),
    });
    pwa.registerSW.mock.calls[0]?.[0].onNeedRefresh();

    const applyUpdate = onNeedRefresh.mock.calls[0]?.[0];
    if (!applyUpdate) throw new Error('Expected an explicit update callback');
    await expect(applyUpdate()).resolves.toBeUndefined();
  });
});
