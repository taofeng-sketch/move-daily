import { CoachSvg } from '../runtime/CoachSvg';
import { Ground, Joint, Limb, PoseLabel } from '../runtime/primitives';
import styles from './toeCoach.module.css';

interface BalanceCoachProps {
  readonly label: string;
}

export function BalanceCoach({ label }: BalanceCoachProps) {
  return (
    <CoachSvg label={label}>
      <g aria-label="Full-body left-leg balance" role="group">
        <Ground x1={18} x2={174} y1={244} y2={244} />
        <circle
          cx={91}
          cy={46}
          fill="var(--action)"
          r={18}
          stroke="var(--ink)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <Limb width={25} x1={91} x2={91} y1={70} y2={139} />
        <Limb width={13} x1={87} x2={52} y1={87} y2={132} />
        <Limb colour="var(--coach-deep)" width={13} x1={95} x2={130} y1={87} y2={132} />
        <Joint cx={91} cy={139} radius={9} />
        <g aria-label="Left support leg" role="group">
          <Limb width={19} x1={91} x2={89} y1={139} y2={189} />
          <Limb width={17} x1={89} x2={87} y1={189} y2={237} />
          <Joint cx={89} cy={189} radius={7} />
          <line
            aria-label="Left support foot contact"
            className={styles.supportFootContact}
            x1={83}
            x2={126}
            y1={244}
            y2={244}
          />
        </g>
        <g
          aria-label="Free leg, position not specified"
          opacity="0.55"
          role="group"
          strokeDasharray="6 6"
        >
          <Limb colour="var(--ink-muted)" width={14} x1={91} x2={120} y1={139} y2={172} />
          <Limb colour="var(--ink-muted)" width={12} x1={120} x2={132} y1={172} y2={207} />
          <Joint cx={120} cy={172} radius={6} colour="var(--ink-muted)" />
          <line
            className={styles.freeFoot}
            x1={128}
            x2={147}
            y1={207}
            y2={207}
          />
        </g>
        <PoseLabel label="Left leg" width={82} x={18} y={154} />
      </g>

      <g aria-label="Magnified left foot" role="group">
        <rect className={styles.softPanel} height={224} rx={18} width={132} x={178} y={28} />
        <text className={styles.coachText} textAnchor="middle" x={244} y={52}>
          Left foot
        </text>
        <path
          className={styles.insetFoot}
          d="M 201 208 C 207 188, 208 145, 221 99 C 227 76, 251 74, 261 97 C 268 115, 268 153, 281 177 C 289 192, 298 204, 295 216 C 293 225, 282 230, 267 230 L 218 230 C 205 230, 198 222, 201 208 Z"
        />
        <path className={styles.toeStraight} d="M 276 207 L 297 207" />
        <path className={styles.archContour} d="M 216 217 C 232 187, 251 187, 269 217" />
        <text className={styles.smallText} textAnchor="middle" x={249} y={72}>
          Toe straight
        </text>
        <text className={styles.smallText} textAnchor="middle" x={245} y={246}>
          Arch lifted
        </text>
      </g>

      <text className={styles.balanceNote} textAnchor="middle" x={160} y={272}>
        Free leg position not specified in plan.
      </text>
    </CoachSvg>
  );
}
