import { afterEach, describe, expect, it, vi } from 'vitest';
import { getInstallInstructions, observeInstallPrompt, type InstallState } from './install';

interface BeforeInstallPromptEvent extends Event {
  readonly prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function installEvent(outcome: 'accepted' | 'dismissed' = 'accepted'): BeforeInstallPromptEvent {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
  Object.defineProperties(event, {
    prompt: { value: vi.fn().mockResolvedValue(undefined) },
    userChoice: { value: Promise.resolve({ outcome }) },
  });
  return event;
}

function latest(states: InstallState[]): InstallState {
  const state = states.at(-1);
  if (!state) throw new Error('Expected an install state');
  return state;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('install instructions', () => {
  it('gives iOS users the manual Share then Add to Home Screen path', () => {
    expect(getInstallInstructions('ios')).toEqual([
      'Tap Share in Safari.',
      'Choose Add to Home Screen.',
    ]);
  });

  it('gives Android and desktop users useful browser guidance', () => {
    expect(getInstallInstructions('android')).toEqual([
      'Open the browser menu.',
      'Choose Install app or Add to Home screen if it appears.',
    ]);
    expect(getInstallInstructions('desktop')).toEqual([
      'Use the install button in the address bar or browser menu if it appears.',
      'Otherwise, bookmark this page for quick access.',
    ]);
  });

  it('does not promise installation on an unsupported platform', () => {
    const instructions = getInstallInstructions('unknown');
    expect(instructions).toEqual([
      'Installation is not available in this browser.',
      'Bookmark this page for quick access.',
    ]);
    expect(instructions.join(' ')).not.toMatch(/install (this|the) app/i);
  });
});

describe('observeInstallPrompt', () => {
  it('reports standalone display mode as already installed', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    const callback = vi.fn<(state: InstallState) => void>();

    const cleanup = observeInstallPrompt(callback);

    expect(callback).toHaveBeenCalledWith({ kind: 'installed' });
    cleanup();
  });

  it('reports manual instructions on iOS when the app is not installed', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    vi.stubGlobal('navigator', {
      maxTouchPoints: 5,
      platform: 'iPhone',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
    });
    const callback = vi.fn<(state: InstallState) => void>();

    const cleanup = observeInstallPrompt(callback);

    expect(callback).toHaveBeenCalledWith({ kind: 'ios-instructions' });
    cleanup();
  });

  it('captures a Chromium prompt without opening it automatically and reports its result once', async () => {
    const states: InstallState[] = [];
    const event = installEvent('accepted');
    const cleanup = observeInstallPrompt((state) => states.push(state));

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(event.prompt).not.toHaveBeenCalled();
    const state = latest(states);
    expect(state.kind).toBe('installable');
    if (state.kind !== 'installable') throw new Error('Expected an installable state');
    await expect(state.prompt()).resolves.toBe('accepted');
    await expect(state.prompt()).resolves.toBe('accepted');
    expect(event.prompt).toHaveBeenCalledOnce();

    cleanup();
  });

  it('contains a rejected browser prompt and reports it as dismissed', async () => {
    const states: InstallState[] = [];
    const event = installEvent();
    vi.mocked(event.prompt).mockRejectedValueOnce(new Error('prompt blocked'));
    const cleanup = observeInstallPrompt((state) => states.push(state));
    window.dispatchEvent(event);

    const state = latest(states);
    if (state.kind !== 'installable') throw new Error('Expected an installable state');
    await expect(state.prompt()).resolves.toBe('dismissed');
    cleanup();
  });

  it('contains throwing prompt-property access', async () => {
    const states: InstallState[] = [];
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.defineProperty(event, 'prompt', {
      get: () => {
        throw new Error('prompt property blocked');
      },
    });
    const cleanup = observeInstallPrompt((state) => states.push(state));
    window.dispatchEvent(event);

    const state = latest(states);
    if (state.kind !== 'installable') throw new Error('Expected an installable state');
    await expect(state.prompt()).resolves.toBe('dismissed');
    cleanup();
  });

  it('reports installation and suppresses callbacks after cleanup', () => {
    const callback = vi.fn<(state: InstallState) => void>();
    const cleanup = observeInstallPrompt(callback);

    window.dispatchEvent(new Event('appinstalled'));
    expect(callback).toHaveBeenLastCalledWith({ kind: 'installed' });

    cleanup();
    const callsAtCleanup = callback.mock.calls.length;
    window.dispatchEvent(installEvent());
    window.dispatchEvent(new Event('appinstalled'));
    expect(callback).toHaveBeenCalledTimes(callsAtCleanup);
  });

  it('contains listener setup and cleanup failures', () => {
    const callback = vi.fn<(state: InstallState) => void>();
    const add = vi.spyOn(window, 'addEventListener').mockImplementation(() => {
      throw new Error('listener setup blocked');
    });

    expect(() => observeInstallPrompt(callback)).not.toThrow();
    expect(callback).toHaveBeenCalled();

    add.mockRestore();
    const cleanup = observeInstallPrompt(callback);
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {
      throw new Error('listener cleanup blocked');
    });
    expect(cleanup).not.toThrow();
  });
});
