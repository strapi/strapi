import React from 'react';

import { darkTheme, lightTheme } from '@strapi/design-system';
import { render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import Theme from '../../../components/Theme';
import ThemeToggleProvider from '../../../components/ThemeToggleProvider';
import ProfilePage from '../index';

import server from './utils/server';
import serverLockedSSO from './utils/serverLockedSSO';

jest.mock('../../../components/LocalesProvider/useLocalesProvider');

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useAppInfo: jest.fn(() => ({ setUserDisplayName: jest.fn() })),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn, unlockApp: jest.fn() })),
}));

const setup = (props) =>
  render(<ProfilePage {...props} />, {
    wrapper({ children }) {
      window.strapi.isEE = true;
      window.strapi.features.isEnabled = () => true;
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <QueryClientProvider client={client}>
          <IntlProvider messages={{}} textComponent="span" locale="en">
            <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
              <Theme>{children}</Theme>
            </ThemeToggleProvider>
          </IntlProvider>
        </QueryClientProvider>
      );
    },
  });

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

  it('renders and show the Interface Language section', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText('Interface language')).toBeInTheDocument();
    });
  });

  it('should display username if it exists', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText('yolo')).toBeInTheDocument();
    });
  });

  it('should display the change password section and all its fields', async () => {
    const { getByRole, queryByTestId, getByLabelText } = setup();

    await waitFor(() => {
      expect(queryByTestId('loader')).not.toBeInTheDocument();
    });

    expect(
      getByRole('heading', {
        name: 'Change password',
      })
    ).toBeInTheDocument();

    expect(getByLabelText('Current Password')).toBeInTheDocument();

    expect(getByLabelText('Password')).toBeInTheDocument();

    expect(getByLabelText('Password confirmation')).toBeInTheDocument();
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
    jest.clearAllMocks();
    serverLockedSSO.close();
  });

  it('should display username if it exists', async () => {
    setup();
    await waitFor(() => {
      expect(screen.getByText('yolo')).toBeInTheDocument();
    });
  });

  it('should not display the change password section and all the fields if the user role is Locked', async () => {
    const { queryByRole, queryByTestId, queryByLabelText } = setup();
    const changePasswordHeading = queryByRole('heading', {
      name: 'Change password',
    });

    await waitFor(() => {
      expect(queryByTestId('loader')).not.toBeInTheDocument();
    });

    expect(changePasswordHeading).not.toBeInTheDocument();

    expect(queryByLabelText('Current Password')).not.toBeInTheDocument();

    expect(queryByLabelText('Password')).not.toBeInTheDocument();

    expect(queryByLabelText('Password confirmation')).not.toBeInTheDocument();
  });
});
