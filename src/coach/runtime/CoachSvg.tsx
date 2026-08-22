import type { ReactNode } from 'react';
import styles from './CoachStage.module.css';

interface CoachSvgProps {
  readonly label: string;
  readonly children: ReactNode;
}

export function CoachSvg({ label, children }: CoachSvgProps) {
  return (
    <svg
      aria-label={label}
      className={styles.stage}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox="0 0 320 280"
    >
      {children}
    </svg>
  );
}
