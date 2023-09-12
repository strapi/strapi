import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { useRBAC } from '@strapi/helper-plugin';
import { fireEvent, getByLabelText, render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import { SingleSignOn } from '../index';

import server from './server';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn().mockImplementation(() => jest.fn()),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
  useRBAC: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
}));

const setup = (props) =>
  render(<SingleSignOn {...props} />, {
    wrapper({ children }) {
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
              admin_app: {
                permissions: {
                  ...fixtures.permissions.app,
                  settings: {
                    ...fixtures.permissions.app.settings,
                    sso: {
                      main: [{ action: 'admin::provider-login.read', subject: null }],
                      read: [{ action: 'admin::provider-login.read', subject: null }],
                      update: [{ action: 'admin::provider-login.update', subject: null }],
                    },
                  },
                },
              },
            })}
          >
            <ThemeProvider theme={lightTheme}>
              <IntlProvider locale="en" messages={{}} textComponent="span">
                {children}
              </IntlProvider>
            </ThemeProvider>
          </Provider>
        </QueryClientProvider>
      );
    },
  });

describe('Admin | ee | SettingsPage | SSO', () => {
  beforeAll(() => server.listen());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => server.resetHandlers());

  afterAll(() => server.close());

  it('renders and matches the snapshot', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    const { getByText } = setup();

    await waitFor(() =>
      expect(getByText('Create new user on SSO login if no account exists')).toBeInTheDocument()
    );
  });

  it('should disable the form when there is no change', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    const { getByTestId, getByText } = setup();

    await waitFor(() =>
      expect(getByText('Create new user on SSO login if no account exists')).toBeInTheDocument()
    );

    expect(getByTestId('save-button')).toHaveAttribute('aria-disabled');
  });

  it('should not disable the form when there is a change', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    const { container, getByTestId } = setup();
    let el;

    await waitFor(() => {
      return (el = getByLabelText(container, 'autoRegister'));
    });

    fireEvent.click(el);

    expect(getByTestId('save-button')).not.toBeDisabled();
  });
});
