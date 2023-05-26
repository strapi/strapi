import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { createMemoryHistory } from 'history';
import { useRBAC, TrackingProvider } from '@strapi/helper-plugin';
import { lightTheme, darkTheme } from '@strapi/design-system';

import Theme from '../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../components/ThemeToggleProvider';
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

jest.mock('ee_else_ce/hooks/useLicenseLimitNotification', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const makeApp = (history) => {
  return (
    <QueryClientProvider client={client}>
      <TrackingProvider>
        <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
          <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
            <Theme>
              <Router history={history}>
                <Route path="/settings/user">
                  <ListPage />
                </Route>
              </Router>
            </Theme>
          </ThemeToggleProvider>
        </IntlProvider>
      </TrackingProvider>
    </QueryClientProvider>
  );
};

describe('ADMIN | Pages | USERS | ListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a list of users', async () => {
    const history = createMemoryHistory();
    history.push('/settings/user?pageSize=10&page=1&sort=firstname');
    const app = makeApp(history);

    const { getByText } = render(app);

    await waitFor(() => {
      expect(getByText('soup')).toBeInTheDocument();
      expect(getByText('dummy')).toBeInTheDocument();
      expect(getByText('Active')).toBeInTheDocument();
      expect(getByText('Inactive')).toBeInTheDocument();
    });
  });

  it('should not show the create button when the user does not have the rights to create', async () => {
    useRBAC.mockImplementationOnce(() => ({
      allowedActions: { canCreate: false, canDelete: true, canRead: true, canUpdate: true },
    }));

    const history = createMemoryHistory();
    history.push('/settings/user?pageSize=10&page=1&sort=firstname');
    const app = makeApp(history);

    const { queryByText } = render(app);

    expect(queryByText('Invite new user')).not.toBeInTheDocument();
  });
});
