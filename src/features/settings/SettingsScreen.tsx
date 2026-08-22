import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type SetStateAction,
} from 'react';
import type { RoutineId } from '../../domain/routine';
import type { Preferences } from '../../persistence/appState';
import type { InstallState } from '../../pwa/install';
import { ReminderDialog } from '../reminders/ReminderDialog';
import styles from './SettingsScreen.module.css';

export type SettingsPreferencePatch = Partial<
  Pick<Preferences, 'voiceEnabled' | 'coachPace' | 'balanceSeconds' | 'reducedMotion'>
>;

export interface SettingsScreenProps {
  readonly preferences: Preferences;
  readonly installState: InstallState;
  readonly installInstructions: readonly string[];
  readonly onPreferencesChange: (patch: SettingsPreferencePatch) => void;
  readonly onReset: () => void;
  readonly onClose: () => void;
  readonly onApplyUpdate?: () => void;
  readonly offlineAvailable?: boolean;
}

export function SettingsScreen({
  preferences,
  installState,
  installInstructions,
  onPreferencesChange,
  onReset,
  onClose,
  onApplyUpdate,
  offlineAvailable = false,
}: SettingsScreenProps): JSX.Element {
  const [reminderRoutine, setReminderRoutine] = useState<RoutineId | null>(null);
  const [showReset, setShowReset] = useState(false);
  const reminderReturnFocusRef = useRef<HTMLElement | null>(null);
  const pendingReturnFocusRef = useRef<HTMLElement | null>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const modalOpen = reminderRoutine !== null || showReset;

  useEffect(() => {
    if (modalOpen) return;
    const returnFocus = pendingReturnFocusRef.current;
    pendingReturnFocusRef.current = null;
    returnFocus?.focus();
  }, [modalOpen]);

  const closeReminder = (): void => {
    pendingReturnFocusRef.current = reminderReturnFocusRef.current;
    setReminderRoutine(null);
  };

  const closeReset = (): void => {
    pendingReturnFocusRef.current = resetButtonRef.current;
    setShowReset(false);
  };

  return (
    <>
      <main
        aria-hidden={modalOpen ? true : undefined}
        className={styles.settings}
        data-testid="settings-surface"
        inert={modalOpen ? true : undefined}
      >
      <header className={styles.header}>
        <div>
          <p className={styles.productLine}>Move Daily</p>
          <h1>Settings and safety</h1>
        </div>
        <button className={styles.quietButton} onClick={onClose} type="button">
          Done
        </button>
      </header>

      {onApplyUpdate !== undefined ? (
        <section aria-labelledby="update-heading" className={styles.updateCard}>
          <div>
            <h2 id="update-heading">Update ready</h2>
            <p>Apply the downloaded update when you are ready.</p>
          </div>
          <button className={styles.installButton} onClick={onApplyUpdate} type="button">
            Apply update
          </button>
        </section>
      ) : null}

      <section className={styles.card} aria-labelledby="coaching-heading">
        <h2 id="coaching-heading">Coaching</h2>
        <fieldset className={styles.fieldset}>
          <legend>Voice prompts</legend>
          <label className={styles.toggleRow}>
            <input
              checked={preferences.voiceEnabled}
              onChange={(event) => onPreferencesChange({ voiceEnabled: event.currentTarget.checked })}
              type="checkbox"
            />
            <span>Use voice prompts</span>
          </label>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Coach pace — visual rhythm</legend>
          <div className={styles.choiceGrid}>
            {(['slow', 'standard', 'brisk'] as const).map((pace) => (
              <label className={styles.choice} key={pace}>
                <input
                  checked={preferences.coachPace === pace}
                  name="coach-pace"
                  onChange={() => onPreferencesChange({ coachPace: pace })}
                  type="radio"
                />
                <span>{capitalise(pace)} visual rhythm</span>
              </label>
            ))}
          </div>
          <p className={styles.helper}>Coach pace is a following rhythm, not a prescribed movement speed.</p>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Balance hold</legend>
          <div className={styles.choiceGrid}>
            {([10, 15] as const).map((seconds) => (
              <label className={styles.choice} key={seconds}>
                <input
                  checked={preferences.balanceSeconds === seconds}
                  name="balance-hold"
                  onChange={() => onPreferencesChange({ balanceSeconds: seconds })}
                  type="radio"
                />
                <span>{seconds} seconds</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Motion</legend>
          <label className={styles.toggleRow}>
            <input
              checked={preferences.reducedMotion}
              onChange={(event) => onPreferencesChange({ reducedMotion: event.currentTarget.checked })}
              type="checkbox"
            />
            <span>Use reduced motion</span>
          </label>
        </fieldset>
      </section>

      <section className={styles.card} aria-labelledby="reminders-heading">
        <h2 id="reminders-heading">Calendar reminders</h2>
        <p>Select days and time for each routine. The app does not infer a schedule.</p>
        <div className={styles.rowActions}>
          <button
            className={styles.quietButton}
            onClick={(event) => {
              reminderReturnFocusRef.current = event.currentTarget;
              setReminderRoutine('back');
            }}
            type="button"
          >
            Set Back reminder
          </button>
          <button
            className={styles.quietButton}
            onClick={(event) => {
              reminderReturnFocusRef.current = event.currentTarget;
              setReminderRoutine('left-toe');
            }}
            type="button"
          >
            Set Left Toe reminder
          </button>
        </div>
      </section>

      <InstallSection
        installInstructions={installInstructions}
        installState={installState}
        offlineAvailable={offlineAvailable}
      />

      <section className={styles.card} aria-labelledby="safety-heading">
        <h2 id="safety-heading">Safety and illustrations</h2>
        <p className={styles.boundary}>Illustration only. Follow the plan and guidance given by your physiotherapist.</p>
        <p>
          Stop the session if you feel unwell or the movement causes pain, and follow your physiotherapist’s advice.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Privacy</h2>
        <p>This device stores routine dates, completed or skipped exercises, one unfinished session, and settings.</p>
        <p className={styles.strongLine}>No exercise history is sent by this app.</p>
        <p>Browser and home-screen histories may be separate.</p>
      </section>

      <section className={`${styles.card} ${styles.dataCard}`} aria-labelledby="data-heading">
        <h2 id="data-heading">Data</h2>
        <p>Remove progress and settings saved by Move Daily in this browser.</p>
        <button
          className={styles.destructiveButton}
          onClick={() => setShowReset(true)}
          ref={resetButtonRef}
          type="button"
        >
          Reset all progress
        </button>
      </section>
      </main>

      {reminderRoutine !== null ? (
        <ReminderDialog
          key={reminderRoutine}
          onClose={closeReminder}
          routineId={reminderRoutine}
        />
      ) : null}

      {showReset ? (
        <ResetDialog
          onCancel={closeReset}
          onConfirm={() => {
            onReset();
            closeReset();
          }}
        />
      ) : null}
    </>
  );
}

function InstallSection({
  installState,
  installInstructions,
  offlineAvailable,
}: Pick<SettingsScreenProps, 'installState' | 'installInstructions' | 'offlineAvailable'>): JSX.Element {
  const [attempt, setAttempt] = useState<InstallAttempt | null>(null);
  const activePrompt = installState.kind === 'installable' ? installState.prompt : null;
  const activeAttempt = activePrompt !== null && attempt?.prompt === activePrompt ? attempt : null;

  const prompt = async (): Promise<void> => {
    if (installState.kind !== 'installable' || activeAttempt !== null) return;
    const promptAction = installState.prompt;
    setAttempt({ prompt: promptAction, status: 'pending', feedback: null });
    try {
      const outcome = await promptAction();
      settleInstallAttempt(
        setAttempt,
        promptAction,
        outcome === 'accepted' ? 'Install request accepted.' : 'Installation was not completed.',
      );
    } catch {
      settleInstallAttempt(setAttempt, promptAction, 'Installation was not completed.');
    }
  };

  return (
    <section className={styles.card} aria-labelledby="install-heading">
      <h2 id="install-heading">
        {installState.kind === 'ios-instructions' ? 'Install on iPhone or iPad' : 'Install and offline'}
      </h2>
      {installState.kind === 'installed' ? <p>Move Daily is installed on this device.</p> : null}
      {installState.kind !== 'installed' && installInstructions.length > 0 ? (
        <ol className={styles.instructions}>
          {installInstructions.map((instruction) => (
            <li key={instruction}>{instruction}</li>
          ))}
        </ol>
      ) : null}
      {installState.kind === 'installable' ? (
        <button
          className={styles.installButton}
          disabled={activeAttempt !== null}
          onClick={() => void prompt()}
          type="button"
        >
          {activeAttempt === null
            ? 'Install Move Daily'
            : activeAttempt.status === 'pending'
              ? 'Opening install…'
              : 'Install prompt used'}
        </button>
      ) : null}
      {activeAttempt?.feedback !== null && activeAttempt?.feedback !== undefined ? (
        <p aria-live="polite">{activeAttempt.feedback}</p>
      ) : null}
      <p className={styles.strongLine}>
        {offlineAvailable
          ? 'Available offline on this device.'
          : 'Open once online to enable offline use.'}
      </p>
      <p>Install before building history because the browser and home-screen app may not share storage.</p>
    </section>
  );
}

interface InstallAttempt {
  readonly prompt: Extract<InstallState, { readonly kind: 'installable' }>['prompt'];
  readonly status: 'pending' | 'consumed';
  readonly feedback: string | null;
}

function settleInstallAttempt(
  setAttempt: Dispatch<SetStateAction<InstallAttempt | null>>,
  prompt: InstallAttempt['prompt'],
  feedback: string,
): void {
  setAttempt((current) =>
    current?.prompt === prompt ? { prompt, status: 'consumed', feedback } : current,
  );
}

interface ResetDialogProps {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

function ResetDialog({ onCancel, onConfirm }: ResetDialogProps): JSX.Element {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      className={styles.backdrop}
      data-testid="reset-backdrop"
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        aria-labelledby="reset-title"
        aria-modal="true"
        className={styles.resetDialog}
        onKeyDown={(event) => handleResetKey(event, dialogRef.current, onCancel)}
        ref={dialogRef}
        role="alertdialog"
      >
        <h2 id="reset-title">Reset all progress?</h2>
        <p>Only Move Daily data saved by this app will be removed.</p>
        <p>This cannot be undone.</p>
        <div className={styles.dialogActions}>
          <button onClick={onCancel} ref={cancelRef} type="button">
            Cancel reset
          </button>
          <button className={styles.destructiveButton} onClick={onConfirm} type="button">
            Yes, reset progress
          </button>
        </div>
      </section>
    </div>
  );
}

function handleResetKey(
  event: KeyboardEvent<HTMLElement>,
  dialog: HTMLElement | null,
  onCancel: () => void,
): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    onCancel();
    return;
  }
  if (event.key !== 'Tab' || dialog === null) return;
  const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled)')];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function capitalise(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
