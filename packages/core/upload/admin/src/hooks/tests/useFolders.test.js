import React from 'react';

import { lightTheme, ThemeProvider, useNotifyAT } from '@strapi/design-system';
import { NotificationsProvider, useFetchClient, useNotification } from '@strapi/helper-plugin';
import { act, renderHook, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import { useFolders } from '../useFolders';

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
      resolve(renderHook(() => useFolders(...args), { wrapper: ComponentFixture }));
    });
  });
}

describe('useFolders', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetches data from the right URL if no query param was set', async () => {
    const { get } = useFetchClient();
    const { result } = await setup({});

    await waitFor(() => result.current.isSuccess);

    const expected = {
      pagination: {
        pageSize: -1,
      },
      filters: {
        $and: [
          {
            parent: {
              id: {
                $null: true,
              },
            },
          },
        ],
      },
    };

    await waitFor(() =>
      expect(get).toBeCalledWith(`/upload/folders`, {
        params: expected,
      })
    );
  });

  test('does not use parent filter in params if _q', async () => {
    const { get } = useFetchClient();

    await setup({
      query: { folder: 5, _q: 'something', filters: { $and: [{ something: 'true' }] } },
    });

    const expected = {
      filters: {
        $and: [
          {
            something: 'true',
          },
        ],
      },
      pagination: {
        pageSize: -1,
      },
      _q: 'something',
    };

    expect(get).toBeCalledWith(`/upload/folders`, {
      params: expected,
    });
  });

  test('fetches data from the right URL if a query param was set', async () => {
    const { get } = useFetchClient();
    const { result } = await setup({ query: { folder: 1 } });

    await waitFor(() => result.current.isSuccess);

    const expected = {
      pagination: {
        pageSize: -1,
      },
      filters: {
        $and: [
          {
            parent: {
              id: 1,
            },
          },
        ],
      },
    };

    expect(get).toBeCalledWith(`/upload/folders`, {
      params: expected,
    });
  });

  test('allows to merge filter query params using filters.$and', async () => {
    const { get } = useFetchClient();
    await setup({
      query: { folder: 5, filters: { $and: [{ something: 'true' }] } },
    });

    const expected = {
      filters: {
        $and: [
          {
            something: 'true',
          },
          {
            parent: {
              id: 5,
            },
          },
        ],
      },
      pagination: {
        pageSize: -1,
      },
    };

    expect(get).toBeCalledWith(`/upload/folders`, {
      params: expected,
    });
  });

  test('it does not fetch, if enabled is set to false', async () => {
    const { get } = useFetchClient();
    const { result } = await setup({ enabled: false });

    await waitFor(() => result.current.isSuccess);

    expect(get).toBeCalledTimes(0);
  });

  test('calls notifyStatus in case of success', async () => {
    const { notifyStatus } = useNotifyAT();
    const toggleNotification = useNotification();
    await setup({});

    await waitFor(() => {
      expect(notifyStatus).toBeCalledWith('The folders have finished loading.');
    });

    expect(toggleNotification).toBeCalledTimes(0);
  });

  test('calls toggleNotification in case of error', async () => {
    const { get } = useFetchClient();
    const originalConsoleError = console.error;
    console.error = jest.fn();

    get.mockRejectedValueOnce(new Error('Jest mock error'));

    const { notifyStatus } = useNotifyAT();
    const toggleNotification = useNotification();
    await setup({});

    await waitFor(() => expect(toggleNotification).toBeCalled());
    await waitFor(() => expect(notifyStatus).not.toBeCalled());

    console.error = originalConsoleError;
  });
});
