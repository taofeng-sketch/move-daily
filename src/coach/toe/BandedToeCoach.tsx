import { CoachSvg } from '../runtime/CoachSvg';
import { lerp, pulse } from '../runtime/math';
import { Band, Ground, MotionArrow, PoseLabel } from '../runtime/primitives';
import styles from './toeCoach.module.css';

interface BandedToeCoachProps {
  readonly label: string;
  readonly progress: number;
}

export function BandedToeCoach({ label, progress }: BandedToeCoachProps) {
  const press = pulse(progress);
  const toeY = lerp(174, 210, press);

  return (
    <CoachSvg label={label}>
      <Ground x1={18} x2={304} y1={232} y2={232} />
      <path
        aria-label="Grounded left foot"
        className={styles.foot}
        d="M 48 218 C 75 207, 84 168, 93 127 C 100 96, 129 95, 146 121 C 161 144, 166 176, 190 191 C 210 204, 229 211, 244 217 L 244 225 L 61 225 C 53 225, 49 223, 48 218 Z"
      />
      <path
        aria-label="Grounded smaller toes"
        className={styles.smallerToes}
        d="M 203 210 C 217 202, 232 205, 244 216 M 187 206 C 201 199, 215 202, 225 211"
      />

      <g aria-label="Loop around left big toe" role="group">
        <Band x1={249} x2={-12} y1={toeY - 8} y2={toeY - 8} />
        <Band x1={249} x2={-12} y1={toeY + 8} y2={toeY + 8} />
        <ellipse
          className={styles.bandLoop}
          cx={258}
          cy={toeY}
          rx={18}
          ry={23}
        />
        <circle
          cx={258}
          cy={toeY}
          data-testid="banded-big-toe-tip"
          fill="var(--action)"
          r={14}
          stroke="var(--ink)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </g>

      <MotionArrow size={9} x1={286} x2={286} y1={166} y2={218} />
      <PoseLabel label="LEFT" width={68} x={20} y={22} />
      <PoseLabel label="Schematic" width={104} x={196} y={22} />
      <text className={styles.coachText} x={206} y={258}>
        Press
      </text>
      <text className={styles.coachText} x={258} y={258}>
        Relax
      </text>
      <text
        className={styles.caveatText}
        lengthAdjust="spacingAndGlyphs"
        textLength={278}
        x={21}
        y={79}
      >
        Use the band setup shown by your physiotherapist.
      </text>
    </CoachSvg>
  );
}
