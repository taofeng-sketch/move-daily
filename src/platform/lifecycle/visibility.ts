export interface VisibilityCallbacks {
  onHidden(): void;
  onVisible(): void;
}

export function observeVisibility(
  documentLike: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>,
  callbacks: VisibilityCallbacks,
): () => void {
  let unsubscribed = false;
  const handleVisibilityChange = () => {
    if (unsubscribed) return;
    if (documentLike.visibilityState === 'hidden') callbacks.onHidden();
    if (documentLike.visibilityState === 'visible') callbacks.onVisible();
  };

  documentLike.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    if (unsubscribed) return;
    unsubscribed = true;
    documentLike.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
