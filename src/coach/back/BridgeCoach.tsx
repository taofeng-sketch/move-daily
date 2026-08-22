import { CoachSvg } from '../runtime/CoachSvg';
import { easeInOut, lerp } from '../runtime/math';
import { Joint, Limb, Mat, MotionArrow } from '../runtime/primitives';
import styles from './backCoach.module.css';

interface BridgeCoachProps {
  readonly label: string;
  readonly progress: number;
}

const segmentProgress = (progress: number, index: number) =>
  Math.min(1, Math.max(0, (progress - 0.5 - index * 0.08) / 0.25));

const FLOOR_SEGMENT_Y = 190;
const RAISED_SEGMENT_Y = [160, 154, 148, 142] as const;

export function BridgeCoach({ label, progress }: BridgeCoachProps) {
  const lift = easeInOut(Math.min(1, Math.max(0, progress * 2)));
  const hipLowering = Math.min(1, Math.max(0, (progress - 0.9) / 0.1));
  const hipY = progress <= 0.5 ? lerp(202, 158, lift) : lerp(158, 202, hipLowering);
  const segmentXs = [104, 128, 152, 176];

  return (
    <CoachSvg label={label}>
      <Mat height={24} width={286} x={17} y={214} />
      <MotionArrow x1={206} x2={206} y1={198} y2={151} />

      <circle cx={76} cy={193} fill="var(--action)" r={18} stroke="var(--ink)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      <Limb x1={90} x2={99} y1={193} y2={184} width={22} />

      <g aria-label="Four spine segments lowering from chest to hips" role="group">
        {segmentXs.map((x, index) => {
          const raisedY = RAISED_SEGMENT_Y[index]!;
          const y =
            progress <= 0.5
              ? lerp(FLOOR_SEGMENT_Y, raisedY, lift)
              : lerp(raisedY, FLOOR_SEGMENT_Y, segmentProgress(progress, index));
          return (
            <rect
              data-testid="spine-segment"
              fill={index % 2 === 0 ? 'var(--coach)' : 'var(--coach-deep)'}
              height={20}
              key={x}
              rx={10}
              stroke="var(--ink)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              width={29}
              x={x}
              y={y}
            />
          );
        })}
      </g>

      <Limb x1={190} x2={218} y1={hipY} y2={173} width={20} />
      <Limb x1={218} x2={250} y1={173} y2={210} width={17} />
      <Limb x1={194} x2={233} y1={hipY + 4} y2={181} width={17} colour="var(--coach-deep)" />
      <Limb x1={233} x2={269} y1={181} y2={210} width={16} colour="var(--coach-deep)" />
      <circle cx={190} cy={hipY} data-testid="bridge-hip" fill="var(--coach-deep)" r={10} />
      <Joint cx={218} cy={173} radius={7} />
      <Joint cx={233} cy={181} radius={7} />

      <text className={styles.smallText} textAnchor="middle" x={146} y={67}>
        Chest to hips
      </text>
      <path className={styles.outline} d="M 94 76 C 122 58, 168 58, 196 76" />
      <MotionArrow x1={99} x2={190} y1={84} y2={84} size={8} />
    </CoachSvg>
  );
}
