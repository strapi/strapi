import React from 'react';
import {
  fireEvent,
  render as renderRTL,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import { MemoryRouter } from 'react-router-dom';

import { useRBAC } from '@strapi/helper-plugin';
import { QueryClientProvider, QueryClient } from 'react-query';
import ListView from '../index';
import server, { resetWebhooks } from './server';

const toggleNotification = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn().mockImplementation(() => toggleNotification),
  useRBAC: jest.fn().mockImplementation(() => ({
    isLoading: false,
    allowedActions: { canUpdate: true, canCreate: true, canDelete: true },
  })),
  useFocusWhenNavigate: jest.fn(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const render = (props) => ({
  ...renderRTL(<ListView {...props} />, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={lightTheme}>
        <QueryClientProvider client={queryClient}>
          <IntlProvider locale="en" messages={{}} defaultLocale="en" textComponent="span">
            <MemoryRouter>{children}</MemoryRouter>
          </IntlProvider>
        </QueryClientProvider>
      </ThemeProvider>
    ),
  }),
});

const originalError = console.error;

const user = userEvent.setup();

describe('Admin | containers | ListView', () => {
  beforeAll(() => {
    console.error = (...args) => {
      if (args[0] instanceof Error && args[0].name.includes('CanceledError')) {
        return;
      }
      originalError.call(console, ...args);
    };
    server.listen();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    resetWebhooks();
    server.resetHandlers();
  });

  afterAll(() => {
    console.error = originalError;
    server.close();
  });

  it('should show a loader when data is loading and then display the data', async () => {
    const { getByText } = render();

    const loadingElement = getByText('Loading content.');

    expect(loadingElement).toBeInTheDocument();

    await waitForElementToBeRemoved(() => getByText('Loading content.'));

    await waitFor(async () => {
      expect(getByText('http:://strapi.io')).toBeInTheDocument();
    });
  });

  it('should show a loader when permissions are loading', () => {
    useRBAC.mockImplementationOnce(() => ({
      isLoading: true,
      allowedActions: { canUpdate: true, canCreate: true, canDelete: true },
    }));

    const { getByText } = render();

    expect(getByText('Loading content.')).toBeInTheDocument();
  });

  it('should show a list of webhooks', async () => {
    const { getByText } = render();

    await waitFor(() => {
      expect(getByText('http:://strapi.io')).toBeInTheDocument();
    });
  });

  it('should delete all webhooks', async () => {
    const { getByText, getByRole, findByText } = render();
    await waitFor(() => {
      getByText('http:://strapi.io');
    });

    fireEvent.click(getByRole('checkbox', { name: 'Select all entries' }));
    fireEvent.click(getByRole('button', { name: 'Delete' }));

    await waitFor(async () => {
      expect(await findByText('Are you sure you want to delete this?')).toBeInTheDocument();
    });

    await user.click(getByRole('button', { name: /confirm/i }));

    await waitFor(async () => {
      expect(await findByText('No webhooks found')).toBeInTheDocument();
    });
  });

  it('should delete a single webhook', async () => {
    const { getByText, getByRole, findByText, getAllByRole } = render();
    await waitFor(() => {
      getByText('http:://strapi.io');
    });

    const deleteButtons = getAllByRole('button', { name: /delete webhook/i });
    await user.click(deleteButtons[0]);

    await waitFor(async () => {
      expect(await findByText('Are you sure you want to delete this?')).toBeInTheDocument();
    });

    await user.click(getByRole('button', { name: /confirm/i }));

    await waitForElementToBeRemoved(() => getByText('http:://strapi.io'));

    await waitFor(async () => {
      expect(await findByText('http://me.io')).toBeInTheDocument();
    });
  });

  it('should disable a webhook', async () => {
    const { getByText, getAllByRole } = render();
    await waitFor(() => {
      getByText('http:://strapi.io');
    });

    const enableSwitches = getAllByRole('switch', { name: /status/i });

    await user.click(enableSwitches[0]);

    await waitFor(async () => {
      expect(enableSwitches[0]).toHaveAttribute('aria-checked', 'false');
    });
  });
});
