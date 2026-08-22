import { useEffect, useRef, useState, type JSX } from 'react';
import { observeVisibility } from '../../platform/lifecycle/visibility';
import { CoachRouter } from './CoachRouter';
import { PauseSheet } from './PauseSheet';
import { PlayerControls, SkipConfirmation } from './PlayerControls';
import { PlayerProgress } from './PlayerProgress';
import { ReadyGate } from './ReadyGate';
import styles from './SessionPlayer.module.css';
import {
  useSessionController,
  type SessionControllerOptions,
} from './useSessionController';

export type SessionPlayerProps = SessionControllerOptions;

export function SessionPlayer(props: SessionPlayerProps): JSX.Element {
  const { view, actions } = useSessionController(props);
  const [showingHelp, setShowingHelp] = useState(false);
  const [confirmingSkip, setConfirmingSkip] = useState(false);
  const exerciseHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousPausedRef = useRef(view.status === 'paused');
  const restoreHeadingAfterSkipRef = useRef(false);
  const isPaused = view.status === 'paused';
  const modalOpen = isPaused || confirmingSkip;
  const isReadyGate = view.status === 'awaiting-ready' || view.status === 'phase-transition';
  const canReplayFromPause =
    view.status === 'paused' &&
    (view.state.resumeStatus === 'active' || view.state.resumeStatus === 'awaiting-ready');
  const canRestartSetFromPause =
    view.status === 'paused' &&
    (view.state.resumeStatus === 'active' || view.state.resumeStatus === 'set-transition');

  const confirmReady = () => {
    void actions.start();
    actions.ready();
  };

  useEffect(() => {
    if (previousPausedRef.current && !isPaused) exerciseHeadingRef.current?.focus();
    previousPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (confirmingSkip || !restoreHeadingAfterSkipRef.current) return;
    restoreHeadingAfterSkipRef.current = false;
    if (!isPaused) exerciseHeadingRef.current?.focus();
  }, [confirmingSkip, isPaused]);

  useEffect(() => {
    let active = true;
    const dismissSkipConfirmation = () => {
      if (active) setConfirmingSkip(false);
    };
    const stopObservingVisibility = observeVisibility(document, {
      onHidden: dismissSkipConfirmation,
      onVisible: () => undefined,
    });
    window.addEventListener('pagehide', dismissSkipConfirmation);

    return () => {
      active = false;
      stopObservingVisibility();
      window.removeEventListener('pagehide', dismissSkipConfirmation);
    };
  }, []);

  const requestSkip = () => {
    actions.pause();
    setConfirmingSkip(true);
  };

  const cancelSkip = async () => {
    restoreHeadingAfterSkipRef.current = true;
    try {
      await actions.resume();
    } finally {
      setConfirmingSkip(false);
    }
  };

  const confirmSkip = () => {
    restoreHeadingAfterSkipRef.current = true;
    actions.skip();
    setConfirmingSkip(false);
  };

  return (
    <main aria-labelledby="exercise-title" className={styles.player}>
      <div
        aria-hidden={modalOpen ? true : undefined}
        className={styles.nonModalSurface}
        inert={modalOpen ? true : undefined}
      >
        <header className={styles.topRail}>
          <span>{view.routine.name}</span>
          <strong>{view.exercisePosition}</strong>
          <button
            aria-controls="player-help"
            aria-expanded={showingHelp}
            aria-label="Help"
            className={styles.iconButton}
            onClick={() => setShowingHelp((visible) => !visible)}
            type="button"
          >
            Help
          </button>
          <button aria-label="Close session" className={styles.iconButton} onClick={actions.exit} type="button">
            Close
          </button>
        </header>

        <div className={styles.coachStage}>
          <CoachRouter
            phase={view.phase}
            preview={isReadyGate || view.status === 'replay'}
            progress={view.coachProgress}
            reducedMotion={view.reducedMotion}
          />
        </div>

        <section aria-atomic="true" aria-live="polite" className={styles.instruction} role="status">
          <h1 id="exercise-title" ref={exerciseHeadingRef} tabIndex={-1}>{view.phase.name}</h1>
          <p>{view.caption}</p>
        </section>

        {view.status === 'preparing' && view.countdownSeconds !== null ? (
          <div aria-label="Preparation countdown" className={styles.preparationCountdown}>
            {view.countdownSeconds}
          </div>
        ) : null}

        <PlayerProgress
          countLabel={view.countLabel}
          setLabel={view.setLabel}
          sideLabel={view.sideLabel}
        />

        {isReadyGate ? (
          <ReadyGate onReady={confirmReady} onReplaySetup={actions.replay} />
        ) : null}

        {view.status === 'set-transition' ? (
          <section aria-label="Set transition" className={styles.transitionActions}>
            <button className={styles.primaryButton} onClick={actions.ready} type="button">
              I’m ready
            </button>
            <button className={styles.secondaryButton} onClick={actions.startNow} type="button">
              Start now
            </button>
          </section>
        ) : null}

        {view.status === 'preparing' ? (
          <section aria-label="Preparation controls" className={styles.transitionActions}>
            <button className={styles.secondaryButton} onClick={actions.startNow} type="button">
              Start now
            </button>
            <button className={styles.control} onClick={actions.needMoreTime} type="button">
              Need more time
            </button>
          </section>
        ) : null}

        {!isPaused ? (
          <PlayerControls
            actions={actions}
            onRequestSkip={requestSkip}
            view={view}
          />
        ) : null}

        {showingHelp ? (
          <section
            aria-label="Safety and illustration help"
            className={styles.helpSheet}
            id="player-help"
          >
            <p>Illustration only. Follow the plan and guidance given by your physiotherapist.</p>
            <p>Stop the session if you feel unwell or the movement causes pain, and follow your physiotherapist’s advice.</p>
            <button className={styles.primaryButton} onClick={() => setShowingHelp(false)} type="button">
              Close help
            </button>
          </section>
        ) : null}
      </div>

      {confirmingSkip ? (
        <SkipConfirmation onCancel={() => void cancelSkip()} onConfirm={confirmSkip} />
      ) : isPaused ? (
        <PauseSheet
          actions={actions}
          canReplay={canReplayFromPause}
          canRestartSet={canRestartSetFromPause}
        />
      ) : null}
    </main>
  );
}
