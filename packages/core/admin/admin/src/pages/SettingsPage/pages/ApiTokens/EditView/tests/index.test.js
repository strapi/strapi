import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Router, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { QueryClient, QueryClientProvider } from 'react-query';
import { lightTheme, darkTheme } from '@strapi/design-system';
import Theme from '../../../../../../components/Theme';
import ThemeToggleProvider from '../../../../../../components/ThemeToggleProvider';
import EditView from '../index';
import { data } from '../utils/tests/dataMock';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
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
    <QueryClientProvider client={client}>
      <IntlProvider messages={{}} defaultLocale="en" textComponent="span" locale="en">
        <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
          <Theme>
            <Router history={history}>
              <Route path="/settings/api-tokens/:id">
                <EditView />
              </Route>
            </Router>
          </Theme>
        </ThemeToggleProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
};

describe('ADMIN | Pages | API TOKENS | EditView', () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  it('renders and matches the snapshot when creating token', async () => {
    const history = createMemoryHistory();
    const App = makeApp(history);
    const { container, getByText } = render(App);

    history.push('/settings/api-tokens/create');

    await waitFor(() => {
      expect(getByText('Address')).toBeInTheDocument();
    });

    expect(container).toMatchSnapshot();
  });

  it('renders and matches the snapshot when editing existing token', async () => {
    const history = createMemoryHistory();
    const App = makeApp(history);
    const { container, getByText } = render(App);

    history.push('/settings/api-tokens/1');

    await waitFor(() => {
      expect(getByText('My super token')).toBeInTheDocument();
      expect(getByText('This describe my super token')).toBeInTheDocument();
      expect(getByText('Regenerate')).toBeInTheDocument();
      expect(getByText('Address')).toBeInTheDocument();
    });

    expect(container).toMatchSnapshot();
  });
});
