import React from 'react';

import { configureStore } from '@reduxjs/toolkit';
import { fixtures } from '@strapi/admin-test-utils';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { useRBAC } from '@strapi/helper-plugin';
import { fireEvent, render, waitFor, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';

import { SingleSignOnPage } from '../SingleSignOnPage';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn().mockImplementation(() => jest.fn()),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
  useRBAC: jest.fn(),
  useFocusWhenNavigate: jest.fn(),
}));

const setup = () =>
  render(<SingleSignOnPage />, {
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
            store={configureStore({
              reducer: (state) => state,
              preloadedState: {
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders and matches the snapshot', async () => {
    // @ts-expect-error – mocking
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));
    const { queryByText } = setup();

    await waitFor(() => expect(queryByText(/Loading/)).not.toBeInTheDocument());
    expect(
      await screen.findByText('Create new user on SSO login if no account exists')
    ).toBeInTheDocument();
  });

  it('should disable the form when there is no change', async () => {
    // @ts-expect-error – mocking
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));
    const { queryByText } = setup();

    await waitFor(() => expect(queryByText(/Loading/)).not.toBeInTheDocument());
    expect(
      await screen.findByText('Create new user on SSO login if no account exists')
    ).toBeInTheDocument();

    expect(screen.getByTestId('save-button')).toHaveAttribute('aria-disabled');
  });

  it('should not disable the form when there is a change', async () => {
    // @ts-expect-error – mocking
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: true, canReadRoles: true },
    }));

    setup();
    const el = await screen.findByTestId('autoRegister');

    if (el) fireEvent.click(el);

    expect(await screen.findByTestId('save-button')).toBeEnabled();
  });
});
