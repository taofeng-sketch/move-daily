import { CoachSvg } from '../runtime/CoachSvg';
import { lerp, pulse } from '../runtime/math';
import { Ground, MotionArrow, PoseLabel } from '../runtime/primitives';
import styles from './toeCoach.module.css';

interface BigToeLiftCoachProps {
  readonly label: string;
  readonly progress: number;
}

export function BigToeLiftCoach({ label, progress }: BigToeLiftCoachProps) {
  const lift = pulse(progress);
  const toeY = lerp(211, 174, lift);
  const shadowRadius = lerp(19, 7, lift);

  return (
    <CoachSvg label={label}>
      <Ground x1={24} x2={300} y1={234} y2={234} />
      <ellipse
        cx={178}
        cy={225}
        fill="var(--ink)"
        opacity={0.12}
        rx={110}
        ry={8}
      />
      <path
        aria-label="Grounded left foot"
        className={styles.foot}
        d="M 48 218 C 72 209, 82 180, 91 132 C 96 105, 124 99, 141 122 C 154 140, 158 174, 179 190 C 197 204, 222 211, 244 217 L 244 225 L 63 225 C 54 225, 49 223, 48 218 Z"
      />
      <path
        aria-label="Grounded smaller toes"
        className={styles.smallerToes}
        d="M 207 211 C 220 203, 234 204, 244 215 M 191 207 C 202 201, 215 202, 225 211 M 177 203 C 187 199, 198 200, 207 207"
      />

      <g aria-label="Moving left big toe" role="group">
        <ellipse
          cx={259}
          cy={226}
          data-testid="big-toe-contact-shadow"
          fill="var(--action)"
          opacity={lerp(0.34, 0.1, lift)}
          rx={shadowRadius}
          ry={4}
        />
        <path
          className={styles.bigToeStem}
          d={`M 239 216 Q 250 ${toeY + 6}, 259 ${toeY}`}
        />
        <circle
          cx={259}
          cy={toeY}
          data-testid="big-toe-tip"
          fill="var(--action)"
          r={15}
          stroke="var(--ink)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </g>

      <MotionArrow size={9} x1={286} x2={286} y1={216} y2={157} />
      <PoseLabel label="LEFT" width={68} x={24} y={24} />
      <text className={styles.smallText} textAnchor="middle" x={258} y={257}>
        Big toe
      </text>
    </CoachSvg>
  );
}
