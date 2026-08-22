import { useEffect, useRef, useState, type JSX, type KeyboardEvent } from 'react';
import type { PlayerActions } from './useSessionController';
import styles from './SessionPlayer.module.css';

export interface PauseSheetProps {
  readonly actions: PlayerActions;
  readonly canReplay: boolean;
  readonly canRestartSet: boolean;
}

function trapDialogFocus(event: KeyboardEvent<HTMLElement>, dialog: HTMLElement | null): void {
  if (event.key !== 'Tab' || dialog === null) return;
  const buttons = [...dialog.querySelectorAll<HTMLButtonElement>('button:not([disabled])')];
  const first = buttons.at(0);
  const last = buttons.at(-1);
  if (!first || !last) return;
  const active = document.activeElement;

  if (event.shiftKey && (active === first || !dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

export function PauseSheet({ actions, canReplay, canRestartSet }: PauseSheetProps): JSX.Element {
  const [confirmingSkip, setConfirmingSkip] = useState(false);
  const pauseDialogRef = useRef<HTMLElement>(null);
  const confirmDialogRef = useRef<HTMLElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const wasConfirmingSkipRef = useRef(false);

  useEffect(() => {
    if (confirmingSkip) {
      wasConfirmingSkipRef.current = true;
      keepRef.current?.focus();
      return;
    }
    if (wasConfirmingSkipRef.current) {
      wasConfirmingSkipRef.current = false;
      skipRef.current?.focus();
      return;
    }
    resumeRef.current?.focus();
  }, [confirmingSkip]);

  const handlePauseKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    trapDialogFocus(event, pauseDialogRef.current);
  };

  const handleConfirmKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setConfirmingSkip(false);
      return;
    }
    trapDialogFocus(event, confirmDialogRef.current);
  };

  return (
    <>
      <section
        aria-hidden={confirmingSkip ? true : undefined}
        aria-label="Session paused"
        aria-modal={confirmingSkip ? undefined : 'true'}
        className={styles.pauseSheet}
        inert={confirmingSkip ? true : undefined}
        onKeyDown={handlePauseKeyDown}
        ref={pauseDialogRef}
        role="dialog"
      >
        <h2>Paused</h2>
        <button className={styles.primaryButton} onClick={() => void actions.resume()} ref={resumeRef} type="button">
          Resume
        </button>
        <button className={styles.control} disabled={!canReplay} onClick={actions.replay} type="button">
          Replay demo
        </button>
        <button className={styles.control} disabled={!canRestartSet} onClick={actions.restartSet} type="button">
          Restart set
        </button>
        <button className={styles.control} onClick={() => setConfirmingSkip(true)} ref={skipRef} type="button">
          Skip exercise
        </button>
        <button className={styles.secondaryButton} onClick={actions.exit} type="button">
          End session
        </button>
      </section>

      {confirmingSkip ? (
        <section
          aria-label="Confirm skip"
          aria-modal="true"
          className={styles.pauseSheet}
          onKeyDown={handleConfirmKeyDown}
          ref={confirmDialogRef}
          role="dialog"
        >
          <h2>Skip this exercise?</h2>
          <p>It will be recorded as skipped, not completed.</p>
          <button
            className={styles.primaryButton}
            onClick={() => {
              setConfirmingSkip(false);
              actions.skip();
            }}
            type="button"
          >
            Skip exercise
          </button>
          <button className={styles.control} onClick={() => setConfirmingSkip(false)} ref={keepRef} type="button">
            Keep exercise
          </button>
        </section>
      ) : null}
    </>
  );
}
