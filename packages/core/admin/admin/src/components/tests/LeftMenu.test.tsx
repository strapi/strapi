import { Menu } from '@strapi/design-system';
import { Earth, House } from '@strapi/icons';
import { render as renderRTL, screen } from '@tests/utils';

import { MainNav } from '../../core/apis/MainNav';
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

  it('renders plugin menus at the bottom, right before the profile menu', async () => {
    const mainNav = new MainNav();
    mainNav.addMenu({
      id: 'spaces',
      useCurrent: () => ({ label: 'Control center', icon: <Earth /> }),
      intlLabel: { id: 'spaces.switcher.label', defaultMessage: 'Space' },
      Content: () => <Menu.Item>France</Menu.Item>,
    });

    renderRTL(
      <LeftMenu
        generalSectionLinks={[]}
        pluginsSectionLinks={[]}
        topMobileNavigation={[]}
        burgerMobileNavigation={[]}
      />,
      { providerOptions: { mainNav } }
    );

    // The bottom of the desktop navigation is hidden below the large breakpoint, as in jsdom
    const spaces = await screen.findByRole('button', {
      name: 'Space: Control center',
      hidden: true,
    });
    const buttons = screen.getAllByRole('button', { hidden: true });

    const profile = buttons[buttons.indexOf(spaces) + 1];

    // Next comes the profile menu trigger, with no name here as no user is logged in
    expect(profile).toHaveAttribute('aria-haspopup', 'menu');
    expect(profile).toHaveTextContent('');
  });
});
