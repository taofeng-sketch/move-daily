import type { JSX } from 'react';
import type { CoachVisualProps } from '../runtime/coach';
import { MotionArrow } from '../runtime/primitives';
import { BridgeCoach } from './BridgeCoach';
import { CobraCoach } from './CobraCoach';
import { FoamRollerCoach } from './FoamRollerCoach';
import { StandingReachCoach } from './StandingReachCoach';
import { SupermanCoach } from './SupermanCoach';
import styles from './backCoach.module.css';

const BACK_PHASES = {
  'standing-knee-bends': {
    label: 'Standing reach with knee bends',
    visualId: 'standing-reach',
  },
  'standing-full-down-up': {
    label: 'Standing reach all the way down and back up',
    visualId: 'standing-reach',
  },
  'bridge-articulations': {
    label: 'Bridge articulation from hips to spine',
    visualId: 'bridge',
  },
  'cobra-forearms': {
    label: 'Cobra supported on forearms',
    visualId: 'cobra-forearms',
  },
  'cobra-hands': {
    label: 'Larger cobra extension supported on hands',
    visualId: 'cobra-hands',
  },
  supermans: {
    label: 'Opposite arm and leg Superman',
    visualId: 'superman',
  },
  'foam-roller-extensions': {
    label: 'Upper-back extension over a foam roller',
    visualId: 'foam-roller',
  },
} as const;

type BackPhaseId = keyof typeof BACK_PHASES;

function renderPhase(phaseId: BackPhaseId, progress: number) {
  const label = BACK_PHASES[phaseId].label;

  switch (phaseId) {
    case 'standing-knee-bends':
      return <StandingReachCoach fullDown={false} label={label} progress={progress} />;
    case 'standing-full-down-up':
      return <StandingReachCoach fullDown label={label} progress={progress} />;
    case 'bridge-articulations':
      return <BridgeCoach label={label} progress={progress} />;
    case 'cobra-forearms':
      return <CobraCoach label={label} progress={progress} support="forearms" />;
    case 'cobra-hands':
      return <CobraCoach label={label} progress={progress} support="hands" />;
    case 'supermans':
      return <SupermanCoach label={label} progress={progress} />;
    case 'foam-roller-extensions':
      return <FoamRollerCoach label={label} progress={progress} />;
  }
}

function isBackPhase(phaseId: CoachVisualProps['phaseId']): phaseId is BackPhaseId {
  return phaseId in BACK_PHASES;
}

export function BackCoach(props: CoachVisualProps): JSX.Element {
  if (!isBackPhase(props.phaseId)) {
    throw new Error(`Unsupported Back phase: ${props.phaseId}`);
  }

  const phase = BACK_PHASES[props.phaseId];
  if (props.visualId !== phase.visualId) {
    throw new Error(
      `Mismatched Back visual: ${props.phaseId} requires ${phase.visualId}, received ${props.visualId}`,
    );
  }

  const label = phase.label;

  if (!props.reducedMotion) {
    return renderPhase(props.phaseId, props.progress);
  }

  const moveProgress = props.phaseId === 'supermans' ? 0.25 : 0.5;

  return (
    <div aria-label={label} className={styles.reducedPanel} role="img">
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
        <div
          aria-hidden="true"
          className={styles.poseGraphic}
          data-pose-progress={moveProgress}
        >
          {renderPhase(props.phaseId, moveProgress)}
        </div>
      </div>
    </div>
  );
}
