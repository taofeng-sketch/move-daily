import { CoachSvg } from '../runtime/CoachSvg';
import { lerp, pulse } from '../runtime/math';
import { Joint, Limb, Mat, MotionArrow, PoseLabel } from '../runtime/primitives';

interface CobraCoachProps {
  readonly label: string;
  readonly progress: number;
  readonly support: 'forearms' | 'hands';
}

export function CobraCoach({ label, progress, support }: CobraCoachProps) {
  const extension = pulse(progress);
  const isHands = support === 'hands';
  const shoulderY = lerp(184, isHands ? 103 : 135, extension);
  const headY = shoulderY - (isHands ? 25 : 20);
  const contact = isHands ? 'Hands' : 'Forearms';

  return (
    <CoachSvg label={label}>
      <Mat height={24} width={286} x={17} y={214} />
      <MotionArrow x1={121} x2={121} y1={181} y2={isHands ? 100 : 130} />

      <Limb x1={57} x2={178} y1={203} y2={197} width={27} colour="var(--coach-deep)" />
      <Limb x1={178} x2={235} y1={197} y2={207} width={18} />
      <Limb x1={178} x2={276} y1={202} y2={210} width={16} colour="var(--coach-deep)" />
      <path
        d={`M 67 198 C 88 194, 101 ${shoulderY + 22}, 126 ${shoulderY}`}
        fill="none"
        stroke="var(--coach)"
        strokeLinecap="round"
        strokeWidth={24}
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={135} cy={headY} fill="var(--action)" r={18} stroke="var(--ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />

      {isHands ? (
        <g aria-label="Hands support contact" role="group">
          <Limb x1={120} x2={151} y1={shoulderY + 10} y2={155} width={13} />
          <Limb x1={151} x2={151} y1={155} y2={207} width={12} />
          <Limb x1={137} x2={174} y1={shoulderY + 12} y2={158} width={13} colour="var(--coach-deep)" />
          <Limb x1={174} x2={174} y1={158} y2={207} width={12} colour="var(--coach-deep)" />
          <Joint cx={151} cy={207} radius={8} colour="var(--action)" />
          <Joint cx={174} cy={207} radius={8} colour="var(--action)" />
        </g>
      ) : (
        <g aria-label="Forearms support contact" role="group">
          <Limb x1={121} x2={151} y1={shoulderY + 8} y2={178} width={13} />
          <Limb x1={151} x2={183} y1={178} y2={207} width={12} />
          <Limb x1={137} x2={169} y1={shoulderY + 10} y2={180} width={13} colour="var(--coach-deep)" />
          <Limb x1={169} x2={207} y1={180} y2={207} width={12} colour="var(--coach-deep)" />
          <Limb x1={183} x2={217} y1={207} y2={207} width={10} colour="var(--action)" />
          <Limb x1={207} x2={239} y1={207} y2={207} width={10} colour="var(--action)" />
        </g>
      )}

      <rect fill="var(--action)" height={7} rx={3.5} width={46} x={61} y={203} />
      <PoseLabel label={contact} width={isHands ? 78 : 92} x={211} y={35} />
    </CoachSvg>
  );
}
