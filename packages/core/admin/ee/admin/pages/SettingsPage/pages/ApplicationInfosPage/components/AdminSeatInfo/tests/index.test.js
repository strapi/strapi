import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { AdminSeatInfoEE } from '..';
import { useLicenseLimits } from '../../../../../../../hooks/useLicenseLimits';

jest.mock('../../../../../../../hooks/useLicenseLimits');

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

const withMarkup = (query) => (text) =>
  query((content, node) => {
    const hasText = (node) => node.textContent === text;
    const childrenDontHaveText = Array.from(node.children).every((child) => !hasText(child));

    return hasText(node) && childrenDontHaveText;
  });

const setup = (props) =>
  render(<AdminSeatInfoEE {...props} />, {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <QueryClientProvider client={client}>
          <Provider
            store={createStore((state) => state, {
              admin_app: { permissions: fixtures.permissions.app },
            })}
          >
            <ThemeProvider theme={lightTheme}>
              <IntlProvider locale="en" messages={{}}>
                {children}
              </IntlProvider>
            </ThemeProvider>
          </Provider>
        </QueryClientProvider>
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
    useLicenseLimits.mockReturnValueOnce(LICENSE_MOCK);

    const { getByText } = setup();

    const getByTextWithMarkup = withMarkup(getByText);

    expect(getByText('Admin seats')).toBeInTheDocument();
    expect(getByTextWithMarkup('10/100')).toBeInTheDocument();
  });

  test('Render billing link (not on strapi cloud)', () => {
    useLicenseLimits.mockReturnValueOnce(LICENSE_MOCK);

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
