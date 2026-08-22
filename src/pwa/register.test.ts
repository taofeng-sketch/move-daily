import { beforeEach, describe, expect, it, vi } from 'vitest';

const pwa = vi.hoisted(() => ({
  registerSW: vi.fn(),
  update: vi.fn<() => Promise<void>>(),
}));

vi.mock('virtual:pwa-register', () => ({ registerSW: pwa.registerSW }));

import { registerMoveDailyPwa } from './register';

class FakeServiceWorker extends EventTarget {
  state: ServiceWorkerState;

  constructor(state: ServiceWorkerState) {
    super();
    this.state = state;
  }

  transitionTo(state: ServiceWorkerState): void {
    this.state = state;
    this.dispatchEvent(new Event('statechange'));
  }
}

function registrationWith(worker: FakeServiceWorker): ServiceWorkerRegistration {
  return { active: worker as unknown as ServiceWorker } as ServiceWorkerRegistration;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  pwa.registerSW.mockReset();
  pwa.update.mockReset();
  pwa.update.mockResolvedValue(undefined);
  pwa.registerSW.mockReturnValue(pwa.update);
});

describe('registerMoveDailyPwa', () => {
  it('forwards offline readiness only after the ready registration is activated', async () => {
    const callbacks = {
      onOfflineReady: vi.fn(),
      onNeedRefresh: vi.fn<(update: () => Promise<void>) => void>(),
      onRegistered: vi.fn(),
    };
    const registration = registrationWith(new FakeServiceWorker('activated'));
    registerMoveDailyPwa(callbacks, {
      getReadyRegistration: vi.fn().mockResolvedValue(registration),
    });
    const options = pwa.registerSW.mock.calls[0]?.[0];

    options.onOfflineReady();
    options.onNeedRefresh();
    options.onRegisteredSW('/move-daily/sw.js', registration);
    await Promise.resolve();

    expect(callbacks.onOfflineReady).toHaveBeenCalledOnce();
    expect(callbacks.onNeedRefresh).toHaveBeenCalledOnce();
    expect(callbacks.onRegistered).toHaveBeenCalledWith(registration);
    expect(pwa.update).not.toHaveBeenCalled();

    const applyUpdate = callbacks.onNeedRefresh.mock.calls[0]?.[0];
    if (!applyUpdate) throw new Error('Expected an explicit update callback');
    await applyUpdate();
    expect(pwa.update).toHaveBeenCalledOnce();
  });

  it('waits through activating, removes its listener, and forwards readiness once', async () => {
    const worker = new FakeServiceWorker('activating');
    const removeEventListener = vi.spyOn(worker, 'removeEventListener');
    const onOfflineReady = vi.fn();
    const getReadyRegistration = vi.fn().mockResolvedValue(registrationWith(worker));
    registerMoveDailyPwa(
      { onOfflineReady, onNeedRefresh: vi.fn(), onRegistered: vi.fn() },
      { getReadyRegistration },
    );
    const options = pwa.registerSW.mock.calls[0]?.[0];

    options.onOfflineReady();
    options.onOfflineReady();
    await Promise.resolve();
    expect(onOfflineReady).not.toHaveBeenCalled();
    expect(getReadyRegistration).toHaveBeenCalledOnce();

    worker.transitionTo('activated');
    worker.transitionTo('redundant');
    expect(onOfflineReady).toHaveBeenCalledOnce();
    expect(removeEventListener).toHaveBeenCalledOnce();
  });

  it.each(['installing', 'redundant'] as const)(
    'does not claim offline readiness from a %s worker',
    async (state) => {
      const onOfflineReady = vi.fn();
      registerMoveDailyPwa(
        { onOfflineReady, onNeedRefresh: vi.fn(), onRegistered: vi.fn() },
        { getReadyRegistration: () => Promise.resolve(registrationWith(new FakeServiceWorker(state))) },
      );

      pwa.registerSW.mock.calls[0]?.[0].onOfflineReady();
      await Promise.resolve();
      expect(onOfflineReady).not.toHaveBeenCalled();
    },
  );

  it('contains a rejected ready registration and suppresses a deferred result after cleanup', async () => {
    const rejectedReady = vi.fn().mockRejectedValue(new Error('ready failed'));
    const rejectedCallback = vi.fn();
    registerMoveDailyPwa(
      { onOfflineReady: rejectedCallback, onNeedRefresh: vi.fn(), onRegistered: vi.fn() },
      { getReadyRegistration: rejectedReady },
    );
    pwa.registerSW.mock.calls[0]?.[0].onOfflineReady();
    await Promise.resolve();
    expect(rejectedCallback).not.toHaveBeenCalled();

    pwa.registerSW.mockClear();
    pwa.registerSW.mockReturnValue(pwa.update);
    const ready = deferred<ServiceWorkerRegistration>();
    const deferredCallback = vi.fn();
    const cleanup = registerMoveDailyPwa(
      { onOfflineReady: deferredCallback, onNeedRefresh: vi.fn(), onRegistered: vi.fn() },
      { getReadyRegistration: () => ready.promise },
    );
    pwa.registerSW.mock.calls[0]?.[0].onOfflineReady();
    cleanup();
    ready.resolve(registrationWith(new FakeServiceWorker('activated')));
    await Promise.resolve();
    expect(deferredCallback).not.toHaveBeenCalled();
  });

  it('removes an activating listener on cleanup and suppresses later activation', async () => {
    const worker = new FakeServiceWorker('activating');
    const removeEventListener = vi.spyOn(worker, 'removeEventListener');
    const onOfflineReady = vi.fn();
    const cleanup = registerMoveDailyPwa(
      { onOfflineReady, onNeedRefresh: vi.fn(), onRegistered: vi.fn() },
      { getReadyRegistration: () => Promise.resolve(registrationWith(worker)) },
    );
    pwa.registerSW.mock.calls[0]?.[0].onOfflineReady();
    await Promise.resolve();

    cleanup();
    worker.transitionTo('activated');
    expect(onOfflineReady).not.toHaveBeenCalled();
    expect(removeEventListener).toHaveBeenCalledOnce();
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
