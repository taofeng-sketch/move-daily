import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getRoutine } from '../../domain/routines';
import { createSession, sessionReducer } from '../../session/reducer';
import { CoachRouter } from './CoachRouter';
import { SessionPlayer } from './SessionPlayer';

afterEach(() => {
  cleanup();
  document.documentElement.style.fontSize = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function activeBackSession() {
  const ready = sessionReducer(
    createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
    { type: 'READY' },
  );
  return sessionReducer(ready, { type: 'PREPARATION_FINISHED' });
}

function preparingBackSession() {
  return sessionReducer(
    createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
    { type: 'READY' },
  );
}

function unavailableSpeechAudio() {
  return {
    unlock: async () => undefined,
    speak: () => undefined,
    tone: () => undefined,
    cancel: () => undefined,
    dispose: () => undefined,
    speechAvailable: false,
  };
}

function availableSpeechAudio() {
  return {
    unlock: vi.fn().mockResolvedValue(undefined),
    speak: vi.fn(),
    tone: vi.fn(),
    cancel: vi.fn(),
    dispose: vi.fn(),
    speechAvailable: true,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function installFrameClock() {
  let now = 0;
  let frames = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
    const id = nextFrameId;
    nextFrameId += 1;
    frames.set(id, callback);
    return id;
  }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));

  return {
    advance(milliseconds: number) {
      now += milliseconds;
      const pending = [...frames.values()];
      frames = new Map();
      act(() => pending.forEach((frame) => frame(now)));
    },
  };
}

describe('CoachRouter', () => {
  it('routes every accepted Back and Toe phase/visual pair to the matching coach', () => {
    for (const phase of [...getRoutine('back').phases, ...getRoutine('left-toe').phases]) {
      const { container } = render(
        <CoachRouter phase={phase} progress={0.25} reducedMotion={false} />,
      );
      expect(container.querySelector('[role="img"]')).not.toBeNull();
      cleanup();
    }
  });

  it('rejects a mismatched phase and visual instead of silently falling back', () => {
    const phase = {
      ...getRoutine('back').phases[2]!,
      id: 'bridge-articulations' as const,
      visual: 'big-toe' as const,
    };
    expect(() => render(<CoachRouter phase={phase} progress={0} reducedMotion={false} />)).toThrow(
      /mismatch/i,
    );
  });
});

describe('SessionPlayer', () => {
  it('keeps the illustration boundary visible at readiness and starts preparation from one I’m ready gesture', () => {
    render(<SessionPlayer routineId="back" />);

    expect(screen.getByText(/illustration/i)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'I’m ready' }));
    expect(screen.getByText('Get ready')).toBeVisible();
  });

  it('offers complete always-available controls and at least 44px touch targets', () => {
    render(
      <SessionPlayer
        audio={availableSpeechAudio()}
        routineId="back"
        initialSession={activeBackSession()}
      />,
    );

    for (const name of ['Pause', 'Replay demo', 'Slower', 'Faster', 'Voice on', 'Skip exercise']) {
      const control = screen.getByRole('button', { name });
      expect(control).toBeVisible();
      expect(getComputedStyle(control).minHeight).toBe('44px');
      expect(getComputedStyle(control).minWidth).toBe('44px');
    }
  });

  it('requires confirmation before skipping and exposes all pause recovery options', () => {
    render(<SessionPlayer routineId="back" initialSession={activeBackSession()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Resume' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Restart set' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Restart set' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'End session' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Skip exercise' }));
    expect(screen.getByText('Skip this exercise?')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Keep exercise' }));
    expect(screen.queryByText('Skip this exercise?')).not.toBeInTheDocument();
  });

  it('uses a labelled modal pause sheet, focuses Resume, and removes the underlying dock', () => {
    render(<SessionPlayer routineId="back" initialSession={activeBackSession()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    const dialog = screen.getByRole('dialog', { name: 'Session paused' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Resume' })).toHaveFocus();
    expect(screen.queryByRole('navigation', { name: 'Session controls' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Replay demo' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Replay demo' })).toBeEnabled();
  });

  it('makes every non-modal player surface inert and hidden while paused', () => {
    render(<SessionPlayer routineId="back" initialSession={activeBackSession()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    const main = screen.getByRole('main');
    const nonModalSurface = main.querySelector<HTMLElement>('[inert]');
    expect(nonModalSurface).not.toBeNull();
    expect(nonModalSurface).toHaveAttribute('aria-hidden', 'true');
    expect(getComputedStyle(nonModalSurface!)).toHaveProperty('pointer-events', 'none');
    expect(screen.queryByRole('button', { name: 'Help' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close session' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Help', hidden: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close session', hidden: true })).toBeInTheDocument();
  });

  it('wraps forward and backward focus within the paused dialog and ignores Escape', () => {
    render(<SessionPlayer routineId="back" initialSession={activeBackSession()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    const dialog = screen.getByRole('dialog', { name: 'Session paused' });
    const resume = screen.getByRole('button', { name: 'Resume' });
    const end = screen.getByRole('button', { name: 'End session' });
    expect(resume).toHaveFocus();

    fireEvent.keyDown(resume, { key: 'Tab', shiftKey: true });
    expect(end).toHaveFocus();
    fireEvent.keyDown(end, { key: 'Tab' });
    expect(resume).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Session paused' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Resume' })).toHaveFocus();
  });

  it('focuses the safe paused skip action and Escape returns to its opener', async () => {
    render(<SessionPlayer routineId="back" initialSession={activeBackSession()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    const skipOpener = screen.getByRole('button', { name: 'Skip exercise' });

    fireEvent.click(skipOpener);
    const confirmation = screen.getByRole('dialog', { name: 'Confirm skip' });
    const keep = screen.getByRole('button', { name: 'Keep exercise' });
    const confirm = screen.getByRole('button', { name: 'Skip exercise' });
    expect(keep).toHaveFocus();
    expect(document.querySelector('[role="dialog"][aria-label="Session paused"]')).toHaveAttribute('inert');

    fireEvent.keyDown(keep, { key: 'Tab' });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(confirm, { key: 'Tab', shiftKey: true });
    expect(keep).toHaveFocus();

    fireEvent.keyDown(confirmation, { key: 'Escape' });
    await waitFor(() => expect(skipOpener).toHaveFocus());
    expect(screen.getByRole('dialog', { name: 'Session paused' })).toBeVisible();
  });

  it('contains a non-paused skip confirmation and safely resumes on Escape', async () => {
    render(<SessionPlayer routineId="back" initialSession={activeBackSession()} />);
    const skipOpener = screen.getByRole('button', { name: 'Skip exercise' });

    fireEvent.click(skipOpener);
    const confirmation = screen.getByRole('dialog', { name: 'Confirm skip' });
    expect(confirmation).toHaveAttribute('aria-modal', 'true');
    const keep = screen.getByRole('button', { name: 'Keep exercise' });
    const confirm = screen.getByRole('button', { name: 'Confirm skip' });
    expect(keep).toHaveFocus();
    expect(screen.getByRole('main').querySelector('[inert]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Session paused' })).not.toBeInTheDocument();

    fireEvent.keyDown(keep, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(keep).toHaveFocus();

    fireEvent.keyDown(confirmation, { key: 'Escape' });
    await waitFor(() => expect(screen.getByLabelText('Preparation countdown')).toHaveTextContent('3'));
    expect(screen.getByRole('heading', { name: 'Standing reach: knee bends' })).toHaveFocus();
    expect(skipOpener).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Confirm skip' })).not.toBeInTheDocument();
  });

  it('freezes a near-final repetition before non-paused skip confirmation can change its target', () => {
    const clock = installFrameClock();
    const onExit = vi.fn();
    render(
      <SessionPlayer
        initialSession={{ ...activeBackSession(), rep: 5 }}
        onExit={onExit}
        routineId="back"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip exercise' }));
    expect(screen.getByRole('dialog', { name: 'Confirm skip' })).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Session paused' })).not.toBeInTheDocument();

    clock.advance(4000);
    expect(screen.getByRole('heading', { name: 'Standing reach: knee bends', hidden: true })).toBeInTheDocument();
    expect(screen.getByText('5 of 6')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm skip' }));
    expect(screen.getByRole('heading', { name: 'Standing reach: full down and up' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Close session' }));
    expect(onExit).toHaveBeenCalledWith(expect.objectContaining({
      phaseIndex: 1,
      skippedPhaseIds: ['standing-knee-bends'],
    }));
    expect(onExit.mock.calls[0]?.[0].completedPhaseIds).not.toContain('standing-knee-bends');
  });

  it('freezes an exact hold through skip confirmation and resumes it through three-second preparation', async () => {
    const clock = installFrameClock();
    const audio = availableSpeechAudio();
    const onExit = vi.fn();
    const wakeLock = {
      request: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
      active: true,
    };
    render(
      <SessionPlayer
        audio={audio}
        initialSession={{
          ...sessionReducer(
            sessionReducer(
              createSession('left-toe', { coachPace: 'standard', balanceSeconds: 10 }),
              { type: 'READY' },
            ),
            { type: 'PREPARATION_FINISHED' },
          ),
          phaseIndex: 3,
          remainingMs: 7250,
        }}
        onExit={onExit}
        routineId="left-toe"
        wakeLock={wakeLock}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip exercise' }));
    const confirmation = screen.getByRole('dialog', { name: 'Confirm skip' });
    expect(screen.queryByRole('dialog', { name: 'Session paused' })).not.toBeInTheDocument();

    clock.advance(10_000);
    expect(confirmation).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Single-leg balance', hidden: true })).toBeInTheDocument();

    fireEvent.keyDown(confirmation, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Session paused' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Preparation countdown')).toHaveTextContent('3'));
    expect(audio.unlock).toHaveBeenCalledOnce();
    expect(wakeLock.request).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { name: 'Single-leg balance' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Close session' }));
    expect(onExit).toHaveBeenCalledWith(expect.objectContaining({
      status: 'paused',
      phaseIndex: 3,
      remainingMs: 7250,
      resumeStatus: 'active',
    }));
  });

  it('dismisses an active-rep skip confirmation on visibility hide and returns to ordinary Pause', () => {
    let pageVisible = true;
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
      pageVisible ? 'visible' : 'hidden',
    );
    const audio = availableSpeechAudio();
    const saveSession = vi.fn();
    const onExit = vi.fn();
    const wakeLock = {
      request: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
      active: true,
    };
    render(
      <SessionPlayer
        audio={audio}
        initialSession={{ ...activeBackSession(), rep: 5 }}
        onExit={onExit}
        routineId="back"
        saveSession={saveSession}
        wakeLock={wakeLock}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip exercise' }));
    expect(screen.getByRole('dialog', { name: 'Confirm skip' })).toBeVisible();

    pageVisible = false;
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(saveSession).toHaveBeenCalledOnce();
    expect(saveSession).toHaveBeenCalledWith(expect.objectContaining({
      status: 'paused',
      phaseIndex: 0,
      setIndex: 0,
      rep: 5,
      remainingMs: null,
      resumeStatus: 'active',
      pauseReason: 'user',
    }));
    expect(onExit).not.toHaveBeenCalled();
    expect(audio.unlock).not.toHaveBeenCalled();
    expect(wakeLock.request).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Confirm skip' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Session paused' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Resume' })).toHaveFocus();

    pageVisible = true;
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(saveSession).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog', { name: 'Confirm skip' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Session paused' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Resume' })).toHaveFocus();
  });

  it('dismisses an exact-hold skip confirmation on pagehide without resuming or routing', () => {
    const clock = installFrameClock();
    const audio = availableSpeechAudio();
    const saveSession = vi.fn();
    const onExit = vi.fn();
    const wakeLock = {
      request: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
      active: true,
    };
    render(
      <SessionPlayer
        audio={audio}
        initialSession={{
          ...sessionReducer(
            sessionReducer(
              createSession('left-toe', { coachPace: 'standard', balanceSeconds: 10 }),
              { type: 'READY' },
            ),
            { type: 'PREPARATION_FINISHED' },
          ),
          phaseIndex: 3,
          remainingMs: 7250,
        }}
        onExit={onExit}
        routineId="left-toe"
        saveSession={saveSession}
        wakeLock={wakeLock}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip exercise' }));
    expect(screen.getByRole('dialog', { name: 'Confirm skip' })).toBeVisible();

    act(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    clock.advance(10_000);
    act(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));

    expect(saveSession).toHaveBeenCalledOnce();
    expect(saveSession).toHaveBeenCalledWith(expect.objectContaining({
      status: 'paused',
      phaseIndex: 3,
      setIndex: 0,
      remainingMs: 7250,
      resumeStatus: 'active',
      pauseReason: 'user',
    }));
    expect(onExit).not.toHaveBeenCalled();
    expect(audio.unlock).not.toHaveBeenCalled();
    expect(wakeLock.request).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Confirm skip' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Session paused' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Resume' })).toHaveFocus();
    expect(screen.queryByLabelText('Preparation countdown')).not.toBeInTheDocument();
  });

  it('cancels a pending active-rep Escape resume when visibility hides before capabilities settle', async () => {
    let pageVisible = true;
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
      pageVisible ? 'visible' : 'hidden',
    );
    const unlock = deferred<void>();
    const wakeRequest = deferred<boolean>();
    const audio = {
      ...availableSpeechAudio(),
      unlock: vi.fn(() => unlock.promise),
    };
    const saveSession = vi.fn();
    const onExit = vi.fn();
    const wakeLock = {
      request: vi.fn(() => wakeRequest.promise),
      release: vi.fn().mockResolvedValue(undefined),
      active: true,
    };
    render(
      <SessionPlayer
        audio={audio}
        initialSession={{ ...activeBackSession(), rep: 5 }}
        onExit={onExit}
        routineId="back"
        saveSession={saveSession}
        wakeLock={wakeLock}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip exercise' }));
    const confirmation = screen.getByRole('dialog', { name: 'Confirm skip' });
    await act(async () => {
      fireEvent.keyDown(confirmation, { key: 'Escape' });
      await Promise.resolve();
    });
    expect(audio.unlock).toHaveBeenCalledOnce();
    expect(wakeLock.request).toHaveBeenCalledOnce();

    pageVisible = false;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(saveSession).toHaveBeenCalledOnce();
    expect(saveSession).toHaveBeenCalledWith(expect.objectContaining({
      status: 'paused',
      phaseIndex: 0,
      setIndex: 0,
      rep: 5,
      remainingMs: null,
      resumeStatus: 'active',
      pauseReason: 'user',
    }));

    await act(async () => {
      unlock.resolve(undefined);
      wakeRequest.resolve(true);
      await Promise.all([unlock.promise, wakeRequest.promise]);
    });
    pageVisible = true;
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(saveSession).toHaveBeenCalledOnce();
    expect(onExit).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Confirm skip' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Session paused' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Resume' })).toHaveFocus();
    expect(screen.getByText('5 of 6')).toBeInTheDocument();
    expect(screen.queryByLabelText('Preparation countdown')).not.toBeInTheDocument();
  });

  it('cancels a pending exact-hold Keep resume when pagehide precedes capability settlement', async () => {
    const clock = installFrameClock();
    const unlock = deferred<void>();
    const wakeRequest = deferred<boolean>();
    const audio = {
      ...availableSpeechAudio(),
      unlock: vi.fn(() => unlock.promise),
    };
    const saveSession = vi.fn();
    const onExit = vi.fn();
    const wakeLock = {
      request: vi.fn(() => wakeRequest.promise),
      release: vi.fn().mockResolvedValue(undefined),
      active: true,
    };
    render(
      <SessionPlayer
        audio={audio}
        initialSession={{
          ...sessionReducer(
            sessionReducer(
              createSession('left-toe', { coachPace: 'standard', balanceSeconds: 10 }),
              { type: 'READY' },
            ),
            { type: 'PREPARATION_FINISHED' },
          ),
          phaseIndex: 3,
          remainingMs: 7250,
        }}
        onExit={onExit}
        routineId="left-toe"
        saveSession={saveSession}
        wakeLock={wakeLock}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip exercise' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Keep exercise' }));
      await Promise.resolve();
    });
    expect(audio.unlock).toHaveBeenCalledOnce();
    expect(wakeLock.request).toHaveBeenCalledOnce();

    act(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    expect(saveSession).toHaveBeenCalledOnce();
    expect(saveSession).toHaveBeenCalledWith(expect.objectContaining({
      status: 'paused',
      phaseIndex: 3,
      setIndex: 0,
      remainingMs: 7250,
      resumeStatus: 'active',
      pauseReason: 'user',
    }));

    await act(async () => {
      unlock.resolve(undefined);
      wakeRequest.resolve(true);
      await Promise.all([unlock.promise, wakeRequest.promise]);
    });
    clock.advance(10_000);
    act(() => window.dispatchEvent(new PageTransitionEvent('pageshow')));

    expect(saveSession).toHaveBeenCalledOnce();
    expect(onExit).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Confirm skip' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Session paused' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Resume' })).toHaveFocus();
    expect(screen.getByText('8 seconds')).toBeInTheDocument();
    expect(screen.queryByLabelText('Preparation countdown')).not.toBeInTheDocument();
  });

  it('bounds fixed player sheets within a 844 by 390 viewport at 200 percent text size', () => {
    vi.stubGlobal('innerWidth', 844);
    vi.stubGlobal('innerHeight', 390);
    document.documentElement.style.fontSize = '32px';

    const expectBoundedSheet = (sheet: HTMLElement) => {
      const style = getComputedStyle(sheet);
      expect(style.maxBlockSize).toContain('100dvb');
      expect(style.maxBlockSize).toContain('1rem');
      expect(style.maxHeight).toContain('100dvh');
      expect(style.overflowY).toBe('auto');
      expect(style.overscrollBehavior).toBe('contain');
      const rootPixels = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      expect(innerHeight - 2 * rootPixels).toBe(326);
    };

    render(<SessionPlayer routineId="back" initialSession={activeBackSession()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));
    expectBoundedSheet(screen.getByRole('region', { name: 'Safety and illustration help' }));
    cleanup();

    render(<SessionPlayer routineId="back" initialSession={activeBackSession()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip exercise' }));
    expectBoundedSheet(screen.getByRole('dialog', { name: 'Confirm skip' }));
    cleanup();

    render(<SessionPlayer routineId="back" initialSession={activeBackSession()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expectBoundedSheet(screen.getByRole('dialog', { name: 'Session paused' }));
  });

  it('restores focus to the stable exercise heading after the pause modal closes', async () => {
    render(<SessionPlayer routineId="back" initialSession={activeBackSession()} />);
    const heading = screen.getByRole('heading', { name: 'Standing reach: knee bends' });
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));

    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.queryByRole('dialog', { name: 'Session paused' })).not.toBeInTheDocument();
  });

  it('routes both deliberate exit controls through the guarded onExit contract', () => {
    const topExit = vi.fn();
    const topSave = vi.fn();
    const first = render(
      <SessionPlayer
        initialSession={activeBackSession()}
        onExit={topExit}
        routineId="back"
        saveSession={topSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close session' }));
    expect(topSave).toHaveBeenCalledOnce();
    expect(topExit).toHaveBeenCalledWith(topSave.mock.calls[0]?.[0]);
    first.unmount();

    const pausedExit = vi.fn();
    const pausedSave = vi.fn();
    render(
      <SessionPlayer
        initialSession={activeBackSession()}
        onExit={pausedExit}
        routineId="back"
        saveSession={pausedSave}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'End session' }));
    expect(pausedSave).toHaveBeenCalledOnce();
    expect(pausedExit).toHaveBeenCalledWith(pausedSave.mock.calls[0]?.[0]);
  });

  it('keeps Replay discoverable but disabled during preparation and a paused preparation target', () => {
    render(<SessionPlayer routineId="back" initialSession={preparingBackSession()} />);

    expect(screen.getByRole('button', { name: 'Replay demo' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Replay demo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Restart set' })).toBeDisabled();
  });

  it('enables Restart set for a paused set-transition target while Replay stays disabled', () => {
    const transition = sessionReducer(
      { ...activeBackSession(), rep: 5 },
      { type: 'CYCLE_FINISHED' },
    );
    const pausedTransition = sessionReducer(transition, {
      type: 'PAUSE',
      reason: 'user',
      remainingMs: 8000,
    });
    render(<SessionPlayer routineId="back" initialSession={pausedTransition} />);

    expect(screen.getByRole('button', { name: 'Replay demo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Restart set' })).toBeEnabled();
  });

  it('exposes Mark rep only for active reduced-motion repetition phases', () => {
    const { rerender } = render(
      <SessionPlayer routineId="back" initialSession={activeBackSession()} reducedMotion />,
    );
    expect(screen.getByRole('button', { name: 'Mark rep' })).toBeVisible();

    rerender(
      <SessionPlayer routineId="back" initialSession={activeBackSession()} reducedMotion={false} />,
    );
    expect(screen.queryByRole('button', { name: 'Mark rep' })).not.toBeInTheDocument();
  });

  it('announces stage captions in one polite live region rather than elapsed seconds', () => {
    render(<SessionPlayer routineId="back" />);
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    expect(liveRegion).toHaveTextContent('In standing, reach toward the floor.');
  });

  it('shows the preparation numeral outside the live region and offers Need more time', () => {
    render(<SessionPlayer routineId="back" initialSession={preparingBackSession()} />);

    const liveRegion = screen.getByRole('status');
    const countdown = screen.getByLabelText('Preparation countdown');
    expect(countdown).toHaveTextContent('5');
    expect(liveRegion).not.toContainElement(countdown);
    fireEvent.click(screen.getByRole('button', { name: 'Need more time' }));
    expect(screen.getByRole('button', { name: 'I’m ready' })).toBeVisible();
  });

  it('keeps safety and illustration help available from the top rail with exact approved copy', () => {
    render(<SessionPlayer routineId="back" initialSession={activeBackSession()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Help' }));

    expect(screen.getByRole('region', { name: 'Safety and illustration help' })).toBeVisible();
    expect(screen.getByText('Illustration only. Follow the plan and guidance given by your physiotherapist.')).toBeVisible();
    expect(screen.getByText('Stop the session if you feel unwell or the movement causes pain, and follow your physiotherapist’s advice.')).toBeVisible();
  });

  it('labels voice truthfully and explains local speech fallback without disabling tones', () => {
    render(
      <SessionPlayer
        audio={unavailableSpeechAudio()}
        initialSession={activeBackSession()}
        routineId="back"
      />,
    );

    const unavailableVoice = screen.getByRole('button', {
      name: 'Voice on. Local speech is unavailable; captions and tones remain usable.',
    });
    expect(unavailableVoice).toHaveTextContent('Voice on · unavailable');
    expect(getComputedStyle(unavailableVoice).minHeight).toBe('44px');
    expect(getComputedStyle(unavailableVoice).minWidth).toBe('44px');
    expect(screen.queryByText('Voice is unavailable. Captions and tones remain usable.')).not.toBeInTheDocument();

    fireEvent.click(unavailableVoice);
    expect(screen.getByRole('button', {
      name: 'Voice off. Local speech is unavailable; captions and tones remain usable.',
    })).toHaveTextContent('Voice off · unavailable');
  });

  it('records a confirmed final skip as saved rather than complete', () => {
    render(
      <SessionPlayer
        initialSession={{
          ...sessionReducer(
            sessionReducer(
              createSession('left-toe', { coachPace: 'standard', balanceSeconds: 10 }),
              { type: 'READY' },
            ),
            { type: 'PREPARATION_FINISHED' },
          ),
          phaseIndex: 3,
          completedPhaseIds: ['big-toe-lifts', 'banded-toe-pointing', 'band-arch-lifts'],
          remainingMs: 10_000,
        }}
        routineId="left-toe"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip exercise' }));
    expect(screen.getByRole('dialog', { name: 'Confirm skip' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm skip' }));
    expect(screen.getByRole('status')).toHaveTextContent('Session saved');
    expect(screen.queryByText('Session complete')).not.toBeInTheDocument();
  });
});
