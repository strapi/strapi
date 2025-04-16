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

  test('Render billing link (not on strapi cloud)', () => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValue(LICENSE_MOCK);

    const { getByText } = render(<AdminSeatInfoEE />);

    expect(getByText('Manage seats')).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access
    expect(getByText('Manage seats').closest('a')).toHaveAttribute(
      'href',
      'https://strapi.io/billing/manage-seats'
    );
  });

  test('Render billing link (gold license)', () => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValue({
      ...LICENSE_MOCK,
      license: {
        ...LICENSE_MOCK.license,
        type: 'gold',
      },
    });

    const { getByText } = render(<AdminSeatInfoEE />);

    expect(getByText('Contact sales')).toBeInTheDocument();
    expect(
      // eslint-disable-next-line testing-library/no-node-access
      getByText('Contact sales').closest('a')
    ).toHaveAttribute('href', 'https://strapi.io/billing/request-seats');
  });
});
