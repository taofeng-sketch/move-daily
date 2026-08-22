import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompletionScreen } from './CompletionScreen';

afterEach(cleanup);

function renderCompletion(overrides: Partial<React.ComponentProps<typeof CompletionScreen>> = {}) {
  const props = {
    routineId: 'back' as const,
    summary: { completed: 5, skipped: 0, total: 5, label: 'Session complete' as const },
    onDone: vi.fn(),
    onSetReminder: vi.fn(),
    onInstall: vi.fn(),
    ...overrides,
  };
  render(<CompletionScreen {...props} />);
  return props;
}

describe('CompletionScreen', () => {
  it('names the completed routine and every written exercise group', () => {
    renderCompletion();

    expect(screen.getByRole('heading', { name: 'Back complete' })).toBeVisible();
    expect(screen.getByText('5 completed')).toBeVisible();
    expect(screen.getByRole('list', { name: 'Completed Back exercises' })).toHaveTextContent(
      'Standing reachBridge articulationsCobrasSupermansFoam-roller upper-back extensions',
    );
  });

  it('renders a normal Left Toe 4 of 4 completion as complete', () => {
    renderCompletion({
      routineId: 'left-toe',
      summary: { completed: 4, skipped: 0, total: 4, label: 'Session complete' },
    });

    expect(screen.getByRole('heading', { name: 'Left Toe complete' })).toBeVisible();
    expect(screen.getByRole('list', { name: 'Completed Left Toe exercises' })).toBeVisible();
  });

  it.each([
    ['incomplete Back count', 'back', { completed: 4, skipped: 0, total: 5, label: 'Session complete' }],
    ['wrong Left Toe routine total', 'left-toe', { completed: 5, skipped: 0, total: 5, label: 'Session complete' }],
  ] as const)('saves an inconsistent %s summary rather than claiming completion', (_case, routineId, summary) => {
    renderCompletion({ routineId, summary });

    expect(screen.getByRole('heading', { name: 'Session saved' })).toBeVisible();
    expect(screen.queryByRole('list', { name: /Completed .* exercises/ })).not.toBeInTheDocument();
  });

  it('does not call a skipped session complete', () => {
    renderCompletion({
      summary: { completed: 4, skipped: 1, total: 5, label: 'Session saved' },
      routineId: 'back',
    });

    expect(screen.getByRole('heading', { name: 'Session saved' })).toBeVisible();
    expect(screen.getByText('4 completed · 1 skipped')).toBeVisible();
    expect(screen.queryByText('Session complete')).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Completed Back exercises' })).not.toBeInTheDocument();
  });

  it('keeps Done dominant and gates each habit action independently', () => {
    const props = renderCompletion();
    expect(screen.getByRole('button', { name: 'Done' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Add to Home Screen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set a calendar reminder' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(props.onDone).toHaveBeenCalledOnce();
  });

  it('delegates independently enabled first-habit actions after Done in keyboard order', () => {
    const props = renderCompletion({
      showInstallAction: true,
      showReminderAction: true,
      routineId: 'left-toe',
      summary: { completed: 4, skipped: 0, total: 4, label: 'Session complete' },
    });
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((button) => button.textContent)).toEqual([
      'Done',
      'Add to Home Screen',
      'Set a calendar reminder',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Add to Home Screen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set a calendar reminder' }));
    expect(props.onInstall).toHaveBeenCalledOnce();
    expect(props.onSetReminder).toHaveBeenCalledOnce();
  });

  it('can show a truthful reminder without exposing an unsupported install action', () => {
    renderCompletion({ showReminderAction: true, showInstallAction: false });

    expect(screen.queryByRole('button', { name: 'Add to Home Screen' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set a calendar reminder' })).toBeVisible();
  });

  it('suppresses habit actions for saved or inconsistent sessions even when enabled', () => {
    renderCompletion({
      showInstallAction: true,
      showReminderAction: true,
      summary: { completed: 4, skipped: 1, total: 5, label: 'Session saved' },
    });

    expect(screen.getByRole('button', { name: 'Done' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Add to Home Screen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set a calendar reminder' })).not.toBeInTheDocument();
  });

  it('contains no personal identifiers or punitive wording', () => {
    renderCompletion({ showInstallAction: true, showReminderAction: true });
    expect(document.body.textContent).not.toMatch(/diagnosis|clinic|clinician|streak|broken|guilt|punish/i);
  });
});
