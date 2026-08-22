import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReminderDialog } from './ReminderDialog';

afterEach(cleanup);

describe('ReminderDialog', () => {
  it('starts with no selected days or hidden time default', () => {
    render(<ReminderDialog routineId="back" onClose={vi.fn()} onDownload={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Set Back calendar reminder' })).toBeVisible();
    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    expect(screen.getAllByRole('checkbox').every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByLabelText('Reminder time')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Create calendar reminder' })).toBeDisabled();
    expect(screen.getByText('Your calendar app controls alert timing.')).toBeVisible();
  });

  it('creates only the explicit routine, days, and time in week order', () => {
    const onDownload = vi.fn();
    render(<ReminderDialog routineId="left-toe" onClose={vi.fn()} onDownload={onDownload} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Sunday' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Wednesday' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Monday' }));
    fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '18:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create calendar reminder' }));

    expect(onDownload).toHaveBeenCalledWith({
      routineId: 'left-toe',
      days: ['MO', 'WE', 'SU'],
      localTime: '18:30',
    });
  });

  it('keeps each dialog draft ephemeral and separate', () => {
    const { rerender, unmount } = render(
      <ReminderDialog key="back" routineId="back" onClose={vi.fn()} onDownload={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Monday' }));
    fireEvent.change(screen.getByLabelText('Reminder time'), { target: { value: '09:00' } });

    rerender(<ReminderDialog key="toe" routineId="left-toe" onClose={vi.fn()} onDownload={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Set Left Toe calendar reminder' })).toBeVisible();
    expect(screen.getAllByRole('checkbox').every((checkbox) => !(checkbox as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByLabelText('Reminder time')).toHaveValue('');

    unmount();
    render(<ReminderDialog routineId="back" onClose={vi.fn()} onDownload={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Monday' })).not.toBeChecked();
    expect(screen.getByLabelText('Reminder time')).toHaveValue('');
  });

  it('supports Escape, traps focus, and returns focus to the opener after close', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn();
    render(
      <ReminderDialog routineId="back" onClose={onClose} onDownload={vi.fn()} returnFocus={opener} />,
    );

    const monday = screen.getByRole('checkbox', { name: 'Monday' });
    expect(monday).toHaveFocus();
    const cancel = screen.getByRole('button', { name: 'Cancel reminder' });
    cancel.focus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    expect(monday).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(cancel).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(opener).toHaveFocus());
    opener.remove();
  });

  it('closes safely from the backdrop without creating a reminder', () => {
    const onClose = vi.fn();
    const onDownload = vi.fn();
    render(<ReminderDialog routineId="back" onClose={onClose} onDownload={onDownload} />);

    fireEvent.mouseDown(screen.getByTestId('reminder-backdrop'));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onDownload).not.toHaveBeenCalled();
  });
});
