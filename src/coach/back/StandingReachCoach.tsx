import { CoachSvg } from '../runtime/CoachSvg';
import { lerp, pulse } from '../runtime/math';
import { Ground, Joint, Limb, MotionArrow, PoseLabel } from '../runtime/primitives';

interface StandingReachCoachProps {
  readonly fullDown: boolean;
  readonly label: string;
  readonly progress: number;
}

export function StandingReachCoach({
  fullDown,
  label,
  progress,
}: StandingReachCoachProps) {
  const motion = pulse(progress);
  const headX = fullDown ? lerp(184, 132, motion) : 176;
  const headY = fullDown ? lerp(48, 122, motion) : 70;
  const shoulderX = fullDown ? lerp(171, 137, motion) : 166;
  const shoulderY = fullDown ? lerp(73, 143, motion) : 94;
  const hipX = fullDown ? lerp(158, 151, motion) : 151;
  const hipY = fullDown ? lerp(135, 166, motion) : 151;
  const kneeX = fullDown ? lerp(171, 184, motion) : lerp(165, 189, motion);
  const kneeY = fullDown ? lerp(194, 205, motion) : lerp(195, 208, motion);
  const handY = fullDown ? lerp(118, 213, motion) : 196;

  return (
    <CoachSvg label={label}>
      <Ground x1={48} x2={274} y1={238} y2={238} />
      <MotionArrow x1={112} x2={112} y1={96} y2={193} />

      <Limb x1={shoulderX} x2={hipX} y1={shoulderY} y2={hipY} width={24} />
      <Limb x1={shoulderX - 2} x2={127} y1={shoulderY + 7} y2={handY} width={12} />
      <Limb x1={shoulderX + 8} x2={143} y1={shoulderY + 8} y2={handY - 2} width={12} />

      <Limb x1={hipX - 2} x2={kneeX} y1={hipY} y2={kneeY} width={17} />
      <Limb x1={kneeX} x2={181} y1={kneeY} y2={232} width={16} />
      <Limb x1={hipX + 8} x2={kneeX + 19} y1={hipY + 1} y2={kneeY - 4} width={17} colour="var(--coach-deep)" />
      <Limb x1={kneeX + 19} x2={213} y1={kneeY - 4} y2={232} width={16} colour="var(--coach-deep)" />

      <Joint cx={hipX} cy={hipY} />
      <Joint cx={kneeX} cy={kneeY} radius={7} />
      <Joint cx={kneeX + 19} cy={kneeY - 4} radius={7} />
      <circle cx={headX} cy={headY} fill="var(--action)" r={18} stroke="var(--ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />

      {fullDown ? <PoseLabel label="Illustration" width={92} x={204} y={28} /> : null}
    </CoachSvg>
  );
}
