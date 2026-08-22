/// <reference types="vite-plugin-pwa/client" />

import { registerSW } from 'virtual:pwa-register';

export interface PwaCallbacks {
  onOfflineReady(): void;
  onNeedRefresh(update: () => Promise<void>): void;
  onRegistered(registration: ServiceWorkerRegistration | undefined): void;
}

export interface PwaRegistrationDependencies {
  readonly getReadyRegistration?: () => Promise<ServiceWorkerRegistration>;
  readonly getServiceWorkerContainer?: () => ServiceWorkerContainerSource | undefined;
}

interface ServiceWorkerContainerSource {
  readonly controller: ServiceWorker | null;
  addEventListener(type: 'controllerchange', listener: EventListener): void;
  removeEventListener(type: 'controllerchange', listener: EventListener): void;
}

export function registerMoveDailyPwa(
  callbacks: PwaCallbacks,
  dependencies: PwaRegistrationDependencies = {},
): () => void {
  let active = true;
  let offlineGateStarted = false;
  let offlineForwarded = false;
  let stopReadinessListeners: (() => void) | null = null;
  const getReadyRegistration = dependencies.getReadyRegistration ?? getBrowserReadyRegistration;
  const getServiceWorkerContainer =
    dependencies.getServiceWorkerContainer ?? getBrowserServiceWorkerContainer;

  const clearReadinessListeners = (): void => {
    stopReadinessListeners?.();
    stopReadinessListeners = null;
  };

  const forwardOfflineReady = (): void => {
    if (!active || offlineForwarded) return;
    offlineForwarded = true;
    clearReadinessListeners();
    safeCallback(active, callbacks.onOfflineReady);
  };

  const gateOfflineReady = (): void => {
    if (!active || offlineGateStarted || offlineForwarded) return;
    offlineGateStarted = true;

    let readyRegistration: Promise<ServiceWorkerRegistration>;
    try {
      readyRegistration = getReadyRegistration();
    } catch {
      return;
    }

    void readyRegistration.then((registration) => {
      if (!active || offlineForwarded) return;
      const worker = registration.active;
      if (worker?.state !== 'activating' && worker?.state !== 'activated') return;

      let serviceWorkerContainer: ServiceWorkerContainerSource | undefined;
      try {
        serviceWorkerContainer = getServiceWorkerContainer();
      } catch {
        return;
      }
      if (!serviceWorkerContainer) return;

      let workerListenerAttached = false;
      let controllerListenerAttached = false;
      let listenersReady = false;
      const removeListeners = (): void => {
        listenersReady = false;
        if (workerListenerAttached) {
          worker.removeEventListener('statechange', onReadinessChange);
          workerListenerAttached = false;
        }
        if (controllerListenerAttached) {
          serviceWorkerContainer.removeEventListener('controllerchange', onReadinessChange);
          controllerListenerAttached = false;
        }
      };
      const onReadinessChange = (): void => {
        if (!listenersReady) return;
        if (!active || offlineForwarded || worker.state === 'redundant') {
          clearReadinessListeners();
          return;
        }
        if (
          worker.state === 'activated' &&
          registration.active === worker &&
          serviceWorkerContainer.controller === worker
        ) {
          forwardOfflineReady();
        }
      };

      stopReadinessListeners = removeListeners;
      try {
        worker.addEventListener('statechange', onReadinessChange);
        workerListenerAttached = true;
        serviceWorkerContainer.addEventListener('controllerchange', onReadinessChange);
        controllerListenerAttached = true;
        listenersReady = true;
        onReadinessChange();
      } catch {
        clearReadinessListeners();
      }
    }).catch(() => {
      // A rejected readiness promise cannot establish offline availability.
    });
  };

  try {
    const updateServiceWorker = registerSW({
      immediate: true,
      onOfflineReady: gateOfflineReady,
      onNeedRefresh: () => {
        if (!active) return;
        safeCallback(active, () =>
          callbacks.onNeedRefresh(async () => {
            if (!active) return;
            try {
              await updateServiceWorker(true);
            } catch {
              // The current online app remains usable when an update cannot apply.
            }
          }),
        );
      },
      onRegisteredSW: (_serviceWorkerUrl, registration) =>
        safeCallback(active, () => callbacks.onRegistered(registration)),
      onRegisterError: () => {
        // Registration failure intentionally leaves the normal online app running.
      },
    });
  } catch {
    // Service workers are progressive enhancement; synchronous failures are contained.
  }

  return () => {
    active = false;
    clearReadinessListeners();
  };
}

function getBrowserReadyRegistration(): Promise<ServiceWorkerRegistration> {
  try {
    const ready = navigator.serviceWorker?.ready;
    return ready ?? Promise.reject(new Error('Service workers are unavailable'));
  } catch (error) {
    return Promise.reject(error);
  }
}

function getBrowserServiceWorkerContainer(): ServiceWorkerContainer | undefined {
  try {
    return typeof navigator === 'undefined' ? undefined : navigator.serviceWorker;
  } catch {
    return undefined;
  }
}

function safeCallback(active: boolean, callback: () => void): void {
  if (!active) return;
  try {
    callback();
  } catch {
    // UI callback failures must not escape service-worker lifecycle hooks.
  }
}
