import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { CoachVisualProps } from '../runtime/coach';
import { BackCoach } from './BackCoach';

const BACK_PHASES = [
  ['standing-knee-bends', 'standing-reach', 'Standing reach with knee bends'],
  ['standing-full-down-up', 'standing-reach', 'Standing reach all the way down and back up'],
  ['bridge-articulations', 'bridge', 'Bridge articulation from hips to spine'],
  ['cobra-forearms', 'cobra-forearms', 'Cobra supported on forearms'],
  ['cobra-hands', 'cobra-hands', 'Larger cobra extension supported on hands'],
  ['supermans', 'superman', 'Opposite arm and leg Superman'],
  ['foam-roller-extensions', 'foam-roller', 'Upper-back extension over a foam roller'],
] as const satisfies readonly (readonly [
  CoachVisualProps['phaseId'],
  CoachVisualProps['visualId'],
  string,
])[];

afterEach(cleanup);

function numberAttribute(element: Element, name: string): number {
  const value = element.getAttribute(name);
  expect(value).not.toBeNull();
  return Number(value);
}

function spineYCoordinates(): number[] {
  const overlay = screen.getByRole('group', {
    name: 'Four spine segments lowering from chest to hips',
  });
  return within(overlay)
    .getAllByTestId('spine-segment')
    .map((segment) => numberAttribute(segment, 'y'));
}

function bridgeHipY(): number {
  return numberAttribute(screen.getByTestId('bridge-hip'), 'cy');
}

function pairCoordinates(label: 'Right arm + left leg' | 'Left arm + right leg') {
  const limbs = within(screen.getByRole('group', { name: label })).getAllByTestId('limb');
  return {
    armY: numberAttribute(limbs[0]!, 'y2'),
    legY: numberAttribute(limbs[2]!, 'y2'),
  };
}

describe('BackCoach', () => {
  it.each(BACK_PHASES)(
    'labels %s without claiming form correction',
    (phaseId, visualId, label) => {
      render(
        <BackCoach
          phaseId={phaseId}
          preview={false}
          progress={0.5}
          reducedMotion={false}
          visualId={visualId}
        />,
      );

      expect(screen.getByRole('img', { name: label })).toBeVisible();
      expect(document.body.textContent).not.toMatch(
        /correct|detected|perfect|brace your core/i,
      );
    },
  );

  it('lifts every bridge segment from a coherent floor start to a raised midpoint', () => {
    const { rerender } = render(
      <BackCoach
        phaseId="bridge-articulations"
        preview={false}
        progress={0}
        reducedMotion={false}
        visualId="bridge"
      />,
    );

    expect(spineYCoordinates()).toEqual([190, 190, 190, 190]);
    expect(bridgeHipY()).toBe(202);

    rerender(
      <BackCoach
        phaseId="bridge-articulations"
        preview={false}
        progress={0.5}
        reducedMotion={false}
        visualId="bridge"
      />,
    );

    expect(spineYCoordinates()).toEqual([160, 154, 148, 142]);
    expect(bridgeHipY()).toBe(158);
  });

  it('lowers bridge segments in a chest-to-hip stagger', () => {
    render(
      <BackCoach
        phaseId="bridge-articulations"
        preview={false}
        progress={0.66}
        reducedMotion={false}
        visualId="bridge"
      />,
    );

    const [chest, upperMiddle, lowerMiddle, hipward] = spineYCoordinates();
    expect(chest!).toBeCloseTo(179.2);
    expect(upperMiddle!).toBeCloseTo(165.52);
    expect(lowerMiddle).toBe(148);
    expect(hipward).toBe(142);
    expect(chest!).toBeGreaterThan(upperMiddle!);
    expect(upperMiddle!).toBeGreaterThan(lowerMiddle!);
    expect(bridgeHipY()).toBe(158);
  });

  it('keeps bridge hips raised until the final lowering interval', () => {
    const { rerender } = render(
      <BackCoach
        phaseId="bridge-articulations"
        preview={false}
        progress={0.9}
        reducedMotion={false}
        visualId="bridge"
      />,
    );

    const loweringCoordinates = spineYCoordinates();
    [190, 190, 188.32, 172.72].forEach((expected, index) => {
      expect(loweringCoordinates[index]).toBeCloseTo(expected);
    });
    expect(bridgeHipY()).toBe(158);

    rerender(
      <BackCoach
        phaseId="bridge-articulations"
        preview={false}
        progress={0.99}
        reducedMotion={false}
        visualId="bridge"
      />,
    );

    expect(spineYCoordinates()).toEqual([190, 190, 190, 190]);
    expect(bridgeHipY()).toBeCloseTo(197.6);

    rerender(
      <BackCoach
        phaseId="bridge-articulations"
        preview={false}
        progress={1}
        reducedMotion={false}
        visualId="bridge"
      />,
    );

    expect(spineYCoordinates()).toEqual([190, 190, 190, 190]);
    expect(bridgeHipY()).toBe(202);
  });

  it.each([
    ['cobra-forearms', 'cobra-forearms', 'Forearms'],
    ['cobra-hands', 'cobra-hands', 'Hands'],
  ] as const)('labels the visible %s support contact', (phaseId, visualId, contact) => {
    render(
      <BackCoach
        phaseId={phaseId}
        preview={false}
        progress={0.5}
        reducedMotion={false}
        visualId={visualId}
      />,
    );

    expect(screen.getByText(contact)).toBeVisible();
    expect(screen.getByRole('group', { name: `${contact} support contact` })).toBeVisible();
  });

  it('draws forearms along the mat and hands as vertical support contacts', () => {
    const { rerender } = render(
      <BackCoach
        phaseId="cobra-forearms"
        preview={false}
        progress={0.5}
        reducedMotion={false}
        visualId="cobra-forearms"
      />,
    );

    const forearmLimbs = within(
      screen.getByRole('group', { name: 'Forearms support contact' }),
    ).getAllByTestId('limb');
    expect(
      forearmLimbs.slice(-2).map((limb) => [
        numberAttribute(limb, 'x1'),
        numberAttribute(limb, 'x2'),
        numberAttribute(limb, 'y1'),
        numberAttribute(limb, 'y2'),
      ]),
    ).toEqual([
      [183, 217, 207, 207],
      [207, 239, 207, 207],
    ]);

    rerender(
      <BackCoach
        phaseId="cobra-hands"
        preview={false}
        progress={0.5}
        reducedMotion={false}
        visualId="cobra-hands"
      />,
    );

    const handLimbs = within(
      screen.getByRole('group', { name: 'Hands support contact' }),
    ).getAllByTestId('limb');
    expect(
      [handLimbs[1], handLimbs[3]].map((limb) => [
        numberAttribute(limb!, 'x1'),
        numberAttribute(limb!, 'x2'),
        numberAttribute(limb!, 'y1'),
        numberAttribute(limb!, 'y2'),
      ]),
    ).toEqual([
      [151, 151, 155, 207],
      [174, 174, 158, 207],
    ]);
  });

  it('names both opposite Superman pairs without relying on colour', () => {
    render(
      <BackCoach
        phaseId="supermans"
        preview={false}
        progress={0.25}
        reducedMotion={false}
        visualId="superman"
      />,
    );

    expect(screen.getByText('Right arm + left leg')).toBeVisible();
    expect(screen.getByText('Left arm + right leg')).toBeVisible();
  });

  it('elevates only one opposite Superman pair in each cycle half', () => {
    const { rerender } = render(
      <BackCoach
        phaseId="supermans"
        preview={false}
        progress={0.25}
        reducedMotion={false}
        visualId="superman"
      />,
    );

    expect(screen.getByRole('group', { name: 'Right arm + left leg' })).toHaveAttribute(
      'data-active',
      'true',
    );
    expect(screen.getByRole('group', { name: 'Left arm + right leg' })).toHaveAttribute(
      'data-active',
      'false',
    );

    rerender(
      <BackCoach
        phaseId="supermans"
        preview={false}
        progress={0.75}
        reducedMotion={false}
        visualId="superman"
      />,
    );

    expect(screen.getByRole('group', { name: 'Right arm + left leg' })).toHaveAttribute(
      'data-active',
      'false',
    );
    expect(screen.getByRole('group', { name: 'Left arm + right leg' })).toHaveAttribute(
      'data-active',
      'true',
    );
  });

  it.each([
    [0, { armY: 135, legY: 178 }, { armY: 137, legY: 179 }],
    [0.25, { armY: 98, legY: 143 }, { armY: 137, legY: 179 }],
    [0.5, { armY: 135, legY: 178 }, { armY: 137, legY: 179 }],
    [0.75, { armY: 135, legY: 178 }, { armY: 100, legY: 144 }],
    [1, { armY: 135, legY: 178 }, { armY: 137, legY: 179 }],
  ] as const)(
    'completes opposite-pair lift and lower geometry at progress %s',
    (progress, rightLeft, leftRight) => {
      render(
        <BackCoach
          phaseId="supermans"
          preview={false}
          progress={progress}
          reducedMotion={false}
          visualId="superman"
        />,
      );

      expect(pairCoordinates('Right arm + left leg')).toEqual(rightLeft);
      expect(pairCoordinates('Left arm + right leg')).toEqual(leftRight);
    },
  );

  it('shows roller orientation and a labelled hips-down reference', () => {
    render(
      <BackCoach
        phaseId="foam-roller-extensions"
        preview={false}
        progress={0.5}
        reducedMotion={false}
        visualId="foam-roller"
      />,
    );

    expect(
      screen.getByRole('group', { name: 'Setup inset: roller across upper back' }),
    ).toBeVisible();
    expect(screen.getByText('Roller across upper back')).toBeVisible();
    expect(screen.getByText('Hips-down reference')).toBeVisible();
  });

  it('places the setup roller horizontally across the upper-back torso', () => {
    render(
      <BackCoach
        phaseId="foam-roller-extensions"
        preview={false}
        progress={0.5}
        reducedMotion={false}
        visualId="foam-roller"
      />,
    );

    const inset = screen.getByRole('group', {
      name: 'Setup inset: roller across upper back',
    });
    const torso = inset.querySelector('ellipse');
    const roller = within(inset).getByTestId('roller');
    const torsoLeft = numberAttribute(torso as Element, 'cx') - numberAttribute(torso as Element, 'rx');
    const torsoRight = numberAttribute(torso as Element, 'cx') + numberAttribute(torso as Element, 'rx');
    const rollerLeft = numberAttribute(roller, 'x');
    const rollerRight = rollerLeft + numberAttribute(roller, 'width');
    const rollerCentreY =
      numberAttribute(roller, 'y') + numberAttribute(roller, 'height') / 2;

    expect(rollerLeft).toBeLessThan(torsoLeft);
    expect(rollerRight).toBeGreaterThan(torsoRight);
    expect(numberAttribute(roller, 'width')).toBeGreaterThan(
      numberAttribute(roller, 'height') * 3,
    );
    expect(rollerCentreY).toBeCloseTo(numberAttribute(torso as Element, 'cy'), -1);
  });

  it('marks the schematic full-down phase as an illustration', () => {
    render(
      <BackCoach
        phaseId="standing-full-down-up"
        preview={false}
        progress={0.5}
        reducedMotion={false}
        visualId="standing-reach"
      />,
    );

    expect(screen.getByText('Illustration')).toBeVisible();
  });

  it.each(BACK_PHASES)(
    'renders static Start and Move cards for reduced-motion %s',
    (phaseId, visualId, label) => {
      render(
        <BackCoach
          phaseId={phaseId}
          preview={false}
          progress={0.91}
          reducedMotion
          visualId={visualId}
        />,
      );

      const panel = screen.getByRole('img', { name: label });
      expect(within(panel).getByText('Start')).toBeVisible();
      expect(within(panel).getByText('Move')).toBeVisible();
      expect(within(panel).getByTestId('reduced-motion-arrow')).toBeVisible();
      expect(panel.querySelectorAll('[data-pose-progress="0"]')).toHaveLength(1);
      const moveProgress = phaseId === 'supermans' ? '0.25' : '0.5';
      expect(panel.querySelectorAll(`[data-pose-progress="${moveProgress}"]`)).toHaveLength(1);
    },
  );

  it('makes the reduced-motion Superman Move card visibly different from Start', () => {
    render(
      <BackCoach
        phaseId="supermans"
        preview={false}
        progress={0.91}
        reducedMotion
        visualId="superman"
      />,
    );

    const startPose = document.querySelector('[data-pose-progress="0"]');
    const movePose = document.querySelector('[data-pose-progress="0.25"]');
    const startPair = startPose?.querySelector('[aria-label="Right arm + left leg"]');
    const movePair = movePose?.querySelector('[aria-label="Right arm + left leg"]');
    const startArmEnd = Number(startPair?.querySelector('[data-testid="limb"]')?.getAttribute('y2'));
    const moveArmEnd = Number(movePair?.querySelector('[data-testid="limb"]')?.getAttribute('y2'));

    expect(moveArmEnd).toBeLessThan(startArmEnd);
  });

  it('rejects a mismatched Back phase and visual pair', () => {
    expect(() =>
      render(
        <BackCoach
          phaseId="bridge-articulations"
          preview={false}
          progress={0.5}
          reducedMotion={false}
          visualId="superman"
        />,
      ),
    ).toThrow('Mismatched Back visual: bridge-articulations requires bridge, received superman');
  });

  it('rejects a phase outside the Back routine', () => {
    expect(() =>
      render(
        <BackCoach
          phaseId="big-toe-lifts"
          preview={false}
          progress={0.5}
          reducedMotion={false}
          visualId="big-toe"
        />,
      ),
    ).toThrow('Unsupported Back phase: big-toe-lifts');
  });
});
