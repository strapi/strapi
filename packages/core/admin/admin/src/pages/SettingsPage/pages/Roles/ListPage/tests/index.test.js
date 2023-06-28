/**
 *
 * Tests for ListPage
 *
 */

import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { darkTheme, lightTheme } from '@strapi/design-system';
import { TrackingProvider, useRBAC } from '@strapi/helper-plugin';
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { createStore } from 'redux';

import Theme from '../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../components/ThemeToggleProvider';
import { useRolesList } from '../../../../../../hooks';
import ListPage from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useRBAC: jest.fn(() => ({
    isLoading: true,
    allowedActions: { canCreate: true, canDelete: true, canRead: true, canUpdate: true },
  })),
}));

jest.mock('../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../hooks'),
  useRolesList: jest.fn(),
}));

const setup = (props) =>
  render(<ListPage {...props} />, {
    wrapper({ children }) {
      const history = createMemoryHistory();

      return (
        <Provider
          store={createStore((state) => state, {
            admin_app: { permissions: fixtures.permissions.app },
          })}
        >
          <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
            <TrackingProvider>
              <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
                <Theme>
                  <Router history={history}>{children}</Router>
                </Theme>
              </ThemeToggleProvider>
            </TrackingProvider>
          </IntlProvider>
        </Provider>
      );
    },
  });

describe('<ListPage />', () => {
  it('renders and matches the snapshot', () => {
    useRolesList.mockImplementationOnce(() => ({
      roles: [],
      isLoading: true,
      getData: jest.fn(),
    }));

    const { getByText } = setup();

    expect(getByText('Loading content.')).toBeInTheDocument();
  });

  it('should show a list of roles', () => {
    useRolesList.mockImplementationOnce(() => ({
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
      getData: jest.fn(),
    }));

    useRBAC.mockImplementationOnce(() => ({
      isLoading: false,
      allowedActions: { canCreate: true, canDelete: true, canRead: true, canUpdate: true },
    }));
    const { getByText } = setup();

    expect(getByText('Super Admin')).toBeInTheDocument();
  });
});
