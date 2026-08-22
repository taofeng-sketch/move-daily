import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Preferences } from '../../persistence/appState';
import type { InstallState } from '../../pwa/install';
import { SettingsScreen } from './SettingsScreen';

afterEach(cleanup);

const preferences: Preferences = {
  voiceEnabled: true,
  coachPace: 'standard',
  balanceSeconds: 10,
  reducedMotion: false,
  installEducationDismissed: true,
  reminderEducationDismissed: true,
};

function renderSettings(overrides: Partial<React.ComponentProps<typeof SettingsScreen>> = {}) {
  const props = {
    preferences,
    installState: { kind: 'unsupported' } as InstallState,
    installInstructions: ['Installation is not available in this browser.', 'Bookmark this page for quick access.'],
    onPreferencesChange: vi.fn(),
    onReset: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  const rendered = render(<SettingsScreen {...props} />);
  return { ...props, container: rendered.container };
}

describe('SettingsScreen', () => {
  it('shows the exact illustration, safety, privacy, and offline boundaries', () => {
    const { container } = renderSettings();

    expect(screen.getByText('Illustration only. Follow the plan and guidance given by your physiotherapist.')).toBeVisible();
    expect(
      screen.getByText(
        'Stop the session if you feel unwell or the movement causes pain, and follow your physiotherapist’s advice.',
      ),
    ).toBeVisible();
    expect(screen.getByText('No exercise history is sent by this app.')).toBeVisible();
    expect(screen.getByText('Open once online to enable offline use.')).toBeVisible();
    expect(screen.getByText('Browser and home-screen histories may be separate.')).toBeVisible();
    expect(container.textContent).not.toMatch(/diagnosis|approved by|endorsed by/i);
  });

  it('keeps an available update action inside the Settings inert surface', () => {
    const onApplyUpdate = vi.fn();
    renderSettings({ onApplyUpdate });
    const update = screen.getByRole('button', { name: 'Apply update' });
    fireEvent.click(update);
    expect(onApplyUpdate).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Reset all progress' }));
    const surface = screen.getByTestId('settings-surface');
    expect(update.closest('[inert]')).toBe(surface);
    expect(surface).toHaveAttribute('aria-hidden', 'true');
  });

  it('replaces first-visit offline guidance once the shell is genuinely ready', () => {
    renderSettings({ offlineAvailable: true });
    expect(screen.getByText('Available offline on this device.')).toBeVisible();
    expect(screen.queryByText('Open once online to enable offline use.')).not.toBeInTheDocument();
  });

  it('uses labelled native controls and emits only allowed immutable preference patches', () => {
    const onPreferencesChange = vi.fn();
    renderSettings({ onPreferencesChange });

    expect(screen.getByRole('group', { name: 'Voice prompts' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Coach pace — visual rhythm' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Slow visual rhythm' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Standard visual rhythm' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Brisk visual rhythm' })).not.toBeChecked();
    expect(screen.getByRole('group', { name: 'Balance hold' })).toBeVisible();
    expect(screen.getByRole('radio', { name: '10 seconds' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '15 seconds' })).not.toBeChecked();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Use voice prompts' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Slow visual rhythm' }));
    fireEvent.click(screen.getByRole('radio', { name: '15 seconds' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use reduced motion' }));

    expect(onPreferencesChange.mock.calls.map(([patch]) => patch)).toEqual([
      { voiceEnabled: false },
      { coachPace: 'slow' },
      { balanceSeconds: 15 },
      { reducedMotion: true },
    ]);
    for (const [patch] of onPreferencesChange.mock.calls) {
      expect(patch).not.toHaveProperty('installEducationDismissed');
      expect(patch).not.toHaveProperty('reminderEducationDismissed');
    }
  });

  it('opens independent Back and Left Toe reminder drafts with no selected days', () => {
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: 'Set Back reminder' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Monday' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reminder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set Left Toe reminder' }));

    const dialog = screen.getByRole('dialog', { name: 'Set Left Toe calendar reminder' });
    expect(dialog).toBeVisible();
    expect(within(dialog).getAllByRole('checkbox').every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true);
  });

  it('uses the real install action and already-resolved guidance without platform detection', async () => {
    const prompt = vi.fn().mockResolvedValue('accepted' as const);
    renderSettings({
      installState: { kind: 'installable', prompt },
      installInstructions: ['Use your browser install control.'],
    });

    expect(screen.getByText('Use your browser install control.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Install Move Daily' }));

    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    expect(screen.getByText('Install request accepted.')).toBeVisible();
    const installButton = screen.getByRole('button', { name: 'Install prompt used' });
    expect(installButton).toBeDisabled();
    fireEvent.click(installButton);
    expect(prompt).toHaveBeenCalledOnce();
  });

  it('keeps a prompt consumed for the same function and resets only for a genuinely new prompt', async () => {
    const firstPrompt = vi.fn().mockRejectedValue(new Error('prompt blocked'));
    const secondPrompt = vi.fn().mockResolvedValue('dismissed' as const);
    const sharedProps = {
      preferences,
      installInstructions: ['Use your browser install control.'],
      onPreferencesChange: vi.fn(),
      onReset: vi.fn(),
      onClose: vi.fn(),
    };
    const { rerender } = render(
      <SettingsScreen {...sharedProps} installState={{ kind: 'installable', prompt: firstPrompt }} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Install Move Daily' }));
    await screen.findByText('Installation was not completed.');
    expect(screen.getByRole('button', { name: 'Install prompt used' })).toBeDisabled();

    rerender(<SettingsScreen {...sharedProps} installState={{ kind: 'installable', prompt: firstPrompt }} />);
    expect(screen.getByRole('button', { name: 'Install prompt used' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Install prompt used' }));
    expect(firstPrompt).toHaveBeenCalledOnce();

    rerender(<SettingsScreen {...sharedProps} installState={{ kind: 'unsupported' }} />);
    expect(screen.queryByRole('button', { name: 'Install prompt used' })).not.toBeInTheDocument();
    rerender(<SettingsScreen {...sharedProps} installState={{ kind: 'installable', prompt: firstPrompt }} />);
    expect(screen.getByRole('button', { name: 'Install prompt used' })).toBeDisabled();

    rerender(<SettingsScreen {...sharedProps} installState={{ kind: 'installable', prompt: secondPrompt }} />);
    const refreshedButton = screen.getByRole('button', { name: 'Install Move Daily' });
    expect(refreshedButton).toBeEnabled();
    fireEvent.click(refreshedButton);
    await waitFor(() => expect(secondPrompt).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Install prompt used' })).toBeDisabled();
  });

  it.each([
    [
      { kind: 'ios-instructions' } as InstallState,
      ['Tap Share in Safari.', 'Choose Add to Home Screen.'],
      'Install on iPhone or iPad',
    ],
    [{ kind: 'installed' } as InstallState, [], 'Move Daily is installed on this device.'],
    [
      { kind: 'unsupported' } as InstallState,
      ['Installation is not available in this browser.', 'Bookmark this page for quick access.'],
      'Installation is not available in this browser.',
    ],
  ] as const)('renders an honest %s installation state', (installState, installInstructions, expected) => {
    renderSettings({ installState, installInstructions });
    expect(screen.getByText(expected)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Install Move Daily' })).not.toBeInTheDocument();
  });

  it('makes reset Cancel-first and safe on Escape, backdrop, and Cancel', async () => {
    const props = renderSettings();
    const opener = screen.getByRole('button', { name: 'Reset all progress' });
    fireEvent.click(opener);

    const dialog = screen.getByRole('alertdialog', { name: 'Reset all progress?' });
    const cancel = screen.getByRole('button', { name: 'Cancel reset' });
    const confirm = screen.getByRole('button', { name: 'Yes, reset progress' });
    expect(cancel).toHaveFocus();
    confirm.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(props.onReset).not.toHaveBeenCalled();
    await waitFor(() => expect(opener).toHaveFocus());

    fireEvent.click(opener);
    fireEvent.mouseDown(screen.getByTestId('reset-backdrop'));
    expect(props.onReset).not.toHaveBeenCalled();
    await waitFor(() => expect(opener).toHaveFocus());

    fireEvent.click(opener);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reset' }));
    expect(props.onReset).not.toHaveBeenCalled();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('makes the Settings background inert and hidden while either modal is open', async () => {
    renderSettings();
    const surface = screen.getByTestId('settings-surface');
    const resetOpener = screen.getByRole('button', { name: 'Reset all progress' });

    fireEvent.click(resetOpener);
    expect(surface).toHaveAttribute('inert');
    expect(surface).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
    expect(resetOpener.closest('[inert]')).toBe(surface);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel reset' }));
    await waitFor(() => expect(resetOpener).toHaveFocus());
    expect(surface).not.toHaveAttribute('inert');
    expect(surface).not.toHaveAttribute('aria-hidden');

    const reminderOpener = screen.getByRole('button', { name: 'Set Back reminder' });
    fireEvent.click(reminderOpener);
    expect(surface).toHaveAttribute('inert');
    expect(surface).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
    expect(reminderOpener.closest('[inert]')).toBe(surface);
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Set Back calendar reminder' }), { key: 'Escape' });
    await waitFor(() => expect(reminderOpener).toHaveFocus());
    expect(surface).not.toHaveAttribute('inert');
    expect(surface).not.toHaveAttribute('aria-hidden');
  });

  it('resets only after explicit affirmative action', () => {
    const props = renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Reset all progress' }));
    expect(screen.getByText('Only Move Daily data saved by this app will be removed.')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, reset progress' }));

    expect(props.onReset).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
