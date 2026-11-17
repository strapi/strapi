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

  test("uses this instance's count until the registry has answered", () => {
    mockLicense({ enforcementUserCount: 11 });

    const { getByText } = render(<LicenseLimitBanner />);

    expect(getByText("You're using more users than your license includes")).toBeInTheDocument();
  });

  test('renders nothing when the license sets no limit', () => {
    mockLicense({ permittedSeats: null, ...across(40, null) });

    const { queryByText } = render(<LicenseLimitBanner />);

    expect(queryByText(/your license/)).not.toBeInTheDocument();
  });
});
