import type { JSX } from 'react';
import styles from './SessionPlayer.module.css';

export interface PlayerProgressProps {
  readonly setLabel: string;
  readonly sideLabel: string | null;
  readonly countLabel: string;
}

export function PlayerProgress({ setLabel, sideLabel, countLabel }: PlayerProgressProps): JSX.Element {
  return (
    <section aria-label="Exercise progress" className={styles.progress}>
      <span>{setLabel}</span>
      {sideLabel === null ? null : <span>{sideLabel}</span>}
      <strong>{countLabel}</strong>
    </section>
  );
}
