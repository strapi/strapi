import { Matcher } from '@testing-library/react';
import { render } from '@tests/utils';

import { useLicenseLimits } from '../../../../../../hooks/useLicenseLimits';
import { AdminSeatInfoEE } from '../AdminSeatInfo';

jest.mock('../../../../../../hooks/useLicenseLimits');

jest.mock('../../../../../../../../../admin/src/hooks/useRBAC');

const LICENSE_MOCK = {
  isLoading: false,
  isError: false,
  license: {
    enforcementUserCount: 10,
    licenseLimitStatus: '',
    permittedSeats: 100,
    isHostedOnStrapiCloud: false,
  },
};

const withMarkup = (query: (id: Matcher) => HTMLElement) => (text: string) =>
  query((content, node) => {
    const hasText = (node: Element | null) => node?.textContent === text;
    // eslint-disable-next-line testing-library/no-node-access
    const childrenDontHaveText = Array.from(node?.children ?? []).every((child) => !hasText(child));

    return hasText(node) && childrenDontHaveText;
  });

describe('<AdminSeatInfo />', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Do not render anything, when permittedSeats is falsy', () => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValue({
      ...LICENSE_MOCK,
      license: {
        ...LICENSE_MOCK.license,
        permittedSeats: null,
      },
    });

    const { queryByText } = render(<AdminSeatInfoEE />);

    expect(queryByText('Admin seats')).not.toBeInTheDocument();
  });

  test('Render seat info', () => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValue(LICENSE_MOCK);

    const { getByText } = render(<AdminSeatInfoEE />);

    const getByTextWithMarkup = withMarkup(getByText);

    expect(getByText('Admin seats')).toBeInTheDocument();
    expect(getByTextWithMarkup('10/100')).toBeInTheDocument();
  });

  test('Shows retained seats when live permittedSeats is wiped after expiry', () => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValue({
      ...LICENSE_MOCK,
      license: {
        ...LICENSE_MOCK.license,
        permittedSeats: null,
        seats: 10,
        licenseStatus: 'expired',
        enforcementUserCount: 4,
      },
    });

    const { getByText } = render(<AdminSeatInfoEE />);

    expect(getByText('Admin seats')).toBeInTheDocument();
    expect(withMarkup(getByText)('4/10')).toBeInTheDocument();
  });

  test('Shows the over-limit warning against the retained seats after expiry', () => {
    // The count turns red against the displayed limit (live, or retained once expired); the
    // warning icon followed only the live status, which is empty after expiry.
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValue({
      ...LICENSE_MOCK,
      license: {
        ...LICENSE_MOCK.license,
        permittedSeats: null,
        seats: 5,
        licenseLimitStatus: null,
        licenseStatus: 'expired',
        enforcementUserCount: 8,
      },
    });

    const { container, getByText } = render(<AdminSeatInfoEE />);

    expect(withMarkup(getByText)('8/5')).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  test('Shows no over-limit warning within the seat limit', () => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValue(LICENSE_MOCK);

    const { container } = render(<AdminSeatInfoEE />);

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  test('Renders nothing when neither a live nor a retained seat limit exists', () => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValue({
      ...LICENSE_MOCK,
      license: { ...LICENSE_MOCK.license, permittedSeats: null, seats: null },
    });

    const { queryByText } = render(<AdminSeatInfoEE />);

    expect(queryByText('Admin seats')).not.toBeInTheDocument();
  });

  describe('with the usage counted across all environments', () => {
    const PROJECT_USAGE = {
      activeUsers: 8,
      contractedUsers: 10,
      updatedAt: '2026-11-13T10:00:00.000Z',
    };

    test('shows the active admin users against the contracted number', () => {
      // @ts-expect-error – mocked
      useLicenseLimits.mockReturnValue({
        ...LICENSE_MOCK,
        license: { ...LICENSE_MOCK.license, projectUsage: PROJECT_USAGE },
      });

      const { getByText, queryByText } = render(<AdminSeatInfoEE />);

      expect(getByText('Active admin users across all environments')).toBeInTheDocument();
      expect(getByText('8 / 10')).toBeInTheDocument();
      expect(getByText(/^Last updated /)).toBeInTheDocument();
      expect(queryByText('Over limit')).not.toBeInTheDocument();
      // Shown next to this instance's seats, which are still enforced
      expect(getByText('Admin seats')).toBeInTheDocument();
      expect(withMarkup(getByText)('10/100')).toBeInTheDocument();
    });

    test('shows an over-limit status above the contracted number', () => {
      // @ts-expect-error – mocked
      useLicenseLimits.mockReturnValue({
        ...LICENSE_MOCK,
        license: {
          ...LICENSE_MOCK.license,
          projectUsage: { ...PROJECT_USAGE, activeUsers: 12 },
        },
      });

      const { getByText } = render(<AdminSeatInfoEE />);

      expect(getByText('12 / 10')).toBeInTheDocument();
      expect(getByText('Over limit')).toBeInTheDocument();
    });

    test('shows only the count when the license sets no contracted number', () => {
      // @ts-expect-error – mocked
      useLicenseLimits.mockReturnValue({
        ...LICENSE_MOCK,
        license: {
          ...LICENSE_MOCK.license,
          permittedSeats: null,
          projectUsage: { ...PROJECT_USAGE, activeUsers: 42, contractedUsers: null },
        },
      });

      const { getByText, queryByText } = render(<AdminSeatInfoEE />);

      expect(getByText('Active admin users across all environments')).toBeInTheDocument();
      expect(getByText('42')).toBeInTheDocument();
      expect(queryByText('Over limit')).not.toBeInTheDocument();
    });

    test('shows only the seat count when the usage is null', () => {
      // @ts-expect-error – mocked
      useLicenseLimits.mockReturnValue({
        ...LICENSE_MOCK,
        license: { ...LICENSE_MOCK.license, projectUsage: null },
      });

      const { getByText, queryByText } = render(<AdminSeatInfoEE />);

      expect(getByText('Admin seats')).toBeInTheDocument();
      expect(withMarkup(getByText)('10/100')).toBeInTheDocument();
      expect(queryByText('Active admin users across all environments')).not.toBeInTheDocument();
    });
  });

  // The per-plan billing links that used to live under the seat count were removed: the Plan card
  // now carries a single Manage/View subscription button that covers both cases.
  test.each([['gold'], ['bronze']])('Render no billing link (%s license)', (type) => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValue({
      ...LICENSE_MOCK,
      license: { ...LICENSE_MOCK.license, type },
    });

    const { queryByText, queryByRole } = render(<AdminSeatInfoEE />);

    expect(queryByText('Manage subscription')).not.toBeInTheDocument();
    expect(queryByText('Contact sales')).not.toBeInTheDocument();
    expect(queryByRole('link')).not.toBeInTheDocument();
  });
});
