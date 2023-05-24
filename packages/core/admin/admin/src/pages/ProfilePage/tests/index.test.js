import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { lightTheme, darkTheme } from '@strapi/design-system';
import { useFetchClient } from '@strapi/helper-plugin';
import ProfilePage from '../index';
import server from './utils/server';
import ThemeToggleProvider from '../../../components/ThemeToggleProvider';
import Theme from '../../../components/Theme';

const mockUseQuery = jest.fn();
jest.mock('react-query', () => {
  const actual = jest.requireActual('react-query');

  return {
    ...actual,
    useQuery: () => mockUseQuery(),
  };
});

jest.mock('../../../components/LocalesProvider/useLocalesProvider', () => () => ({
  changeLocale() {},
  localeNames: ['en'],
  messages: ['test'],
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useAppInfo: jest.fn(() => ({ setUserDisplayName: jest.fn() })),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn, unlockApp: jest.fn() })),
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        data: {
          autoRegister: false,
          defaultRole: "1",
          ssoLockedRoles: []
        }
      },
    }),
  }),
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const App = (
  <QueryClientProvider client={client}>
    <IntlProvider messages={{}} textComponent="span" locale="en">
      <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
        <Theme>
          <ProfilePage />
        </Theme>
      </ThemeToggleProvider>
    </IntlProvider>
  </QueryClientProvider>
);

describe('ADMIN | Pages | Profile page', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({
      status: 'success',
      data: {
        id: 2,
        firstname: "yolo",
        roles: [{
          id: 2
        }],
      },
      isSuccess: true,
    });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    jest.resetAllMocks();
    server.close();
  });

  it('renders and matches the snapshot', async () => {
    const { container } = render(App);
    await waitFor(() => {
      expect(screen.getByText('Interface language')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should display the change password section', async () => {
    render(App);
    await waitFor(() => {
      expect(screen.getByText('Change password')).toBeInTheDocument();
    });
  })

  it('should display username if it exists', async () => {
    render(App);
    await waitFor(() => {
      expect(screen.getByText('yolo')).toBeInTheDocument();
    });
  });

  it('should not display the change password section if sso is Locked', async () => {
    useFetchClient().get = jest.fn().mockResolvedValueOnce({
      data: {
        data: {
          autoRegister: false,
          defaultRole: "1",
          ssoLockedRoles: ["1", "2", "3"]
        }
      },
    });

    render(App);
    await waitFor(() => {
      expect(screen.queryByText('Change password')).toBeNull();
    })
  })
});
