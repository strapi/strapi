import { render, screen } from '@tests/utils';

import { useLicenseLimits } from '../../../../../../hooks/useLicenseLimits';
import { LicenseUsageBanner } from '../LicenseUsageBanner';

jest.mock('../../../../../../hooks/useLicenseLimits');

const PROJECT_USAGE = {
  activeUsers: 10,
  contractedUsers: 10,
  updatedAt: '2026-11-13T10:00:00.000Z',
};

const mockLicense = (license: Record<string, unknown> | undefined) => {
  // @ts-expect-error – mocked
  useLicenseLimits.mockReturnValue({ license, isError: false, isLoading: false });
};

const MESSAGE =
  'Your license covers 10 active admin users across all environments. 12 are currently active.';

describe('<LicenseUsageBanner />', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    ['no license', undefined],
    ['no usage', { type: 'gold', projectUsage: null }],
    ['an older server without the usage', { type: 'gold' }],
    ['no contracted number', { projectUsage: { ...PROJECT_USAGE, contractedUsers: null } }],
    ['a usage below the contracted number', { projectUsage: { ...PROJECT_USAGE, activeUsers: 9 } }],
  ])('renders nothing with %s', (_label, license) => {
    mockLicense(license);

    render(<LicenseUsageBanner />);

    expect(screen.queryByText(/Your license covers/)).not.toBeInTheDocument();
  });

  it('informs when the usage reaches the contracted number', () => {
    mockLicense({ type: 'gold', projectUsage: PROJECT_USAGE });

    render(<LicenseUsageBanner />);

    expect(
      screen.getByText(
        'Your license covers 10 active admin users across all environments. 10 are currently active.'
      )
    ).toBeInTheDocument();
  });

  it('informs when the usage is over the contracted number, with a link to sales', () => {
    mockLicense({ type: 'gold', projectUsage: { ...PROJECT_USAGE, activeUsers: 12 } });

    render(<LicenseUsageBanner />);

    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Contact sales/ })).toHaveAttribute(
      'href',
      'mailto:sales@strapi.io'
    );
  });

  it('links to the subscription for a non-Enterprise license', () => {
    mockLicense({ type: 'silver', projectUsage: { ...PROJECT_USAGE, activeUsers: 12 } });

    render(<LicenseUsageBanner />);

    expect(screen.getByRole('link', { name: /Manage subscription/ })).toHaveAttribute(
      'href',
      'https://billing.strapi.io'
    );
  });

  it('can be dismissed', async () => {
    mockLicense({ type: 'gold', projectUsage: { ...PROJECT_USAGE, activeUsers: 12 } });

    const { user } = render(<LicenseUsageBanner />);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
  });
});
