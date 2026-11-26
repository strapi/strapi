import { render, screen } from '@tests/utils';

import { MainNav as MainNavApi } from '../../../core/apis/MainNav';
import { MainNav } from '../MainNav';

const renderTinted = (...tints: Array<() => string | null>) => {
  const mainNav = new MainNavApi();
  tints.forEach((useTint) => mainNav.addTint(useTint));

  return render(<MainNav />, { providerOptions: { mainNav } });
};

describe('MainNav', () => {
  it('is not tinted without a tint', () => {
    renderTinted();

    const nav = screen.getByRole('navigation');

    expect(nav).not.toHaveAttribute('data-tinted');
    expect(nav.style.getPropertyValue('--main-nav-tint')).toBe('');
  });

  it('is not tinted when every tint returns null', () => {
    renderTinted(() => null);

    expect(screen.getByRole('navigation')).not.toHaveAttribute('data-tinted');
  });

  it('takes the colour of the first tint that returns one', () => {
    renderTinted(
      () => null,
      () => '#2e7d32',
      () => '#c62828'
    );

    const nav = screen.getByRole('navigation');

    expect(nav).toHaveAttribute('data-tinted');
    expect(nav.style.getPropertyValue('--main-nav-tint')).toBe('#2e7d32');
  });

  it('skips a tint that is not a colour, or that color-mix() cannot use', () => {
    // jsdom has no CSS.supports. Browsers also accept CSS-wide keywords and var() as a colour
    const supports = jest.fn((property: string, value: string) => value !== 'space-green');
    Object.defineProperty(CSS, 'supports', { value: supports, configurable: true });

    try {
      renderTinted(
        // A JS plugin returning `tinted && color`
        () => false as unknown as null,
        () => 'space-green',
        () => 'inherit',
        () => 'var(--space-color)',
        () => '#2e7d32'
      );

      expect(screen.getByRole('navigation').style.getPropertyValue('--main-nav-tint')).toBe(
        '#2e7d32'
      );
      expect(supports).toHaveBeenCalledWith('color', 'space-green');
    } finally {
      // @ts-expect-error - removes the stub
      delete CSS.supports;
    }
  });

  it('darkens the link icon but leaves its badge colour alone', () => {
    const mainNav = new MainNavApi();
    mainNav.addTint(() => '#2e7d32');

    render(
      <MainNav>
        <a href="/content-manager">
          <svg>
            <path data-testid="link-icon" />
          </svg>
          <span>
            <svg>
              <path data-testid="badge-icon" />
            </svg>
          </span>
        </a>
      </MainNav>,
      { providerOptions: { mainNav } }
    );

    expect(getComputedStyle(screen.getByTestId('link-icon')).fill).toBe('#666687');
    // The badge keeps the colour it sets itself, here none
    expect(getComputedStyle(screen.getByTestId('badge-icon')).fill).toBe('');
  });
});
