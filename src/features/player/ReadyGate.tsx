import type { JSX } from 'react';
import styles from './SessionPlayer.module.css';

export interface ReadyGateProps {
  readonly onReady: () => void;
  readonly onReplaySetup: () => void;
}

export function ReadyGate({ onReady, onReplaySetup }: ReadyGateProps): JSX.Element {
  return (
    <section aria-label="Ready to begin" className={styles.readyGate}>
      <p className={styles.illustrationBoundary}>
        Illustration only — follow the setup shown by your physiotherapist.
      </p>
      <button className={styles.primaryButton} onClick={onReady} type="button">
        I’m ready
      </button>
      <button className={styles.secondaryButton} onClick={onReplaySetup} type="button">
        Replay setup
      </button>
    </section>
  );
}
