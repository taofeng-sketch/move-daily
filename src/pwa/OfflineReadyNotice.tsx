export interface OfflineReadyNoticeProps {
  readonly onDismiss: () => void;
}

export function OfflineReadyNotice({ onDismiss }: OfflineReadyNoticeProps) {
  return (
    <aside aria-label="Offline availability">
      <p role="status">Ready offline — Move Daily can now open without a connection.</p>
      <button type="button" aria-label="Dismiss offline-ready notice" onClick={onDismiss}>
        Dismiss
      </button>
    </aside>
  );
}
