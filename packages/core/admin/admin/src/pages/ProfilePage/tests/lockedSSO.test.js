import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { lightTheme, darkTheme } from '@strapi/design-system';
import ProfilePage from '../index';
import serverLockedSSO from './utils/serverLockedSSO';
import ThemeToggleProvider from '../../../components/ThemeToggleProvider';
import Theme from '../../../components/Theme';

jest.mock('../../../components/LocalesProvider/useLocalesProvider');

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

describe('ADMIN | Pages | Profile page', () => {
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
