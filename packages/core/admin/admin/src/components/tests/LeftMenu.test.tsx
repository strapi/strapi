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
});
