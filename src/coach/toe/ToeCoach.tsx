import type { JSX } from 'react';
import type { CoachVisualProps } from '../runtime/coach';
import { MotionArrow } from '../runtime/primitives';
import { ArchLiftCoach } from './ArchLiftCoach';
import { BalanceCoach } from './BalanceCoach';
import { BandedToeCoach } from './BandedToeCoach';
import { BigToeLiftCoach } from './BigToeLiftCoach';
import styles from './toeCoach.module.css';

const TOE_PHASES = {
  'big-toe-lifts': {
    label: 'Left big-toe lift close-up',
    visualId: 'big-toe',
  },
  'banded-toe-pointing': {
    label: 'Left banded big-toe pointing close-up',
    visualId: 'banded-toe',
  },
  'band-arch-lifts': {
    label: 'Left heavy-band arch lift split view',
    visualId: 'arch-lift',
  },
  'single-leg-balance': {
    label: 'Left single-leg balance with foot inset',
    visualId: 'balance',
  },
} as const;

type ToePhaseId = keyof typeof TOE_PHASES;

function isToePhase(phaseId: CoachVisualProps['phaseId']): phaseId is ToePhaseId {
  return phaseId in TOE_PHASES;
}

function renderPhase(phaseId: ToePhaseId, progress: number) {
  const label = TOE_PHASES[phaseId].label;

  switch (phaseId) {
    case 'big-toe-lifts':
      return <BigToeLiftCoach label={label} progress={progress} />;
    case 'banded-toe-pointing':
      return <BandedToeCoach label={label} progress={progress} />;
    case 'band-arch-lifts':
      return <ArchLiftCoach label={label} progress={progress} />;
    case 'single-leg-balance':
      return <BalanceCoach label={label} />;
  }
}

export function ToeCoach(props: CoachVisualProps): JSX.Element {
  if (!isToePhase(props.phaseId)) {
    throw new Error(`Unsupported Toe phase: ${props.phaseId}`);
  }

  const phase = TOE_PHASES[props.phaseId];
  if (props.visualId !== phase.visualId) {
    throw new Error(
      `Mismatched Toe visual: ${props.phaseId} requires ${phase.visualId}, received ${props.visualId}`,
    );
  }

  if (!props.reducedMotion) {
    return renderPhase(props.phaseId, props.progress);
  }

  if (props.phaseId === 'single-leg-balance') {
    return (
      <div aria-label={phase.label} className={styles.holdPanel} role="img">
        <span className={styles.holdLabel}>Hold</span>
        <div aria-hidden="true" className={styles.holdGraphic} data-pose-progress="0">
          {renderPhase(props.phaseId, 0)}
        </div>
      </div>
    );
  }

  return (
    <div aria-label={phase.label} className={styles.reducedPanel} role="img">
      <div className={styles.poseCard}>
        <span className={styles.poseCardLabel}>Start</span>
        <div aria-hidden="true" className={styles.poseGraphic} data-pose-progress="0">
          {renderPhase(props.phaseId, 0)}
        </div>
      </div>
      <svg
        aria-hidden="true"
        className={styles.reducedArrow}
        data-testid="reduced-motion-arrow"
        viewBox="0 0 32 48"
      >
        <MotionArrow size={7} x1={4} x2={27} y1={24} y2={24} />
      </svg>
      <div className={styles.poseCard}>
        <span className={styles.poseCardLabel}>Move</span>
        <div aria-hidden="true" className={styles.poseGraphic} data-pose-progress="0.5">
          {renderPhase(props.phaseId, 0.5)}
        </div>
      </div>
    </div>
  );
}
