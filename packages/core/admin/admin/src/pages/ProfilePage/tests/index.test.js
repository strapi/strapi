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

jest.mock('../../../components/LocalesProvider/useLocalesProvider');

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
  useAppInfo: jest.fn(() => ({ setUserDisplayName: jest.fn() })),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn, unlockApp: jest.fn() })),
}));

const setup = (props) => render(<ProfilePage {...props} />, {
  wrapper({ children }) {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    return <QueryClientProvider client={client}>
      <IntlProvider messages={{}} textComponent="span" locale="en">
        <ThemeToggleProvider themes={{ light: lightTheme, dark: darkTheme }}>
          <Theme>
            {children}
          </Theme>
        </ThemeToggleProvider>
      </IntlProvider>
    </QueryClientProvider>
  }
})

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
    const { getByRole, getByTestId, queryByTestId } =  setup();

    await waitFor(() => {
      expect(queryByTestId('loader')).not.toBeInTheDocument();
    });

    expect(getByRole('heading', {
      name: 'Change password'
    })).toBeInTheDocument();

    expect(getByTestId('test-current-password-input')).toBeInTheDocument()


    expect(getByTestId('test-new-password-input')).toBeInTheDocument()

    expect(getByTestId('test-confirmed-password-input')).toBeInTheDocument()
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
    setup();
    await waitFor(() => {
      expect(screen.getByText('yolo')).toBeInTheDocument();
    });
  });

  it('should not display the change password section and all the fields if the user role is Locked', async () => {
    const { queryByRole, queryByTestId } =  setup();
    const changePasswordHeading = queryByRole('heading', {
      name: 'Change password'
    });

    await waitFor(() => {
      expect(queryByTestId('loader')).not.toBeInTheDocument();
    });
    
    expect(changePasswordHeading).not.toBeInTheDocument();

    expect(queryByTestId('test-current-password-input')).not.toBeInTheDocument()
    
    expect(queryByTestId('test-new-password-input')).not.toBeInTheDocument()
    
    expect(queryByTestId('test-confirmed-password-input')).not.toBeInTheDocument()
  });
});
