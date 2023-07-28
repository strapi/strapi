import React from 'react';

import { lightTheme, ThemeProvider, useNotifyAT } from '@strapi/design-system';
import { NotificationsProvider, useFetchClient, useNotification } from '@strapi/helper-plugin';
import { act, renderHook, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import { useFolder } from '../useFolder';

const notifyStatusMock = jest.fn();

jest.mock('@strapi/design-system', () => ({
  ...jest.requireActual('@strapi/design-system'),
  useNotifyAT: () => ({
    notifyStatus: notifyStatusMock,
  }),
}));

const notificationStatusMock = jest.fn();

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: () => notificationStatusMock,
  useFetchClient: jest.fn().mockReturnValue({
    get: jest.fn().mockResolvedValue({
      data: {
        id: 1,
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

// eslint-disable-next-line react/prop-types
function ComponentFixture({ children }) {
  return (
    <Router>
      <Route>
        <QueryClientProvider client={client}>
          <ThemeProvider theme={lightTheme}>
            <NotificationsProvider>
              <IntlProvider locale="en" messages={{}}>
                {children}
              </IntlProvider>
            </NotificationsProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </Route>
    </Router>
  );
}

function setup(...args) {
  return new Promise((resolve) => {
    act(() => {
      resolve(renderHook(() => useFolder(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useFolder', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetches data from the right URL if no query param was set', async () => {
    const { get } = useFetchClient();
    const { result } = await setup(1, {});

    await waitFor(() => result.current.isSuccess);

    await waitFor(() =>
      expect(get).toBeCalledWith('/upload/folders/1', {
        params: {
          populate: {
            parent: {
              populate: {
                parent: '*',
              },
            },
          },
        },
      })
    );
  });

  test('it does not fetch, if enabled is set to false', async () => {
    const { get } = useFetchClient();
    const { result } = await setup(1, { enabled: false });

    await waitFor(() => result.current.isSuccess);

    expect(get).toBeCalledTimes(0);
  });

  test('calls toggleNotification in case of error', async () => {
    const { get } = useFetchClient();
    const originalConsoleError = console.error;
    console.error = jest.fn();

    get.mockRejectedValueOnce(new Error('Jest mock error'));

    const { notifyStatus } = useNotifyAT();
    const toggleNotification = useNotification();
    const { result } = await setup(1, {});

    await waitFor(() => !result.current.isLoading);

    expect(toggleNotification).toBeCalled();
    expect(notifyStatus).not.toBeCalled();

    console.error = originalConsoleError;
  });
});
