import { render, screen } from '@tests/utils';

import { TopBanners } from '../TopBanners';

jest.mock('@strapi/admin/strapi-admin/ee', () => ({
  useLicenseLimits: jest.fn(() => ({
    license: {
      isTrial: true,
    },
  })),
}));

jest.mock('../../../src/services/admin', () => ({
  useGetLicenseTrialTimeLeftQuery: jest.fn(() => ({
    data: {
      trialEndsAt: '2099-05-15T00:00:00.000Z',
    },
  })),
  useInitQuery: jest.fn(() => ({
    data: {
      uuid: 'test-uuid',
    },
  })),
}));

const UPSELL_BANNER_TEXT = 'Access to Growth plan features:';
const MEDIA_LIBRARY_BANNER_TEXT = 'Introducing the new Media Library';

describe('TopBanners', () => {
  beforeEach(() => {
    localStorage.clear();
    window.strapi.featureFlags.isEnabled = jest.fn(() => false);
  });

  it('should only show the upsell banner outside of the Media Library', () => {
    render(<TopBanners />, { initialEntries: ['/content-manager'] });

    expect(screen.getByText(UPSELL_BANNER_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(MEDIA_LIBRARY_BANNER_TEXT)).not.toBeInTheDocument();
  });

  it('should only show the Media Library banner on the Media Library, not stacked with the upsell one', () => {
    render(<TopBanners />, { initialEntries: ['/plugins/upload'] });

    expect(screen.getByText(MEDIA_LIBRARY_BANNER_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(UPSELL_BANNER_TEXT)).not.toBeInTheDocument();
  });

  it('should bring the upsell banner back once the Media Library banner is dismissed', async () => {
    const { user } = render(<TopBanners />, { initialEntries: ['/plugins/upload'] });

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText(MEDIA_LIBRARY_BANNER_TEXT)).not.toBeInTheDocument();
    expect(screen.getByText(UPSELL_BANNER_TEXT)).toBeInTheDocument();
  });

  it('should show the upsell banner again after navigating away from an already-dismissed Media Library banner', () => {
    // Dismissed on a previous visit to the Media Library.
    localStorage.setItem('STRAPI_MEDIA_LIBRARY_BANNER_DISMISSED_FOR_false:test-uuid', 'true');

    render(<TopBanners />, { initialEntries: ['/plugins/upload'] });

    expect(screen.queryByText(MEDIA_LIBRARY_BANNER_TEXT)).not.toBeInTheDocument();
    expect(screen.getByText(UPSELL_BANNER_TEXT)).toBeInTheDocument();
  });
});
