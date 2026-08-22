/// <reference types="vite-plugin-pwa/client" />

import { registerSW } from 'virtual:pwa-register';

export interface PwaCallbacks {
  onOfflineReady(): void;
  onNeedRefresh(update: () => Promise<void>): void;
  onRegistered(registration: ServiceWorkerRegistration | undefined): void;
}

export function registerMoveDailyPwa(callbacks: PwaCallbacks): () => void {
  let active = true;

  try {
    const updateServiceWorker = registerSW({
      immediate: true,
      onOfflineReady: () => safeCallback(active, callbacks.onOfflineReady),
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
  };
}

function safeCallback(active: boolean, callback: () => void): void {
  if (!active) return;
  try {
    callback();
  } catch {
    // UI callback failures must not escape service-worker lifecycle hooks.
  }
}
