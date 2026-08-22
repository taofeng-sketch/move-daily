interface LimbProps {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly width?: number;
  readonly colour?: string;
}

export function Limb({
  x1,
  y1,
  x2,
  y2,
  width = 18,
  colour = 'var(--coach)',
}: LimbProps) {
  return (
    <line
      data-testid="limb"
      stroke={colour}
      strokeLinecap="round"
      strokeWidth={width}
      vectorEffect="non-scaling-stroke"
      x1={x1}
      x2={x2}
      y1={y1}
      y2={y2}
    />
  );
}

interface JointProps {
  readonly cx: number;
  readonly cy: number;
  readonly radius?: number;
  readonly colour?: string;
}

export function Joint({ cx, cy, radius = 8, colour = 'var(--coach-deep)' }: JointProps) {
  return <circle cx={cx} cy={cy} data-testid="joint" fill={colour} r={radius} />;
}

interface GroundProps {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly colour?: string;
}

export function Ground({ x1, y1, x2, y2, colour = 'var(--ink)' }: GroundProps) {
  return (
    <line
      data-testid="ground"
      stroke={colour}
      strokeLinecap="round"
      strokeWidth={2}
      vectorEffect="non-scaling-stroke"
      x1={x1}
      x2={x2}
      y1={y1}
      y2={y2}
    />
  );
}

interface MatProps {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly radius?: number;
  readonly colour?: string;
}

export function Mat({
  x,
  y,
  width,
  height,
  radius = 12,
  colour = 'var(--paper-raised)',
}: MatProps) {
  return (
    <rect
      data-testid="mat"
      fill={colour}
      height={height}
      rx={radius}
      stroke="var(--ink)"
      strokeWidth={2}
      vectorEffect="non-scaling-stroke"
      width={width}
      x={x}
      y={y}
    />
  );
}

interface RollerProps {
  readonly cx: number;
  readonly cy: number;
  readonly length?: number;
  readonly radius?: number;
  readonly colour?: string;
}

export function Roller({
  cx,
  cy,
  length = 64,
  radius = 13,
  colour = 'var(--coach-deep)',
}: RollerProps) {
  return (
    <rect
      data-testid="roller"
      fill={colour}
      height={radius * 2}
      rx={radius}
      stroke="var(--ink)"
      strokeWidth={2}
      vectorEffect="non-scaling-stroke"
      width={length}
      x={cx - length / 2}
      y={cy - radius}
    />
  );
}

interface BandProps {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly width?: number;
  readonly colour?: string;
}

export function Band({
  x1,
  y1,
  x2,
  y2,
  width = 6,
  colour = 'var(--action)',
}: BandProps) {
  return (
    <line
      data-testid="band"
      fill="none"
      stroke={colour}
      strokeLinecap="round"
      strokeWidth={width}
      vectorEffect="non-scaling-stroke"
      x1={x1}
      x2={x2}
      y1={y1}
      y2={y2}
    />
  );
}

interface MotionArrowProps {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly size?: number;
  readonly colour?: string;
}

export function MotionArrow({
  x1,
  y1,
  x2,
  y2,
  size = 10,
  colour = 'var(--action)',
}: MotionArrowProps) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const leftX = x2 - size * Math.cos(angle - Math.PI / 6);
  const leftY = y2 - size * Math.sin(angle - Math.PI / 6);
  const rightX = x2 - size * Math.cos(angle + Math.PI / 6);
  const rightY = y2 - size * Math.sin(angle + Math.PI / 6);

  return (
    <g aria-hidden="true" data-testid="motion-arrow">
      <line
        stroke={colour}
        strokeLinecap="round"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
        x1={x1}
        x2={x2}
        y1={y1}
        y2={y2}
      />
      <polyline
        fill="none"
        points={`${leftX},${leftY} ${x2},${y2} ${rightX},${rightY}`}
        stroke={colour}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

interface PoseLabelProps {
  readonly x: number;
  readonly y: number;
  readonly label: string;
  readonly width?: number;
}

export function PoseLabel({ x, y, label, width = 104 }: PoseLabelProps) {
  return (
    <g aria-label={label} data-pose-label="true" data-testid="pose-label">
      <rect
        fill="var(--paper)"
        height={24}
        rx={12}
        stroke="var(--ink)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        width={width}
        x={x}
        y={y}
      />
      <text
        fill="var(--ink)"
        fontSize={12}
        fontWeight={700}
        textAnchor="middle"
        x={x + width / 2}
        y={y + 16}
      >
        {label}
      </text>
    </g>
  );
}
