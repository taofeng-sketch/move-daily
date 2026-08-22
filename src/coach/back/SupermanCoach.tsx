import { CoachSvg } from '../runtime/CoachSvg';
import { pulse } from '../runtime/math';
import { Joint, Limb, Mat, MotionArrow } from '../runtime/primitives';
import styles from './backCoach.module.css';

interface SupermanCoachProps {
  readonly label: string;
  readonly progress: number;
}

export function SupermanCoach({ label, progress }: SupermanCoachProps) {
  const firstPairLift = progress <= 0.5 ? pulse(progress * 2) : 0;
  const secondPairLift = progress >= 0.5 ? pulse((progress - 0.5) * 2) : 0;
  const firstPairActive = progress > 0 && progress < 0.5;
  const secondPairActive = progress > 0.5 && progress < 1;
  const rightColour = firstPairActive ? 'var(--action)' : 'var(--coach-deep)';
  const leftColour = secondPairActive ? 'var(--action)' : 'var(--coach-deep)';

  return (
    <CoachSvg label={label}>
      <Mat height={30} width={258} x={31} y={197} />
      <ellipse cx={160} cy={136} fill="var(--coach)" rx={47} ry={34} stroke="var(--ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <circle cx={160} cy={92} fill="var(--action)" r={20} stroke="var(--ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />

      <g aria-label="Right arm + left leg" data-active={firstPairActive} role="group">
        <Limb colour={rightColour} width={15} x1={139} x2={87} y1={120} y2={135 - firstPairLift * 37} />
        <Limb colour={rightColour} width={14} x1={87} x2={47} y1={135 - firstPairLift * 37} y2={155 - firstPairLift * 48} />
        <Joint colour={rightColour} cx={87} cy={135 - firstPairLift * 37} radius={7} />
        <Limb colour={rightColour} width={18} x1={176} x2={205} y1={153} y2={178 - firstPairLift * 35} />
        <Limb colour={rightColour} width={16} x1={205} x2={255} y1={178 - firstPairLift * 35} y2={183 - firstPairLift * 53} />
        <Joint colour={rightColour} cx={205} cy={178 - firstPairLift * 35} radius={8} />
      </g>

      <g aria-label="Left arm + right leg" data-active={secondPairActive} role="group">
        <Limb colour={leftColour} width={15} x1={181} x2={230} y1={120} y2={137 - secondPairLift * 37} />
        <Limb colour={leftColour} width={14} x1={230} x2={273} y1={137 - secondPairLift * 37} y2={158 - secondPairLift * 48} />
        <Joint colour={leftColour} cx={230} cy={137 - secondPairLift * 37} radius={7} />
        <Limb colour={leftColour} width={18} x1={144} x2={116} y1={153} y2={179 - secondPairLift * 35} />
        <Limb colour={leftColour} width={16} x1={116} x2={66} y1={179 - secondPairLift * 35} y2={184 - secondPairLift * 53} />
        <Joint colour={leftColour} cx={116} cy={179 - secondPairLift * 35} radius={8} />
      </g>

      <MotionArrow x1={58} x2={58} y1={174} y2={116} size={8} />
      <MotionArrow x1={262} x2={262} y1={174} y2={116} size={8} />

      <g>
        <rect className={styles.softPanel} height={28} rx={12} width={140} x={8} y={241} />
        <circle cx={20} cy={255} fill="var(--action)" r={5} />
        <text className={styles.smallText} x={30} y={258}>Right arm + left leg</text>
      </g>
      <g>
        <rect className={styles.softPanel} height={28} rx={12} width={154} x={158} y={241} />
        <circle cx={170} cy={255} fill="var(--coach-deep)" r={5} />
        <text className={styles.smallText} x={180} y={258}>Left arm + right leg</text>
      </g>
    </CoachSvg>
  );
}
