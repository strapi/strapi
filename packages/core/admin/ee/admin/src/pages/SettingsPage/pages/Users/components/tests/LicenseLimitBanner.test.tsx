import { render } from '@tests/utils';

import { useLicenseLimits } from '../../../../../../hooks/useLicenseLimits';
import { LicenseLimitBanner } from '../LicenseLimitBanner';

jest.mock('../../../../../../hooks/useLicenseLimits');

const mockLicense = (license: Record<string, unknown>) => {
  // @ts-expect-error – mocked
  useLicenseLimits.mockReturnValue({
    isLoading: false,
    isError: false,
    license: {
      licenseStatus: 'active',
      type: 'gold',
      planPriceId: 'Strapi-Enterprise-Platform-Tier-1-USD-Yearly',
      enforcementUserCount: 2,
      permittedSeats: 10,
      adminUsersAcrossInstances: null,
      ...license,
    },
  });
};

const across = (activeUsers: number, contractedUsers: number | null = 10) => ({
  adminUsersAcrossInstances: { activeUsers, contractedUsers, updatedAt: '2026-11-13T10:00:00Z' },
});

describe('<LicenseLimitBanner />', () => {
  test('renders nothing below the limit', () => {
    mockLicense(across(7));

    const { queryByText } = render(<LicenseLimitBanner />);

    expect(queryByText(/your license/)).not.toBeInTheDocument();
  });

  test('tells the admin when every included user is used', () => {
    mockLicense(across(10));

    const { getByText } = render(<LicenseLimitBanner />);

    expect(getByText("You're using all the users included in your license")).toBeInTheDocument();
    expect(getByText(/^10 unique users are active across your environments/)).toBeInTheDocument();
    expect(getByText('Contact sales').closest('a')).toHaveAttribute(
      'href',
      'mailto:sales@strapi.io'
    );
  });

  test('warns the admin when more users are active than the license includes', () => {
    mockLicense(across(14));

    const { getByText } = render(<LicenseLimitBanner />);

    expect(getByText("You're using more users than your license includes")).toBeInTheDocument();
    expect(
      getByText(
        /^14 unique users are active across your environments, but your license includes 10 users/
      )
    ).toBeInTheDocument();
  });

  test('sends a Growth admin to the billing portal to manage their seats', () => {
    mockLicense({ type: 'silver', planPriceId: 'growth-v2-USD-Monthly', ...across(14) });

    const { getByText, queryByText } = render(<LicenseLimitBanner />);

    expect(
      getByText(/or manage your seats to add more users to your license\.$/)
    ).toBeInTheDocument();
    expect(getByText('Manage seats').closest('a')).toHaveAttribute(
      'href',
      'https://billing.strapi.io'
    );
    expect(queryByText('Contact sales')).not.toBeInTheDocument();
  });

  test.each([
    ['an Enterprise plan', 'Strapi-Enterprise-Platform-Tier-1-USD-Yearly'],
    ['no plan id', null],
  ])('tells the admin to contact sales for %s', (_label, planPriceId) => {
    mockLicense({ planPriceId, ...across(14) });

    const { getByText, queryByText } = render(<LicenseLimitBanner />);

    expect(getByText(/or contact sales to add more users to your license\.$/)).toBeInTheDocument();
    expect(getByText('Contact sales').closest('a')).toHaveAttribute(
      'href',
      'mailto:sales@strapi.io'
    );
    expect(queryByText('Manage seats')).not.toBeInTheDocument();
  });

  test("uses this instance's count and wording until the registry has answered", () => {
    mockLicense({ enforcementUserCount: 11 });

    const { getByText, queryByText } = render(<LicenseLimitBanner />);

    expect(getByText("You're using more users than your license includes")).toBeInTheDocument();
    expect(
      getByText(/^11 users are active in this environment, but your license includes 10 users/)
    ).toBeInTheDocument();
    expect(queryByText(/across your environments/)).not.toBeInTheDocument();
  });

  test('tells the admin this instance uses every included user until the registry has answered', () => {
    mockLicense({ enforcementUserCount: 10 });

    const { getByText } = render(<LicenseLimitBanner />);

    expect(getByText("You're using all the users included in your license")).toBeInTheDocument();
    expect(
      getByText(/^10 users are active in this environment, which is the number included/)
    ).toBeInTheDocument();
  });

  test('renders nothing when the license sets no limit', () => {
    mockLicense({ permittedSeats: null, ...across(40, null) });

    const { queryByText } = render(<LicenseLimitBanner />);

    expect(queryByText(/your license/)).not.toBeInTheDocument();
  });
});
