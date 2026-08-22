import { CoachSvg } from '../runtime/CoachSvg';
import { lerp, pulse } from '../runtime/math';
import { Joint, Limb, Mat, MotionArrow, PoseLabel, Roller } from '../runtime/primitives';
import styles from './backCoach.module.css';

interface FoamRollerCoachProps {
  readonly label: string;
  readonly progress: number;
}

export function FoamRollerCoach({ label, progress }: FoamRollerCoachProps) {
  const extension = pulse(progress);
  const shoulderY = lerp(183, 145, extension);
  const headY = lerp(164, 126, extension);

  return (
    <CoachSvg label={label}>
      <Mat height={22} width={290} x={15} y={216} />
      <Roller cx={111} cy={202} length={66} radius={14} />
      <MotionArrow x1={80} x2={65} y1={169} y2={124} />

      <path
        d={`M 106 192 C 102 ${shoulderY + 18}, 88 ${shoulderY + 8}, 75 ${shoulderY}`}
        fill="none"
        stroke="var(--coach)"
        strokeLinecap="round"
        strokeWidth={25}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={65} cy={headY} fill="var(--action)" r={18} stroke="var(--ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <Limb x1={73} x2={51} y1={shoulderY + 5} y2={headY - 5} width={12} />
      <Limb x1={86} x2={78} y1={shoulderY + 9} y2={headY - 11} width={12} colour="var(--coach-deep)" />

      <Limb x1={113} x2={169} y1={200} y2={205} width={25} colour="var(--coach-deep)" />
      <Limb x1={169} x2={205} y1={205} y2={168} width={18} />
      <Limb x1={205} x2={241} y1={168} y2={211} width={16} />
      <Limb x1={173} x2={225} y1={207} y2={178} width={17} colour="var(--coach-deep)" />
      <Limb x1={225} x2={270} y1={178} y2={211} width={15} colour="var(--coach-deep)" />
      <Joint cx={169} cy={205} radius={9} colour="var(--action)" />
      <Joint cx={205} cy={168} radius={7} />
      <Joint cx={225} cy={178} radius={7} />

      <g aria-label="Setup inset: roller across upper back" role="group">
        <rect className={styles.softPanel} height={94} rx={14} width={132} x={178} y={16} />
        <text className={styles.smallText} textAnchor="middle" x={244} y={34}>Setup</text>
        <ellipse cx={244} cy={70} fill="var(--coach)" rx={34} ry={25} stroke="var(--ink)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <Roller cx={244} cy={68} length={86} radius={9} colour="var(--action)" />
        <text className={styles.smallText} textAnchor="middle" x={244} y={103}>Roller across upper back</text>
      </g>

      <PoseLabel label="Hips-down reference" width={148} x={150} y={244} />
    </CoachSvg>
  );
}
