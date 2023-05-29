import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { lightTheme, darkTheme } from '@strapi/design-system';
import ProfilePage from '../index';
import server from './utils/server';
import serverLockedSSO from './utils/serverLockedSSO';
import ThemeToggleProvider from '../../../components/ThemeToggleProvider';
import Theme from '../../../components/Theme';

jest.mock('../../../components/LocalesProvider/useLocalesProvider', () => () => ({
  changeLocale() {},
  localeNames: {
    en: 'English'
  },
  messages: ['test'],
}));

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useAppInfo: jest.fn(() => ({ setUserDisplayName: jest.fn() })),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn, unlockApp: jest.fn() })),
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

describe('ADMIN | Pages | Profile page | without SSO lock', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('renders and matches the snapshot', async () => {
    const { container } = render(App);
    await waitFor(() => {
      expect(screen.getByText('Interface language')).toBeInTheDocument();
    });

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should display username if it exists', async () => {
    render(App);
    await waitFor(() => {
      expect(screen.getByText('yolo')).toBeInTheDocument();
    });
  });

  it('should display the change password section and all its fields', async () => {
    const { getByRole, getByTestId } = render(App);
    const changePasswordHeading = getByRole('heading', {
      name: 'Change password'
    });
    
    await waitFor(() => {
      expect(changePasswordHeading).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(getByTestId('test-current-password-input')).toBeInTheDocument()
    });

    await waitFor(() => {
      expect(getByTestId('test-new-password-input')).toBeInTheDocument()
    });

    await waitFor(() => {
      expect(getByTestId('test-confirmed-password-input')).toBeInTheDocument()
    });
  });
});

describe('ADMIN | Pages | Profile page | with SSO lock', () => {
  beforeAll(() => serverLockedSSO.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    serverLockedSSO.resetHandlers();
  });

  afterAll(() => {
    jest.resetAllMocks();
    serverLockedSSO.close();
  });

  it('should display username if it exists', async () => {
    render(App);
    await waitFor(() => {
      expect(screen.getByText('yolo')).toBeInTheDocument();
    });
  });

  it('should not display the change password section and all the fields if the user role is Locked', async () => {
    const { queryByRole, queryByTestId } = render(App);
    const changePasswordHeading = queryByRole('heading', {
      name: 'Change password'
    });
    
    await waitFor(() => {
      expect(changePasswordHeading).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(queryByTestId('test-current-password-input')).not.toBeInTheDocument()
    });

    await waitFor(() => {
      expect(queryByTestId('test-new-password-input')).not.toBeInTheDocument()
    });

    await waitFor(() => {
      expect(queryByTestId('test-confirmed-password-input')).not.toBeInTheDocument()
    });
  });
});
