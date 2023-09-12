import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { useRBAC } from '@strapi/helper-plugin';
import { render as renderRTL, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';

import { ProvidersPage } from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useOverlayBlocker: jest.fn(() => ({ lockApp: jest.fn(), unlockApp: jest.fn() })),
  useRBAC: jest.fn(),
}));

const render = (props) =>
  renderRTL(<ProvidersPage {...props} />, {
    wrapper({ children }) {
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <ThemeProvider theme={lightTheme}>
          <QueryClientProvider client={client}>
            <IntlProvider locale="en" messages={{}} textComponent="span">
              {children}
            </IntlProvider>
          </QueryClientProvider>
        </ThemeProvider>
      );
    },
  });

describe('Admin | containers | ProvidersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show a list of providers', async () => {
    useRBAC.mockImplementation(() => ({
      isLoading: false,
      allowedActions: { canUpdate: false },
    }));

    const { getByText, getByTestId } = render();

    await waitFor(() => {
      expect(getByText('email')).toBeInTheDocument();
      expect(getByTestId('enable-email').textContent).toEqual('Enabled');
      expect(getByTestId('enable-discord').textContent).toEqual('Disabled');
    });
  });
});
