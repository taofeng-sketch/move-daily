import { describe, expect, it, vi } from 'vitest';
import { observeVisibility } from './visibility';

function createDocumentLike() {
  const listeners = new Set<EventListener>();
  const documentLike = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'visibilitychange' && typeof listener === 'function') listeners.add(listener);
    },
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
      if (type === 'visibilitychange' && typeof listener === 'function') listeners.delete(listener);
    },
    setVisibility(state: DocumentVisibilityState) {
      this.visibilityState = state;
      for (const listener of listeners) listener(new Event('visibilitychange'));
    },
  };

  return documentLike;
}

describe('page visibility observation', () => {
  it('calls only the hidden callback when the page becomes hidden', () => {
    const documentLike = createDocumentLike();
    const onHidden = vi.fn();
    const onVisible = vi.fn();
    observeVisibility(documentLike, { onHidden, onVisible });

    documentLike.setVisibility('hidden');

    expect(onHidden).toHaveBeenCalledOnce();
    expect(onVisible).not.toHaveBeenCalled();
  });

  it('calls only the visible callback when the page becomes visible', () => {
    const documentLike = createDocumentLike();
    const onHidden = vi.fn();
    const onVisible = vi.fn();
    observeVisibility(documentLike, { onHidden, onVisible });

    documentLike.setVisibility('visible');

    expect(onVisible).toHaveBeenCalledOnce();
    expect(onHidden).not.toHaveBeenCalled();
  });

  it('stops observing after unsubscribe', () => {
    const documentLike = createDocumentLike();
    const onHidden = vi.fn();
    const unsubscribe = observeVisibility(documentLike, { onHidden, onVisible: vi.fn() });

    unsubscribe();
    documentLike.setVisibility('hidden');

    expect(onHidden).not.toHaveBeenCalled();
  });
});
