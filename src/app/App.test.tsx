import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APP_STATE } from '../persistence/appState';
import { APP_STORAGE_KEY } from '../persistence/storage';
import type { CoachAudio } from '../platform/audio/coachAudio';
import type { WakeLockController } from '../platform/lifecycle/wakeLock';
import type { InstallState } from '../pwa/install';
import { createSession } from '../session/reducer';
import { App, type AppRuntime } from './App';
import { createPlatformBridge } from './platformBridge';

function runtime(options: { readonly installState?: InstallState; readonly update?: () => Promise<void> } = {}) {
  let emitInstall: ((state: InstallState) => void) | undefined;
  let onNeedRefresh: ((update: () => Promise<void>) => void) | undefined;
  const audio: CoachAudio = {
    speechAvailable: true,
    unlock: vi.fn().mockResolvedValue(undefined),
    speak: vi.fn(),
    tone: vi.fn(),
    cancel: vi.fn(),
    dispose: vi.fn(),
  };
  const wakeLock: WakeLockController = {
    active: false,
    request: vi.fn().mockResolvedValue(true),
    release: vi.fn().mockResolvedValue(undefined),
  };
  const platform = createPlatformBridge({
    observeInstall: (callback) => {
      emitInstall = callback;
      return vi.fn();
    },
    registerPwa: (callbacks) => {
      onNeedRefresh = callbacks.onNeedRefresh;
      return vi.fn();
    },
  });
  platform.start();
  if (options.installState) emitInstall?.(options.installState);
  if (options.update) onNeedRefresh?.(options.update);
  return { value: { audio, wakeLock, platform } satisfies AppRuntime, audio, wakeLock };
}

function seedFinalBackRep(): void {
  const session = {
    ...createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
    status: 'paused' as const,
    phaseIndex: 6,
    setIndex: 1,
    rep: 9,
    completedPhaseIds: [
      'standing-knee-bends',
      'standing-full-down-up',
      'bridge-articulations',
      'cobra-forearms',
      'cobra-hands',
      'supermans',
    ] as const,
    resumeStatus: 'active' as const,
    pauseReason: 'background' as const,
  };
  localStorage.setItem(
    APP_STORAGE_KEY,
    JSON.stringify({
      ...DEFAULT_APP_STATE,
      preferences: { ...DEFAULT_APP_STATE.preferences, reducedMotion: true },
      activeSession: session,
    }),
  );
}

beforeEach(() => localStorage.clear());

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('App', () => {
  it('renders the public product name and English promise', () => {
    render(<App runtime={runtime().value} />);
    expect(screen.getByRole('heading', { name: 'Move Daily' })).toBeVisible();
    expect(screen.getByText('Your plan, one move at a time.')).toBeVisible();
  });

  it('does not paint focus on initial Home and prevents scroll when focusing a routed heading', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    render(<App runtime={runtime().value} />);
    expect(focus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('invokes stable audio and Wake Lock in the Start click and routes without awaiting them', () => {
    const appRuntime = runtime();
    render(<App runtime={appRuntime.value} />);

    fireEvent.click(screen.getByRole('button', { name: 'Start Back' }));

    expect(appRuntime.audio.unlock).toHaveBeenCalledOnce();
    expect(appRuntime.wakeLock.request).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { name: 'Standing reach: knee bends' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'I’m ready' })).toBeVisible();
  });

  it('buffers an early update, withholds apply during Player, and restores it after deliberate exit', () => {
    const applyUpdate = vi.fn().mockResolvedValue(undefined);
    const appRuntime = runtime({ update: applyUpdate });
    render(<App runtime={appRuntime.value} />);
    expect(screen.getByText('Update ready.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Apply update' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Start Back' }));
    expect(screen.getByText('Update ready — apply after this session.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Apply update' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close session' }));
    expect(screen.getByRole('button', { name: /Resume Back/ })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Apply update' })).toBeVisible();
    expect(applyUpdate).not.toHaveBeenCalled();
  });

  it('offers the pending update inside Settings rather than behind its modal surface', () => {
    const applyUpdate = vi.fn().mockResolvedValue(undefined);
    render(<App runtime={runtime({ update: applyUpdate }).value} />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    fireEvent.click(screen.getByRole('button', { name: 'Apply update' }));
    expect(applyUpdate).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Reset all progress' }));
    expect(screen.getByRole('button', { name: 'Apply update', hidden: true }).closest('[inert]')).toBe(
      screen.getByTestId('settings-surface'),
    );
  });

  it('routes Completion install help to Settings without consuming its captured prompt', async () => {
    seedFinalBackRep();
    const prompt = vi.fn(async () => 'accepted' as const);
    const appRuntime = runtime({ installState: { kind: 'installable', prompt } });
    render(<App runtime={appRuntime.value} />);

    fireEvent.click(screen.getByRole('button', { name: /Resume Back/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark rep' }));

    await screen.findByRole('heading', { name: 'Back complete' });
    expect(screen.getByRole('button', { name: 'Add to Home Screen' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Set a calendar reminder' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Add to Home Screen' }));

    expect(screen.getByRole('heading', { name: 'Settings and safety' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Install Move Daily' })).toBeVisible();
    expect(prompt).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByRole('heading', { name: 'Back complete' })).toBeVisible();
    expect(screen.getByText('5 completed')).toBeVisible();
  });

  it('resets from Completion install help to a clean Home route', async () => {
    seedFinalBackRep();
    const appRuntime = runtime({
      installState: { kind: 'installable', prompt: vi.fn(async () => 'dismissed' as const) },
    });
    render(<App runtime={appRuntime.value} />);
    fireEvent.click(screen.getByRole('button', { name: /Resume Back/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark rep' }));
    await screen.findByRole('heading', { name: 'Back complete' });
    fireEvent.click(screen.getByRole('button', { name: 'Add to Home Screen' }));

    fireEvent.click(screen.getByRole('button', { name: 'Reset all progress' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, reset progress' }));

    expect(screen.getByRole('heading', { name: 'Move Daily' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Back complete' })).not.toBeInTheDocument();
    expect(localStorage.getItem(APP_STORAGE_KEY)).toBeNull();
  });

  it('keeps Completion reminder independent and makes the completed surface inert', async () => {
    seedFinalBackRep();
    render(<App runtime={runtime({ installState: { kind: 'unsupported' } }).value} />);
    fireEvent.click(screen.getByRole('button', { name: /Resume Back/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark rep' }));
    await screen.findByRole('heading', { name: 'Back complete' });

    expect(screen.queryByRole('button', { name: 'Add to Home Screen' })).not.toBeInTheDocument();
    const reminderButton = screen.getByRole('button', { name: 'Set a calendar reminder' });
    reminderButton.focus();
    fireEvent.click(reminderButton);

    const surface = screen.getByTestId('completion-surface');
    expect(surface).toHaveAttribute('inert');
    expect(surface).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('dialog', { name: 'Set Back calendar reminder' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reminder' }));
    await waitFor(() => expect(surface).not.toHaveAttribute('inert'));
    await waitFor(() => expect(reminderButton).toHaveFocus());
  });

  it('shows separate English notices for unavailable and recovered persistence', () => {
    const blocked = {
      getItem: () => {
        throw new DOMException('blocked');
      },
      setItem: () => {
        throw new DOMException('blocked');
      },
      removeItem: () => {
        throw new DOMException('blocked');
      },
    };
    const first = render(<App runtime={runtime().value} modelDependencies={{ storage: blocked }} />);
    expect(
      screen.getByText('This session will work, but progress cannot be saved on this device.'),
    ).toBeVisible();
    first.unmount();

    const recoveredStorage = {
      getItem: () => '{broken',
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    render(<App runtime={runtime().value} modelDependencies={{ storage: recoveredStorage }} />);
    expect(screen.getByText('Saved progress was unreadable, so Move Daily started fresh.')).toBeVisible();
  });
});
