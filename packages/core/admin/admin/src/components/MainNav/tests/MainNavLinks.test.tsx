import { lightTheme } from '@strapi/design-system';
import { House, PaperPlane } from '@strapi/icons';
import { within } from '@testing-library/react';
import { render, screen } from '@tests/utils';

import { MainNavBurgerMenuLinks, MainNavIcons } from '../MainNavLinks';

import type { MenuItem } from '../../../hooks/useMenu';

const originalIsTrial = window.strapi.isTrial;
const originalIsEnabled = window.strapi.features.isEnabled;

const setLicense = ({ isTrial, features }: { isTrial: boolean; features: string[] }) => {
  window.strapi.isTrial = isTrial;
  window.strapi.features.isEnabled = (name) => features.includes(name ?? '');
};

const links: MenuItem[] = [
  {
    to: 'plugins/content-releases',
    icon: PaperPlane,
    intlLabel: { id: 'content-releases.plugin.name', defaultMessage: 'Releases' },
    permissions: [],
    licenseOnly: true,
    licenseFeature: 'cms-content-releases',
  },
  {
    // A plugin that flags its link without naming the feature it needs
    to: 'plugins/paid-plugin',
    icon: House,
    intlLabel: { id: 'paid-plugin.name', defaultMessage: 'Paid plugin' },
    permissions: [],
    licenseOnly: true,
  },
];

const navs = [
  [
    'main nav icons',
    () => <MainNavIcons listLinks={links} mobileLinks={links} handleClickOnLink={jest.fn()} />,
  ],
  ['burger menu', () => <MainNavBurgerMenuLinks listLinks={links} handleClickOnLink={jest.fn()} />],
] as const;

const lightningFillFor = (label: string) =>
  within(screen.getByRole('link', { name: label }))
    .queryByLabelText('locked')
    // eslint-disable-next-line testing-library/no-node-access
    ?.querySelector('svg')
    ?.getAttribute('fill');

describe.each(navs)('%s', (_, Nav) => {
  afterEach(() => {
    window.strapi.isTrial = originalIsTrial;
    window.strapi.features.isEnabled = originalIsEnabled;
  });

  it('marks a feature the trial grants in purple', () => {
    setLicense({ isTrial: true, features: ['cms-content-releases'] });

    render(<Nav />);

    expect(lightningFillFor('Releases')).toBe(lightTheme.colors.primary600);
  });

  it('shows no icon on a feature the paid license grants', () => {
    setLicense({ isTrial: false, features: ['cms-content-releases'] });

    render(<Nav />);

    expect(lightningFillFor('Releases')).toBeUndefined();
  });

  it('marks a feature the license does not grant in grey', () => {
    setLicense({ isTrial: false, features: [] });

    render(<Nav />);

    expect(lightningFillFor('Releases')).toBe(lightTheme.colors.neutral300);
  });

  it('marks a link that names no feature in grey, even when everything is licensed', () => {
    setLicense({ isTrial: true, features: ['cms-content-releases'] });
    window.strapi.features.isEnabled = () => true;

    render(<Nav />);

    expect(lightningFillFor('Paid plugin')).toBe(lightTheme.colors.neutral300);
  });
});
