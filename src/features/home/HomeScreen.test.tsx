import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCurrentPhase } from '../../session/selectors';
import { createSession, sessionReducer } from '../../session/reducer';
import type { CompletionRecord } from '../../persistence/appState';
import type { SessionState } from '../../session/session';
import { HomeScreen } from './HomeScreen';

afterEach(cleanup);

const saturday = new Date(2026, 7, 22, 12);

function renderHome(overrides: Partial<React.ComponentProps<typeof HomeScreen>> = {}) {
  const props = {
    activeSession: null,
    history: [] as readonly CompletionRecord[],
    onStart: vi.fn(),
    onResume: vi.fn(),
    onOpenSettings: vi.fn(),
    now: saturday,
    ...overrides,
  };
  const rendered = render(<HomeScreen {...props} />);
  return { ...props, container: rendered.container };
}

function nextReachableState(state: SessionState): SessionState {
  switch (state.status) {
    case 'awaiting-ready':
      return sessionReducer(state, { type: 'READY' });
    case 'preparing':
      return sessionReducer(state, { type: 'PREPARATION_FINISHED' });
    case 'active':
      return sessionReducer(state, {
        type: getCurrentPhase(state).dose.kind === 'hold' ? 'HOLD_FINISHED' : 'CYCLE_FINISHED',
      });
    case 'set-transition':
    case 'phase-transition':
      return sessionReducer(state, { type: 'TRANSITION_FINISHED' });
    case 'complete':
      return state;
    case 'paused':
    case 'replay':
      throw new Error(`Unexpected state in reachable fixture: ${state.status}`);
  }
}

function activePhase(routineId: 'back' | 'left-toe', phaseIndex: number): SessionState {
  let state = createSession(routineId, { coachPace: 'standard', balanceSeconds: 10 });
  for (let guard = 0; guard < 500; guard += 1) {
    if (state.phaseIndex === phaseIndex && state.status === 'active') return state;
    state = nextReachableState(state);
  }
  throw new Error(`Could not reach phase ${phaseIndex} for ${routineId}`);
}

function completeSession(routineId: 'back' | 'left-toe'): SessionState {
  let state = createSession(routineId, { coachPace: 'standard', balanceSeconds: 10 });
  for (let guard = 0; guard < 500; guard += 1) {
    if (state.status === 'complete') return state;
    state = nextReachableState(state);
  }
  throw new Error(`Could not complete ${routineId}`);
}

describe('HomeScreen', () => {
  it('starts either routine with one button tap', () => {
    const props = renderHome();

    fireEvent.click(screen.getByRole('button', { name: 'Start Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start Left Toe' }));

    expect(props.onStart).toHaveBeenNthCalledWith(1, 'back');
    expect(props.onStart).toHaveBeenNthCalledWith(2, 'left-toe');
  });

  it('shows the local calendar date with routine frequency and equipment', () => {
    renderHome();

    expect(screen.getByText('Saturday, 22 August 2026')).toBeVisible();
    expect(screen.getAllByText('Most days')).toHaveLength(2);
    expect(screen.getByText('4× per week')).toBeVisible();
    expect(screen.getByText('Equipment: mat and foam roller')).toBeVisible();
    expect(screen.getByText('Equipment: loop band and heavy loop band')).toBeVisible();
  });

  it('uses the selected coach pace and balance choice for honest About estimates', () => {
    const { rerender } = render(
      <HomeScreen
        activeSession={null}
        history={[]}
        onStart={vi.fn()}
        onResume={vi.fn()}
        onOpenSettings={vi.fn()}
        now={saturday}
      />,
    );
    expect(screen.getByText('About 12 min')).toBeVisible();
    expect(screen.getByText('About 7 min')).toBeVisible();

    rerender(
      <HomeScreen
        activeSession={null}
        history={[]}
        onStart={vi.fn()}
        onResume={vi.fn()}
        onOpenSettings={vi.fn()}
        coachPace="slow"
        balanceSeconds={15}
        now={saturday}
      />,
    );
    expect(screen.getByText('About 15 min')).toBeVisible();
    expect(screen.getByText('About 8 min')).toBeVisible();
  });

  it('makes an unfinished session the sole primary path with exact written-group progress', () => {
    const activeSession = activePhase('back', 4);
    const onResume = vi.fn();
    renderHome({ activeSession, onResume });

    const resume = screen.getByRole('button', {
      name: 'Resume Back — Exercise 3 of 5, Cobra on hands, Set 1 of 1',
    });
    expect(resume).toBeVisible();
    expect(resume).toHaveTextContent('Exercise 3 of 5 · Cobra on hands · Set 1 of 1');
    expect(screen.queryByRole('button', { name: 'Start Back' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Left Toe' })).not.toBeInTheDocument();

    fireEvent.click(resume);
    expect(onResume).toHaveBeenCalledOnce();
  });

  it('uses Left Toe written exercise groups rather than player phases in resume progress', () => {
    renderHome({ activeSession: activePhase('left-toe', 2) });

    expect(
      screen.getByRole('button', {
        name: 'Resume Left Toe — Exercise 3 of 4, Heavy-band arch lifts, Set 1 of 3',
      }),
    ).toBeVisible();
  });

  it('does not offer Resume for a reachable completed session', () => {
    renderHome({ activeSession: completeSession('back') });

    expect(screen.queryByRole('button', { name: /Resume Back/ })).not.toBeInTheDocument();
  });

  it('uses seven labelled local-week Back dots and neutral outlines for incomplete days', () => {
    renderHome({
      history: [
        { id: 'back:2026-08-17:complete', routineId: 'back', localDate: '2026-08-17', outcome: 'complete' },
        { id: 'back:2026-08-19:saved', routineId: 'back', localDate: '2026-08-19', outcome: 'saved-with-skips' },
      ],
    });

    const days = screen.getAllByRole('listitem', { name: /Back, / });
    expect(days).toHaveLength(7);
    expect(days[0]).toHaveAccessibleName('Back, Monday 17 August: completed');
    expect(days[2]).toHaveAccessibleName('Back, Wednesday 19 August: not completed');
    expect(screen.getAllByText('Most days')).toHaveLength(2);
    expect(screen.queryByText(/streak|broken|missed/i)).not.toBeInTheDocument();
  });

  it('uses four target marks for Left Toe and ignores saved-with-skips records', () => {
    renderHome({
      history: [
        { id: 'toe:2026-08-18:complete', routineId: 'left-toe', localDate: '2026-08-18', outcome: 'complete' },
        { id: 'toe:2026-08-20:complete', routineId: 'left-toe', localDate: '2026-08-20', outcome: 'complete' },
        { id: 'toe:2026-08-21:saved', routineId: 'left-toe', localDate: '2026-08-21', outcome: 'saved-with-skips' },
      ],
    });

    expect(screen.getByText('2 of 4 this week')).toBeVisible();
    expect(screen.getAllByRole('listitem', { name: /Left Toe weekly target mark/ })).toHaveLength(4);
    expect(screen.getByRole('listitem', { name: 'Left Toe weekly target mark 3 of 4: not completed' })).toBeVisible();
  });

  it('keeps keyboard actions to quiet settings then the one resumable session', () => {
    const activeSession = activePhase('back', 4);
    const { container } = renderHome({ activeSession });

    expect([...container.querySelectorAll('button')].map((button) => button.textContent?.trim())).toEqual([
      'Settings',
      expect.stringContaining('Resume Back'),
    ]);
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveAccessibleName('Settings');
    expect(screen.getByRole('button', { name: /Resume Back — Exercise 3 of 5/ })).toHaveAccessibleName(
      'Resume Back — Exercise 3 of 5, Cobra on hands, Set 1 of 1',
    );
  });

  it('contains no personal identifiers or punitive consistency language', () => {
    const { container } = renderHome();
    expect(container.textContent).not.toMatch(/diagnosis|clinic|clinician|streak|broken|guilt|punish/i);
  });
});
