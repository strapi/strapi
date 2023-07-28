import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { darkTheme, lightTheme } from '@strapi/design-system';
import { render, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { Route, Router } from 'react-router-dom';
import { createStore } from 'redux';

import Theme from '../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../components/ThemeToggleProvider';
import EditView from '../index';
import { data } from '../utils/tests/dataMock';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useRBAC: jest.fn(() => ({
    allowedActions: {
      canCreate: true,
      canDelete: true,
      canRead: true,
      canUpdate: true,
      canRegenerate: true,
    },
  })),
  useGuidedTour: jest.fn(() => ({
    startSection: jest.fn(),
  })),
  useOverlayBlocker: jest.fn(() => ({
    lockApp: jest.fn(),
    unlockApp: jest.fn(),
  })),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockImplementation((path) => {
      if (path === '/admin/content-api/permissions') {
        return { data };
      }

      return {
        data: {
          data: {
            id: '1',
            name: 'My super token',
            description: 'This describe my super token',
            type: 'read-only',
            createdAt: '2021-11-15T00:00:00.000Z',
            permissions: [],
          },
        },
      };
    }),
  }),
}));

jest.spyOn(Date, 'now').mockImplementation(() => new Date('2015-10-01T08:00:00.000Z'));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const makeApp = (history) => {
  return (
    <Provider
      store={createStore((state) => state, {
        admin_app: { permissions: fixtures.permissions.app },
      })}
    >
      <QueryClientProvider client={client}>
        <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
          <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
            <Theme>
              <Router history={history}>
                <Route path="/settings/transfer-tokens/:id">
                  <EditView />
                </Route>
              </Router>
            </Theme>
          </ThemeToggleProvider>
        </IntlProvider>
      </QueryClientProvider>
    </Provider>
  );
};

describe('ADMIN | Pages | TRANSFER TOKENS | EditView', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders and matches the snapshot when editing existing token', async () => {
    const history = createMemoryHistory();
    const App = makeApp(history);
    const { getByText } = render(App);

    history.push('/settings/transfer-tokens/1');

    await waitFor(() => expect(getByText('My super token')).toBeInTheDocument());
    await waitFor(() => expect(getByText('This describe my super token')).toBeInTheDocument());
    await waitFor(() => expect(getByText('Regenerate')).toBeInTheDocument());
  });
});
