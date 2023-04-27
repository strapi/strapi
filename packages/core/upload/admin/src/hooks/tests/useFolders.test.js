import React from 'react';
import { stringify } from 'qs';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider, QueryClient } from 'react-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import { NotificationsProvider, useNotification, useFetchClient } from '@strapi/helper-plugin';
import { useNotifyAT, ThemeProvider, lightTheme } from '@strapi/design-system';

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
    const { result, waitFor, waitForNextUpdate } = await setup({});

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

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

    expect(get).toBeCalledWith(`/upload/folders?${stringify(expected, { encode: false })}`);
  });

  test('does not use parent filter in params if _q', async () => {
    const { get } = useFetchClient();
    const { result, waitFor, waitForNextUpdate } = await setup({
      query: { folder: 5, _q: 'something', filters: { $and: [{ something: 'true' }] } },
    });

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

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

    expect(get).toBeCalledWith(`/upload/folders?${stringify(expected, { encode: false })}`);
  });

  test('fetches data from the right URL if a query param was set', async () => {
    const { get } = useFetchClient();
    const { result, waitFor, waitForNextUpdate } = await setup({ query: { folder: 1 } });

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

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

    expect(get).toBeCalledWith(`/upload/folders?${stringify(expected, { encode: false })}`);
  });

  test('allows to merge filter query params using filters.$and', async () => {
    const { get } = useFetchClient();
    const { result, waitFor, waitForNextUpdate } = await setup({
      query: { folder: 5, filters: { $and: [{ something: 'true' }] } },
    });

    await waitFor(() => result.current.isSuccess);
    await waitForNextUpdate();

    const expected = {
      filters: {
        $and: [
          {
            something: true,
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

    expect(get).toBeCalledWith(`/upload/folders?${stringify(expected, { encode: false })}`);
  });

  test('it does not fetch, if enabled is set to false', async () => {
    const { get } = useFetchClient();
    const { result, waitFor } = await setup({ enabled: false });

    await waitFor(() => result.current.isSuccess);

    expect(get).toBeCalledTimes(0);
  });

  test('calls notifyStatus in case of success', async () => {
    const { notifyStatus } = useNotifyAT();
    const toggleNotification = useNotification();
    const { waitForNextUpdate } = await setup({});

    await waitForNextUpdate();

    expect(notifyStatus).toBeCalledWith('The folders have finished loading.');
    expect(toggleNotification).toBeCalledTimes(0);
  });

  test('calls toggleNotification in case of error', async () => {
    const { get } = useFetchClient();
    const originalConsoleError = console.error;
    console.error = jest.fn();

    get.mockRejectedValueOnce(new Error('Jest mock error'));

    const { notifyStatus } = useNotifyAT();
    const toggleNotification = useNotification();
    const { waitFor } = await setup({});

    await waitFor(() => expect(toggleNotification).toBeCalled());
    await waitFor(() => expect(notifyStatus).not.toBeCalled());

    console.error = originalConsoleError;
  });
});
