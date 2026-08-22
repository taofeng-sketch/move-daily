import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { CoachVisualProps } from '../runtime/coach';
import { ToeCoach } from './ToeCoach';

const TOE_PHASES = [
  ['big-toe-lifts', 'big-toe', 'Left big-toe lift close-up'],
  [
    'banded-toe-pointing',
    'banded-toe',
    'Left banded big-toe pointing close-up',
  ],
  ['band-arch-lifts', 'arch-lift', 'Left heavy-band arch lift split view'],
  [
    'single-leg-balance',
    'balance',
    'Left single-leg balance with foot inset',
  ],
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

function renderToe(
  phaseId: CoachVisualProps['phaseId'],
  visualId: CoachVisualProps['visualId'],
  progress = 0.5,
  reducedMotion = false,
) {
  return render(
    <ToeCoach
      phaseId={phaseId}
      preview={false}
      progress={progress}
      reducedMotion={reducedMotion}
      visualId={visualId}
    />,
  );
}

describe('ToeCoach', () => {
  it.each(TOE_PHASES)(
    'provides the exact accessible image label and a non-colour left-side marker for %s',
    (phaseId, visualId, label) => {
      renderToe(phaseId, visualId);

      const visual = screen.getByRole('img', { name: label });
      expect(visual).toBeVisible();
      expect(within(visual).getAllByText(/^(LEFT|Left foot|Left leg)$/)).not.toHaveLength(0);
    },
  );

  it('moves only the big toe vertically while the foot stays grounded', () => {
    const { rerender } = renderToe('big-toe-lifts', 'big-toe', 0);
    const footAtStart = screen.getByLabelText('Grounded left foot').getAttribute('d');
    const otherToesAtStart = screen.getByLabelText('Grounded smaller toes').getAttribute('d');
    const toeAtStart = screen.getByRole('group', { name: 'Moving left big toe' });
    const toeStartY = numberAttribute(within(toeAtStart).getByTestId('big-toe-tip'), 'cy');
    const shadowStartRadius = numberAttribute(
      within(toeAtStart).getByTestId('big-toe-contact-shadow'),
      'rx',
    );

    rerender(
      <ToeCoach
        phaseId="big-toe-lifts"
        preview={false}
        progress={0.5}
        reducedMotion={false}
        visualId="big-toe"
      />,
    );

    const toeAtPeak = screen.getByRole('group', { name: 'Moving left big toe' });
    expect(numberAttribute(within(toeAtPeak).getByTestId('big-toe-tip'), 'cy')).toBeLessThan(
      toeStartY,
    );
    expect(screen.getByLabelText('Grounded left foot')).toHaveAttribute('d', footAtStart);
    expect(screen.getByLabelText('Grounded smaller toes')).toHaveAttribute(
      'd',
      otherToesAtStart,
    );
    expect(numberAttribute(within(toeAtPeak).getByTestId('big-toe-contact-shadow'), 'rx')).toBeLessThan(
      shadowStartRadius,
    );
    expect(screen.getByTestId('ground')).toBeVisible();

    const arrow = screen.getByTestId('motion-arrow').querySelector('line');
    expect(arrow).not.toBeNull();
    expect(numberAttribute(arrow!, 'x1')).toBe(numberAttribute(arrow!, 'x2'));
    expect(numberAttribute(arrow!, 'y1')).toBeGreaterThan(numberAttribute(arrow!, 'y2'));
  });

  it('loops the band around the big toe and lets both strands exit the frame without an anchor', () => {
    renderToe('banded-toe-pointing', 'banded-toe');

    expect(screen.getByRole('group', { name: 'Loop around left big toe' })).toBeVisible();
    const exitingBands = screen
      .getAllByTestId('band')
      .filter((band) => numberAttribute(band, 'x2') < 0);
    expect(exitingBands).toHaveLength(2);
    for (const band of exitingBands) {
      expect(numberAttribute(band, 'y1')).toBe(numberAttribute(band, 'y2'));
    }
    expect(document.body.textContent).not.toMatch(/anchor|resistance angle/i);
  });

  it('shows only the prescribed press-down and relax motion for the banded big toe', () => {
    const { rerender } = renderToe('banded-toe-pointing', 'banded-toe', 0);
    const startY = numberAttribute(screen.getByTestId('banded-big-toe-tip'), 'cy');

    rerender(
      <ToeCoach
        phaseId="banded-toe-pointing"
        preview={false}
        progress={0.5}
        reducedMotion={false}
        visualId="banded-toe"
      />,
    );

    expect(numberAttribute(screen.getByTestId('banded-big-toe-tip'), 'cy')).toBeGreaterThan(
      startY,
    );
    expect(screen.getByText('Press')).toBeVisible();
    expect(screen.getByText('Relax')).toBeVisible();
  });

  it.each([
    ['banded-toe-pointing', 'banded-toe'],
    ['band-arch-lifts', 'arch-lift'],
  ] as const)('keeps the unresolved %s setup visibly schematic', (phaseId, visualId) => {
    renderToe(phaseId, visualId);

    expect(screen.getByText('Schematic')).toBeVisible();
    expect(
      screen.getByText('Use the band setup shown by your physiotherapist.'),
    ).toBeVisible();
  });

  it('wraps the arch setup caveat in a mobile-legible region instead of compressing it', () => {
    renderToe('band-arch-lifts', 'arch-lift');

    const caveat = screen.getByText('Use the band setup shown by your physiotherapist.');
    const region = caveat.closest('foreignObject');
    expect(region).not.toBeNull();
    expect(numberAttribute(region!, 'width')).toBeGreaterThanOrEqual(150);
    expect(numberAttribute(region!, 'height')).toBeGreaterThanOrEqual(40);
    expect(caveat).not.toHaveAttribute('textLength');
  });

  it('uses a real split view for arch setup and the larger arch close-up', () => {
    renderToe('band-arch-lifts', 'arch-lift');

    const setup = screen.getByRole('group', { name: 'Setup' });
    const closeUp = screen.getByRole('group', { name: 'Arch close-up' });
    expect(setup).toBeVisible();
    expect(closeUp).toBeVisible();
    expect(numberAttribute(setup, 'data-panel-width')).toBeLessThan(
      numberAttribute(closeUp, 'data-panel-width'),
    );
  });

  it('shows the left foot in a schematic loop, a sideways band, and the right foot pinning it', () => {
    renderToe('band-arch-lifts', 'arch-lift');

    const setup = screen.getByRole('group', { name: 'Setup' });
    const loop = within(setup).getByLabelText('Schematic loop around left foot');
    const leftFoot = within(setup).getByLabelText('Left foot in loop');
    const rightFoot = within(setup).getByLabelText('Right foot pins band');
    const band = within(setup).getByTestId('band');

    const loopLeft = numberAttribute(loop, 'cx') - numberAttribute(loop, 'rx');
    const loopRight = numberAttribute(loop, 'cx') + numberAttribute(loop, 'rx');
    const leftFootX = numberAttribute(leftFoot, 'cx');
    const rightFootX = numberAttribute(rightFoot, 'cx');
    expect(leftFootX).toBeGreaterThan(loopLeft);
    expect(leftFootX).toBeLessThan(loopRight);
    expect(rightFootX).toBeGreaterThan(loopRight);
    expect(numberAttribute(band, 'y1')).toBe(numberAttribute(band, 'y2'));
    expect(numberAttribute(band, 'x1')).toBeLessThan(leftFootX);
    expect(numberAttribute(band, 'x2')).toBeGreaterThan(rightFootX);
  });

  it('raises the inside-arch contour while the grounded foot outline remains unchanged', () => {
    const { rerender } = renderToe('band-arch-lifts', 'arch-lift', 0);
    const outlineAtStart = screen.getByLabelText('Grounded left foot close-up').getAttribute('d');
    const archAtStart = screen.getByLabelText('Inside arch contour').getAttribute('d');

    rerender(
      <ToeCoach
        phaseId="band-arch-lifts"
        preview={false}
        progress={0.5}
        reducedMotion={false}
        visualId="arch-lift"
      />,
    );

    expect(screen.getByLabelText('Grounded left foot close-up')).toHaveAttribute(
      'd',
      outlineAtStart,
    );
    expect(screen.getByLabelText('Inside arch contour').getAttribute('d')).not.toBe(
      archAtStart,
    );
    expect(screen.getByLabelText('Inside arch contour')).toHaveAttribute(
      'd',
      'M 54 220 C 96 158, 154 158, 202 220',
    );
  });

  it('combines a calm full-body left-leg hold with a magnified labelled foot inset', () => {
    renderToe('single-leg-balance', 'balance', 0.23);

    const body = screen.getByRole('group', { name: 'Full-body left-leg balance' });
    const inset = screen.getByRole('group', { name: 'Magnified left foot' });
    expect(body).toBeVisible();
    expect(within(body).getByRole('group', { name: 'Left support leg' })).toBeVisible();
    expect(
      within(body).getByRole('group', { name: 'Free leg, position not specified' }),
    ).toBeVisible();
    expect(screen.getByText('Free leg position not specified in plan.')).toBeVisible();
    expect(inset).toBeVisible();
    expect(within(inset).getByText('Left foot')).toBeVisible();
    expect(within(inset).getByText('Toe straight')).toBeVisible();
    expect(within(inset).getByText('Arch lifted')).toBeVisible();
    expect(document.body.textContent).not.toMatch(/countdown/i);
  });

  it('draws two distinct legs with left-foot ground contact and free-leg clearance', () => {
    renderToe('single-leg-balance', 'balance');

    const body = screen.getByRole('group', { name: 'Full-body left-leg balance' });
    const support = within(body).getByRole('group', { name: 'Left support leg' });
    const free = within(body).getByRole('group', {
      name: 'Free leg, position not specified',
    });
    const groundY = numberAttribute(within(body).getByTestId('ground'), 'y1');
    const supportFoot = within(support).getByLabelText('Left support foot contact');
    const supportLimbs = within(support).getAllByTestId('limb');
    const freeLimbs = within(free).getAllByTestId('limb');
    const supportLowerLeg = supportLimbs.at(-1)!;
    const freeLowerLeg = freeLimbs.at(-1)!;

    expect(numberAttribute(supportFoot, 'y1')).toBe(groundY);
    expect(numberAttribute(supportFoot, 'y2')).toBe(groundY);
    expect(numberAttribute(freeLowerLeg, 'y2')).toBeLessThan(groundY);
    expect([
      numberAttribute(freeLowerLeg, 'x2'),
      numberAttribute(freeLowerLeg, 'y2'),
    ]).not.toEqual([
      numberAttribute(supportLowerLeg, 'x2'),
      numberAttribute(supportLowerLeg, 'y2'),
    ]);
    expect(free).toHaveAttribute('opacity', '0.55');
    expect(free).toHaveAttribute('stroke-dasharray', '6 6');
  });

  it('keeps the balance hold completely static across progress values', () => {
    const { rerender } = renderToe('single-leg-balance', 'balance', 0);
    const startMarkup = screen.getByRole('img', {
      name: 'Left single-leg balance with foot inset',
    }).innerHTML;

    rerender(
      <ToeCoach
        phaseId="single-leg-balance"
        preview={false}
        progress={0.94}
        reducedMotion={false}
        visualId="balance"
      />,
    );

    expect(
      screen.getByRole('img', { name: 'Left single-leg balance with foot inset' }).innerHTML,
    ).toBe(startMarkup);
  });

  it('uses the identical two-leg balance geometry in reduced motion', () => {
    renderToe('single-leg-balance', 'balance', 0.61);
    const activeBody = screen.getByRole('group', {
      name: 'Full-body left-leg balance',
    }).innerHTML;
    cleanup();

    renderToe('single-leg-balance', 'balance', 0.91, true);
    const panel = screen.getByRole('img', {
      name: 'Left single-leg balance with foot inset',
    });
    const reducedBody = panel.querySelector(
      '[aria-label="Full-body left-leg balance"]',
    );
    expect(reducedBody).not.toBeNull();
    expect(reducedBody!.innerHTML).toBe(activeBody);
  });

  it.each(TOE_PHASES.slice(0, 3))(
    'renders static Start and Move cards for reduced-motion %s',
    (phaseId, visualId, label) => {
      renderToe(phaseId, visualId, 0.91, true);

      const panel = screen.getByRole('img', { name: label });
      expect(within(panel).getByText('Start')).toBeVisible();
      expect(within(panel).getByText('Move')).toBeVisible();
      expect(within(panel).getByTestId('reduced-motion-arrow')).toBeVisible();
      expect(panel.querySelectorAll('[data-pose-progress="0"]')).toHaveLength(1);
      expect(panel.querySelectorAll('[data-pose-progress="0.5"]')).toHaveLength(1);
    },
  );

  it('renders one static Hold pose without a reduced-motion loop for balance', () => {
    renderToe('single-leg-balance', 'balance', 0.91, true);

    const panel = screen.getByRole('img', {
      name: 'Left single-leg balance with foot inset',
    });
    expect(within(panel).getByText('Hold')).toBeVisible();
    expect(within(panel).queryByText('Start')).not.toBeInTheDocument();
    expect(within(panel).queryByText('Move')).not.toBeInTheDocument();
    expect(within(panel).queryByTestId('reduced-motion-arrow')).not.toBeInTheDocument();
    expect(panel.querySelectorAll('[data-pose-progress="0"]')).toHaveLength(1);
  });

  it.each(TOE_PHASES)(
    'keeps %s public-safe and free of sensing, correction, or clinical claims',
    (phaseId, visualId) => {
      renderToe(phaseId, visualId);

      expect(document.body.textContent).not.toMatch(
        /camera|detect(?:ed|ion)?|correct(?:ed|ion)?|form score|diagnos|treatment|pain threshold|prescribed tempo/i,
      );
    },
  );

  it('rejects a mismatched Toe phase and visual pair', () => {
    expect(() => renderToe('big-toe-lifts', 'arch-lift')).toThrow(
      'Mismatched Toe visual: big-toe-lifts requires big-toe, received arch-lift',
    );
  });

  it('rejects a phase outside the Left Toe routine', () => {
    expect(() => renderToe('bridge-articulations', 'bridge')).toThrow(
      'Unsupported Toe phase: bridge-articulations',
    );
  });
});
