import { getInstallInstructions, observeInstallPrompt, type InstallState } from '../pwa/install';
import { registerMoveDailyPwa, type PwaCallbacks } from '../pwa/register';

export interface PlatformSnapshot {
  readonly installState: InstallState;
  readonly offlineReady: boolean;
  readonly offlineAvailable: boolean;
  readonly applyUpdate: (() => Promise<void>) | null;
  readonly registered: boolean;
}

export interface PlatformBridge {
  getSnapshot(): PlatformSnapshot;
  getServerSnapshot(): PlatformSnapshot;
  subscribe(listener: () => void): () => void;
  start(): void;
  stop(): void;
  dismissOfflineReady(): void;
}

export interface PlatformBridgeDependencies {
  readonly observeInstall?: typeof observeInstallPrompt;
  readonly registerPwa?: (callbacks: PwaCallbacks) => () => void;
  readonly hasServiceWorkerController?: () => boolean;
}

const INITIAL_SNAPSHOT: PlatformSnapshot = {
  installState: { kind: 'unsupported' },
  offlineReady: false,
  offlineAvailable: false,
  applyUpdate: null,
  registered: false,
};

export function createPlatformBridge(
  dependencies: PlatformBridgeDependencies = {},
): PlatformBridge {
  const observeInstall = dependencies.observeInstall ?? observeInstallPrompt;
  const registerPwa = dependencies.registerPwa ?? registerMoveDailyPwa;
  const hasServiceWorkerController =
    dependencies.hasServiceWorkerController ?? browserHasServiceWorkerController;
  const listeners = new Set<() => void>();
  let snapshot = INITIAL_SNAPSHOT;
  let started = false;
  let stopped = false;
  let stopInstall: (() => void) | null = null;
  let stopPwa: (() => void) | null = null;

  const publish = (patch: Partial<PlatformSnapshot>): void => {
    if (stopped) return;
    snapshot = { ...snapshot, ...patch };
    for (const listener of listeners) listener();
  };

  const acceptInstallState = (state: InstallState): void => {
    if (state.kind !== 'installable') {
      publish({ installState: state });
      return;
    }
    const sourcePrompt = state.prompt;
    const prompt = async (): Promise<'accepted' | 'dismissed'> => {
      const outcome = await sourcePrompt();
      const current = snapshot.installState;
      if (current.kind === 'installable' && current.prompt === prompt) {
        publish({ installState: { kind: 'unsupported' } });
      }
      return outcome;
    };
    publish({ installState: { kind: 'installable', prompt } });
  };

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (started || stopped) return;
      started = true;
      if (safeHasServiceWorkerController(hasServiceWorkerController)) {
        publish({ offlineAvailable: true });
      }
      stopInstall = observeInstall(acceptInstallState);
      stopPwa = registerPwa({
        onOfflineReady: () => publish({ offlineReady: true, offlineAvailable: true }),
        onNeedRefresh: (applyUpdate) => publish({ applyUpdate }),
        onRegistered: (registration) => {
          const activeWorker = registration?.active?.state === 'activated';
          publish({
            registered: registration !== undefined,
            offlineAvailable:
              snapshot.offlineAvailable ||
              activeWorker ||
              safeHasServiceWorkerController(hasServiceWorkerController),
          });
        },
      });
    },
    stop() {
      if (stopped) return;
      stopped = true;
      listeners.clear();
      stopInstall?.();
      stopPwa?.();
      stopInstall = null;
      stopPwa = null;
    },
    dismissOfflineReady() {
      if (!snapshot.offlineReady) return;
      publish({ offlineReady: false });
    },
  };
}

function safeHasServiceWorkerController(reader: () => boolean): boolean {
  try {
    return reader();
  } catch {
    return false;
  }
}

function browserHasServiceWorkerController(): boolean {
  return navigator.serviceWorker?.controller !== null && navigator.serviceWorker?.controller !== undefined;
}

export function resolveInstallInstructions(state: InstallState): readonly string[] {
  switch (state.kind) {
    case 'ios-instructions':
      return getInstallInstructions('ios');
    case 'unsupported':
      return getInstallInstructions('unknown');
    case 'installable':
    case 'installed':
      return [];
  }
}
