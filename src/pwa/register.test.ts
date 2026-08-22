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

function asServiceWorker(worker: FakeServiceWorker): ServiceWorker {
  return worker as unknown as ServiceWorker;
}

class FakeServiceWorkerContainer extends EventTarget {
  controller: ServiceWorker | null;

  constructor(controller: ServiceWorker | null = null) {
    super();
    this.controller = controller;
  }

  setController(controller: ServiceWorker | null): void {
    this.controller = controller;
    this.dispatchEvent(new Event('controllerchange'));
  }
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
    const worker = new FakeServiceWorker('activated');
    const registration = registrationWith(worker);
    const serviceWorkerContainer = new FakeServiceWorkerContainer(asServiceWorker(worker));
    registerMoveDailyPwa(callbacks, {
      getReadyRegistration: vi.fn().mockResolvedValue(registration),
      getServiceWorkerContainer: () => serviceWorkerContainer,
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

  it('waits for both activation and current-page control, then forwards readiness once', async () => {
    const worker = new FakeServiceWorker('activating');
    const workerRemoveEventListener = vi.spyOn(worker, 'removeEventListener');
    const serviceWorkerContainer = new FakeServiceWorkerContainer();
    const containerRemoveEventListener = vi.spyOn(serviceWorkerContainer, 'removeEventListener');
    const onOfflineReady = vi.fn();
    const getReadyRegistration = vi.fn().mockResolvedValue(registrationWith(worker));
    registerMoveDailyPwa(
      { onOfflineReady, onNeedRefresh: vi.fn(), onRegistered: vi.fn() },
      { getReadyRegistration, getServiceWorkerContainer: () => serviceWorkerContainer },
    );
    const options = pwa.registerSW.mock.calls[0]?.[0];

    options.onOfflineReady();
    options.onOfflineReady();
    await Promise.resolve();
    expect(onOfflineReady).not.toHaveBeenCalled();
    expect(getReadyRegistration).toHaveBeenCalledOnce();

    worker.transitionTo('activated');
    expect(onOfflineReady).not.toHaveBeenCalled();
    serviceWorkerContainer.setController(asServiceWorker(worker));
    worker.transitionTo('redundant');
    expect(onOfflineReady).toHaveBeenCalledOnce();
    expect(workerRemoveEventListener).toHaveBeenCalledOnce();
    expect(containerRemoveEventListener).toHaveBeenCalledOnce();
  });

  it('rechecks activation after attaching listeners to close a statechange race', async () => {
    const worker = new FakeServiceWorker('activating');
    const serviceWorkerContainer = new FakeServiceWorkerContainer(asServiceWorker(worker));
    const originalAddEventListener = worker.addEventListener.bind(worker);
    vi.spyOn(worker, 'addEventListener').mockImplementation((type, listener, options) => {
      originalAddEventListener(type, listener, options);
      if (type === 'statechange') worker.state = 'activated';
    });
    const onOfflineReady = vi.fn();
    registerMoveDailyPwa(
      { onOfflineReady, onNeedRefresh: vi.fn(), onRegistered: vi.fn() },
      {
        getReadyRegistration: () => Promise.resolve(registrationWith(worker)),
        getServiceWorkerContainer: () => serviceWorkerContainer,
      },
    );

    pwa.registerSW.mock.calls[0]?.[0].onOfflineReady();
    await Promise.resolve();
    expect(onOfflineReady).toHaveBeenCalledOnce();
  });

  it('rechecks page control after attaching listeners to close a controllerchange race', async () => {
    const worker = new FakeServiceWorker('activated');
    const serviceWorkerContainer = new FakeServiceWorkerContainer();
    const originalAddEventListener = serviceWorkerContainer.addEventListener.bind(serviceWorkerContainer);
    vi.spyOn(serviceWorkerContainer, 'addEventListener').mockImplementation((type, listener, options) => {
      originalAddEventListener(type, listener, options);
      if (type === 'controllerchange') serviceWorkerContainer.controller = asServiceWorker(worker);
    });
    const onOfflineReady = vi.fn();
    registerMoveDailyPwa(
      { onOfflineReady, onNeedRefresh: vi.fn(), onRegistered: vi.fn() },
      {
        getReadyRegistration: () => Promise.resolve(registrationWith(worker)),
        getServiceWorkerContainer: () => serviceWorkerContainer,
      },
    );

    pwa.registerSW.mock.calls[0]?.[0].onOfflineReady();
    await Promise.resolve();
    expect(onOfflineReady).toHaveBeenCalledOnce();
  });

  it('does not claim readiness for an activated worker that is not the current controller', async () => {
    const worker = new FakeServiceWorker('activated');
    const otherWorker = new FakeServiceWorker('activated');
    const serviceWorkerContainer = new FakeServiceWorkerContainer(asServiceWorker(otherWorker));
    const workerRemoveEventListener = vi.spyOn(worker, 'removeEventListener');
    const containerRemoveEventListener = vi.spyOn(serviceWorkerContainer, 'removeEventListener');
    const onOfflineReady = vi.fn();
    const cleanup = registerMoveDailyPwa(
      { onOfflineReady, onNeedRefresh: vi.fn(), onRegistered: vi.fn() },
      {
        getReadyRegistration: () => Promise.resolve(registrationWith(worker)),
        getServiceWorkerContainer: () => serviceWorkerContainer,
      },
    );

    pwa.registerSW.mock.calls[0]?.[0].onOfflineReady();
    await Promise.resolve();
    serviceWorkerContainer.setController(asServiceWorker(otherWorker));
    expect(onOfflineReady).not.toHaveBeenCalled();

    cleanup();
    serviceWorkerContainer.setController(asServiceWorker(worker));
    expect(onOfflineReady).not.toHaveBeenCalled();
    expect(workerRemoveEventListener).toHaveBeenCalledOnce();
    expect(containerRemoveEventListener).toHaveBeenCalledOnce();
  });

  it.each(['installing', 'redundant'] as const)(
    'does not claim offline readiness from a %s worker',
    async (state) => {
      const onOfflineReady = vi.fn();
      registerMoveDailyPwa(
        { onOfflineReady, onNeedRefresh: vi.fn(), onRegistered: vi.fn() },
        {
          getReadyRegistration: () => Promise.resolve(registrationWith(new FakeServiceWorker(state))),
          getServiceWorkerContainer: () => new FakeServiceWorkerContainer(),
        },
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
    const serviceWorkerContainer = new FakeServiceWorkerContainer();
    const workerRemoveEventListener = vi.spyOn(worker, 'removeEventListener');
    const containerRemoveEventListener = vi.spyOn(serviceWorkerContainer, 'removeEventListener');
    const onOfflineReady = vi.fn();
    const cleanup = registerMoveDailyPwa(
      { onOfflineReady, onNeedRefresh: vi.fn(), onRegistered: vi.fn() },
      {
        getReadyRegistration: () => Promise.resolve(registrationWith(worker)),
        getServiceWorkerContainer: () => serviceWorkerContainer,
      },
    );
    pwa.registerSW.mock.calls[0]?.[0].onOfflineReady();
    await Promise.resolve();

    cleanup();
    worker.transitionTo('activated');
    serviceWorkerContainer.setController(asServiceWorker(worker));
    expect(onOfflineReady).not.toHaveBeenCalled();
    expect(workerRemoveEventListener).toHaveBeenCalledOnce();
    expect(containerRemoveEventListener).toHaveBeenCalledOnce();
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
