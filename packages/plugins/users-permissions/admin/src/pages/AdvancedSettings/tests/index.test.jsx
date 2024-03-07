import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { render as renderRTL, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';

import { AdvancedSettingsPage } from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn, unlockApp: jest.fn() })),
  useRBAC: jest.fn().mockImplementation(() => ({
    isLoading: false,
    allowedActions: { canUpdate: true },
  })),
}));

const render = () =>
  renderRTL(<AdvancedSettingsPage />, {
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
          <IntlProvider messages={{ en: {} }} textComponent="span" locale="en">
            <ThemeProvider theme={lightTheme}>
              <NotificationsProvider>
                <MemoryRouter>{children}</MemoryRouter>
              </NotificationsProvider>
            </ThemeProvider>
          </IntlProvider>
        </QueryClientProvider>
      );
    },
  });

describe('ADMIN | Pages | Settings | Advanced Settings', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    const { getByRole, queryByText } = render();

    await waitFor(() => expect(queryByText('Loading content.')).not.toBeInTheDocument());

    expect(getByRole('heading', { name: 'Advanced Settings' })).toBeInTheDocument();

    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(
      getByRole('combobox', { name: 'Default role for authenticated users' })
    ).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'One account per email address' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'Enable sign-ups' })).toBeInTheDocument();
    expect(getByRole('checkbox', { name: 'Enable email confirmation' })).toBeInTheDocument();
    expect(getByRole('textbox', { name: 'Reset password page' })).toBeInTheDocument();
    expect(getByRole('textbox', { name: 'Redirection url' })).toBeInTheDocument();
  });
});
