import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OfflineReadyNotice } from './OfflineReadyNotice';

describe('OfflineReadyNotice', () => {
  it('announces truthful offline readiness and delegates dismissal', () => {
    const onDismiss = vi.fn();
    render(<OfflineReadyNotice onDismiss={onDismiss} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Ready offline — Move Daily can now open without a connection.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss offline-ready notice' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
