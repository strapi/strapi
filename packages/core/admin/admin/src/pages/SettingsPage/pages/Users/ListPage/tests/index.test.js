import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { TrackingProvider, useRBAC } from '@strapi/helper-plugin';
import { render, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { Route, Router } from 'react-router-dom';
import { createStore } from 'redux';

import ListPage from '../index';

jest.mock('../../../../../../hooks/useAdminUsers', () => ({
  __esModule: true,
  useAdminUsers: jest.fn().mockReturnValue({
    users: [
      {
        email: 'soup@strapi.io',
        firstname: 'soup',
        id: 1,
        isActive: true,
        lastname: 'soupette',
        roles: [
          {
            id: 1,
            name: 'Super Admin',
          },
        ],
      },
      {
        email: 'dummy@strapi.io',
        firstname: 'dummy',
        id: 2,
        isActive: false,
        lastname: 'dum test',
        roles: [
          {
            id: 1,
            name: 'Super Admin',
          },
          {
            id: 2,
            name: 'Editor',
          },
        ],
      },
    ],
    pagination: { page: 1, pageSize: 10, pageCount: 2, total: 2 },
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useRBAC: jest.fn(() => ({
    allowedActions: { canCreate: true, canDelete: true, canRead: true, canUpdate: true },
  })),
}));

const setup = (props) =>
  render(() => <ListPage {...props} />, {
    wrapper({ children }) {
      const history = createMemoryHistory();
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <Provider
          store={createStore((state) => state, {
            admin_app: { permissions: fixtures.permissions.app },
          })}
        >
          <QueryClientProvider client={client}>
            <TrackingProvider>
              <IntlProvider defaultLocale="en" locale="en">
                <ThemeProvider theme={lightTheme}>
                  <Router history={history}>
                    <Route path="/settings/user?pageSize=10&page=1&sort=firstname">
                      {children}
                    </Route>
                  </Router>
                </ThemeProvider>
              </IntlProvider>
            </TrackingProvider>
          </QueryClientProvider>
        </Provider>
      );
    },
  });

describe('ADMIN | Pages | USERS | ListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a list of users', async () => {
    const { getByText } = setup();

    await waitFor(() => expect(getByText('soup')).toBeInTheDocument());
    await waitFor(() => expect(getByText('dummy')).toBeInTheDocument());
    await waitFor(() => expect(getByText('Active')).toBeInTheDocument());
    await waitFor(() => expect(getByText('Inactive')).toBeInTheDocument());
  });

  it('should not show the create button when the user does not have the rights to create', async () => {
    useRBAC.mockImplementationOnce(() => ({
      allowedActions: { canCreate: false, canDelete: true, canRead: true, canUpdate: true },
    }));

    const { queryByText } = setup();

    expect(queryByText('Invite new user')).not.toBeInTheDocument();
  });
});
