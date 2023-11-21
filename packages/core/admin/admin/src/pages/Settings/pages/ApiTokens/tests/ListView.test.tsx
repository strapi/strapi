import React from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { fixtures } from '@strapi/admin-test-utils';
import { darkTheme, lightTheme } from '@strapi/design-system';
import { TrackingProvider, useRBAC } from '@strapi/helper-plugin';
import { render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { Route, MemoryRouter } from 'react-router-dom';

import { Theme } from '../../../../../components/Theme';
import { ThemeToggleProvider } from '../../../../../components/ThemeToggleProvider';
import { ListView } from '../ListView';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useRBAC: jest.fn(),
  useGuidedTour: jest.fn(() => ({
    startSection: jest.fn(),
  })),
  useQueryParams: jest.fn().mockReturnValue([
    {
      query: {
        sort: 'test:ASC',
      },
    },
  ]),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            name: 'My super token',
            description: 'This describe my super token',
            type: 'read-only',
            createdAt: '2021-11-15T00:00:00.000Z',
          },
        ],
      },
    }),
  }),
}));

// TO BE REMOVED: we have added this mock to prevent errors in the snapshots caused by the Unicode space character
// before AM/PM in the dates, after the introduction of node 18.13
jest.mock('react-intl', () => {
  const reactIntl = jest.requireActual('react-intl');
  const intl = reactIntl.createIntl({
    locale: 'en',
  });

  intl.formatDate = jest.fn(() => '11/15/2021');
  intl.formatTime = jest.fn(() => '12:00 AM');

  return {
    ...reactIntl,
    useIntl: () => intl,
  };
});

const setup = ({ path = '/settings/api-tokens', ...props } = {}) =>
  render(<ListView {...props} />, {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <Provider
          store={configureStore({
            reducer: (state) => state,
            preloadedState: {
              admin_app: { permissions: fixtures.permissions.app },
            },
          })}
        >
          <QueryClientProvider client={client}>
            <TrackingProvider>
              <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
                <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
                  <Theme>
                    <MemoryRouter initialEntries={[path]}>
                      <Route path="/settings/api-tokens">{children}</Route>
                    </MemoryRouter>
                  </Theme>
                </ThemeToggleProvider>
              </IntlProvider>
            </TrackingProvider>
          </QueryClientProvider>
        </Provider>
      );
    },
  });

describe('ADMIN | Pages | API TOKENS | ListPage', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('should show a list of api tokens', async () => {
    // @ts-expect-error this is fine
    useRBAC.mockReturnValue({
      allowedActions: {
        canCreate: true,
        canDelete: true,
        canRead: true,
        canUpdate: true,
        canRegenerate: true,
      },
    });

    const { getByText } = setup({ path: '/settings/api-tokens' });

    // eslint-disable-next-line testing-library/prefer-find-by
    await waitFor(() => expect(getByText('My super token')).toBeInTheDocument());
    // eslint-disable-next-line testing-library/prefer-find-by
    await waitFor(() => expect(getByText('This describe my super token')).toBeInTheDocument());
  });

  it('should not show the create button when the user does not have the rights to create', async () => {
    // @ts-expect-error this is fine
    useRBAC.mockReturnValue({
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: true,
        canRegenerate: true,
      },
    });

    const { queryByTestId } = setup();

    await waitFor(() => expect(queryByTestId('create-api-token-button')).not.toBeInTheDocument());
  });

  it('should show the delete button when the user have the rights to delete', async () => {
    // @ts-expect-error this is fine
    useRBAC.mockReturnValue({
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: false,
        canRegenerate: false,
      },
    });

    const { container } = setup();

    await waitFor(() =>
      // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
      expect(container.querySelector('button[name="delete"]')).toBeInTheDocument()
    );
  });

  it('should show the read button when the user have the rights to read and not to update', async () => {
    // @ts-expect-error this is fine
    useRBAC.mockReturnValue({
      allowedActions: {
        canCreate: false,
        canDelete: true,
        canRead: true,
        canUpdate: false,
        canRegenerate: false,
      },
    });

    const { container } = setup();

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
    await waitFor(() => expect(container.querySelector('a[title*="Read"]')).toBeInTheDocument());
  });
});
