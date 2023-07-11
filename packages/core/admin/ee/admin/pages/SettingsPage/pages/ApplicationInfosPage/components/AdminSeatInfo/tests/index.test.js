import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { AdminSeatInfoEE } from '..';
import { useLicenseLimits } from '../../../../../../../hooks';

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

const withMarkup = (query) => (text) =>
  query((content, node) => {
    const hasText = (node) => node.textContent === text;
    const childrenDontHaveText = Array.from(node.children).every((child) => !hasText(child));

    return hasText(node) && childrenDontHaveText;
  });

jest.mock('../../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../../hooks'),
  useLicenseLimits: jest.fn(() => LICENSE_MOCK),
}));

const setup = (props) =>
  render(<AdminSeatInfoEE {...props} />, {
    wrapper({ children }) {
      return (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider locale="en" messages={{}}>
            {children}
          </IntlProvider>
        </ThemeProvider>
      );
    },
  });

describe('<AdminSeatInfo />', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Do not render anything, when permittedSeats is falsy', () => {
    useLicenseLimits.mockReturnValueOnce({
      ...LICENSE_MOCK,
      license: {
        ...LICENSE_MOCK.license,
        permittedSeats: null,
      },
    });

    const { queryByText } = setup();

    expect(queryByText('Admin seats')).not.toBeInTheDocument();
  });

  test('Render seat info', () => {
    const { getByText } = setup();

    const getByTextWithMarkup = withMarkup(getByText);

    expect(getByText('Admin seats')).toBeInTheDocument();
    expect(getByTextWithMarkup('10/100')).toBeInTheDocument();
  });

  test('Render billing link (not on strapi cloud)', () => {
    const { getByText } = setup();

    expect(getByText('Contact sales')).toBeInTheDocument();
    expect(getByText('Contact sales').closest('a')).toHaveAttribute(
      'href',
      'https://strapi.io/billing/request-seats'
    );
  });

  test('Render billing link (on strapi cloud)', () => {
    useLicenseLimits.mockReturnValueOnce({
      ...LICENSE_MOCK,
      license: {
        ...LICENSE_MOCK.license,
        isHostedOnStrapiCloud: true,
      },
    });

    const { getByText } = setup();

    expect(getByText('Add seats')).toBeInTheDocument();
    expect(getByText('Add seats').closest('a')).toHaveAttribute(
      'href',
      'https://cloud.strapi.io/profile/billing'
    );
  });

  test('Render OVER_LIMIT icon', () => {
    useLicenseLimits.mockReturnValueOnce({
      ...LICENSE_MOCK,
      license: {
        ...LICENSE_MOCK.license,
        licenseLimitStatus: 'OVER_LIMIT',
      },
    });

    const { getByText } = setup();

    expect(getByText('At limit: add seats to invite more users')).toBeInTheDocument();
  });
});
