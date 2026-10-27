import { House } from '@strapi/icons';
import { render as renderRTL, screen } from '@tests/utils';

import { LeftMenu } from '../LeftMenu';

jest.mock('../../features/Tracking', () => ({
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

jest.mock('../../hooks/useMediaQuery', () => ({
  useIsDesktop: jest.fn(() => true),
}));

describe('LeftMenu', () => {
  it('does not crash when plugin section links are missing during menu initialization', () => {
    renderRTL(
      <LeftMenu
        generalSectionLinks={[
          {
            to: '/content-manager',
            icon: House,
            intlLabel: {
              id: 'content-manager.plugin.name',
              defaultMessage: 'Content Manager',
            },
            permissions: [],
          },
        ]}
        // @ts-expect-error - reproduces incomplete menu state from plugin registration.
        pluginsSectionLinks={undefined}
        topMobileNavigation={[]}
        burgerMobileNavigation={[]}
      />
    );

    expect(screen.getByRole('link', { name: 'Content Manager' })).toBeInTheDocument();
  });

  const onSelect = jest.fn();
  const renderMenuLink = (menu: { options: Array<{ value: string; label: string }> }) =>
    renderRTL(
      <LeftMenu
        generalSectionLinks={[]}
        pluginsSectionLinks={[
          {
            to: 'plugins/spaces',
            icon: House,
            intlLabel: { id: 'spaces.label', defaultMessage: 'Space' },
            permissions: [],
            menu: { useMenu: () => ({ value: 'fr', onSelect, ...menu }) },
          },
        ]}
        topMobileNavigation={[]}
        burgerMobileNavigation={[]}
      />
    );

  it('renders a menu link with `menu` as a menu of its options and calls back on a choice', async () => {
    const { user } = renderMenuLink({
      options: [
        { value: 'fr', label: 'France' },
        { value: 'de', label: 'Germany' },
      ],
    });

    expect(screen.queryByRole('link', { name: 'Space' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Space: France' }));
    expect(
      screen.getByRole('menuitemradio', { name: 'France', checked: true })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('menuitemradio', { name: 'Germany' }));

    expect(onSelect).toHaveBeenCalledWith('de');
  });

  it('keeps a menu link with no options as a link', () => {
    renderMenuLink({ options: [] });

    expect(screen.getByRole('link', { name: 'Space' })).toBeInTheDocument();
  });
});
