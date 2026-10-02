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

  test('Renders nothing when neither a live nor a retained seat limit exists', () => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValue({
      ...LICENSE_MOCK,
      license: { ...LICENSE_MOCK.license, permittedSeats: null, seats: null },
    });

    const { queryByText } = render(<AdminSeatInfoEE />);

    expect(queryByText('Admin seats')).not.toBeInTheDocument();
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
