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
import server from './utils/server';

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

jest.mock('ee_else_ce/pages/SettingsPage/pages/Users/ListPage/CreateAction', () => () => {
  return <></>;
});

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
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => server.resetHandlers());

  afterAll(() => {
    server.close();
    jest.resetAllMocks();
  });

  it('renders and matches the snapshot', () => {
    const history = createMemoryHistory();
    history.push('/settings/user?pageSize=10&page=1&sort=firstname');
    const app = makeApp(history);

    const { container } = render(app);

    expect(container.firstChild).toMatchSnapshot();
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
