import { act, renderHook } from '@testing-library/react';
import { StrictMode, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as coachAudioModule from '../../platform/audio/coachAudio';
import { createSession, sessionReducer } from '../../session/reducer';
import type { SessionState } from '../../session/session';
import { useSessionController } from './useSessionController';

function createAudio(speechAvailable = true) {
  return {
    unlock: vi.fn().mockResolvedValue(undefined),
    speak: vi.fn(),
    tone: vi.fn(),
    cancel: vi.fn(),
    dispose: vi.fn(),
    speechAvailable,
  };
}

function activeSession(routineId: 'back' | 'left-toe' = 'back'): SessionState {
  const ready = sessionReducer(
    createSession(routineId, { coachPace: 'standard', balanceSeconds: 10 }),
    { type: 'READY' },
  );
  return sessionReducer(ready, { type: 'PREPARATION_FINISHED' });
}

function strictWrapper({ children }: PropsWithChildren) {
  return <StrictMode>{children}</StrictMode>;
}

describe('useSessionController', () => {
  let now = 0;
  let frames = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;
  let pageVisible = true;

  const advanceFrame = (milliseconds: number) => {
    now += milliseconds;
    const pending = [...frames.values()];
    frames = new Map();
    act(() => pending.forEach((frame) => frame(now)));
  };

  beforeEach(() => {
    now = 0;
    frames = new Map();
    nextFrameId = 1;
    pageVisible = true;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    }));
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)));
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
      pageVisible ? 'visible' : 'hidden',
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('starts from one gesture, unlocks audio, and waits at readiness when capabilities reject', async () => {
    const audio = createAudio();
    audio.unlock.mockRejectedValueOnce(new Error('blocked'));
    const wakeLock = {
      request: vi.fn().mockRejectedValue(new Error('denied')),
      release: vi.fn().mockResolvedValue(undefined),
      active: false,
    };
    const { result } = renderHook(() =>
      useSessionController({ routineId: 'back', audio, wakeLock }),
    );

    await act(() => result.current.actions.start());

    expect(audio.unlock).toHaveBeenCalledOnce();
    expect(wakeLock.request).toHaveBeenCalledOnce();
    expect(result.current.view.status).toBe('awaiting-ready');
  });

  it('keeps setup caption and speech in parity, then uses an exact five-second preparation', () => {
    const audio = createAudio();
    const { result } = renderHook(() => useSessionController({ routineId: 'back', audio }));

    expect(result.current.view.caption).toBe('In standing, reach toward the floor.');
    expect(audio.speak).toHaveBeenCalledWith(
      'Standing reach: knee bends. In standing, reach toward the floor.',
    );

    act(() => result.current.actions.ready());
    expect(result.current.view.status).toBe('preparing');
    expect(result.current.view.countdownSeconds).toBe(5);
    advanceFrame(5000);
    expect(result.current.view.status).toBe('active');
  });

  it('uses automatic rep cycles normally but exact manual progression with reduced motion', () => {
    const automatic = renderHook(() =>
      useSessionController({ routineId: 'back', initialSession: activeSession('back') }),
    );
    advanceFrame(4000);
    expect(automatic.result.current.view.state.rep).toBe(1);
    automatic.unmount();

    now = 0;
    frames = new Map();
    const manual = renderHook(() =>
      useSessionController({
        routineId: 'back',
        initialSession: activeSession('back'),
        reducedMotion: true,
      }),
    );
    advanceFrame(40_000);
    expect(manual.result.current.view.state.rep).toBe(0);
    act(() => manual.result.current.actions.markRep());
    expect(manual.result.current.view.state.rep).toBe(1);
  });

  it('automates the selected hold deadline even with reduced motion', () => {
    const base = createSession('left-toe', { coachPace: 'standard', balanceSeconds: 10 });
    const hold = {
      ...activeSession('left-toe'),
      phaseIndex: 3,
      status: 'active' as const,
      remainingMs: 10_000,
    };
    const { result } = renderHook(() =>
      useSessionController({ routineId: base.routineId, initialSession: hold, reducedMotion: true }),
    );

    advanceFrame(9999);
    expect(result.current.view.status).toBe('active');
    advanceFrame(1);
    expect(result.current.view.status).toBe('set-transition');
  });

  it('pauses without consuming progress, saves the explicit remainder, and requires gesture resume', async () => {
    const audio = createAudio();
    const saveSession = vi.fn();
    const wakeLock = {
      request: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
      active: true,
    };
    const { result } = renderHook(() =>
      useSessionController({
        routineId: 'left-toe',
        initialSession: {
          ...activeSession('left-toe'),
          phaseIndex: 3,
          remainingMs: 10_000,
        },
        audio,
        wakeLock,
        saveSession,
      }),
    );
    advanceFrame(2500);

    act(() => result.current.actions.background());
    expect(result.current.view.status).toBe('paused');
    expect(saveSession).toHaveBeenCalledWith(expect.objectContaining({ remainingMs: 7500 }));
    expect(audio.cancel).toHaveBeenCalled();
    expect(wakeLock.release).toHaveBeenCalled();

    now += 30_000;
    await act(() => result.current.actions.resume());
    expect(wakeLock.request).toHaveBeenCalledOnce();
    expect(result.current.view.status).toBe('preparing');
    expect(result.current.view.countdownSeconds).toBe(3);
    advanceFrame(3000);
    expect(result.current.view.status).toBe('active');
    advanceFrame(7499);
    expect(result.current.view.status).toBe('active');
    advanceFrame(1);
    expect(result.current.view.status).toBe('set-transition');
  });

  it('preserves the original hold target through a second background during resume preparation', async () => {
    const saveSession = vi.fn();
    const { result } = renderHook(() =>
      useSessionController({
        routineId: 'left-toe',
        initialSession: {
          ...activeSession('left-toe'),
          phaseIndex: 3,
          remainingMs: 10_000,
        },
        saveSession,
      }),
    );
    advanceFrame(2500);
    act(() => result.current.actions.background());
    await act(() => result.current.actions.resume());
    advanceFrame(1000);

    act(() => result.current.actions.background());
    expect(result.current.view.state).toMatchObject({
      status: 'paused',
      resumeStatus: 'active',
      remainingMs: 7500,
      resumeRemainingMs: null,
    });
    expect(saveSession).toHaveBeenLastCalledWith(result.current.view.state);
  });

  it('keeps hold progress frozen while replaying and after replay is backgrounded', () => {
    const { result } = renderHook(() =>
      useSessionController({
        routineId: 'left-toe',
        initialSession: {
          ...activeSession('left-toe'),
          phaseIndex: 3,
          remainingMs: 10_000,
        },
      }),
    );
    advanceFrame(2500);

    act(() => result.current.actions.replay());
    expect(result.current.view.state).toMatchObject({
      status: 'replay',
      resumeStatus: 'active',
      resumeRemainingMs: 7500,
    });
    advanceFrame(500);
    act(() => result.current.actions.background());
    expect(result.current.view.state).toMatchObject({
      status: 'paused',
      resumeStatus: 'active',
      remainingMs: 7500,
    });
  });

  it('finishes one uncounted replay, gives three seconds, and restores the exact hold remainder', () => {
    const { result } = renderHook(() =>
      useSessionController({
        routineId: 'left-toe',
        initialSession: {
          ...activeSession('left-toe'),
          phaseIndex: 3,
          remainingMs: 10_000,
        },
      }),
    );
    advanceFrame(2500);
    act(() => result.current.actions.replay());
    advanceFrame(1000);

    expect(result.current.view.state).toMatchObject({
      status: 'preparing',
      remainingMs: 3000,
      resumeRemainingMs: 7500,
    });
    advanceFrame(3000);
    expect(result.current.view.state).toMatchObject({ status: 'active', remainingMs: 7500 });
  });

  it('freezes an in-progress repetition cycle through replay and resume preparation', () => {
    const { result } = renderHook(() =>
      useSessionController({ routineId: 'back', initialSession: activeSession('back') }),
    );
    advanceFrame(2000);
    expect(result.current.view.coachProgress).toBe(0.5);

    act(() => result.current.actions.replay());
    advanceFrame(4000);
    expect(result.current.view.status).toBe('preparing');
    advanceFrame(3000);

    expect(result.current.view.status).toBe('active');
    expect(result.current.view.state.rep).toBe(0);
    expect(result.current.view.coachProgress).toBe(0.5);
  });

  it('keeps the complete opening cue audible after replaying beyond rep one, then cues the next segment once', () => {
    const audio = createAudio();
    const { result } = renderHook(() =>
      useSessionController({ routineId: 'back', initialSession: activeSession('back'), audio }),
    );
    advanceFrame(4000);
    advanceFrame(1000);
    expect(result.current.view.state.rep).toBe(1);
    expect(result.current.view.coachProgress).toBe(0.25);

    audio.speak.mockClear();
    act(() => result.current.actions.replay());
    advanceFrame(4000);
    advanceFrame(3000);

    expect(result.current.view.state.rep).toBe(1);
    expect(result.current.view.coachProgress).toBe(0.25);
    expect(audio.speak.mock.calls.at(-1)?.[0]).toBe('Bend your knees. Straighten your knees.');
    advanceFrame(999);
    expect(audio.speak.mock.calls.filter(([text]) => text === 'Straighten your knees.')).toHaveLength(0);
    advanceFrame(1);
    expect(audio.speak.mock.calls.filter(([text]) => text === 'Straighten your knees.')).toHaveLength(1);
    expect(result.current.view.state.rep).toBe(1);
  });

  it('keeps the complete opening cue audible after Pause and Resume beyond rep one', async () => {
    const audio = createAudio();
    const { result } = renderHook(() =>
      useSessionController({ routineId: 'back', initialSession: activeSession('back'), audio }),
    );
    advanceFrame(4000);
    advanceFrame(1000);

    audio.speak.mockClear();
    act(() => result.current.actions.pause());
    await act(() => result.current.actions.resume());
    advanceFrame(3000);

    expect(result.current.view.state.rep).toBe(1);
    expect(result.current.view.coachProgress).toBe(0.25);
    expect(audio.speak.mock.calls.at(-1)?.[0]).toBe('Bend your knees. Straighten your knees.');
    advanceFrame(1000);
    expect(audio.speak.mock.calls.filter(([text]) => text === 'Straighten your knees.')).toHaveLength(1);
  });

  it('replays the final preparation cue after a paused session resumes', async () => {
    const audio = createAudio();
    const { result } = renderHook(() => useSessionController({ routineId: 'back', audio }));
    act(() => result.current.actions.ready());
    advanceFrame(2000);
    expect(audio.speak.mock.calls.filter(([text]) => text.includes('Three'))).toHaveLength(1);

    act(() => result.current.actions.pause());
    await act(() => result.current.actions.resume());
    expect(result.current.view.countdownSeconds).toBe(3);
    expect(audio.speak.mock.calls.filter(([text]) => text.includes('Three'))).toHaveLength(2);
  });

  it('speaks Get ready and the five-to-one preparation countdown at second boundaries', () => {
    const audio = createAudio();
    const { result } = renderHook(() => useSessionController({ routineId: 'back', audio }));
    act(() => result.current.actions.ready());

    expect(audio.speak).toHaveBeenCalledWith('Get ready. Five.');
    for (const [milliseconds, word] of [
      [1000, 'Four'],
      [1000, 'Three'],
      [1000, 'Two'],
      [1000, 'One'],
    ] as const) {
      const previousCancelCount = audio.cancel.mock.calls.length;
      advanceFrame(milliseconds);
      expect(audio.speak).toHaveBeenCalledWith(word);
      expect(audio.cancel).toHaveBeenCalledTimes(previousCancelCount + 1);
      expect(audio.cancel.mock.invocationCallOrder.at(-1)).toBeLessThan(
        audio.speak.mock.invocationCallOrder.at(-1) ?? Number.POSITIVE_INFINITY,
      );
    }
    expect(result.current.view.status).toBe('preparing');
    advanceFrame(1000);
    expect(result.current.view.status).toBe('active');
    expect(audio.speak.mock.calls.map(([text]) => text).filter((text) => /^(?:[1-9]|1\d|20)$/.test(text))).toEqual([]);
  });

  it('dispatches zero-ms restored preparation, set transition, and hold deadlines once', () => {
    const preparation = {
      ...sessionReducer(
        createSession('back', { coachPace: 'standard', balanceSeconds: 10 }),
        { type: 'READY' },
      ),
      remainingMs: 0,
    };
    const preparing = renderHook(() =>
      useSessionController({ routineId: 'back', initialSession: preparation }),
    );
    advanceFrame(0);
    expect(preparing.result.current.view.status).toBe('active');
    advanceFrame(0);
    expect(preparing.result.current.view.state.rep).toBe(0);
    preparing.unmount();

    frames = new Map();
    const transitionState = sessionReducer(
      { ...activeSession('back'), rep: 5 },
      { type: 'CYCLE_FINISHED' },
    );
    const transition = renderHook(() =>
      useSessionController({
        routineId: 'back',
        initialSession: { ...transitionState, remainingMs: 0 },
      }),
    );
    advanceFrame(0);
    expect(transition.result.current.view.state).toMatchObject({ status: 'preparing', remainingMs: 5000 });
    transition.unmount();

    frames = new Map();
    const hold = renderHook(() =>
      useSessionController({
        routineId: 'left-toe',
        initialSession: {
          ...activeSession('left-toe'),
          phaseIndex: 3,
          remainingMs: 0,
        },
      }),
    );
    advanceFrame(0);
    expect(hold.result.current.view.state).toMatchObject({ status: 'set-transition', setIndex: 1 });
  });

  it('returns ordinary and resumed preparation through Need more time without losing progress', async () => {
    const ordinary = renderHook(() => useSessionController({ routineId: 'back' }));
    act(() => ordinary.result.current.actions.ready());
    act(() => (ordinary.result.current.actions as unknown as { needMoreTime(): void }).needMoreTime());
    expect(ordinary.result.current.view.state).toMatchObject({
      status: 'awaiting-ready',
      remainingMs: null,
      resumeStatus: null,
    });
    ordinary.unmount();

    frames = new Map();
    const resumed = renderHook(() =>
      useSessionController({
        routineId: 'left-toe',
        initialSession: {
          ...activeSession('left-toe'),
          phaseIndex: 3,
          remainingMs: 7250,
        },
      }),
    );
    act(() => resumed.result.current.actions.pause());
    await act(() => resumed.result.current.actions.resume());
    act(() => (resumed.result.current.actions as unknown as { needMoreTime(): void }).needMoreTime());
    expect(resumed.result.current.view.state).toMatchObject({
      status: 'paused',
      remainingMs: 7250,
      resumeStatus: 'active',
      resumeRemainingMs: null,
      pauseReason: 'user',
    });
  });

  it('keeps stage cues idempotent through StrictMode effect replay', () => {
    const audio = createAudio();
    renderHook(() => useSessionController({ routineId: 'back', audio }), {
      wrapper: strictWrapper,
    });

    expect(audio.speak.mock.calls.filter(([text]) =>
      text === 'Standing reach: knee bends. In standing, reach toward the floor.',
    )).toHaveLength(1);
  });

  it('keeps internally owned audio alive through StrictMode replay and disposes once after real unmount', async () => {
    const ownedAudio = createAudio();
    const factory = vi.spyOn(coachAudioModule, 'createCoachAudio').mockReturnValue(ownedAudio);
    const { unmount } = renderHook(() => useSessionController({ routineId: 'back' }), {
      wrapper: strictWrapper,
    });
    await act(async () => Promise.resolve());

    expect(factory).toHaveBeenCalledOnce();
    expect(ownedAudio.dispose).not.toHaveBeenCalled();
    unmount();
    await act(async () => Promise.resolve());
    expect(ownedAudio.dispose).toHaveBeenCalledOnce();
  });

  it('uses one shared transition cue for visible text and speech, including the next setup', () => {
    const audio = createAudio();
    const phaseTransition = sessionReducer(
      { ...activeSession('back'), setIndex: 2, rep: 5 },
      { type: 'CYCLE_FINISHED' },
    );
    const { result } = renderHook(() =>
      useSessionController({ routineId: 'back', initialSession: phaseTransition, audio }),
    );
    const expected =
      'Exercise complete. Next exercise: Standing reach: full down and up. Now go all the way down and back up.';

    expect(result.current.view.caption).toBe(expected);
    expect(audio.speak).toHaveBeenCalledWith(expected);
  });

  it('resets coach progress at a late final-rep boundary so the next set cannot complete early', () => {
    const { result } = renderHook(() =>
      useSessionController({
        routineId: 'back',
        initialSession: { ...activeSession('back'), rep: 5 },
      }),
    );
    advanceFrame(4500);
    expect(result.current.view.state).toMatchObject({ status: 'set-transition', setIndex: 1 });
    expect(result.current.view.coachProgress).toBe(0);
    advanceFrame(8000);
    advanceFrame(5000);
    expect(result.current.view.state).toMatchObject({ status: 'active', setIndex: 1, rep: 0 });
    advanceFrame(3999);
    expect(result.current.view.state.rep).toBe(0);
    advanceFrame(1);
    expect(result.current.view.state.rep).toBe(1);
  });

  it('speaks the complete opening movement cue and later short cues without number speech', () => {
    const audio = createAudio();
    const { result } = renderHook(() =>
      useSessionController({ routineId: 'back', initialSession: activeSession('back'), audio }),
    );
    expect(audio.speak).toHaveBeenCalledWith('Bend your knees. Straighten your knees.');

    advanceFrame(4000);
    expect(result.current.view.state.rep).toBe(1);
    expect(audio.speak).toHaveBeenCalledWith('Bend your knees.');
    advanceFrame(2000);
    expect(audio.speak).toHaveBeenCalledWith('Straighten your knees.');
    expect(audio.speak.mock.calls.flat()).not.toContain('1');
  });

  it.each(['background', 'exit'] as const)(
    'releases Wake Lock when persistence throws during %s',
    (action) => {
      const wakeLock = {
        request: vi.fn().mockResolvedValue(true),
        release: vi.fn().mockResolvedValue(undefined),
        active: true,
      };
      const { result } = renderHook(() =>
        useSessionController({
          routineId: 'back',
          initialSession: activeSession('back'),
          saveSession: () => {
            throw new Error('storage unavailable');
          },
          wakeLock,
        }),
      );

      expect(() => act(() => result.current.actions[action]())).not.toThrow();
      expect(wakeLock.release).toHaveBeenCalledOnce();
    },
  );

  it('signals deliberate exit only after saving the exact reducer-owned paused state', () => {
    const calls: string[] = [];
    const saveSession = vi.fn((state: SessionState) => {
      calls.push(`save:${state.status}:${state.pauseReason}`);
    });
    const onExit = vi.fn((state: SessionState) => {
      calls.push(`exit:${state.status}:${state.pauseReason}`);
    });
    const { result } = renderHook(() =>
      useSessionController({
        routineId: 'back',
        initialSession: activeSession('back'),
        saveSession,
        onExit,
      }),
    );

    act(() => result.current.actions.background());
    expect(onExit).not.toHaveBeenCalled();

    act(() => result.current.actions.exit());

    expect(saveSession).toHaveBeenLastCalledWith(result.current.view.state);
    expect(onExit).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledWith(result.current.view.state);
    expect(calls).toEqual([
      'save:paused:background',
      'save:paused:background',
      'exit:paused:background',
    ]);
  });

  it('contains save and exit callback failures while still attempting cleanup in order', () => {
    const calls: string[] = [];
    const wakeLock = {
      request: vi.fn().mockResolvedValue(true),
      release: vi.fn(() => {
        calls.push('release');
        return Promise.reject(new Error('release unavailable'));
      }),
      active: true,
    };
    const saveSession = vi.fn((state: SessionState) => {
      void state;
      calls.push('save');
      throw new Error('storage unavailable');
    });
    const onExit = vi.fn(() => {
      calls.push('exit');
      throw new Error('route unavailable');
    });
    const { result } = renderHook(() =>
      useSessionController({
        routineId: 'back',
        initialSession: activeSession('back'),
        saveSession,
        onExit,
        wakeLock,
      }),
    );

    expect(() => act(() => result.current.actions.exit())).not.toThrow();
    expect(saveSession).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledWith(saveSession.mock.calls[0]?.[0]);
    expect(calls).toEqual(['save', 'exit', 'release']);
  });

  it('uses the reducer-owned eight-second set transition deadline', () => {
    const { result } = renderHook(() =>
      useSessionController({
        routineId: 'back',
        initialSession: { ...activeSession('back'), rep: 5 },
        reducedMotion: true,
      }),
    );
    act(() => result.current.actions.markRep());
    expect(result.current.view.state).toMatchObject({ status: 'set-transition', remainingMs: 8000 });
    expect(result.current.view.countdownSeconds).toBe(8);
    advanceFrame(7999);
    expect(result.current.view.status).toBe('set-transition');
    advanceFrame(1);
    expect(result.current.view.state).toMatchObject({ status: 'preparing', remainingMs: 5000 });
  });

  it('responds to the real visibility event by pausing, saving, cancelling, and releasing', () => {
    const audio = createAudio();
    const saveSession = vi.fn();
    const wakeLock = {
      request: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
      active: true,
    };
    const { result } = renderHook(() =>
      useSessionController({
        routineId: 'back',
        initialSession: activeSession('back'),
        audio,
        wakeLock,
        saveSession,
      }),
    );

    pageVisible = false;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(result.current.view.state).toMatchObject({ status: 'paused', pauseReason: 'background' });
    expect(saveSession).toHaveBeenLastCalledWith(result.current.view.state);
    expect(audio.cancel).toHaveBeenCalled();
    expect(wakeLock.release).toHaveBeenCalled();
  });

  it('uses pagehide as a save-only background fallback and never signals deliberate exit', () => {
    const saveSession = vi.fn();
    const onExit = vi.fn();
    const wakeLock = {
      request: vi.fn().mockResolvedValue(true),
      release: vi.fn().mockResolvedValue(undefined),
      active: true,
    };
    const { result } = renderHook(() =>
      useSessionController({
        routineId: 'back',
        initialSession: activeSession('back'),
        saveSession,
        onExit,
        wakeLock,
      }),
    );

    act(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));

    expect(result.current.view.state).toMatchObject({ status: 'paused', pauseReason: 'background' });
    expect(saveSession).toHaveBeenCalledOnce();
    expect(saveSession).toHaveBeenCalledWith(result.current.view.state);
    expect(onExit).not.toHaveBeenCalled();
    expect(wakeLock.release).toHaveBeenCalledOnce();
  });

  it('removes the pagehide fallback when the controller unmounts', () => {
    const saveSession = vi.fn();
    const onExit = vi.fn();
    const { unmount } = renderHook(() =>
      useSessionController({
        routineId: 'back',
        initialSession: activeSession('back'),
        saveSession,
        onExit,
      }),
    );
    unmount();
    saveSession.mockClear();

    act(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));

    expect(saveSession).not.toHaveBeenCalled();
    expect(onExit).not.toHaveBeenCalled();
  });

  it('supports decrement and restart without allowing a major phase to begin silently', () => {
    const initial = { ...activeSession('back'), setIndex: 2, rep: 5 };
    const { result } = renderHook(() =>
      useSessionController({ routineId: 'back', initialSession: initial, reducedMotion: true }),
    );

    act(() => result.current.actions.decrementRep());
    expect(result.current.view.state.rep).toBe(4);
    act(() => result.current.actions.restartSet());
    expect(result.current.view.state.rep).toBe(0);

    act(() => {
      for (let rep = 0; rep < 6; rep += 1) result.current.actions.markRep();
    });
    expect(result.current.view.status).toBe('phase-transition');
    advanceFrame(30_000);
    expect(result.current.view.status).toBe('phase-transition');
    act(() => result.current.actions.ready());
    expect(result.current.view.status).toBe('preparing');
  });

  it('cancels before skip and never lets direct audio calls mutate session state', () => {
    const audio = createAudio(false);
    const { result } = renderHook(() =>
      useSessionController({ routineId: 'back', initialSession: activeSession('back'), audio }),
    );
    const beforeAudio = result.current.view.state;

    act(() => {
      audio.speak('Three');
      audio.tone('count');
    });
    expect(result.current.view.state).toEqual(beforeAudio);

    act(() => result.current.actions.skip());
    expect(audio.cancel.mock.invocationCallOrder.at(-1)).toBeLessThan(
      audio.speak.mock.invocationCallOrder.at(-1) ?? Number.POSITIVE_INFINITY,
    );
    expect(result.current.view.state.skippedPhaseIds).toContain('standing-knee-bends');
    expect(result.current.view.state.completedPhaseIds).not.toContain('standing-knee-bends');
    expect(result.current.view.status).toBe('phase-transition');
    expect(result.current.view.speechAvailable).toBe(false);
  });

  it('reports an honest saved label when the final phase is skipped', () => {
    const initial = {
      ...activeSession('left-toe'),
      phaseIndex: 3,
      completedPhaseIds: ['big-toe-lifts', 'banded-toe-pointing', 'band-arch-lifts'] as const,
    };
    const { result } = renderHook(() =>
      useSessionController({ routineId: 'left-toe', initialSession: initial }),
    );

    act(() => result.current.actions.skip());
    expect(result.current.view.status).toBe('complete');
    expect(result.current.view.caption).toBe('Session saved');
  });
});
