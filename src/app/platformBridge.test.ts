import { describe, expect, it, vi } from 'vitest';
import type { InstallState } from '../pwa/install';
import type { PwaCallbacks } from '../pwa/register';
import { createPlatformBridge, resolveInstallInstructions } from './platformBridge';

describe('platform bridge', () => {
  it('starts each browser observer once and buffers early events before React subscribes', () => {
    let emitInstall: ((state: InstallState) => void) | undefined;
    let pwaCallbacks:
      | {
          onOfflineReady(): void;
          onNeedRefresh(update: () => Promise<void>): void;
          onRegistered(registration: ServiceWorkerRegistration | undefined): void;
        }
      | undefined;
    const observeInstall = vi.fn((callback: (state: InstallState) => void) => {
      emitInstall = callback;
      return vi.fn();
    });
    const registerPwa = vi.fn((callbacks: NonNullable<typeof pwaCallbacks>) => {
      pwaCallbacks = callbacks;
      return vi.fn();
    });
    const prompt = vi.fn(async () => 'accepted' as const);
    const update = vi.fn().mockResolvedValue(undefined);
    const bridge = createPlatformBridge({ observeInstall, registerPwa });

    bridge.start();
    bridge.start();
    emitInstall?.({ kind: 'installable', prompt });
    pwaCallbacks?.onOfflineReady();
    pwaCallbacks?.onNeedRefresh(update);
    const subscriber = vi.fn();
    bridge.subscribe(subscriber);

    expect(observeInstall).toHaveBeenCalledOnce();
    expect(registerPwa).toHaveBeenCalledOnce();
    expect(bridge.getSnapshot()).toMatchObject({
      installState: { kind: 'installable' },
      offlineReady: true,
      offlineAvailable: true,
      applyUpdate: update,
    });
    expect(subscriber).not.toHaveBeenCalled();
  });

  it('notifies subscribers and retains an update after an apply call returns without navigation', async () => {
    let pwaCallbacks: PwaCallbacks | undefined;
    const update = vi.fn().mockResolvedValue(undefined);
    const bridge = createPlatformBridge({
      observeInstall: () => vi.fn(),
      registerPwa: (callbacks) => {
        pwaCallbacks = callbacks;
        return vi.fn();
      },
    });
    const subscriber = vi.fn();
    bridge.start();
    bridge.subscribe(subscriber);

    pwaCallbacks?.onNeedRefresh(update);
    expect(subscriber).toHaveBeenCalledOnce();
    await bridge.getSnapshot().applyUpdate?.();

    expect(update).toHaveBeenCalledOnce();
    expect(bridge.getSnapshot().applyUpdate).toBe(update);
  });

  it('dismisses only the offline-ready notice and cleans up once', () => {
    const stopInstall = vi.fn();
    const stopPwa = vi.fn();
    let ready: (() => void) | undefined;
    const bridge = createPlatformBridge({
      observeInstall: () => stopInstall,
      registerPwa: (callbacks) => {
        ready = callbacks.onOfflineReady;
        return stopPwa;
      },
    });
    bridge.start();
    ready?.();
    expect(bridge.getSnapshot().offlineReady).toBe(true);

    bridge.dismissOfflineReady();
    expect(bridge.getSnapshot().offlineReady).toBe(false);
    expect(bridge.getSnapshot().offlineAvailable).toBe(true);
    bridge.stop();
    bridge.stop();
    expect(stopInstall).toHaveBeenCalledOnce();
    expect(stopPwa).toHaveBeenCalledOnce();
  });

  it('derives offline availability from an active worker or controller, never an installing worker', () => {
    let callbacks: PwaCallbacks | undefined;
    const bridge = createPlatformBridge({
      observeInstall: () => vi.fn(),
      hasServiceWorkerController: () => false,
      registerPwa: (nextCallbacks) => {
        callbacks = nextCallbacks;
        return vi.fn();
      },
    });
    bridge.start();

    callbacks?.onRegistered({ installing: {} } as ServiceWorkerRegistration);
    expect(bridge.getSnapshot().offlineAvailable).toBe(false);

    callbacks?.onRegistered({ active: {} } as ServiceWorkerRegistration);
    expect(bridge.getSnapshot().offlineAvailable).toBe(true);

    let controlledCallbacks: PwaCallbacks | undefined;
    const controlledBridge = createPlatformBridge({
      observeInstall: () => vi.fn(),
      hasServiceWorkerController: () => true,
      registerPwa: (nextCallbacks) => {
        controlledCallbacks = nextCallbacks;
        return vi.fn();
      },
    });
    controlledBridge.start();
    expect(controlledBridge.getSnapshot().offlineAvailable).toBe(true);
    controlledCallbacks?.onRegistered(undefined);
    expect(controlledBridge.getSnapshot().offlineAvailable).toBe(true);
  });

  it('retires a consumed install prompt across screen remounts until a genuinely new prompt arrives', async () => {
    let emitInstall: ((state: InstallState) => void) | undefined;
    const bridge = createPlatformBridge({
      observeInstall: (callback) => {
        emitInstall = callback;
        return vi.fn();
      },
      registerPwa: () => vi.fn(),
    });
    const firstPrompt = vi.fn(async () => 'dismissed' as const);
    const secondPrompt = vi.fn(async () => 'accepted' as const);
    bridge.start();
    emitInstall?.({ kind: 'installable', prompt: firstPrompt });
    const first = bridge.getSnapshot().installState;
    if (first.kind !== 'installable') throw new Error('Expected first install prompt');

    await first.prompt();
    expect(firstPrompt).toHaveBeenCalledOnce();
    expect(bridge.getSnapshot().installState.kind).toBe('unsupported');

    emitInstall?.({ kind: 'installable', prompt: secondPrompt });
    const second = bridge.getSnapshot().installState;
    expect(second.kind).toBe('installable');
    if (second.kind !== 'installable') throw new Error('Expected replacement install prompt');
    expect(second.prompt).not.toBe(first.prompt);
  });
});

describe('install instructions', () => {
  it('keeps install states honest without a dead promise', () => {
    expect(resolveInstallInstructions({ kind: 'ios-instructions' })).toEqual([
      'Tap Share in Safari.',
      'Choose Add to Home Screen.',
    ]);
    expect(resolveInstallInstructions({ kind: 'installed' })).toEqual([]);
    expect(resolveInstallInstructions({ kind: 'installable', prompt: vi.fn() })).toEqual([]);
    expect(resolveInstallInstructions({ kind: 'unsupported' })).toEqual([
      'Installation is not available in this browser.',
      'Bookmark this page for quick access.',
    ]);
  });
});
