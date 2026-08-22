import { CoachSvg } from '../runtime/CoachSvg';
import { lerp, pulse } from '../runtime/math';
import { Band, Ground, MotionArrow, PoseLabel } from '../runtime/primitives';
import styles from './toeCoach.module.css';

interface ArchLiftCoachProps {
  readonly label: string;
  readonly progress: number;
}

export function ArchLiftCoach({ label, progress }: ArchLiftCoachProps) {
  const lift = pulse(progress);
  const archY = lerp(202, 158, lift);

  return (
    <CoachSvg label={label}>
      <g aria-label="Setup" data-panel-width="126" role="group">
        <rect className={styles.softPanel} height={96} rx={13} width={126} x={14} y={14} />
        <text className={styles.coachText} textAnchor="middle" x={77} y={32}>
          Setup
        </text>
        <Band x1={20} x2={134} y1={80} y2={80} width={5} />
        <ellipse
          aria-label="Schematic loop around left foot"
          className={styles.schematicLoop}
          cx={61}
          cy={69}
          rx={30}
          ry={20}
        />
        <ellipse
          aria-label="Left foot in loop"
          className={styles.setupFoot}
          cx={61}
          cy={68}
          rx={18}
          ry={30}
        />
        <ellipse
          aria-label="Right foot pins band"
          className={styles.setupFootStrong}
          cx={112}
          cy={76}
          rx={18}
          ry={28}
        />
        <text className={styles.tinyText} textAnchor="middle" x={61} y={72}>
          LEFT
        </text>
        <text className={styles.tinyText} textAnchor="middle" x={112} y={72}>
          RIGHT
        </text>
        <text className={styles.tinyText} textAnchor="middle" x={112} y={103}>
          pins band
        </text>
      </g>

      <g aria-label="Schematic note" role="group">
        <PoseLabel label="Schematic" width={104} x={190} y={14} />
        <foreignObject height={50} width={158} x={148} y={52}>
          <div className={styles.caveatHtml}>
            Use the band setup shown by your physiotherapist.
          </div>
        </foreignObject>
      </g>

      <g aria-label="Arch close-up" data-panel-width="288" role="group">
        <rect className={styles.softPanel} height={146} rx={16} width={292} x={14} y={120} />
        <text className={styles.coachText} x={28} y={142}>
          Arch close-up
        </text>
        <Ground x1={32} x2={280} y1={230} y2={230} />
        <path
          aria-label="Grounded left foot close-up"
          className={styles.archFoot}
          d="M 44 220 C 66 206, 84 188, 103 170 C 125 149, 148 148, 169 169 C 188 188, 213 208, 252 216 L 268 224 L 268 230 L 44 230 Z"
        />
        <path
          aria-label="Inside arch contour"
          className={styles.archContour}
          d={`M 54 220 C 96 ${archY}, 154 ${archY}, 202 220`}
        />
        <MotionArrow size={8} x1={124} x2={124} y1={218} y2={164} />
        <PoseLabel label="LEFT" width={68} x={217} y={135} />
        <text className={styles.smallText} x={162} y={254}>
          Relax
        </text>
        <text className={styles.smallText} x={215} y={254}>
          Lift
        </text>
      </g>
    </CoachSvg>
  );
}
