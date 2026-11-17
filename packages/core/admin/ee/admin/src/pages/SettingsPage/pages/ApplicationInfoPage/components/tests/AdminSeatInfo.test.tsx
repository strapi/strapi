import { render } from '@tests/utils';

import { useLicenseLimits } from '../../../../../../hooks/useLicenseLimits';
import { AdminSeatInfoEE } from '../AdminSeatInfo';

jest.mock('../../../../../../hooks/useLicenseLimits');

jest.mock('../../../../../../../../../admin/src/hooks/useRBAC');

const LICENSE_MOCK = {
  isLoading: false,
  isError: false,
  license: {
    enforcementUserCount: 2,
    licenseLimitStatus: '',
    permittedSeats: 10,
    isHostedOnStrapiCloud: false,
    adminUsersAcrossInstances: null,
  },
};

const ADMIN_USERS = {
  activeUsers: 7,
  contractedUsers: 10,
  updatedAt: '2026-11-13T10:00:00.000Z',
};

const mockLicense = (license: Record<string, unknown>) => {
  // @ts-expect-error – mocked
  useLicenseLimits.mockReturnValue({
    ...LICENSE_MOCK,
    license: { ...LICENSE_MOCK.license, ...license },
  });
};

describe('<AdminSeatInfo />', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows the count across all instances against the license limit', () => {
    mockLicense({ adminUsersAcrossInstances: ADMIN_USERS });

    const { getByText, queryByText } = render(<AdminSeatInfoEE />);

    expect(getByText('Admin users')).toBeInTheDocument();
    expect(getByText('7/10')).toBeInTheDocument();
    expect(getByText('Across all environments · 2 in this environment')).toBeInTheDocument();
    expect(queryByText(/over$/)).not.toBeInTheDocument();
  });

  test('shows how many users are over the limit', () => {
    mockLicense({
      enforcementUserCount: 6,
      adminUsersAcrossInstances: { ...ADMIN_USERS, activeUsers: 14 },
    });

    const { getByText } = render(<AdminSeatInfoEE />);

    expect(getByText('14/10')).toBeInTheDocument();
    expect(getByText('4 over')).toBeInTheDocument();
    expect(getByText('Across all environments · 6 in this environment')).toBeInTheDocument();
  });

  test('shows only the count when the license sets no limit', () => {
    mockLicense({
      permittedSeats: null,
      adminUsersAcrossInstances: { ...ADMIN_USERS, activeUsers: 42, contractedUsers: null },
    });

    const { getByText } = render(<AdminSeatInfoEE />);

    expect(getByText('42')).toBeInTheDocument();
  });

  test("shows this instance's count without the caption until the registry has answered", () => {
    mockLicense({ enforcementUserCount: 4, permittedSeats: 3 });

    const { getByText, queryByText } = render(<AdminSeatInfoEE />);

    expect(getByText('4/3')).toBeInTheDocument();
    expect(getByText('1 over')).toBeInTheDocument();
    expect(queryByText(/Across all environments/)).not.toBeInTheDocument();
  });

  test('falls back to the retained seats once the live limit is wiped after expiry', () => {
    mockLicense({
      permittedSeats: null,
      seats: 10,
      licenseStatus: 'expired',
      enforcementUserCount: 4,
    });

    const { getByText } = render(<AdminSeatInfoEE />);

    expect(getByText('4/10')).toBeInTheDocument();
  });

  test('renders nothing without a limit or a count across instances', () => {
    mockLicense({ permittedSeats: null, seats: null });

    const { queryByText } = render(<AdminSeatInfoEE />);

    expect(queryByText('Admin users')).not.toBeInTheDocument();
  });
});
