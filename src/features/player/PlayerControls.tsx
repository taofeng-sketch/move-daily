import {
  useEffect,
  useRef,
  type JSX,
  type KeyboardEvent,
} from 'react';
import type { CoachPace } from '../../domain/routine';
import type { PlayerActions, PlayerViewModel } from './useSessionController';
import styles from './SessionPlayer.module.css';

export interface PlayerControlsProps {
  readonly view: PlayerViewModel;
  readonly actions: PlayerActions;
  readonly onRequestSkip: () => void;
}

export interface SkipConfirmationProps {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

const PACES: readonly CoachPace[] = ['slow', 'standard', 'brisk'];

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

export function SkipConfirmation({ onCancel, onConfirm }: SkipConfirmationProps): JSX.Element {
  const dialogRef = useRef<HTMLElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepRef.current?.focus();
  }, []);

  return (
    <section
      aria-label="Confirm skip"
      aria-modal="true"
      className={styles.confirmSkip}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
          return;
        }
        trapDialogFocus(event, dialogRef.current);
      }}
      ref={dialogRef}
      role="dialog"
    >
      <strong>Skip this exercise?</strong>
      <span>It will be recorded as skipped, not completed.</span>
      <button className={styles.control} onClick={onCancel} ref={keepRef} type="button">
        Keep exercise
      </button>
      <button className={styles.secondaryButton} onClick={onConfirm} type="button">
        Confirm skip
      </button>
    </section>
  );
}

export function PlayerControls({
  view,
  actions,
  onRequestSkip,
}: PlayerControlsProps): JSX.Element {
  const paceIndex = PACES.indexOf(view.state.preferences.coachPace);
  const slower = PACES[Math.max(0, paceIndex - 1)] ?? 'slow';
  const faster = PACES[Math.min(PACES.length - 1, paceIndex + 1)] ?? 'brisk';
  const isActiveReps = view.status === 'active' && view.phase.dose.kind === 'reps';
  const canReplay =
    view.status === 'active' ||
    view.status === 'awaiting-ready' ||
    view.status === 'phase-transition';
  const voicePreference = view.voiceEnabled ? 'Voice on' : 'Voice off';
  const voiceLabel = view.speechAvailable
    ? voicePreference
    : `${voicePreference}. Local speech is unavailable; captions and tones remain usable.`;

  return (
    <nav aria-label="Session controls" className={styles.controls}>
      <button className={styles.control} disabled={view.status === 'complete'} onClick={actions.pause} type="button">
        Pause
      </button>
      <button className={styles.control} disabled={!canReplay} onClick={actions.replay} type="button">
        Replay demo
      </button>
      <button
        aria-label="Slower"
        className={styles.control}
        disabled={paceIndex === 0}
        onClick={() => actions.setCoachPace(slower)}
        type="button"
      >
        Slower
      </button>
      <button
        aria-label="Faster"
        className={styles.control}
        disabled={paceIndex === PACES.length - 1}
        onClick={() => actions.setCoachPace(faster)}
        type="button"
      >
        Faster
      </button>
      <button
        aria-label={voiceLabel}
        className={styles.control}
        onClick={() => actions.setVoiceEnabled(!view.voiceEnabled)}
        type="button"
      >
        {voicePreference}{view.speechAvailable ? null : ' · unavailable'}
      </button>
      {view.reducedMotion && isActiveReps ? (
        <button className={styles.primaryButton} onClick={actions.markRep} type="button">
          Mark rep
        </button>
      ) : null}
      {isActiveReps ? (
        <button aria-label="Minus one rep" className={styles.control} onClick={actions.decrementRep} type="button">
          −1 rep
        </button>
      ) : null}
      {view.status === 'paused' ? null : (
        <button
          className={`${styles.control} ${styles.skipControl}`}
          disabled={view.status === 'complete'}
          onClick={onRequestSkip}
          type="button"
        >
          Skip exercise
        </button>
      )}
    </nav>
  );
}
