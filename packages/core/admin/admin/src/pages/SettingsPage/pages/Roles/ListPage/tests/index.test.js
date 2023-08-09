/**
 *
 * Tests for ListPage
 *
 */

import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { useRBAC } from '@strapi/helper-plugin';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { createStore } from 'redux';

import { useAdminRoles } from '../../../../../../hooks/useAdminRoles';
import ListPage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useRBAC: jest.fn(() => ({
    isLoading: true,
    allowedActions: { canCreate: true, canDelete: true, canRead: true, canUpdate: true },
  })),
}));

jest.mock('../../../../../../hooks/useAdminRoles');

const setup = (props) =>
  render(<ListPage {...props} />, {
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
        <QueryClientProvider client={client}>
          <Provider
            store={createStore((state) => state, {
              admin_app: { permissions: fixtures.permissions.app },
            })}
          >
            <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
              <ThemeProvider theme={lightTheme}>
                <Router history={history}>{children}</Router>
              </ThemeProvider>
            </IntlProvider>
          </Provider>
        </QueryClientProvider>
      );
    },
  });

describe('<ListPage />', () => {
  it('renders and matches the snapshot', () => {
    useAdminRoles.mockImplementationOnce(() => ({
      roles: [],
      isLoading: true,
    }));

    const { getByText } = setup();

    expect(getByText('Loading content.')).toBeInTheDocument();
  });

  it('should show a list of roles', () => {
    useAdminRoles.mockImplementationOnce(() => ({
      roles: [
        {
          code: 'strapi-super-admin',
          created_at: '2021-08-24T14:37:20.384Z',
          description: 'Super Admins can access and manage all features and settings.',
          id: 1,
          name: 'Super Admin',
          updatedAt: '2021-08-24T14:37:20.384Z',
          usersCount: 1,
        },
      ],
      isLoading: false,
    }));

    useRBAC.mockImplementationOnce(() => ({
      isLoading: false,
      allowedActions: { canCreate: true, canDelete: true, canRead: true, canUpdate: true },
    }));
    const { getByText } = setup();

    expect(getByText('Super Admin')).toBeInTheDocument();
  });
});
