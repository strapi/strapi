import { Matcher } from '@testing-library/react';
import { render } from '@tests/utils';

import { useLicenseLimits } from '../../../../../../hooks/useLicenseLimits';
import { AdminSeatInfoEE } from '../AdminSeatInfo';

jest.mock('../../../../../../hooks/useLicenseLimits');

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useRBAC: jest.fn().mockReturnValue({
    isLoading: false,
    allowedActions: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
  }),
}));

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
    useLicenseLimits.mockReturnValueOnce({
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
    useLicenseLimits.mockReturnValueOnce(LICENSE_MOCK);

    const { getByText } = render(<AdminSeatInfoEE />);

    const getByTextWithMarkup = withMarkup(getByText);

    expect(getByText('Admin seats')).toBeInTheDocument();
    expect(getByTextWithMarkup('10/100')).toBeInTheDocument();
  });

  test('Render billing link (not on strapi cloud)', () => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValueOnce(LICENSE_MOCK);

    const { getByText } = render(<AdminSeatInfoEE />);

    expect(getByText('Contact sales')).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access
    expect(getByText('Contact sales').closest('a')).toHaveAttribute(
      'href',
      'https://strapi.io/billing/request-seats'
    );
  });

  test('Render billing link (on strapi cloud)', () => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValueOnce({
      ...LICENSE_MOCK,
      license: {
        ...LICENSE_MOCK.license,
        isHostedOnStrapiCloud: true,
      },
    });

    const { getByText } = render(<AdminSeatInfoEE />);

    expect(getByText('Add seats')).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-node-access
    expect(getByText('Add seats').closest('a')).toHaveAttribute(
      'href',
      'https://cloud.strapi.io/profile/billing'
    );
  });

  test('Render OVER_LIMIT icon', () => {
    // @ts-expect-error – mocked
    useLicenseLimits.mockReturnValueOnce({
      ...LICENSE_MOCK,
      license: {
        ...LICENSE_MOCK.license,
        licenseLimitStatus: 'OVER_LIMIT',
      },
    });

    const { getByText } = render(<AdminSeatInfoEE />);

    expect(getByText('At limit: add seats to invite more users')).toBeInTheDocument();
  });
});
