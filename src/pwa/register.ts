/// <reference types="vite-plugin-pwa/client" />

import { registerSW } from 'virtual:pwa-register';

export interface PwaCallbacks {
  onOfflineReady(): void;
  onNeedRefresh(update: () => Promise<void>): void;
  onRegistered(registration: ServiceWorkerRegistration | undefined): void;
}

export interface PwaRegistrationDependencies {
  readonly getReadyRegistration?: () => Promise<ServiceWorkerRegistration>;
}

export function registerMoveDailyPwa(
  callbacks: PwaCallbacks,
  dependencies: PwaRegistrationDependencies = {},
): () => void {
  let active = true;
  let offlineGateStarted = false;
  let offlineForwarded = false;
  let stopActivationListener: (() => void) | null = null;
  const getReadyRegistration = dependencies.getReadyRegistration ?? getBrowserReadyRegistration;

  const clearActivationListener = (): void => {
    stopActivationListener?.();
    stopActivationListener = null;
  };

  const forwardOfflineReady = (): void => {
    if (!active || offlineForwarded) return;
    offlineForwarded = true;
    clearActivationListener();
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
      if (worker?.state === 'activated') {
        forwardOfflineReady();
        return;
      }
      if (worker?.state !== 'activating') return;

      const onStateChange = (): void => {
        if (!active || worker.state === 'redundant') {
          clearActivationListener();
          return;
        }
        if (worker.state === 'activated') forwardOfflineReady();
      };
      worker.addEventListener('statechange', onStateChange);
      stopActivationListener = () => worker.removeEventListener('statechange', onStateChange);
      onStateChange();
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
    clearActivationListener();
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

function safeCallback(active: boolean, callback: () => void): void {
  if (!active) return;
  try {
    callback();
  } catch {
    // UI callback failures must not escape service-worker lifecycle hooks.
  }
}
